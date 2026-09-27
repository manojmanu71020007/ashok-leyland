from datetime import datetime

from bus_range_estimator.models import Bus, GTFSRoute, RouteAssignment
from bus_range_estimator.swap_engine import (
    ALLOWED_CATEGORIES,
    get_route_category,
    get_slot,
    is_bus_category_allowed,
    resync_assignments,
)


def test_page4_time_slots():
    """Verify time slot categories match Page 4:
    05:00-07:00 -> Normal
    07:00-10:00 -> Extreme Peak
    10:00-16:00 -> Peak
    16:00-20:00 -> Extreme Peak
    20:00-23:00 -> Peak
    """
    assert get_slot(5) == "NORMAL"
    assert get_slot(6) == "NORMAL"
    assert get_slot(7) == "EXTREME_PEAK"
    assert get_slot(9) == "EXTREME_PEAK"
    assert get_slot(10) == "PEAK"
    assert get_slot(15) == "PEAK"
    assert get_slot(16) == "EXTREME_PEAK"
    assert get_slot(19) == "EXTREME_PEAK"
    assert get_slot(20) == "PEAK"
    assert get_slot(22) == "PEAK"
    assert get_slot(23) == "NORMAL"
    assert get_slot(2) == "NORMAL"


def test_page4_matrix_allowed_categories():
    """Verify Page 4 Priority Allocation Matrix rules."""
    # Simple Route
    assert is_bus_category_allowed("A", "SIMPLE", "NORMAL") is True
    assert is_bus_category_allowed("B", "SIMPLE", "NORMAL") is True
    assert is_bus_category_allowed("C", "SIMPLE", "NORMAL") is True
    assert is_bus_category_allowed("A", "SIMPLE", "PEAK") is True
    assert is_bus_category_allowed("B", "SIMPLE", "PEAK") is True
    assert is_bus_category_allowed("C", "SIMPLE", "PEAK") is False
    assert is_bus_category_allowed("A", "SIMPLE", "EXTREME_PEAK") is True
    assert is_bus_category_allowed("B", "SIMPLE", "EXTREME_PEAK") is True
    assert is_bus_category_allowed("C", "SIMPLE", "EXTREME_PEAK") is False

    # Moderate Route
    assert is_bus_category_allowed("A", "MODERATE", "NORMAL") is True
    assert is_bus_category_allowed("B", "MODERATE", "NORMAL") is True
    assert is_bus_category_allowed("C", "MODERATE", "NORMAL") is False
    assert is_bus_category_allowed("A", "MODERATE", "PEAK") is True
    assert is_bus_category_allowed("B", "MODERATE", "PEAK") is False
    assert is_bus_category_allowed("A", "MODERATE", "EXTREME_PEAK") is True
    assert is_bus_category_allowed("B", "MODERATE", "EXTREME_PEAK") is False

    # Complex Route
    assert is_bus_category_allowed("A", "COMPLEX", "NORMAL") is True
    assert is_bus_category_allowed("B", "COMPLEX", "NORMAL") is False
    assert is_bus_category_allowed("A", "COMPLEX", "PEAK") is True
    assert is_bus_category_allowed("B", "COMPLEX", "PEAK") is False
    assert is_bus_category_allowed("A", "COMPLEX", "EXTREME_PEAK") is True
    assert is_bus_category_allowed("B", "COMPLEX", "EXTREME_PEAK") is False


def test_route_category_classification():
    assert get_route_category(35.0) == "COMPLEX"
    assert get_route_category(20.0) == "COMPLEX"
    assert get_route_category(15.0) == "MODERATE"
    assert get_route_category(10.0) == "MODERATE"
    assert get_route_category(5.0) == "SIMPLE"
    assert get_route_category(1.5) == "SIMPLE"


