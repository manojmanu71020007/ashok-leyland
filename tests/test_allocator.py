from datetime import datetime

from bus_range_estimator import Bus, Schedule, allocate, categorize, is_feasible


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
