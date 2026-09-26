"""Electric bus depot scheduling range estimator package."""

from .allocator import (
    LOCK_IN_WINDOW_MINUTES,
    SOC_HYSTERESIS_PERCENT,
    allocate,
    can_swap_buses,
    categorize,
    is_feasible,
    is_schedule_locked_in,
    swap_assignments,
)
from .config import DEFAULTS
from .estimator import blend, fit_coefficients, live_range, planned_range
from .models import Bus, Schedule, TelemetryPoint, TripLog

__all__ = [
    "TripLog",
    "TelemetryPoint",
    "Bus",
    "Schedule",
    "fit_coefficients",
    "planned_range",
    "live_range",
    "blend",
    "categorize",
    "is_feasible",
    "allocate",
    "swap_assignments",
    "can_swap_buses",
    "is_schedule_locked_in",
    "SOC_HYSTERESIS_PERCENT",
    "LOCK_IN_WINDOW_MINUTES",
    "DEFAULTS",
]