def test_swap_engine_extreme_peak_complex_prioritizes_category_a():
    """In Extreme Peak on a Complex Route, the swap engine prioritizes Category A bus (>120 km)."""
    # Bus A: 100% SoC -> >120 km range (Category A)
    bus_a = Bus(bus_id="EV-01", soc=100.0, soh=1.0, interior_clean=True, exterior_clean=True, available=True)
    # Bus B: 85% SoC -> ~106 km range (Category B)
    bus_b = Bus(bus_id="EV-02", soc=85.0, soh=1.0, interior_clean=True, exterior_clean=True, available=True)

    complex_route = GTFSRoute(route_id="R-COMPLEX", route_short_name="401-AM", distance_km=30.0, route_category="COMPLEX")
    simple_route = GTFSRoute(route_id="R-SIMPLE", route_short_name="D9-PSS", distance_km=5.0, route_category="SIMPLE")

    assignments: dict[str, RouteAssignment] = {}
    res = resync_assignments(
        buses=[bus_a, bus_b],
        gtfs_routes=[complex_route, simple_route],
        trip_logs=[],
        telemetry=[],
        assignments=assignments,
        slot="EXTREME_PEAK",
    )

    # Complex route gets Category A bus (EV-01)
    assert res["R-COMPLEX"].assigned_bus_id == "EV-01"
    assert res["R-COMPLEX"].assigned_category == "A"
    assert res["R-COMPLEX"].matrix_compliant is True

    # Simple route gets Category B bus (EV-02)
    assert res["R-SIMPLE"].assigned_bus_id == "EV-02"
    assert res["R-SIMPLE"].assigned_category == "B"
    assert res["R-SIMPLE"].matrix_compliant is True


def test_swap_engine_normal_slot_simple_route_conserves_category_a():
    """In Normal / Off-peak (05:00-07:00), a Simple Route can take Category B or C, conserving Category A."""
    bus_cat_a = Bus(bus_id="EV-CAT-A", soc=100.0, soh=1.0, interior_clean=True, exterior_clean=True, available=True)
    bus_cat_b = Bus(bus_id="EV-CAT-B", soc=85.0, soh=1.0, interior_clean=True, exterior_clean=True, available=True)

    simple_route = GTFSRoute(route_id="R-SIMPLE", route_short_name="D9-PSS", distance_km=5.0, route_category="SIMPLE")

    assignments: dict[str, RouteAssignment] = {}
    res = resync_assignments(
        buses=[bus_cat_a, bus_cat_b],
        gtfs_routes=[simple_route],
        trip_logs=[],
        telemetry=[],
        assignments=assignments,
        slot="NORMAL",
    )

    # Simple route during Normal hours chooses Category B bus, conserving Category A
    assert res["R-SIMPLE"].assigned_bus_id == "EV-CAT-B"
    assert res["R-SIMPLE"].assigned_category == "B"
    assert res["R-SIMPLE"].matrix_compliant is True


def test_swap_engine_matrix_upgrade_immediate_swap():
    """If an incumbent on a Complex route is Category B during Extreme Peak,
    a Category A challenger takes over immediately without requiring >5% SoC difference."""
    # Incumbent Bus B: Category B (e.g. 85% SoC)
    bus_b = Bus(bus_id="EV-02", soc=85.0, soh=1.0, interior_clean=True, exterior_clean=True, available=True)
    # Challenger Bus A: Category A (e.g. 100% SoC)
    bus_a = Bus(bus_id="EV-01", soc=100.0, soh=1.0, interior_clean=True, exterior_clean=True, available=True)

    complex_route = GTFSRoute(route_id="R-COMPLEX", route_short_name="401-AM", distance_km=25.0, route_category="COMPLEX")

    # Incumbent was previously EV-02
    assignments = {
        "R-COMPLEX": RouteAssignment(
            route_id="R-COMPLEX",
            route_distance_km=25.0,
            assigned_bus_id="EV-02",
            assigned_short_name="EV-02",
            assigned_category="B",
            expected_range_km=106.0,
            last_swap_soc=85.0,
            matrix_compliant=False,
        )
    }

    res = resync_assignments(
        buses=[bus_a, bus_b],
        gtfs_routes=[complex_route],
        trip_logs=[],
        telemetry=[],
        assignments=assignments,
        slot="EXTREME_PEAK",
    )

    # Must swap immediately to EV-01 to restore Page 4 matrix compliance
    assert res["R-COMPLEX"].assigned_bus_id == "EV-01"
    assert res["R-COMPLEX"].assigned_category == "A"
    assert res["R-COMPLEX"].matrix_compliant is True
    assert "Page 4 Matrix Compliance" in res["R-COMPLEX"].swap_reason
