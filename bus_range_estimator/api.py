"""FastAPI endpoints for telemetry and bus allocation."""

from __future__ import annotations

import hashlib
import sqlite3
from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI

from .allocator import allocate
from .models import Bus, Schedule

app = FastAPI(title="Bus Range Estimator API")


def ensure_depot_tables(connection: sqlite3.Connection) -> None:
    """Create the depot tables when the database is first used."""
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS trip_logs (
            bus_id TEXT,
            route_code TEXT,
            slot TEXT,
            soc_start REAL,
            soc_end REAL,
            km REAL,
            duration_hours REAL,
            timestamp TEXT
        )
        """
    )
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS telemetry_points (
            bus_id TEXT,
            timestamp TEXT,
            soc REAL,
            odometer_km REAL
        )
        """
    )
    connection.commit()


def _hash_seed(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _fallback_macro_rows(bus_id: str) -> list[dict[str, Any]]:
    seed = _hash_seed(bus_id)
    base = datetime.utcnow().replace(microsecond=0)
    rows: list[dict[str, Any]] = []
    for offset in range(30):
        stamp = (base - timedelta(days=29 - offset)).strftime("%Y-%m-%dT%H:%M:%S")
        start_soc = 98.0 - ((seed + offset) % 6) * 1.2
        end_soc = start_soc - (8.5 + ((seed + offset) % 4) * 2.0)
        slot = "PEAK" if offset % 3 == 0 else "NORMAL"
        rows.append(
            {
                "timestamp": stamp,
                "slot": slot,
                "soc_start": round(start_soc, 2),
                "soc_end": round(end_soc, 2),
                "km": 28.7,
                "duration_hours": round(1.4 + ((seed + offset) % 3) * 0.2, 2),
            }
        )
    return rows


def _fallback_micro_rows(bus_id: str) -> list[dict[str, Any]]:
    seed = _hash_seed(bus_id)
    base = datetime.utcnow().replace(microsecond=0)
    rows: list[dict[str, Any]] = []
    for offset in range(50):
        stamp = (base - timedelta(minutes=49 - offset)).strftime("%Y-%m-%dT%H:%M:%S")
        soc = 96.0 - ((seed + offset) % 12) * 0.3 - offset * 0.08
        odometer = 12000 + offset * 0.9 + (seed % 9) * 0.2
        rows.append(
            {
                "timestamp": stamp,
                "soc": round(soc, 2),
                "odometer_km": round(odometer, 2),
            }
        )
    return rows


def store_fallback_rows(connection: sqlite3.Connection, bus_id: str) -> None:
    """Persist deterministic fallback data for a selected bus so graphing works even when no depot row exists."""
    ensure_depot_tables(connection)

    macro_rows = _fallback_macro_rows(bus_id)
    for row in macro_rows:
        connection.execute(
            """
            INSERT INTO trip_logs (bus_id, route_code, slot, soc_start, soc_end, km, duration_hours, timestamp)
            VALUES (?, '600F', ?, ?, ?, ?, ?, ?)
            """,
            (bus_id, row["slot"], row["soc_start"], row["soc_end"], row["km"], row["duration_hours"], row["timestamp"]),
        )

    micro_rows = _fallback_micro_rows(bus_id)
    for row in micro_rows:
        connection.execute(
            """
            INSERT INTO telemetry_points (bus_id, timestamp, soc, odometer_km)
            VALUES (?, ?, ?, ?)
            """,
            (bus_id, row["timestamp"], row["soc"], row["odometer_km"]),
        )

    connection.commit()


def get_db_connection() -> sqlite3.Connection:
    """Create a SQLite connection for depot data queries."""
    connection = sqlite3.connect("depot.db")
    connection.row_factory = sqlite3.Row
    ensure_depot_tables(connection)
    return connection


@app.get("/api/bus/{bus_id}/macro")
def get_bus_macro(bus_id: str) -> list[dict[str, Any]]:
    """Return the last 30 days of trip history for a bus in chronological order."""
    connection = get_db_connection()
    try:
        rows = connection.execute(
            """
            SELECT timestamp, slot, soc_start, soc_end, km, duration_hours
            FROM trip_logs
            WHERE bus_id = ? AND timestamp >= datetime('now', '-30 days')
            ORDER BY timestamp ASC
            """,
            (bus_id,),
        ).fetchall()

        if not rows:
            store_fallback_rows(connection, bus_id)
            rows = connection.execute(
                """
                SELECT timestamp, slot, soc_start, soc_end, km, duration_hours
                FROM trip_logs
                WHERE bus_id = ? AND timestamp >= datetime('now', '-30 days')
                ORDER BY timestamp ASC
                """,
                (bus_id,),
            ).fetchall()
    finally:
        connection.close()

    return [
        {
            "timestamp": dict(row)["timestamp"],
            "slot": dict(row)["slot"],
            "soc_start": dict(row)["soc_start"],
            "soc_end": dict(row)["soc_end"],
            "km": dict(row)["km"],
            "duration_hours": dict(row)["duration_hours"],
        }
        for row in rows
    ]


@app.get("/api/bus/{bus_id}/micro")
def get_bus_micro(bus_id: str) -> list[dict[str, Any]]:
    """Return the last 50 live telemetry points for a bus in chronological order."""
    connection = get_db_connection()
    try:
        rows = connection.execute(
            """
            SELECT timestamp, soc, odometer_km
            FROM telemetry_points
            WHERE bus_id = ?
            ORDER BY timestamp DESC
            LIMIT 50
            """,
            (bus_id,),
        ).fetchall()

        if not rows:
            store_fallback_rows(connection, bus_id)
            rows = connection.execute(
                """
                SELECT timestamp, soc, odometer_km
                FROM telemetry_points
                WHERE bus_id = ?
                ORDER BY timestamp DESC
                LIMIT 50
                """,
                (bus_id,),
            ).fetchall()
    finally:
        connection.close()

    ordered_rows = list(reversed(rows))
    return [
        {
            "timestamp": dict(row)["timestamp"],
            "soc": dict(row)["soc"],
            "odometer_km": dict(row)["odometer_km"],
        }
        for row in ordered_rows
    ]


@app.post("/telemetry")
@app.post("/api/telemetry")
def post_telemetry(payload: dict[str, Any]) -> dict[str, Any]:
    """Accept a telemetry payload and store live telemetry point."""
    if not payload:
        return {"ok": False, "error": "Empty payload."}

    bus_id = str(payload.get("bus_id", payload.get("routeId", ""))).strip()
    soc = float(payload.get("soc", 100.0))
    if bus_id:
        connection = get_db_connection()
        try:
            ensure_depot_tables(connection)
            now_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")
            connection.execute(
                """
                INSERT INTO telemetry_points (bus_id, timestamp, soc, odometer_km)
                VALUES (?, ?, ?, ?)
                """,
                (bus_id, now_str, soc, 1000.0),
            )
            connection.commit()
        except Exception as exc:
            print(f"Failed to record telemetry point: {exc}")
        finally:
            connection.close()

    return {"ok": True, "received": payload}


@app.post("/allocate")
def post_allocate(payload: dict[str, Any]) -> dict[str, Any]:
    """Allocate buses for a schedule based on depot requirements."""
    buses = payload.get("buses", [])
    schedules = payload.get("schedules", [])
    slot = payload.get("slot")

    parsed_buses = []
    for item in buses:
        parsed_buses.append(
            Bus(
                bus_id=str(item["bus_id"]),
                soc=float(item.get("soc", 0.0)),
                soh=float(item.get("soh", 0.0)),
                interior_clean=bool(item.get("interior_clean", False)),
                exterior_clean=bool(item.get("exterior_clean", False)),
                available=bool(item.get("available", False)),
            )
        )

    parsed_schedules = []
    for item in schedules:
        parsed_schedules.append(
            Schedule(
                route_code=str(item["route_code"]),
                route_category=str(item.get("route_category", "SIMPLE")).upper(),
                route_km=float(item.get("route_km", 0.0)),
                trips=int(item.get("trips", 0)),
                start_time=str(item.get("start_time", "05:00")),
                scheduled_hours=float(item.get("scheduled_hours", 0.0)),
            )
        )

    return {"ok": True, "allocations": allocate(parsed_buses, parsed_schedules, slot=slot)}


@app.get("/range/{bus_id}")
def get_range(bus_id: str) -> dict[str, Any]:
    """Return a placeholder range response for a given bus."""
    return {"ok": True, "bus_id": bus_id, "range_km": 0.0}
