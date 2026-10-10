"""Unit tests for historical SoC discharge rate calculation by distance and time."""

import pytest
from datetime import datetime, timedelta

from bus_range_estimator.discharge_rate import (
    ConsumptionSegment,
    ScheduleDischargeEstimate,
    extract_valid_consumption_segments,
    estimate_schedule_discharge,
)


def test_valid_duration_data():
    """Verify that valid duration and distance produce accurate soc_per_km and soc_per_hour."""
    records = [
        {
            "bus_id": "BM238",
            "route_code": "600F",
            "slot": "NORMAL",
            "km": 30.0,
            "soc_start": 95.0,
            "soc_end": 77.0,  # drop = 18.0%
            "duration_minutes": 90.0,  # 1.5 hours
        }
    ]
    segments = extract_valid_consumption_segments(records)
    assert len(segments) == 1
    seg = segments[0]
    assert not seg.is_charging
    assert not seg.is_layover
    assert seg.soc_drop == 18.0
    # soc_per_km = 18.0 / 30.0 = 0.6 %/km
    assert pytest.approx(seg.soc_per_km, 0.001) == 0.6
    # soc_per_hour = 18.0 / 1.5 = 12.0 %/hr
    assert pytest.approx(seg.soc_per_hour, 0.001) == 12.0

    # Test schedule estimation using this segment
    res = estimate_schedule_discharge(
        segments=segments,
        bus_id="BM238",
        route_code="600F",
        target_distance_km=30.0,
        expected_duration_hours=1.5,
        slot="NORMAL",
        reserve_pct=15.0,
        bus_actual_range_km=110.0,
    )
    assert res.evidence_status == "RELIABLE_ACTIVE_HISTORY"
    assert pytest.approx(res.soc_per_hour, 0.1) == 12.0
    # Time base = 1.5 * 12 = 18.0%
    assert pytest.approx(res.time_base_soc_pct, 0.1) == 18.0
    # Time required = 18 + 15 = 33.0%
    assert pytest.approx(res.time_expected_soc_pct, 0.1) == 33.0
    # Distance base = (30 / 110) * 100 = 27.27%
    assert pytest.approx(res.distance_base_soc_pct, 0.1) == 27.27


def test_missing_duration_fallback():
    """Verify that when schedule duration is missing or zero, the system falls back to distance model."""
    records = [
        {
            "bus_id": "BM238",
            "route_code": "600F",
            "km": 30.0,
            "soc_start": 90.0,
            "soc_end": 75.0,
            "duration_minutes": 60.0,
        }
    ]
    segments = extract_valid_consumption_segments(records)

    # Call with expected_duration_hours = 0 (missing duration)
    res = estimate_schedule_discharge(
        segments=segments,
        bus_id="BM238",
        route_code="600F",
        target_distance_km=30.0,
        expected_duration_hours=0.0,
        reserve_pct=15.0,
        bus_actual_range_km=110.0,
    )
    assert res.evidence_status == "MISSING_DURATION_FALLBACK"
    assert res.time_base_soc_pct is None
    assert res.time_expected_soc_pct is None
    assert "missing or zero" in res.limitation_note.lower()
    # Distance estimate remains fully operational
    assert res.distance_required_soc_pct > 0


def test_charging_during_trip_excluded():
    """Verify that segments where SoC increases are flagged as charging and excluded from consumption rate."""
    records = [
        # Normal discharge segment
        {
            "bus_id": "BM238",
            "route_code": "600F",
            "km": 20.0,
            "soc_start": 80.0,
            "soc_end": 68.0,  # drop = 12%
            "duration_minutes": 50.0,
        },
        # Opportunity charging during turnaround
        {
            "bus_id": "BM238",
            "route_code": "600F",
            "km": 0.0,
            "soc_start": 68.0,
            "soc_end": 92.0,  # charging!
            "duration_minutes": 40.0,
        },
    ]
    segments = extract_valid_consumption_segments(records)
    assert len(segments) == 2
    seg_discharge = segments[0]
    seg_charge = segments[1]

    assert not seg_discharge.is_charging
    assert seg_charge.is_charging
    assert seg_charge.soc_per_km is None
    assert seg_charge.soc_per_hour is None
    assert "charging" in seg_charge.quality_note.lower()

    # The charging segment must NOT contaminate the estimation
    res = estimate_schedule_discharge(
        segments=segments,
        bus_id="BM238",
        route_code="600F",
        target_distance_km=20.0,
        expected_duration_hours=0.833,
        reserve_pct=15.0,
    )
    # Rate should reflect only the discharge segment (12% / 0.833h ≈ 14.4%/hr)
    assert res.soc_per_hour is not None
    assert pytest.approx(res.soc_per_hour, 0.5) == 14.4


