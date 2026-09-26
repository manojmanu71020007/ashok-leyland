"""Feasibility and allocation logic for EV depot operations."""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, Sequence

from .config import DEFAULTS
from .estimator import categorize, planned_range
from .models import Bus, Schedule


SLOT_RULES = {
    "NORMAL": {"start": "05:00", "end": "07:00"},
    "EXTREME_PEAK": {"start": "07:00", "end": "10:00"},
    "PEAK": {"start": "10:00", "end": "16:00"},
}

ALLOWED_CATEGORIES = {
    "SIMPLE": {"NORMAL": {"A", "B", "C"}, "PEAK": {"A", "B"}, "EXTREME_PEAK": {"A", "B"}},
    "MODERATE": {"NORMAL": {"A", "B"}, "PEAK": {"A"}, "EXTREME_PEAK": {"A"}},
    "COMPLEX": {"NORMAL": {"A"}, "PEAK": {"A"}, "EXTREME_PEAK": {"A"}},
}

SOC_HYSTERESIS_PERCENT: float = 5.0


def _slot_for_time(start_time: str) -> str:
    """Map a route start time to a standard schedule slot."""
    try:
        hour = int(start_time.split(":", 1)[0])
    except (TypeError, ValueError):
        return "NORMAL"

    if 5 <= hour < 7:
        return "NORMAL"
    if 7 <= hour < 10:
        return "EXTREME_PEAK"
    if 10 <= hour < 16:
        return "PEAK"
    if 16 <= hour < 20:
        return "EXTREME_PEAK"
    return "PEAK"


def can_swap_buses(
    current_bus: Bus,
    candidate_bus: Bus,
    *,
    hysteresis: float = SOC_HYSTERESIS_PERCENT,
) -> bool:
    """Evaluate whether candidate_bus can replace current_bus under SoC hysteresis.
    
    Swap is permitted if candidate_bus has an SoC advantage strictly exceeding the
    hysteresis threshold (default 5%).
    If current_bus is no longer available/clean/qualified, swap is always permitted.
    """
    if not current_bus.available or not current_bus.interior_clean or not current_bus.exterior_clean:
        return True
    if current_bus.soc < 98:
        return True

    soc_diff = float(candidate_bus.soc) - float(current_bus.soc)
    return soc_diff > hysteresis


def is_feasible(*, bus: Bus, schedule: Schedule, a: float = DEFAULTS.default_a, b: float = DEFAULTS.default_b) -> dict:
    """Evaluate whether the bus can cover the given schedule and return the shortfall."""
    soc_avail = max(0.0, float(bus.soc) - DEFAULTS.reserve_soc_percent)
    soc_needed = (a * float(schedule.route_km) * int(schedule.trips) + b * float(schedule.scheduled_hours)) * DEFAULTS.safety_margin
    feasible = soc_avail >= soc_needed
    shortfall_soc = max(0.0, soc_needed - soc_avail)
    shortfall_km = shortfall_soc / max(a, 1e-6) if a > 0 else 0.0
    return {
        "feasible": feasible,
        "soc_avail": soc_avail,
        "soc_needed": soc_needed,
        "shortfall_soc": shortfall_soc,
        "shortfall_km": shortfall_km,
    }


