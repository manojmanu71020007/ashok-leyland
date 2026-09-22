from datetime import datetime, timedelta

from bus_range_estimator import (
    TripLog,
    TelemetryPoint,
    blend,
    fit_coefficients,
    live_range,
    planned_range,
)


def test_fit_coefficients_uses_defaults_for_small_history():
    history = []
    a, b = fit_coefficients(history)
    assert a == 0.55
    assert b == 3.0


def test_planned_range_with_current_data():
    now = datetime.utcnow()
    history = [
        TripLog(
            bus_id="B1",
            route_code="600F",
            slot="NORMAL",
            soc_start=98,
            soc_end=82,
            km=28.7,
            duration_hours=1.25,
            timestamp=now - timedelta(days=2),
        ),
        TripLog(
            bus_id="B1",
            route_code="600F",
            slot="NORMAL",
            soc_start=96,
            soc_end=80,
            km=28.7,
            duration_hours=1.3,
            timestamp=now - timedelta(days=1),
        ),
        TripLog(
            bus_id="B1",
            route_code="600F",
            slot="NORMAL",
            soc_start=95,
            soc_end=78,
            km=28.7,
            duration_hours=1.2,
            timestamp=now,
        ),
    ]

    value = planned_range(history, bus_id="B1", route_code="600F", slot="NORMAL", soc=98, reserve=10)
    assert value > 0
    assert value < 200


def test_live_range_handles_recent_telemetry():
    now = datetime.utcnow()
    points = [
        TelemetryPoint(bus_id="B1", timestamp=now - timedelta(minutes=20), soc=98.0, odometer_km=1000),
        TelemetryPoint(bus_id="B1", timestamp=now - timedelta(minutes=15), soc=96.0, odometer_km=1005),
        TelemetryPoint(bus_id="B1", timestamp=now - timedelta(minutes=10), soc=94.0, odometer_km=1010),
        TelemetryPoint(bus_id="B1", timestamp=now - timedelta(minutes=6), soc=92.0, odometer_km=1014),
        TelemetryPoint(bus_id="B1", timestamp=now - timedelta(minutes=2), soc=90.0, odometer_km=1018),
    ]
    value = live_range(points, reserve=10)
    assert value is not None
    assert value > 0


def test_blend_returns_planned_when_no_live_data():
    planned = 120.0
    result = blend(planned=planned, live=None, window_minutes=0)
    assert result == planned
