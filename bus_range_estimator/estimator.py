"""Range estimation logic for depot scheduling."""

from __future__ import annotations

from datetime import datetime
from math import isclose
from typing import Iterable, Optional

import numpy as np

from .config import DEFAULTS
from .models import TelemetryPoint, TripLog


def _safe_float(value: float, default: float = 0.0) -> float:
    """Return a float value or a safe default when invalid."""
    try:
        numeric = float(value)
        if np.isnan(numeric) or np.isinf(numeric):
            return default
        return numeric
    except (TypeError, ValueError):
        return default


def fit_coefficients(history: Iterable[TripLog], *, default_a: float = DEFAULTS.default_a, default_b: float = DEFAULTS.default_b) -> tuple[float, float]:
    """Fit planned range coefficients from historical trip logs.

    The coefficient model is delta_soc = a * km + b * hours. For route-and-slot
    historical data, recent trips are weighted with an exponential decay using a
    half-life of 14 days. If fewer than 10 trips are available, the defaults are
    returned.
    """
    rows = list(history)
    if len(rows) < DEFAULTS.min_history_trips:
        return default_a, default_b

    xs = []
    ys = []
    weights = []
    now = datetime.utcnow()

    for row in rows:
        if row.duration_hours <= 0 or row.km <= 0:
            continue
        delta_soc = max(0.0, abs(float(row.soc_start) - float(row.soc_end)))
        age_days = max(0.0, (now - row.timestamp).total_seconds() / 86400.0)
        weight = np.exp(np.log(0.5) * (age_days / DEFAULTS.half_life_days))
        xs.append([float(row.km), float(row.duration_hours)])
        ys.append(delta_soc)
        weights.append(weight)

    if len(xs) < DEFAULTS.min_history_trips:
        return default_a, default_b

    x_array = np.asarray(xs, dtype=float)
    y_array = np.asarray(ys, dtype=float)
    w_array = np.asarray(weights, dtype=float)

    weighted_x = x_array * np.sqrt(w_array)[:, None]
    weighted_y = y_array * np.sqrt(w_array)

    try:
        coefficients, *_ = np.linalg.lstsq(weighted_x, weighted_y, rcond=None)
    except np.linalg.LinAlgError:
        return default_a, default_b

    a = max(0.0, float(coefficients[0]))
    b = max(0.0, float(coefficients[1]))
    if np.isnan(a) or np.isnan(b) or np.isinf(a) or np.isinf(b):
        return default_a, default_b

    return a, b


def _route_speed(history: Iterable[TripLog], route_code: str, slot: str) -> float:
    """Return the average historical speed in km/h for a route and slot."""
    matched = []
    for row in history:
        if row.route_code == route_code and row.slot == slot and row.duration_hours > 0:
            matched.append(float(row.km) / float(row.duration_hours))
    if not matched:
        return 25.0
    return float(np.mean(matched))


def planned_range(
    history: Iterable[TripLog],
    *,
    bus_id: Optional[str] = None,
    route_code: Optional[str] = None,
    slot: Optional[str] = None,
    soc: float = 100.0,
    reserve: float = DEFAULTS.reserve_soc_percent,
    default_a: float = DEFAULTS.default_a,
    default_b: float = DEFAULTS.default_b,
) -> float:
    """Estimate the planned depot range for the next dispatch.

    The historical fit is formed per (route_code, slot), falling back to per bus,
    then to global defaults. When there are not enough records, the defaults are
    used. The result is the available SOC adjusted by the fitted drain model.
    """
    rows = list(history)
    if not rows:
        return soc - reserve

    if route_code and slot:
        route_rows = [row for row in rows if row.route_code == route_code and row.slot == slot]
        if len(route_rows) >= DEFAULTS.min_history_trips:
            a, b = fit_coefficients(route_rows, default_a=default_a, default_b=default_b)
            v = _route_speed(route_rows, route_code, slot)
            soc_avail = max(0.0, soc - float(reserve))
            denom = a + (b / v) if v > 0 else a
            return soc_avail / denom if denom > 0 else soc_avail

    if bus_id:
        bus_rows = [row for row in rows if row.bus_id == bus_id]
        if len(bus_rows) >= DEFAULTS.min_history_trips:
            a, b = fit_coefficients(bus_rows, default_a=default_a, default_b=default_b)
            v = np.mean([float(row.km) / max(float(row.duration_hours), 1e-6) for row in bus_rows if row.duration_hours > 0]) or 25.0
            soc_avail = max(0.0, soc - float(reserve))
            denom = a + (b / v) if v > 0 else a
            return soc_avail / denom if denom > 0 else soc_avail

    a, b = default_a, default_b
    v = 25.0
    soc_avail = max(0.0, soc - float(reserve))
    denom = a + (b / v) if v > 0 else a
    return soc_avail / denom if denom > 0 else soc_avail


def live_range(
    telemetry: Iterable[TelemetryPoint],
    *,
    reserve: float = DEFAULTS.reserve_soc_percent,
    min_points: int = DEFAULTS.minimum_live_points,
    min_span_minutes: int = DEFAULTS.minimum_live_span_minutes,
) -> Optional[float]:
    """Estimate the live range using recent SOC drift over time.

    Returns None when the telemetry window is too small or the data is invalid.
    """
    points = sorted(telemetry, key=lambda point: point.timestamp)
    if len(points) < min_points:
        return None

    window_minutes = (points[-1].timestamp - points[0].timestamp).total_seconds() / 60.0
    if window_minutes < min_span_minutes:
        return None

    soc_values = np.asarray([float(point.soc) for point in points], dtype=float)
    time_minutes = np.asarray([
        (point.timestamp - points[0].timestamp).total_seconds() / 60.0 for point in points
    ], dtype=float)

    if time_minutes.size < 2:
        return None

    slope, _ = np.polyfit(time_minutes, soc_values, 1)
    drain_per_hour = -slope * 60.0
    if drain_per_hour <= DEFAULTS.minimum_drain_per_hour:
        return None

    soc_remaining = max(0.0, float(points[-1].soc) - float(reserve))
    hours_remaining = soc_remaining / drain_per_hour
    v_avg_recent = 0.0
    if len(points) > 1:
        odometer_values = np.asarray([float(point.odometer_km) for point in points], dtype=float)
        if np.any(np.diff(odometer_values) < 0):
            odometer_values = np.maximum.accumulate(odometer_values)
        speed_values = np.diff(odometer_values) / np.maximum(np.diff(time_minutes), 1e-6)
        v_avg_recent = float(np.mean(speed_values)) if speed_values.size else 0.0

    if v_avg_recent <= 0:
        v_avg_recent = 25.0
    return max(0.0, hours_remaining * v_avg_recent)


def blend(*, planned: float, live: Optional[float], window_minutes: float = DEFAULTS.live_window_minutes) -> float:
    """Blend planned and live range estimates using the configured alpha weight."""
    if live is None:
        return planned

    alpha = 0.8 * min(1.0, window_minutes / DEFAULTS.live_window_minutes)
    return float(alpha * live + (1.0 - alpha) * planned)


def categorize(range_km: float) -> str:
    """Return the route range category as A, B, or C."""
    if range_km > DEFAULTS.range_category_a:
        return "A"
    if range_km >= DEFAULTS.range_category_b and range_km <= DEFAULTS.range_category_a:
        return "B"
    return "C"
