"""Synthetic demo for the EV bus range estimator package."""

from __future__ import annotations

from datetime import datetime, timedelta

from .allocator import allocate
from .models import Bus, Schedule, TelemetryPoint, TripLog


def generate_demo_logs() -> list[TripLog]:
    """Generate 30 days of synthetic trip logs for 10 buses on route 600F."""
    logs: list[TripLog] = []
    now = datetime.utcnow()
    route_code = "600F"

    for bus_index in range(1, 11):
        for day in range(30):
            for trip in range(4):
                base = now - timedelta(days=day, hours=trip * 3)
                soc_start = 98 - (day % 4) * 1.2 - trip * 0.5
                soc_end = soc_start - 12.0 if trip % 2 else soc_start - 8.0
                logs.append(
                    TripLog(
                        bus_id=f"B{bus_index}",
                        route_code=route_code,
                        slot="PEAK" if trip in {1, 2} else "NORMAL",
                        soc_start=soc_start,
                        soc_end=soc_end,
                        km=28.7,
                        duration_hours=1.2,
                        timestamp=base,
                    )
                )
    return logs


def run_demo() -> None:
    """Generate sample allocation data and print a compact table."""
    logs = generate_demo_logs()
    buses = [
        Bus(bus_id=f"B{i}", soc=99, soh=0.95, interior_clean=True, exterior_clean=True, available=True, history=logs)
        for i in range(1, 11)
    ]
    schedule = Schedule(route_code="600F", route_category="SIMPLE", route_km=28.7, trips=2, start_time="09:00", scheduled_hours=3.0)
    results = allocate(buses, [schedule], slot="PEAK")
    print("Bus allocation demo")
    print("=" * 60)
    for item in results:
        print(item)


if __name__ == "__main__":
    run_demo()
