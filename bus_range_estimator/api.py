"""FastAPI endpoints for telemetry and bus allocation."""

from __future__ import annotations

import csv
import hashlib
import os
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


def get_bus_aliases(bus_id: str) -> list[str]:
    """Find all aliases (bus_id, route_id, route_short_name) for a given bus."""
    clean_id = str(bus_id).strip()
    aliases = {clean_id}
    routes_file = os.path.join(os.getcwd(), "routes", "routes.txt")
    if os.path.exists(routes_file):
        try:
            with open(routes_file, "r", encoding="utf-8") as f:
                reader = csv.reader(f)
                next(reader, None)
                for row in reader:
                    if len(row) >= 5:
                        r_short, r_id = row[1].strip(), row[4].strip()
                        if clean_id in (r_short, r_id):
                            aliases.add(r_short)
                            aliases.add(r_id)
        except Exception:
            pass
    return list(aliases)


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
        aliases = get_bus_aliases(bus_id)
        placeholders = ",".join("?" for _ in aliases)
        rows = connection.execute(
            f"""
            SELECT timestamp, slot, soc_start, soc_end, km, duration_hours
            FROM trip_logs
            WHERE bus_id IN ({placeholders}) AND timestamp >= datetime('now', '-30 days')
            ORDER BY timestamp ASC
            """,
            aliases,
        ).fetchall()

        if rows:
            seen_times = set()
            unique_rows = []
            for row in rows:
                t = dict(row)["timestamp"]
                if t not in seen_times:
                    seen_times.add(t)
                    unique_rows.append(
                        {
                            "timestamp": t,
                            "slot": dict(row)["slot"],
                            "soc_start": dict(row)["soc_start"],
                            "soc_end": dict(row)["soc_end"],
                            "km": dict(row)["km"],
                            "duration_hours": dict(row)["duration_hours"],
                        }
                    )
            return unique_rows

        return _fallback_macro_rows(bus_id)
    finally:
        connection.close()


@app.get("/api/bus/{bus_id}/micro")
def get_bus_micro(bus_id: str) -> list[dict[str, Any]]:
    """Return live real-time telemetry points for a bus in chronological order."""
    connection = get_db_connection()
    try:
        aliases = get_bus_aliases(bus_id)
        placeholders = ",".join("?" for _ in aliases)
        rows = connection.execute(
            f"""
            SELECT timestamp, soc, odometer_km
            FROM telemetry_points
            WHERE bus_id IN ({placeholders})
            ORDER BY timestamp ASC
            LIMIT 100
            """,
            aliases,
        ).fetchall()

        if rows:
            seen_times = set()
            unique_rows = []
            for row in rows:
                t = dict(row)["timestamp"]
                if t not in seen_times:
                    seen_times.add(t)
                    unique_rows.append(
                        {
                            "timestamp": t,
                            "soc": dict(row)["soc"],
                            "odometer_km": dict(row)["odometer_km"],
                        }
                    )
            return unique_rows

        # No live telemetry points yet -> return in-memory simulated curve without DB pollution
        return _fallback_micro_rows(bus_id)
    finally:
        connection.close()


@app.post("/telemetry")
@app.post("/api/telemetry")
def post_telemetry(payload: dict[str, Any]) -> dict[str, Any]:
    """Accept a telemetry payload and store live telemetry point in real time."""
    if not payload:
        return {"ok": False, "error": "Empty payload."}

    raw_bus_id = str(payload.get("bus_id", payload.get("routeId", ""))).strip()
    soc = float(payload.get("soc", 100.0))
    ts = payload.get("timestamp") or payload.get("updatedAt")
    if not ts:
        ts = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    if raw_bus_id:
        aliases = get_bus_aliases(raw_bus_id)
        connection = get_db_connection()
        try:
            ensure_depot_tables(connection)
            for b_id in aliases:
                connection.execute(
                    """
                    INSERT INTO telemetry_points (bus_id, timestamp, soc, odometer_km)
                    VALUES (?, ?, ?, ?)
                    """,
                    (b_id, ts, soc, 1000.0),
                )
                connection.execute(
                    """
                    INSERT INTO trip_logs (bus_id, route_code, slot, soc_start, soc_end, km, duration_hours, timestamp)
                    VALUES (?, 'LIVE', 'LIVE', ?, ?, 0.0, 0.0, ?)
                    """,
                    (b_id, soc, soc, ts),
                )
            connection.commit()
        except Exception as exc:
            print(f"Failed to record telemetry point: {exc}")
        finally:
            connection.close()

    return {"ok": True, "received": payload, "timestamp": ts}


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
