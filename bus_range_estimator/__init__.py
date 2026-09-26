"""Electric bus depot scheduling range estimator package."""

from .allocator import (
    SOC_HYSTERESIS_PERCENT,
    allocate,
    can_swap_buses,
    categorize,
    is_feasible,
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
    "SOC_HYSTERESIS_PERCENT",
    "DEFAULTS",
]

