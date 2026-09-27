"""Greedy global swap engine for the EV depot.

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
from .estimator import blend, live_range, planned_range
from .models import Bus, GTFSRoute, RouteAssignment, TelemetryPoint, TripLog


# ── Time-slot helper ──────────────────────────────────────────────────────────

def get_slot(hour: Optional[int] = None) -> str:
    """Map a wall-clock hour (0–23) to a schedule slot name.

    If *hour* is None the current UTC hour is used.
    """
    if hour is None:
        hour = datetime.utcnow().hour
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
    """Re-compute bus-to-route assignments using a greedy global match.

    The algorithm:
    1. Gate buses — only eligible buses (SoC ≥ floor, available, clean) enter
       the pool.
    2. Sort routes by GTFS distance DESCENDING so the longest route gets first
       pick of the highest-range buses.
    3. Greedy one-pass match with 5% SOC hysteresis:
       - Keep the incumbent when it is still valid AND the best challenger
         does not clear the hysteresis band.
       - Reassign immediately when the incumbent is invalid (failed floor,
         no longer in remaining pool — i.e. already committed to a longer
         route this pass).
    4. Mark routes with no eligible candidate as NO_DEPARTURE.

    INVARIANT: ``assignments.keys()`` is identical before and after this call.
    Only the values inside each ``RouteAssignment`` object are mutated.

    Parameters
    ----------
    assignments:
        The persistent mapping of route_id → RouteAssignment.  This dict's
        keys are never added or removed here — only values are updated.
    """
    bus_list = list(buses)
    route_list = list(gtfs_routes)
    logs_list = list(trip_logs)
    telem_list = list(telemetry)
    effective_slot = slot or get_slot()

    # ── Step 1: eligibility gate ──────────────────────────────────────────────
    ranges = compute_ranges(
        bus_list, logs_list, telem_list,
        slot=effective_slot, route_code=None,
    )
    eligible_bus_ids: set[str] = set(ranges.keys())
    bus_map: Dict[str, Bus] = {b.bus_id: b for b in bus_list}

    # ── Step 2: sort routes longest-first ────────────────────────────────────
    sorted_routes = sorted(route_list, key=lambda r: r.distance_km, reverse=True)

    # ── Step 3: greedy match with hysteresis ──────────────────────────────────
    remaining: set[str] = set(eligible_bus_ids)

    for route in sorted_routes:
        rid = route.route_id

        # Ensure the key exists in assignments (idempotent init)
        if rid not in assignments:
            assignments[rid] = RouteAssignment(
                route_id=rid,
                route_distance_km=route.distance_km,
            )

        # Candidates: eligible, available in pool, range covers this route
        candidates: List[str] = [
            bid for bid in remaining
            if ranges[bid] >= route.distance_km
        ]

        if not candidates:
            # NO_DEPARTURE — no bus can cover this route's distance
            assignments[rid].assigned_bus_id = None
            assignments[rid].assigned_short_name = None
            assignments[rid].expected_range_km = 0.0
            assignments[rid].route_distance_km = route.distance_km
            continue

        best = max(candidates, key=lambda b: ranges[b])

        # ── Incumbent check ───────────────────────────────────────────────────
        incumbent_id = assignments[rid].assigned_bus_id
        incumbent_still_valid: bool = (
            incumbent_id is not None
            and incumbent_id in remaining          # NOT already committed elsewhere
            and incumbent_id in eligible_bus_ids   # still passes all gates
            and ranges.get(incumbent_id, 0.0) >= route.distance_km
        )

        if incumbent_still_valid:
            assert incumbent_id is not None  # narrowing for type checker
            challenger_soc = bus_map[best].soc
            incumbent_soc = bus_map[incumbent_id].soc
            if challenger_soc - incumbent_soc > SWAP_SOC_THRESHOLD:
                chosen = best        # challenger cleared hysteresis band
            else:
                chosen = incumbent_id  # keep incumbent, suppress micro-swap
        else:
            chosen = best            # no valid incumbent — take the best available

        # ── Commit assignment ─────────────────────────────────────────────────
        chosen_bus = bus_map[chosen]
        assignments[rid].assigned_bus_id = chosen
        assignments[rid].assigned_short_name = chosen_bus.short_name or chosen
        assignments[rid].expected_range_km = ranges[chosen]
        assignments[rid].last_swap_soc = chosen_bus.soc
        assignments[rid].route_distance_km = route.distance_km
        remaining.discard(chosen)

    return assignments
