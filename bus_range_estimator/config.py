"""Configuration values for the depot scheduling estimator."""

from __future__ import annotations


class Defaults:
    """Default constants used throughout the range estimation math."""

    reserve_soc_percent: float = 10.0
    min_history_trips: int = 10
    half_life_days: float = 14.0
    default_a: float = 0.55
    default_b: float = 3.0
    minimum_drain_per_hour: float = 0.05
    safety_margin: float = 1.10
    live_window_minutes: int = 20
    minimum_live_points: int = 5
    minimum_live_span_minutes: int = 5
    range_category_a: float = 120.0
    range_category_b: float = 100.0


DEFAULTS = Defaults()
