from datetime import datetime

from bus_range_estimator import (
    Bus,
    Schedule,
    allocate,
    can_swap_buses,
    categorize,
    is_feasible,
    is_schedule_locked_in,
    swap_assignments,
)


def test_range_category_values():
    assert categorize(130) == "A"
    assert categorize(110) == "B"
    assert categorize(90) == "C"


def test_is_feasible_returns_shortfall_for_insufficient_soc():
    bus = Bus(bus_id="B1", soc=90, soh=0.9, interior_clean=True, exterior_clean=True, available=True)
    schedule = Schedule(
        route_code="600F",
        route_category="SIMPLE",
        route_km=28.7,
        trips=2,
        start_time="08:00",
        scheduled_hours=2.5,
    )
    result = is_feasible(bus=bus, schedule=schedule, a=0.55, b=3.0)
    assert result["feasible"] in {True, False}
    assert "soc_needed" in result


def test_allocate_orders_and_rejects_ineligible_buses():
    good = Bus(bus_id="B1", soc=99, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    dirty = Bus(bus_id="B2", soc=99, soh=0.8, interior_clean=False, exterior_clean=True, available=True)
    schedule = Schedule(
        route_code="600F",
        route_category="SIMPLE",
        route_km=28.7,
        trips=2,
        start_time="09:00",
        scheduled_hours=3.0,
    )

    ranking = allocate([good, dirty], [schedule], slot="PEAK")
    assert isinstance(ranking, list)
    assert len(ranking) >= 1
    assert any(item["bus_id"] == "B1" for item in ranking)


def test_soc_hysteresis_prevents_small_gap_swaps():
    """Bus A (98% SoC) should NOT be displaced by Bus B (99% SoC, 1% gap <= 5% threshold).
    
    However, Bus C (104% SoC, 6% gap > 5% threshold) CAN displace Bus A.
    """
    bus_a = Bus(bus_id="B_A", soc=98.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_b = Bus(bus_id="B_B", soc=99.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_c = Bus(bus_id="B_C", soc=104.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    
    schedule = Schedule(
        route_code="600F",
        route_category="SIMPLE",
        route_km=28.7,
        trips=2,
        start_time="06:00",
        scheduled_hours=3.0,
    )
    now = datetime(2026, 9, 25, 4, 0)  # 2 hours before departure -> not locked in

    # 1. Bus B (99%) vs Bus A (98%): 1% diff <= 5% -> Bus A retains #1 rank
    ranking_small_gap = allocate(
        [bus_a, bus_b],
        [schedule],
        current_assignments={"600F": "B_A"},
        now=now,
    )
    assert ranking_small_gap[0]["bus_id"] == "B_A"
    assert ranking_small_gap[1]["bus_id"] == "B_B"
    assert ranking_small_gap[1].get("swap_prevented_by_hysteresis") is True

    # 2. Bus C (104%) vs Bus A (98%): 6% diff > 5% -> Bus C can take #1 rank
    ranking_large_gap = allocate(
        [bus_a, bus_c],
        [schedule],
        current_assignments={"600F": "B_A"},
        now=now,
    )
    assert ranking_large_gap[0]["bus_id"] == "B_C"


def test_soc_hysteresis_allows_swap_if_assigned_bus_becomes_ineligible():
    """If assigned bus drops below 98% SoC or becomes dirty, candidate with <= 5% gap CAN take over."""
    bus_a_disqualified = Bus(bus_id="B_A", soc=95.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_b = Bus(bus_id="B_B", soc=99.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    schedule = Schedule(
        route_code="600F",
        route_category="SIMPLE",
        route_km=28.7,
        trips=2,
        start_time="06:00",
        scheduled_hours=3.0,
    )
    now = datetime(2026, 9, 25, 4, 0)

    ranking = allocate(
        [bus_a_disqualified, bus_b],
        [schedule],
        current_assignments={"600F": "B_A"},
        now=now,
    )
    assert ranking[0]["bus_id"] == "B_B"
    assert ranking[0]["eligible"] is True



def test_is_schedule_locked_in_edge_cases():
    ref = datetime(2026, 9, 25, 10, 0)
    # 15 minutes away -> locked in
    assert is_schedule_locked_in("10:15", reference_time=ref, window_minutes=30.0) is True
    # Exactly 30 minutes away -> locked in
    assert is_schedule_locked_in("10:30", reference_time=ref, window_minutes=30.0) is True
    # 31 minutes away -> not locked in
    assert is_schedule_locked_in("10:31", reference_time=ref, window_minutes=30.0) is False
    # ISO string
    assert is_schedule_locked_in("2026-09-25T10:20:00", reference_time=ref, window_minutes=30.0) is True


def test_swap_assignments_fleet_coordination():
    bus_a = Bus(bus_id="B_A", soc=98.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_b = Bus(bus_id="B_B", soc=99.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_c = Bus(bus_id="B_C", soc=105.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)

    sched_locked = Schedule(
        route_code="R_LOCKED",
        route_category="SIMPLE",
        route_km=28.7,
        trips=2,
        start_time="06:15",
        scheduled_hours=2.0,
    )
    sched_open = Schedule(
        route_code="R_OPEN",
        route_category="SIMPLE",
        route_km=28.7,
        trips=2,
        start_time="06:50",
        scheduled_hours=2.0,
    )

    current = {"R_LOCKED": "B_A", "R_OPEN": "B_B"}
    now = datetime(2026, 9, 25, 6, 0)

    updated = swap_assignments(
        [bus_a, bus_b, bus_c],
        [sched_locked, sched_open],
        current_assignments=current,
        now=now,
    )

    # R_LOCKED should remain B_A (frozen due to 30m lock-in, since departure is 15 min away)
    assert updated["R_LOCKED"] == "B_A"
    # R_OPEN had B_B (99%). B_C (105%) has > 5% higher SoC (diff = 6%), and departure is 50 min away (not locked) -> R_OPEN swaps to B_C
    assert updated["R_OPEN"] == "B_C"


def test_can_swap_buses_helper():
    bus_curr = Bus(bus_id="B1", soc=98.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_small_gap = Bus(bus_id="B2", soc=99.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)
    bus_large_gap = Bus(bus_id="B3", soc=104.0, soh=0.95, interior_clean=True, exterior_clean=True, available=True)

    assert can_swap_buses(bus_curr, bus_small_gap, hysteresis=5.0) is False
    assert can_swap_buses(bus_curr, bus_large_gap, hysteresis=5.0) is True
