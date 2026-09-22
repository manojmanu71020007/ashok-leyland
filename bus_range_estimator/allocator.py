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


def allocate(buses: Sequence[Bus], schedules: Sequence[Schedule], *, slot: str | None = None) -> list[dict]:
    """Rank buses for each schedule and return a flat list with a reason for each candidate."""
    results: list[dict] = []
    effective_slot = slot or "NORMAL"

    for schedule in schedules:
        slot_name = _slot_for_time(schedule.start_time) if slot is None else effective_slot
        route_category = schedule.route_category
        allowed = ALLOWED_CATEGORIES.get(route_category.upper(), ALLOWED_CATEGORIES["SIMPLE"])
        candidates = []

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

        ranked = sorted(
            candidates,
            key=lambda item: (
                0 if item.get("eligible") else 1,
                {"A": 0, "B": 1, "C": 2}.get(item.get("category"), 3),
                float(item.get("planned_range_km", 9999)),
            ),
        )
        results.extend(ranked)

    return results
