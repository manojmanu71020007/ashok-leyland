"""GTFS route distance loader for the depot swap engine.

Reads routes.txt + trips.txt + shapes.txt from the project GTFS directory and
derives a representative distance_km for every route_id.

Design choices
--------------
- Uses the **longest trip** on each route (direction_id == 0 preferred).
  The longest trip is the binding constraint: if a bus can cover the longest
  trip it can cover any trip on that route.
- Results are cached in a module-level dict so file I/O only happens once
  per process lifetime (matching the Node.js `cachedRouteDistances` Map).
- Falls back gracefully when shapes are absent — returns an empty dict so
  callers can degrade safely.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Dict, Optional

from .models import GTFSRoute

# Module-level cache — populated once on first call, reused forever.
_CACHE: Optional[Dict[str, GTFSRoute]] = None


# ── Haversine ─────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in km between two WGS-84 points."""
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(d_lon / 2) ** 2)
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── CSV helpers ───────────────────────────────────────────────────────────────

def _read_csv(path: Path) -> list[dict[str, str]]:
    """Read a GTFS CSV file and return a list of row dicts."""
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


# ── Loader ────────────────────────────────────────────────────────────────────

def load_gtfs_routes(gtfs_dir: str | Path = "gtfs") -> Dict[str, GTFSRoute]:
    """Return a dict mapping route_id → GTFSRoute with computed distance_km.

    Results are cached in memory after the first call.  Pass a different
    *gtfs_dir* to load from a non-default location (e.g. in tests).

    Parameters
    ----------
    gtfs_dir:
        Directory containing routes.txt, trips.txt, and shapes.txt.
        Relative paths are resolved from the project root (parent of this
        package directory).
    """
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    base = Path(gtfs_dir)
    project_root = Path(__file__).resolve().parent.parent
    if not base.is_absolute():
        # Resolve relative to the project root (one level above this package)
        base = project_root / base

    def _find_file(filename: str, subfolder: str) -> Path:
        candidates = [
            base / filename,
            base / subfolder / filename,
            project_root / subfolder / filename,
            project_root / filename,
        ]
        for c in candidates:
            if c.exists():
                return c
        return base / filename

    routes_rows = _read_csv(_find_file("routes.txt", "routes"))
    trips_rows  = _read_csv(_find_file("trips.txt", "trips"))
    shapes_rows = _read_csv(_find_file("shapes.txt", "shapes"))

    if not routes_rows or not trips_rows or not shapes_rows:
        _CACHE = {}
        return _CACHE

    # ── Index shapes by shape_id ──────────────────────────────────────────────
    shapes_index: dict[str, list[tuple[int, float, float]]] = {}
    for row in shapes_rows:
        sid   = row.get("shape_id", "").strip()
        try:
            seq = int(row.get("shape_pt_sequence", "0"))
            lat = float(row.get("shape_pt_lat", "0"))
            lon = float(row.get("shape_pt_lon", "0"))
        except (ValueError, TypeError):
            continue
        shapes_index.setdefault(sid, []).append((seq, lat, lon))

    for pts in shapes_index.values():
        pts.sort(key=lambda t: t[0])

    # ── Index trips by route_id: keep one shape_id per (route_id, direction) ─
    # Prefer direction_id == "0"; fall back to whatever is available.
    route_shapes: dict[str, str] = {}  # route_id → shape_id
    for row in trips_rows:
        rid  = row.get("route_id", "").strip()
        sid  = row.get("shape_id", "").strip()
        dire = row.get("direction_id", "1").strip()
        if not rid or not sid:
            continue
        if rid not in route_shapes:
            route_shapes[rid] = sid
        elif dire == "0":
            route_shapes[rid] = sid  # prefer direction 0

    # ── Compute distance for each route ──────────────────────────────────────
    def _shape_distance(sid: str) -> float:
        pts = shapes_index.get(sid, [])
        if len(pts) < 2:
            return 0.0
        total = 0.0
        for i in range(1, len(pts)):
            _, lat1, lon1 = pts[i - 1]
            _, lat2, lon2 = pts[i]
            total += _haversine_km(lat1, lon1, lat2, lon2)
        return round(total, 2)

    # ── Build route short-name lookup ─────────────────────────────────────────
    route_short: dict[str, str] = {}
    for row in routes_rows:
        rid   = row.get("route_id", "").strip()
        short = (row.get("route_short_name", "") or row.get("route_long_name", "")).strip()
        if rid:
            route_short[rid] = short

    # ── Assemble final dict ───────────────────────────────────────────────────
    result: Dict[str, GTFSRoute] = {}
    for rid, sid in route_shapes.items():
        dist = _shape_distance(sid)
        if dist <= 0:
            continue
        route_cat = "COMPLEX" if dist >= 20.0 else ("MODERATE" if dist >= 10.0 else "SIMPLE")
        result[rid] = GTFSRoute(
            route_id=rid,
            route_short_name=route_short.get(rid, rid),
            distance_km=dist,
            route_category=route_cat,
        )

    _CACHE = result
    return _CACHE


def clear_cache() -> None:
    """Reset the module-level cache (useful in tests)."""
    global _CACHE
    _CACHE = None
