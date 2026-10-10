"""FastAPI endpoints for telemetry and bus allocation."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import sqlite3
from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI

from .allocator import allocate, swap_assignments
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


def _get_current_bus_soc(bus_id: str) -> float:
    state_file = Path(__file__).resolve().parent.parent / "bus_state.json"
    if state_file.exists():
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
            clean_id = str(bus_id).strip()
            if clean_id in state and isinstance(state[clean_id], dict) and "soc" in state[clean_id]:
                return float(state[clean_id]["soc"])
            for k, v in state.items():
                if isinstance(v, dict):
                    if (
                        str(v.get("busNumber", "")).strip().lower() == clean_id.lower()
                        or state.get("_assignments", {}).get(k, "").strip().lower() == clean_id.lower()
                    ):
                        if "soc" in v:
                            return float(v["soc"])
            digits = "".join(filter(str.isdigit, clean_id))
            if digits and digits in state and isinstance(state[digits], dict) and "soc" in state[digits]:
                return float(state[digits]["soc"])
        except Exception:
            pass
    return 100.0


def _fallback_macro_rows(bus_id: str) -> list[dict[str, Any]]:
    seed = _hash_seed(bus_id)
    base = datetime.utcnow().replace(microsecond=0)
    current_soc = _get_current_bus_soc(bus_id)
    rows: list[dict[str, Any]] = []
    for offset in range(30):
        stamp = (base - timedelta(days=29 - offset)).strftime("%Y-%m-%dT%H:%M:%S")
        slot = "PEAK" if offset % 3 == 0 else "NORMAL"
        km = 28.7
        duration = round(1.4 + ((seed + offset) % 3) * 0.2, 2)
        if offset == 29:
            end_soc = current_soc
            start_soc = min(100.0, current_soc + 15.0)
        else:
            start_soc = min(100.0, 98.0 - ((seed + offset) % 4) * 1.5)
            end_soc = max(15.0, start_soc - (12.0 + ((seed + offset) % 3) * 2.0))
        rows.append(
            {
                "timestamp": stamp,
                "slot": slot,
                "soc_start": round(start_soc, 2),
                "soc_end": round(end_soc, 2),
                "km": km,
                "duration_hours": duration,
            }
        )
    return rows


def _fallback_micro_rows(bus_id: str) -> list[dict[str, Any]]:
    seed = _hash_seed(bus_id)
    base = datetime.utcnow().replace(microsecond=0)
    current_soc = _get_current_bus_soc(bus_id)
    rows: list[dict[str, Any]] = []
    for offset in range(50):
        stamp = (base - timedelta(minutes=49 - offset)).strftime("%Y-%m-%dT%H:%M:%S")
        if offset == 49:
            soc = current_soc
        else:
            drift = (49 - offset) * 0.08 + ((seed + offset) % 3) * 0.1
            soc = min(100.0, max(0.0, current_soc + drift))
        odometer = round(28.7 * max(0.1, (offset + 1) / 50.0), 1)
        rows.append(
            {
                "timestamp": stamp,
                "soc": round(soc, 2),
                "odometer_km": odometer,
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


@app.get("/api/bus/{bus_id}/last-soc")
def get_last_soc(bus_id: str) -> dict:
    """Return the most recent telemetry SoC for a bus, or null if none exists."""
    connection = get_db_connection()
    try:
        row = connection.execute(
            "SELECT soc FROM telemetry_points WHERE bus_id = ? ORDER BY timestamp DESC LIMIT 1",
            (bus_id,),
        ).fetchone()
    finally:
        connection.close()
    if row:
        return {"ok": True, "soc": dict(row)["soc"]}
    return {"ok": False, "soc": None}


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

    current_assignments = payload.get("current_assignments")
    now_str = payload.get("now")
    now_dt = None
    if now_str:
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%H:%M"):
            try:
                now_dt = datetime.strptime(str(now_str).strip(), fmt)
                break
            except ValueError:
                pass

    return {
        "ok": True,
        "allocations": allocate(
            parsed_buses,
            parsed_schedules,
            slot=slot,
            current_assignments=current_assignments,
            now=now_dt,
        ),
    }


@app.post("/swap")
def post_swap(payload: dict[str, Any]) -> dict[str, Any]:
    """Calculate updated assignments with 5% SoC hysteresis guardrail."""
    buses = payload.get("buses", [])
    schedules = payload.get("schedules", [])
    current_assignments = payload.get("current_assignments", {})
    now_str = payload.get("now")
    now_dt = None
    if now_str:
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%H:%M"):
            try:
                now_dt = datetime.strptime(str(now_str).strip(), fmt)
                break
            except ValueError:
                pass

    parsed_buses = [
        Bus(
            bus_id=str(item["bus_id"]),
            soc=float(item.get("soc", 0.0)),
            soh=float(item.get("soh", 0.0)),
            interior_clean=bool(item.get("interior_clean", False)),
            exterior_clean=bool(item.get("exterior_clean", False)),
            available=bool(item.get("available", False)),
        )
        for item in buses
    ]

    parsed_schedules = [
        Schedule(
            route_code=str(item["route_code"]),
            route_category=str(item.get("route_category", "SIMPLE")).upper(),
            route_km=float(item.get("route_km", 0.0)),
            trips=int(item.get("trips", 0)),
            start_time=str(item.get("start_time", "05:00")),
            scheduled_hours=float(item.get("scheduled_hours", 0.0)),
        )
        for item in schedules
    ]

    updated = swap_assignments(
        parsed_buses,
        parsed_schedules,
        current_assignments=current_assignments,
        now=now_dt,
    )
    return {"ok": True, "assignments": updated}



@app.get("/range/{bus_id}")
def get_range(bus_id: str) -> dict[str, Any]:
    """Return planned, live, and blended range estimates for a bus.

    This endpoint is called by server.js on every telemetry update to replace
    the static 1.42 km/% multiplier with historically-fitted coefficients and
    live SOC regression.

    Response fields
    ---------------
    ok              : bool
    bus_id          : str
    soc             : float   — current SoC from telemetry or bus_state.json
    planned_range_km: float   — historical-fit range (always available)
    live_range_km   : float | null — live regression (null if window too small)
    blended_range_km: float   — final estimate used by the swap engine
    range_category  : "A" | "B" | "C"
    """
    from .estimator import blend as _blend, categorize, live_range as _live_range, planned_range as _planned_range
    from .models import TelemetryPoint as _TelPt, TripLog as _TLog

    connection = get_db_connection()
    try:
        # ── Trip history (last 30 days) ───────────────────────────────────────
        macro_rows = connection.execute(
            """
            SELECT bus_id, route_code, slot, soc_start, soc_end, km, duration_hours, timestamp
            FROM trip_logs
            WHERE bus_id = ? AND timestamp >= datetime('now', '-30 days')
            ORDER BY timestamp ASC
            """,
            (bus_id,),
        ).fetchall()

        # ── Live telemetry (last 20 minutes) ─────────────────────────────────
        micro_rows = connection.execute(
            """
            SELECT bus_id, timestamp, soc, odometer_km
            FROM telemetry_points
            WHERE bus_id = ? AND timestamp >= datetime('now', '-20 minutes')
            ORDER BY timestamp ASC
            """,
            (bus_id,),
        ).fetchall()
    finally:
        connection.close()

    # Build TripLog objects
    trip_logs: list[_TLog] = []
    for r in macro_rows:
        d = dict(r)
        try:
            ts = datetime.strptime(d["timestamp"], "%Y-%m-%dT%H:%M:%S")
        except (ValueError, TypeError):
            continue
        trip_logs.append(
            _TLog(
                bus_id=d["bus_id"],
                route_code=d.get("route_code") or "",
                slot=d.get("slot") or "NORMAL",
                soc_start=float(d["soc_start"]),
                soc_end=float(d["soc_end"]),
                km=float(d["km"]),
                duration_hours=float(d["duration_hours"]),
                timestamp=ts,
            )
        )

    # Build TelemetryPoint objects
    telem_points: list[_TelPt] = []
    for r in micro_rows:
        d = dict(r)
        try:
            ts = datetime.strptime(d["timestamp"], "%Y-%m-%dT%H:%M:%S")
        except (ValueError, TypeError):
            continue
        telem_points.append(
            _TelPt(
                bus_id=d["bus_id"],
                timestamp=ts,
                soc=float(d["soc"]),
                odometer_km=float(d["odometer_km"]),
            )
        )

    # Current SoC
    current_soc = _get_current_bus_soc(bus_id)
    if telem_points:
        current_soc = telem_points[-1].soc

    # ── Planned range (historical fit) ────────────────────────────────────────
    p_range = _planned_range(
        trip_logs,
        bus_id=bus_id,
        route_code=None,
        slot=None,
        soc=current_soc,
    )

    # ── Live range (may be None) ──────────────────────────────────────────────
    l_range = _live_range(telem_points) if len(telem_points) >= 5 else None

    # ── Blended range ─────────────────────────────────────────────────────────
    window_min = 0.0
    if l_range is not None and len(telem_points) >= 2:
        window_min = (
            (telem_points[-1].timestamp - telem_points[0].timestamp).total_seconds() / 60.0
        )
    blended = _blend(planned=p_range, live=l_range, window_minutes=window_min)

    return {
        "ok": True,
        "bus_id": bus_id,
        "soc": round(current_soc, 2),
        "planned_range_km": round(p_range, 2),
        "live_range_km": round(l_range, 2) if l_range is not None else None,
        "blended_range_km": round(blended, 2),
        "range_category": categorize(blended),
    }


@app.get("/matrix")
def get_matrix() -> dict[str, Any]:
    """Return the Page 4 Priority Allocation Matrix rules."""
    from .swap_engine import ALLOWED_CATEGORIES, get_slot

    return {
        "ok": True,
        "page": 4,
        "title": "Priority Allocation Matrix",
        "current_slot": get_slot(),
        "bus_range_categories": {
            "A": {"name": "High", "range_km": ">120 km"},
            "B": {"name": "Medium", "range_km": "100-120 km"},
            "C": {"name": "Low", "range_km": "<100 km"},
        },
        "route_categories": {
            "SIMPLE": {"meaning": "Easy to operate", "distance_km": "< 10 km"},
            "MODERATE": {"meaning": "Normal effort", "distance_km": "10 - 20 km"},
            "COMPLEX": {"meaning": "Requires additional planning", "distance_km": ">= 20 km"},
        },
        "time_slots": {
            "NORMAL": "05:00–07:00 (and 23:00–05:00)",
            "EXTREME_PEAK": "07:00–10:00 and 16:00–20:00",
            "PEAK": "10:00–16:00 and 20:00–23:00",
        },
        "allowed_categories": {
            rcat: {slot: sorted(list(cats)) for slot, cats in slots.items()}
            for rcat, slots in ALLOWED_CATEGORIES.items()
        },
    }


@app.post("/swap/resync")
def post_resync_swap(payload: dict[str, Any]) -> dict[str, Any]:
    """Perform global greedy match respecting Page 4 Priority Allocation Matrix."""
    from .gtfs_loader import load_gtfs_routes
    from .swap_engine import resync_assignments, get_slot

    slot = payload.get("slot") or get_slot()
    buses_in = payload.get("buses", [])

    buses = [
        Bus(
            bus_id=str(item["bus_id"]),
            soc=float(item.get("soc", 100.0)),
            soh=float(item.get("soh", 1.0)),
            interior_clean=bool(item.get("interior_clean", True)),
            exterior_clean=bool(item.get("exterior_clean", True)),
            available=bool(item.get("available", True)),
            short_name=str(item.get("short_name", "")),
        )
        for item in buses_in
    ]

    routes_dict = load_gtfs_routes()
    routes_list = list(routes_dict.values())
    assignments_in: dict[str, RouteAssignment] = {}

    updated = resync_assignments(
        buses=buses,
        gtfs_routes=routes_list,
        trip_logs=[],
        telemetry=[],
        assignments=assignments_in,
        slot=slot,
    )

    return {
        "ok": True,
        "slot": slot,
        "assignments": {
            rid: {
                "route_id": a.route_id,
                "assigned_bus_id": a.assigned_bus_id,
                "assigned_short_name": a.assigned_short_name,
                "assigned_category": a.assigned_category,
                "route_category": a.route_category,
                "route_distance_km": a.route_distance_km,
                "expected_range_km": a.expected_range_km,
                "matrix_compliant": a.matrix_compliant,
                "swap_reason": a.swap_reason,
            }
            for rid, a in updated.items()
        },
    }


@app.get("/api/soc/discharge-estimate")
def get_discharge_estimate(
    bus_id: str,
    route_code: str = "600F",
    target_distance_km: float = 28.7,
    expected_duration_hours: float = 1.3,
    shift: str = "",
    slot: str = "NORMAL",
    reserve_pct: float = 15.0,
    bus_category: str = "B",
    bus_actual_range_km: Optional[float] = None,
) -> dict[str, Any]:
    """Calculate dual distance-based and historical time-based SoC estimate for a schedule departure."""
    from .discharge_rate import extract_valid_consumption_segments, estimate_schedule_discharge
    import dataclasses

    conn = get_db_connection()
    raw_records = []
    try:
        rows = conn.execute(
            """
            SELECT bus_id, route_code, slot, soc_start, soc_end, km, duration_hours, timestamp
            FROM trip_logs
            WHERE bus_id = ?
            ORDER BY timestamp DESC
            LIMIT 100
            """,
            (bus_id,),
        ).fetchall()
        for r in rows:
            raw_records.append(dict(r))
    finally:
        conn.close()

    if not raw_records:
        raw_records = _fallback_macro_rows(bus_id)

    segments = extract_valid_consumption_segments(raw_records)
    res = estimate_schedule_discharge(
        segments=segments,
        bus_id=bus_id,
        route_code=route_code,
        target_distance_km=target_distance_km,
        expected_duration_hours=expected_duration_hours,
        shift=shift,
        slot=slot,
        reserve_pct=reserve_pct,
        bus_actual_range_km=bus_actual_range_km,
        bus_category=bus_category,
    )

    return {
        "ok": True,
        "estimate": dataclasses.asdict(res),
    }


@app.get("/api/soc/segments/{bus_id}")
def get_bus_segments(bus_id: str) -> dict[str, Any]:
    """Return parsed non-charging driving segments with soc_per_km and soc_per_hour."""
    from .discharge_rate import extract_valid_consumption_segments
    import dataclasses

    conn = get_db_connection()
    raw_records = []
    try:
        rows = conn.execute(
            """
            SELECT bus_id, route_code, slot, soc_start, soc_end, km, duration_hours, timestamp
            FROM trip_logs
            WHERE bus_id = ?
            ORDER BY timestamp DESC
            LIMIT 100
            """,
            (bus_id,),
        ).fetchall()
        for r in rows:
            raw_records.append(dict(r))
    finally:
        conn.close()

    if not raw_records:
        raw_records = _fallback_macro_rows(bus_id)

    segments = extract_valid_consumption_segments(raw_records)
    return {
        "ok": True,
        "bus_id": bus_id,
        "segments": [dataclasses.asdict(s) for s in segments],
        "valid_driving_segments_count": len([s for s in segments if not s.is_charging and not s.is_layover]),
    }


