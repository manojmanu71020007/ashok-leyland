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

# ── Depot dispatch safety ─────────────────────────────────────────────────────
# Absolute minimum SoC a bus must have to be eligible for any route assignment.
# Replaces the old hardcoded soc >= 98 gate. A bus below this floor is excluded
# from the eligible pool entirely — it is not just low-priority, it is absent.
DEPOT_MIN_SOC_FLOOR: float = 25.0  # %

# ── Swap hysteresis ───────────────────────────────────────────────────────────
# A challenger bus must beat the incumbent's SoC by strictly more than this to
# trigger a swap. Prevents micro-swaps caused by sensor noise or tiny charge
# fluctuations (e.g. 80% → 82% should not displace an assigned bus).
SWAP_SOC_THRESHOLD: float = 5.0  # %

# ── GTFS file paths (relative to project root) ───────────────────────────────
GTFS_ROUTES_FILE: str = "gtfs/routes.txt"
GTFS_TRIPS_FILE: str = "gtfs/trips.txt"
GTFS_SHAPES_FILE: str = "gtfs/shapes.txt"