def test_charging_only_records_contamination_fallback():
    """Verify fallback when all available records for a bus are charging segments."""
    records = [
        {
            "bus_id": "BM100",
            "route_code": "360K",
            "km": 0.0,
            "soc_start": 40.0,
            "soc_end": 95.0,
            "duration_minutes": 60.0,
        }
    ]
    segments = extract_valid_consumption_segments(records)
    assert segments[0].is_charging

    res = estimate_schedule_discharge(
        segments=segments,
        bus_id="BM100",
        route_code="360K",
        target_distance_km=25.0,
        expected_duration_hours=1.0,
        bus_actual_range_km=110.0,
    )
    assert res.evidence_status == "CHARGING_CONTAMINATED_FALLBACK"
    assert res.time_base_soc_pct is None
    assert "contaminated" in res.limitation_note.lower()
    # Distance model remains valid
    assert res.distance_required_soc_pct > 0


def test_elapsed_vs_actual_driving_time():
    """Verify that layovers/dwell are excluded and elapsed proxy is clearly flagged."""
    records = [
        # Stationary layover: 60 minutes parked, 0 km traveled, minimal SoC change
        {
            "bus_id": "BM238",
            "route_code": "600F",
            "km": 0.0,
            "soc_start": 80.0,
            "soc_end": 79.5,
            "duration_minutes": 60.0,
        },
        # Schedule duration proxy: elapsed time recorded without active driving breakdown
        {
            "bus_id": "BM238",
            "route_code": "600F",
            "km": 30.0,
            "soc_start": 90.0,
            "soc_end": 72.0,
            "elapsed_minutes": 120.0,  # flagged as proxy
        },
    ]
    segments = extract_valid_consumption_segments(records)
    layover_seg = segments[0]
    proxy_seg = segments[1]

    # Layover check
    assert layover_seg.is_layover
    assert layover_seg.soc_per_hour is None  # Not counted as driving rate

    # Proxy check
    assert proxy_seg.is_elapsed_proxy
    assert "proxy" in proxy_seg.quality_note.lower()

    # Estimation using proxy records
    res = estimate_schedule_discharge(
        segments=[proxy_seg],
        bus_id="BM238",
        route_code="600F",
        target_distance_km=30.0,
        expected_duration_hours=2.0,
    )
    assert res.is_elapsed_proxy
    assert res.evidence_status == "ELAPSED_PROXY"
    assert "proxy" in res.limitation_note.lower()


def test_no_double_counting_principle():
    """Verify that distance and time estimates are separate and never summed."""
    records = [
        {
            "bus_id": "BM273",
            "route_code": "600F",
            "km": 40.0,
            "soc_start": 90.0,
            "soc_end": 60.0,  # 30% drop
            "duration_minutes": 120.0,  # 2.0 hrs -> 15% / hr
        }
    ]
    segments = extract_valid_consumption_segments(records)
    res = estimate_schedule_discharge(
        segments=segments,
        bus_id="BM273",
        route_code="600F",
        target_distance_km=40.0,
        expected_duration_hours=2.0,
        reserve_pct=15.0,
        bus_actual_range_km=136.0,
    )

    # Distance requirement = (40 / 136) * 100 + 15 = 29.41 + 15 = 44.41%
    assert pytest.approx(res.distance_required_soc_pct, 0.1) == 44.41

    # Time expectation = 2.0 * 15.0 + 15 = 30.0 + 15 = 45.0%
    assert pytest.approx(res.time_expected_soc_pct, 0.1) == 45.0

    # Ensure warning against double-counting is explicitly present
    assert "must not be added together" in res.double_counting_warning.lower()

    # Verify no naive summation field exists
    assert not hasattr(res, "total_combined_sum_soc")


def test_tier_differentiation_a_b_c():
    """Verify Category A requires less SoC, Category B moderate SoC, Category C high SoC."""
    target_km = 50.0
    hours = 2.0
    reserve = 15.0

    # Tier A (135 km range)
    res_a = estimate_schedule_discharge(
        segments=[],
        bus_id="BM_CAT_A",
        route_code="600F",
        target_distance_km=target_km,
        expected_duration_hours=hours,
        reserve_pct=reserve,
        bus_actual_range_km=135.0,
        bus_category="A",
    )

    # Tier B (110 km range)
    res_b = estimate_schedule_discharge(
        segments=[],
        bus_id="BM_CAT_B",
        route_code="600F",
        target_distance_km=target_km,
        expected_duration_hours=hours,
        reserve_pct=reserve,
        bus_actual_range_km=110.0,
        bus_category="B",
    )

    # Tier C (70 km range)
    res_c = estimate_schedule_discharge(
        segments=[],
        bus_id="BM_CAT_C",
        route_code="600F",
        target_distance_km=target_km,
        expected_duration_hours=hours,
        reserve_pct=reserve,
        bus_actual_range_km=70.0,
        bus_category="C",
    )

    # Tier A < Tier B < Tier C
    assert res_a.distance_required_soc_pct < res_b.distance_required_soc_pct
    assert res_b.distance_required_soc_pct < res_c.distance_required_soc_pct

    # Cat A ~ 52.0%, Cat B ~ 60.5%, Cat C ~ 86.4%
    assert res_a.distance_required_soc_pct < 55.0
    assert 55.0 <= res_b.distance_required_soc_pct <= 65.0
    assert res_c.distance_required_soc_pct > 80.0
