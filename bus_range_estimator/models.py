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
