"""Greedy global swap engine for the fleet depot.

This module contains the Python-side implementation of Logic 2.  The Node.js
``swapBusAssignments()`` function in server.js is the authoritative real-time
swap engine (it runs synchronously on every telemetry POST and has direct
access to the live bus_state.json).  This Python module:

1. Provides ``compute_ranges()`` — returns the blended range for every bus that
   passes all eligibility gates, using ``planned_range`` / ``live_range`` /
   ``blend`` from ``estimator.py``.

2. Provides ``resync_assignments()`` — the greedy global match: sort routes by
   GTFS distance (longest first), sort eligible buses by range (highest first),
   assign greedily with 5% SOC hysteresis and the incumbent-in-remaining
   correctness guard.

3. Provides ``get_slot()`` — maps wall-clock hour to NORMAL/PEAK/EXTREME_PEAK.

The swap engine is designed to be called by ``api.py``'s ``/range/{bus_id}``
and ``/update_bus_status`` endpoints so the depot dashboard and ESP selection
box always show the Python-computed blended range, not the flat 1.42 km/% value.

Key invariant
-------------
``assignments.keys()`` is identical before and after every call to
``resync_assignments()``.  Only values (assigned_bus_id, assigned_short_name,
expected_range_km, last_swap_soc) change.  Route IDs are fixed slots forever.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, Iterable, List, Optional

from .config import DEFAULTS, DEPOT_MIN_SOC_FLOOR, SWAP_SOC_THRESHOLD
from .estimator import blend, categorize, live_range, planned_range
from .models import Bus, GTFSRoute, RouteAssignment, TelemetryPoint, TripLog


# ── Page 4 Priority Allocation Matrix ─────────────────────────────────────────
# Maps Route Category (Difficulty) x Time Slot -> Allowed Bus Range Categories.
# Category A: > 120 km | Category B: 100-120 km | Category C: < 100 km
ALLOWED_CATEGORIES: dict[str, dict[str, set[str]]] = {
    "SIMPLE": {"NORMAL": {"A", "B", "C"}, "PEAK": {"A", "B"}, "EXTREME_PEAK": {"A", "B"}},
    "MODERATE": {"NORMAL": {"A", "B"}, "PEAK": {"A"}, "EXTREME_PEAK": {"A"}},
    "COMPLEX": {"NORMAL": {"A"}, "PEAK": {"A"}, "EXTREME_PEAK": {"A"}},
}


# ── Time-slot helper ──────────────────────────────────────────────────────────

def get_slot(dt_or_hour: Optional[datetime | int] = None) -> str:
    """Map a wall-clock hour (0–23) or datetime to a schedule slot name (Page 4).

    05:00–07:00: NORMAL
    07:00–10:00: EXTREME_PEAK
    10:00–16:00: PEAK
    16:00–20:00: EXTREME_PEAK
    20:00–23:00: PEAK
    23:00–05:00: NORMAL (Off-peak night)
    """
    if dt_or_hour is None:
        hour = datetime.now().hour
    elif isinstance(dt_or_hour, datetime):
        hour = dt_or_hour.hour
    else:
        hour = int(dt_or_hour)

    if 5 <= hour < 7:
        return "NORMAL"
    if 7 <= hour < 10:
        return "EXTREME_PEAK"
    if 10 <= hour < 16:
        return "PEAK"
    if 16 <= hour < 20:
        return "EXTREME_PEAK"
    if 20 <= hour < 23:
        return "PEAK"
    return "NORMAL"


def get_route_category(distance_km: float, explicit: Optional[str] = None) -> str:
    """Classify route into SIMPLE, MODERATE, or COMPLEX based on distance or explicit label."""
    if explicit and explicit.upper() in {"SIMPLE", "MODERATE", "COMPLEX"}:
        return explicit.upper()
    if distance_km >= 20.0:
        return "COMPLEX"
    if distance_km >= 10.0:
        return "MODERATE"
    return "SIMPLE"


def is_bus_category_allowed(bus_cat: str, route_cat: str, slot: str) -> bool:
    """Check if bus range tier is permitted for route category and time slot (Page 4)."""
    slot_map = ALLOWED_CATEGORIES.get(route_cat.upper(), ALLOWED_CATEGORIES["SIMPLE"])
    allowed = slot_map.get(slot.upper(), {"A"})
    return bus_cat.upper() in allowed


# ── Eligibility gate ──────────────────────────────────────────────────────────

def _is_eligible(bus: Bus) -> bool:
    """Return True when a bus passes all depot dispatch gates.

    A bus that fails here is absent from the eligible pool entirely — it does
    not appear in ``compute_ranges()`` output and cannot be assigned to any
    route.  This is different from being low-priority: failing the floor means
    no grace band (hysteresis) applies at all.
    """
    return (
        bus.available
        and bus.interior_clean
        and bus.exterior_clean
        and bus.soc >= DEPOT_MIN_SOC_FLOOR
    )


# ── Range computation ─────────────────────────────────────────────────────────

def compute_ranges(
    buses: Iterable[Bus],
    trip_logs: Iterable[TripLog],
    telemetry: Iterable[TelemetryPoint],
    *,
    slot: Optional[str] = None,
    route_code: Optional[str] = None,
) -> Dict[str, float]:
    """Return blended range in km for every bus that passes all eligibility gates.

    Buses that fail any gate (available, interior_clean, exterior_clean, SoC ≥
    floor) are absent from the returned dict.  Callers treat absence as
    ineligibility — no special sentinel value is needed.

    Parameters
    ----------
    buses:
        Current fleet state.
    trip_logs:
        Historical trip records used to fit (a, b) drain coefficients.
    telemetry:
        Recent live telemetry points (last 20 min) used for live_range().
    slot:
        Optional time-slot override ("NORMAL"/"PEAK"/"EXTREME_PEAK").
        Defaults to the current UTC hour via ``get_slot()``.
    route_code:
        Optional route code — when provided, ``planned_range`` uses
        route-specific historical data first.  Pass None when computing
        generic per-bus range (e.g. before a route is assigned).
    """
    effective_slot = slot or get_slot()
    logs_list = list(trip_logs)
    telem_list = list(telemetry)

    ranges: Dict[str, float] = {}
    for bus in buses:
        if not _is_eligible(bus):
            continue

        # Filter telemetry to this bus only
        bus_telem = [t for t in telem_list if t.bus_id == bus.bus_id]

        # 1. Planned range (historical fit or defaults)
        p = planned_range(
            logs_list,
            bus_id=bus.bus_id,
            route_code=route_code,
            slot=effective_slot,
            soc=bus.soc,
            reserve=DEFAULTS.reserve_soc_percent,
        )

        # 2. Live range (may return None if window is too small)
        l = live_range(bus_telem, reserve=DEFAULTS.reserve_soc_percent)

        # 3. Blended estimate
        window_min = 0.0
        if l is not None and len(bus_telem) >= 2:
            window_min = (
                (bus_telem[-1].timestamp - bus_telem[0].timestamp).total_seconds() / 60.0
            )

        ranges[bus.bus_id] = blend(planned=p, live=l, window_minutes=window_min)

    return ranges


# ── Greedy global assignment ──────────────────────────────────────────────────

def resync_assignments(
    buses: Iterable[Bus],
    gtfs_routes: Iterable[GTFSRoute],
    trip_logs: Iterable[TripLog],
    telemetry: Iterable[TelemetryPoint],
    assignments: Dict[str, RouteAssignment],
    *,
    slot: Optional[str] = None,
) -> Dict[str, RouteAssignment]:
    """Re-compute bus-to-route assignments using Page 4 Priority Allocation Matrix.

    The algorithm:
    1. Gate buses — only eligible buses (SoC >= floor, available, clean) enter
       the pool.
    2. Classify buses into Page 4 range tiers:
       - Category A: > 120 km
       - Category B: 100-120 km
       - Category C: < 100 km
    3. Sort routes by Page 4 operational difficulty priority:
       - Complex routes (>= 20 km) first, then Moderate (10-20 km), then Simple (< 10 km).
       - Within the same category, longest distance first.
       This guarantees that Complex routes in Extreme Peak get priority access
       to Category A buses (> 120 km).
    4. Match with Page 4 matrix & 5% SoC hysteresis:
       - If incumbent violates the matrix (e.g. Cat B on Complex route during Extreme Peak)
         and a compliant challenger (Cat A) is available, swap immediately to restore compliance.
       - If incumbent is compliant, keep it unless a compliant challenger clears the 5% hysteresis band.
       - On Simple routes during Normal hours, allocate Category B or C buses if available,
         preserving Category A buses for difficult schedules.
    5. Mark routes with no eligible candidate as NO_DEPARTURE.

    INVARIANT: ``assignments.keys()`` is identical before and after this call.
    Only the values inside each ``RouteAssignment`` object are mutated.
    """
    bus_list = list(buses)
    route_list = list(gtfs_routes)
    logs_list = list(trip_logs)
    telem_list = list(telemetry)
    effective_slot = slot or get_slot()

    # ── Step 1: eligibility gate & blended ranges ─────────────────────────────
    ranges = compute_ranges(
        bus_list, logs_list, telem_list,
        slot=effective_slot, route_code=None,
    )
    eligible_bus_ids: set[str] = set(ranges.keys())
    bus_map: Dict[str, Bus] = {b.bus_id: b for b in bus_list}
    bus_categories: Dict[str, str] = {bid: categorize(ranges[bid]) for bid in ranges}

    # ── Step 2: prioritize routes (Complex -> Moderate -> Simple, then distance)
    cat_ranks = {"COMPLEX": 0, "MODERATE": 1, "SIMPLE": 2}

    def _route_sort_key(r: GTFSRoute) -> tuple[int, float]:
        rcat = getattr(r, "route_category", None) or get_route_category(r.distance_km)
        return (cat_ranks.get(rcat.upper(), 2), -r.distance_km)

    sorted_routes = sorted(route_list, key=_route_sort_key)

    # ── Step 3: greedy match with Page 4 Priority Allocation Matrix ───────────
    remaining: set[str] = set(eligible_bus_ids)

    for route in sorted_routes:
        rid = route.route_id
        rcat = getattr(route, "route_category", None) or get_route_category(route.distance_km)
        rcat = rcat.upper()
        allowed_tiers = ALLOWED_CATEGORIES.get(rcat, ALLOWED_CATEGORIES["SIMPLE"]).get(effective_slot.upper(), {"A"})

        # Ensure the key exists in assignments (idempotent init)
        if rid not in assignments:
            assignments[rid] = RouteAssignment(
                route_id=rid,
                route_distance_km=route.distance_km,
                route_category=rcat,
            )

        # Candidates covering route distance
        distance_candidates = [
            bid for bid in remaining
            if ranges[bid] >= route.distance_km
        ]

        # Candidates meeting Page 4 matrix
        strict_candidates = [
            bid for bid in distance_candidates
            if bus_categories[bid] in allowed_tiers
        ]

        if strict_candidates:
            candidates = strict_candidates
            is_matrix_compliant = True
        elif distance_candidates:
            # Fallback if fleet has a shortage of compliant tier buses
            candidates = distance_candidates
            is_matrix_compliant = False
        else:
            # NO_DEPARTURE — no bus can cover this route's distance
            assignments[rid].assigned_bus_id = None
            assignments[rid].assigned_short_name = None
            assignments[rid].assigned_category = None
            assignments[rid].expected_range_km = 0.0
            assignments[rid].route_distance_km = route.distance_km
            assignments[rid].route_category = rcat
            assignments[rid].matrix_compliant = False
            assignments[rid].swap_reason = f"NO_DEPARTURE: No eligible bus has range >= {route.distance_km:.1f} km."
            continue

        # Candidate ranking:
        # If Simple Route during Normal hours: allocate B or C to conserve A
        if rcat == "SIMPLE" and effective_slot.upper() == "NORMAL":
            best = max(
                candidates,
                key=lambda b: (0 if bus_categories[b] in {"B", "C"} else -1, ranges[b])
            )
        elif rcat in {"MODERATE", "STANDARD"} and effective_slot.upper() == "NORMAL":
            # For moderate/standard route primary allocation is Category B; fallback to A if B absent
            best = max(
                candidates,
                key=lambda b: (1 if bus_categories[b] == "B" else (0 if bus_categories[b] == "A" else -1), ranges[b])
            )
        else:
            # High difficulty or peak hours: prioritize Category A / highest range
            best = max(candidates, key=lambda b: ranges[b])

        # ── Incumbent check with Page 4 matrix & 5% hysteresis ───────────────
        incumbent_id = assignments[rid].assigned_bus_id
        incumbent_still_valid: bool = (
            incumbent_id is not None
            and incumbent_id in remaining          # NOT already committed elsewhere
            and incumbent_id in eligible_bus_ids   # still passes all gates
            and ranges.get(incumbent_id, 0.0) >= route.distance_km
        )

        swap_reason = ""
        if incumbent_still_valid:
            assert incumbent_id is not None
            incumbent_cat = bus_categories.get(incumbent_id, "C")
            best_cat = bus_categories.get(best, "C")
            incumbent_compliant = incumbent_cat in allowed_tiers
            best_compliant = best_cat in allowed_tiers

            if not incumbent_compliant and best_compliant:
                # Challenger fixes a Page 4 matrix violation: immediate upgrade
                chosen = best
                swap_reason = (
                    f"Page 4 Matrix Compliance: Upgraded Route {rid} ({rcat}, {effective_slot}) "
                    f"from Category {incumbent_cat} to Category {best_cat} bus '{best}'."
                )
            elif incumbent_compliant and not best_compliant:
                # Keep incumbent to preserve matrix compliance
                chosen = incumbent_id
                swap_reason = f"Preserved matrix compliance with incumbent Category {incumbent_cat} bus '{incumbent_id}'."
            else:
                # Both compliant (or both non-compliant): evaluate hysteresis
                challenger_soc = bus_map[best].soc
                incumbent_soc = bus_map[incumbent_id].soc
                if challenger_soc - incumbent_soc > SWAP_SOC_THRESHOLD:
                    chosen = best
                    swap_reason = (
                        f"Range Optimization: Challenger '{best}' cleared 5% SoC hysteresis band "
                        f"({challenger_soc:.1f}% vs {incumbent_soc:.1f}%)."
                    )
                else:
                    chosen = incumbent_id
                    swap_reason = (
                        f"Hysteresis Hold: Incumbent '{incumbent_id}' retained "
                        f"(SoC gap {challenger_soc - incumbent_soc:+.1f}% <= {SWAP_SOC_THRESHOLD}%)."
                    )
        else:
            chosen = best
            chosen_cat = bus_categories.get(best, "C")
            swap_reason = (
                f"Page 4 Priority Dispatch: Assigned Category {chosen_cat} bus '{chosen}' "
                f"({ranges[chosen]:.1f} km range, {bus_map[chosen].soc:.1f}% SoC) to {rcat} route."
            )

        # ── Commit assignment ─────────────────────────────────────────────────
        chosen_bus = bus_map[chosen]
        chosen_cat = bus_categories[chosen]
        assignments[rid].assigned_bus_id = chosen
        assignments[rid].assigned_short_name = chosen_bus.short_name or chosen
        assignments[rid].assigned_category = chosen_cat
        assignments[rid].route_category = rcat
        assignments[rid].expected_range_km = ranges[chosen]
        assignments[rid].matrix_compliant = (chosen_cat in allowed_tiers)
        assignments[rid].swap_reason = swap_reason
        assignments[rid].last_swap_soc = chosen_bus.soc
        assignments[rid].route_distance_km = route.distance_km
        remaining.discard(chosen)

    return assignments
