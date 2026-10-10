"""Historical SOC discharge rate calculation by distance and time.

Calculates dual-metric discharge rates:
- soc_per_km = soc_drop / distance_km
- soc_per_hour = soc_drop / operating_duration_hours

Strictly excludes charging intervals and long non-operating layovers from active
driving time. Keeps distance-based and time-based estimates distinct to avoid
double-counting energy consumption.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Iterable, List, Optional, Tuple, Dict
import numpy as np


@dataclass
class ConsumptionSegment:
    """A single continuous operational consumption segment."""

    segment_id: str
    bus_id: str
    distance_km: float
    soc_start: float
    soc_end: float
    soc_drop: float
    duration_minutes: float
    duration_hours: float
    soc_per_km: Optional[float] = None
    soc_per_hour: Optional[float] = None
    route_code: str = ""
    shift: str = ""
    slot: str = "NORMAL"  # "NORMAL", "PEAK", "EXTREME_PEAK"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_charging: bool = False
    is_layover: bool = False
    is_elapsed_proxy: bool = False
    quality_note: str = ""


@dataclass
class ScheduleDischargeEstimate:
    """Evaluation output for a schedule departure comparing distance and time."""

    bus_id: str
    route_code: str
    shift: str
    slot: str
    target_distance_km: float
    expected_duration_hours: float
    reserve_pct: float
    bus_category: str = "B"
    bus_actual_range_km: float = 110.0

    # Primary distance-based estimate
    distance_base_soc_pct: float = 0.0
    distance_required_soc_pct: float = 0.0  # base + reserve
    soc_per_km: float = 0.0

    # Supplementary time-based estimate (None if data insufficient or contaminated)
    time_base_soc_pct: Optional[float] = None
    time_expected_soc_pct: Optional[float] = None  # time_base + reserve
    soc_per_hour: Optional[float] = None

    # Quality & diagnostic metadata
    comparable_segments_count: int = 0
    is_elapsed_proxy: bool = False
    evidence_status: str = "VALIDATED_DISTANCE"
    traffic_impact_note: str = ""
    limitation_note: Optional[str] = None
    double_counting_warning: str = (
        "Estimates are independent and must not be added together to avoid double-counting energy consumption."
    )


def extract_valid_consumption_segments(
    raw_records: Iterable[Any],
    *,
    max_layover_minutes: float = 45.0,
    min_valid_distance_km: float = 0.2,
    min_valid_duration_min: float = 1.0,
) -> List[ConsumptionSegment]:
    """Parse and clean raw operational records into valid non-charging segments.

    Rules applied:
    1. Excludes charging events (where soc_end > soc_start or soc_drop <= 0).
    2. Excludes layover/stationary periods from active driving time.
    3. Identifies and flags elapsed schedule duration proxy records when granular
       driving duration breakdown is not provided.
    4. Computes soc_per_km and soc_per_hour only on clean driving portions.
    """
    segments: List[ConsumptionSegment] = []

    for idx, rec in enumerate(raw_records):
        seg_id = f"seg_{idx}"
        bus_id = ""
        route_code = ""
        shift = ""
        slot = "NORMAL"
        dist_km = 0.0
        s_start = 100.0
        s_end = 100.0
        dur_min = 0.0
        start_ts = None
        end_ts = None
        is_proxy = False
        quality_notes = []

        if isinstance(rec, dict):
            bus_id = str(rec.get("bus_id") or rec.get("bmNumber") or rec.get("bus") or f"BUS_{idx}").strip()
            route_code = str(rec.get("route_code") or rec.get("route") or rec.get("routeId") or "").strip()
            shift = str(rec.get("shift") or "").strip()
            slot = str(rec.get("slot") or "NORMAL").upper().strip()
            dist_km = float(rec.get("km") or rec.get("distance_km") or 0.0)
            s_start = float(rec.get("soc_start") if rec.get("soc_start") is not None else rec.get("startSoc", 100.0))
            s_end = float(rec.get("soc_end") if rec.get("soc_end") is not None else rec.get("endSoc", 100.0))
            
            # Duration parsing
            if "duration_minutes" in rec and rec["duration_minutes"] is not None:
                dur_min = float(rec["duration_minutes"])
            elif "duration_hours" in rec and rec["duration_hours"] is not None:
                dur_min = float(rec["duration_hours"]) * 60.0
            elif "operating_minutes" in rec and rec["operating_minutes"] is not None:
                dur_min = float(rec["operating_minutes"])
            elif "elapsed_minutes" in rec and rec["elapsed_minutes"] is not None:
                dur_min = float(rec["elapsed_minutes"])
                is_proxy = True
                quality_notes.append("Elapsed trip duration proxy (includes layover/dwell)")

            is_proxy = is_proxy or bool(rec.get("is_elapsed_proxy", False))
            if rec.get("quality_note"):
                quality_notes.append(str(rec["quality_note"]))

        else:
            # Object like TripLog
            bus_id = getattr(rec, "bus_id", f"BUS_{idx}")
            route_code = getattr(rec, "route_code", "")
            shift = getattr(rec, "shift", "")
            slot = getattr(rec, "slot", "NORMAL")
            dist_km = float(getattr(rec, "km", getattr(rec, "distance_km", 0.0)))
            s_start = float(getattr(rec, "soc_start", 100.0))
            s_end = float(getattr(rec, "soc_end", 100.0))
            dur_hours = float(getattr(rec, "duration_hours", 0.0))
            dur_min = dur_hours * 60.0
            start_ts = getattr(rec, "timestamp", None)
            is_proxy = bool(getattr(rec, "is_elapsed_proxy", False))

        soc_drop = round(s_start - s_end, 3)

        # 1. Check Charging
        is_charging = (s_end > s_start) or (soc_drop < -0.05)
        if is_charging:
            segments.append(
                ConsumptionSegment(
                    segment_id=seg_id,
                    bus_id=bus_id,
                    distance_km=dist_km,
                    soc_start=s_start,
                    soc_end=s_end,
                    soc_drop=soc_drop,
                    duration_minutes=dur_min,
                    duration_hours=dur_min / 60.0,
                    soc_per_km=None,
                    soc_per_hour=None,
                    route_code=route_code,
                    shift=shift,
                    slot=slot,
                    is_charging=True,
                    is_layover=False,
                    is_elapsed_proxy=is_proxy,
                    quality_note="Charging/Regenerative segment (excluded from discharge rate calculations)",
                )
            )
            continue

        # 2. Check Layover / Stationary Idle
        is_layover = False
        if dist_km < min_valid_distance_km and dur_min > 10.0:
            is_layover = True
            quality_notes.append("Stationary layover/idle period (excluded from driving rate)")
        elif dur_min > (max_layover_minutes * 2.0) and dist_km < 5.0:
            is_layover = True
            quality_notes.append("Extended depot dwell period")

        dur_hours = dur_min / 60.0
        spk = round(soc_drop / dist_km, 4) if (dist_km >= min_valid_distance_km and soc_drop > 0) else None
        sph = round(soc_drop / dur_hours, 4) if (dur_hours > (min_valid_duration_min / 60.0) and soc_drop > 0 and not is_layover) else None

        segments.append(
            ConsumptionSegment(
                segment_id=seg_id,
                bus_id=bus_id,
                distance_km=dist_km,
                soc_start=s_start,
                soc_end=s_end,
                soc_drop=max(0.0, soc_drop),
                duration_minutes=dur_min,
                duration_hours=dur_hours,
                soc_per_km=spk,
                soc_per_hour=sph,
                route_code=route_code,
                shift=shift,
                slot=slot,
                start_time=start_ts,
                end_time=end_ts,
                is_charging=False,
                is_layover=is_layover,
                is_elapsed_proxy=is_proxy,
                quality_note="; ".join(quality_notes) if quality_notes else "Valid driving consumption segment",
            )
        )

    return segments


def estimate_schedule_discharge(
    segments: Iterable[ConsumptionSegment],
    *,
    bus_id: str,
    route_code: str,
    target_distance_km: float,
    expected_duration_hours: float,
    shift: str = "",
    slot: str = "NORMAL",
    reserve_pct: float = 15.0,
    bus_actual_range_km: Optional[float] = None,
    bus_category: str = "B",
) -> ScheduleDischargeEstimate:
    """Estimate required and expected SoC for a schedule departure.

    Calculates:
    - Distance-based SoC requirement using bus range or historical soc_per_km.
    - Time-based supplementary SoC expectation using historical soc_per_hour.
    - Preserves both estimates side-by-side without summing them (prevents double counting).
    - Falls back to distance calculation when duration data is missing, inconsistent,
      or contaminated by charging.
    """
    # Baseline range mapping by Category if bus_actual_range_km not provided
    if not bus_actual_range_km or bus_actual_range_km <= 0:
        cat_defaults = {"A": 130.0, "B": 110.0, "C": 75.0}
        bus_actual_range_km = cat_defaults.get(bus_category.upper(), 110.0)

    # 1. Base Distance Calculation (Physical Range Model)
    dist_base_soc = round((target_distance_km / bus_actual_range_km) * 100.0, 2)
    dist_req_soc = round(min(100.0, dist_base_soc + reserve_pct), 2)
    default_spk = round(100.0 / bus_actual_range_km, 4)

    # Filter valid operational segments (excluding charging and layovers)
    valid_segments = [
        s for s in segments
        if not s.is_charging and not s.is_layover and s.soc_drop > 0
    ]

    # Find comparable trips
    # Preference 1: Same bus + same route + same slot
    c1 = [
        s for s in valid_segments
        if s.bus_id == bus_id and s.route_code == route_code and s.slot == slot and s.soc_per_hour is not None
    ]
    # Preference 2: Same bus + same route
    c2 = [
        s for s in valid_segments
        if s.bus_id == bus_id and s.route_code == route_code and s.soc_per_hour is not None
    ]
    # Preference 3: Same bus across routes
    c3 = [
        s for s in valid_segments
        if s.bus_id == bus_id and s.soc_per_hour is not None
    ]
    # Preference 4: Fleet on same route & slot
    c4 = [
        s for s in valid_segments
        if s.route_code == route_code and s.slot == slot and s.soc_per_hour is not None
    ]

    comparable_pool = c1 or c2 or c3 or c4
    any_proxy = any(s.is_elapsed_proxy for s in comparable_pool)

    # Evaluate traffic slot impact (Peak vs Normal)
    peak_pool = [s for s in valid_segments if s.slot in ("PEAK", "EXTREME_PEAK") and s.soc_per_hour]
    normal_pool = [s for s in valid_segments if s.slot == "NORMAL" and s.soc_per_hour]
    traffic_note = ""
    if peak_pool and normal_pool:
        avg_peak_sph = float(np.mean([s.soc_per_hour for s in peak_pool]))
        avg_norm_sph = float(np.mean([s.soc_per_hour for s in normal_pool]))
        if avg_norm_sph > 0:
            diff_pct = round(((avg_peak_sph - avg_norm_sph) / avg_norm_sph) * 100.0, 1)
            if diff_pct > 0:
                traffic_note = f"Peak slot traffic & HVAC draw elevates hourly discharge by +{diff_pct}% compared to normal hours."
            elif diff_pct < 0:
                traffic_note = f"Normal hours discharge rate is {abs(diff_pct)}% lower than peak traffic."

    # Check validity of duration and comparable data
    limitation_note = None
    time_base_soc = None
    time_exp_soc = None
    selected_sph = None
    evidence_status = "VALIDATED_DISTANCE"

    if expected_duration_hours <= 0:
        limitation_note = "Expected schedule duration is missing or zero; time-based estimation unavailable."
        evidence_status = "MISSING_DURATION_FALLBACK"
    elif len(comparable_pool) == 0:
        # Check if there are only charging segments
        charging_segs = [s for s in segments if s.bus_id == bus_id and s.is_charging]
        if charging_segs and not valid_segments:
            limitation_note = "Historical records contain charging segments; contaminated data excluded from discharge rate."
            evidence_status = "CHARGING_CONTAMINATED_FALLBACK"
        else:
            limitation_note = "Insufficient historical active driving duration records; fallback to validated range distance model."
            evidence_status = "INSUFFICIENT_HISTORY_FALLBACK"
    else:
        # We have comparable records!
        selected_sph = round(float(np.median([s.soc_per_hour for s in comparable_pool])), 2)
        # Average soc_per_km from comparable
        valid_spks = [s.soc_per_km for s in comparable_pool if s.soc_per_km is not None]
        if valid_spks:
            default_spk = round(float(np.median(valid_spks)), 4)

        time_base_soc = round(expected_duration_hours * selected_sph, 2)
        time_exp_soc = round(min(100.0, time_base_soc + reserve_pct), 2)

        if any_proxy:
            evidence_status = "ELAPSED_PROXY"
            limitation_note = (
                "Based on elapsed schedule duration proxy (may include station dwell/layovers); "
                "treat as supplementary traffic indicator."
            )
        else:
            evidence_status = "RELIABLE_ACTIVE_HISTORY"

    return ScheduleDischargeEstimate(
        bus_id=bus_id,
        route_code=route_code,
        shift=shift,
        slot=slot,
        target_distance_km=target_distance_km,
        expected_duration_hours=expected_duration_hours,
        reserve_pct=reserve_pct,
        bus_category=bus_category.upper(),
        bus_actual_range_km=bus_actual_range_km,
        distance_base_soc_pct=dist_base_soc,
        distance_required_soc_pct=dist_req_soc,
        soc_per_km=default_spk,
        time_base_soc_pct=time_base_soc,
        time_expected_soc_pct=time_exp_soc,
        soc_per_hour=selected_sph,
        comparable_segments_count=len(comparable_pool),
        is_elapsed_proxy=any_proxy,
        evidence_status=evidence_status,
        traffic_impact_note=traffic_note,
        limitation_note=limitation_note,
    )