def allocate(
    buses: Sequence[Bus],
    schedules: Sequence[Schedule],
    *,
    slot: str | None = None,
    current_assignments: dict[str, str] | None = None,
    now: datetime | None = None,
    soc_hysteresis: float = SOC_HYSTERESIS_PERCENT,
) -> list[dict]:
    """Rank buses for each schedule and return a flat list with a reason for each candidate.
    
    Applies 5% SoC Hysteresis guardrail: Do not trigger a swap from a currently assigned bus unless
    the candidate bus's SoC exceeds the assigned bus's SoC by > 5%.
    """
    results: list[dict] = []
    effective_slot = slot or "NORMAL"
    bus_map = {b.bus_id: b for b in buses}

    for schedule in schedules:
        slot_name = _slot_for_time(schedule.start_time) if slot is None else effective_slot
        route_category = schedule.route_category
        allowed = ALLOWED_CATEGORIES.get(route_category.upper(), ALLOWED_CATEGORIES["SIMPLE"])
        candidates = []

        assigned_bus_id = current_assignments.get(schedule.route_code) if current_assignments else None
        assigned_bus = bus_map.get(assigned_bus_id) if assigned_bus_id else None

        for bus in buses:
            candidate = {
                "bus_id": bus.bus_id,
                "schedule": schedule.route_code,
                "slot": slot_name,
                "eligible": False,
                "reason": "",
            }

            if not bus.available or not bus.interior_clean or not bus.exterior_clean:
                candidate["reason"] = "Bus is unavailable or not cleaned."
                candidates.append(candidate)
                continue
            if bus.soc < 98:
                candidate["reason"] = "SOC below 98% required for dispatch."
                candidates.append(candidate)
                continue

            feasibility = is_feasible(bus=bus, schedule=schedule)
            if not feasibility["feasible"]:
                candidate["reason"] = (
                    f"Insufficient SOC: need {feasibility['soc_needed']:.1f}% and shortfall is "
                    f"{feasibility['shortfall_soc']:.1f}%. Suggest splitting trips or scheduling a mid-day charge."
                )
                candidates.append(candidate)
                continue

            planned = planned_range(
                bus.history,
                bus_id=bus.bus_id,
                route_code=schedule.route_code,
                slot=slot_name,
                soc=bus.soc,
                reserve=DEFAULTS.reserve_soc_percent,
            )
            category = categorize(planned)
            allowed_categories = allowed.get(slot_name.upper(), {"A"})
            if category not in allowed_categories:
                candidate["reason"] = (
                    f"Range category {category} is not allowed in slot {slot_name} for route category {route_category}."
                )
                candidates.append(candidate)
                continue

            candidate.update({
                "eligible": True,
                "reason": f"Eligible: range category {category} at {planned:.1f} km.",
                "category": category,
                "planned_range_km": planned,
            })
            candidates.append(candidate)

        # Apply 5% SoC Hysteresis guardrail to eligible candidates
        assigned_candidate = next((c for c in candidates if c["bus_id"] == assigned_bus_id), None)
        assigned_is_eligible = bool(assigned_candidate and assigned_candidate.get("eligible"))

        if assigned_is_eligible and assigned_bus:
            # Candidate must exceed assigned bus by > soc_hysteresis
            for item in candidates:
                if item["bus_id"] != assigned_bus_id and item.get("eligible"):
                    cand_bus = bus_map.get(item["bus_id"])
                    soc_diff = float(cand_bus.soc) - float(assigned_bus.soc) if cand_bus else 0.0
                    if soc_diff <= soc_hysteresis:
                        item["swap_prevented_by_hysteresis"] = True
                        item["reason"] += f" (Swap suppressed: SoC advantage {soc_diff:+.1f}% <= {soc_hysteresis}% hysteresis)."

        def _sort_key(item: dict) -> tuple:
            eligible = item.get("eligible", False)
            if not eligible:
                return (5, 3, 0.0)

            is_assigned = (item["bus_id"] == assigned_bus_id)
            if is_assigned:
                return (
                    0,
                    {"A": 0, "B": 1, "C": 2}.get(item.get("category"), 3),
                    -float(item.get("planned_range_km", 0)),
                )

            if item.get("swap_prevented_by_hysteresis"):
                # Cannot displace the assigned bus
                return (
                    2,
                    {"A": 0, "B": 1, "C": 2}.get(item.get("category"), 3),
                    -float(item.get("planned_range_km", 0)),
                )

            # Candidate exceeded hysteresis threshold (> 5% SoC gap): can compete for assignment
            return (
                0,
                {"A": 0, "B": 1, "C": 2}.get(item.get("category"), 3),
                -float(item.get("planned_range_km", 0)),
            )

        ranked = sorted(candidates, key=_sort_key)
        results.extend(ranked)

    return results


def swap_assignments(
    buses: Sequence[Bus],
    schedules: Sequence[Schedule],
    current_assignments: dict[str, str],
    *,
    now: datetime | None = None,
    soc_hysteresis: float = SOC_HYSTERESIS_PERCENT,
) -> dict[str, str]:
    """Calculate updated bus-to-schedule assignments with 5% SoC hysteresis guardrail.

    Swapping a candidate bus into a schedule only occurs if:
    - The candidate bus is eligible and feasible for the schedule.
    - The candidate bus SoC exceeds the currently assigned bus SoC by > `soc_hysteresis` (or current is ineligible).
    """
    updated_assignments = dict(current_assignments)

    alloc_results = allocate(
        buses,
        schedules,
        current_assignments=updated_assignments,
        now=now,
        soc_hysteresis=soc_hysteresis,
    )

    results_by_sched: dict[str, list[dict]] = {}
    for res in alloc_results:
        results_by_sched.setdefault(res["schedule"], []).append(res)

    for route_code, candidates in results_by_sched.items():
        eligible_candidates = [c for c in candidates if c.get("eligible")]
        if eligible_candidates:
            top_bus_id = eligible_candidates[0]["bus_id"]
            updated_assignments[route_code] = top_bus_id

    return updated_assignments
