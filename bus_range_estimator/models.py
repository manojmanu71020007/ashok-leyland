"""Core data models for the electric bus range estimator."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class TripLog:
    """Single historical trip record used to fit planned range coefficients."""

    bus_id: str
    route_code: str
    slot: str
    soc_start: float
    soc_end: float
    km: float
    duration_hours: float
    timestamp: datetime


@dataclass
class TelemetryPoint:
    """Live SOC/odometer data emitted by a bus during service."""

    bus_id: str
    timestamp: datetime
    soc: float
    odometer_km: float


@dataclass
class Bus:
    """Depot bus state used to assess dispatch eligibility."""

    bus_id: str
    soc: float
    soh: float
    interior_clean: bool
    exterior_clean: bool
    available: bool
    short_name: str = ""          # physical bus label shown on ESP dropdown (e.g. "600F")
    history: list[TripLog] = field(default_factory=list)


@dataclass
class Schedule:
    """A route schedule requiring a range and feasibility evaluation."""

    route_code: str
    route_category: str
    route_km: float
    trips: int
    start_time: str
    scheduled_hours: float


@dataclass
class GTFSRoute:
    """A GTFS route slot — the key is fixed and never changes."""

    route_id: str             # fixed slot key — never reassigned
    route_short_name: str     # e.g. "600F"
    distance_km: float        # derived from GTFS shape (longest trip direction)


@dataclass
class RouteAssignment:
    """Current bus-to-route mapping produced by the swap engine."""

    route_id: str
    route_distance_km: float
    assigned_bus_id: Optional[str] = None       # None means NO_DEPARTURE
    assigned_short_name: Optional[str] = None    # None means NO_DEPARTURE
    expected_range_km: float = 0.0
    last_swap_soc: Optional[float] = None        # incumbent SoC at time of last swap

    @property
    def no_departure(self) -> bool:
        """True when no eligible bus is available for this route."""
        return self.assigned_bus_id is None
