"""Fleet state and bus lifecycle management for Chandapura EV depot.

Pure business-logic module:
- Manages 122 electric buses (BM001 to BM304) with degradation ranges
- BM NO to REG NO preservation
- Demo SOC controls (single, per-bus, and randomized)
- 3-state inspection and defect management
- Active duty assignment and overlap tracking
"""

from typing import List, Dict, Optional, Any, Union
import random
from pathlib import Path

from models import (
    BusVehicle, BusStatus, InspectionStatus, ScheduleDuty,
    FaultyBusReport, FaultyBusReplacementSuggestion
)
from data_loader import load_bus_fleet


class FleetManager:
    """Manages mutable in-memory operational state of the bus fleet."""
    
    def __init__(self, buses: Optional[List[BusVehicle]] = None):
        if buses is None:
            buses = load_bus_fleet()
        self._buses: Dict[str, BusVehicle] = {b.bm_no.upper(): b for b in buses}
        # Mapping: bm_no -> schedule_key
        self._active_assignments: Dict[str, str] = {}
        # Mapping: schedule_key -> bm_no
        self._schedule_to_bus: Dict[str, str] = {}

    @property
    def total_buses(self) -> int:
        return len(self._buses)

    def get_bus(self, bm_no: str) -> Optional[BusVehicle]:
        return self._buses.get(bm_no.strip().upper())

    def get_all_buses(self) -> List[BusVehicle]:
        return sorted(list(self._buses.values()), key=lambda b: b.bm_no)

    def get_highest_range_bus(self) -> BusVehicle:
        if not self._buses:
            raise ValueError("No buses in fleet")
        return max(self._buses.values(), key=lambda b: b.actual_range_km)

    def get_lowest_range_bus(self) -> BusVehicle:
        if not self._buses:
            raise ValueError("No buses in fleet")
        return min(self._buses.values(), key=lambda b: b.actual_range_km)

    # --- SOC Controls ---

    def set_bulk_soc(self, soc_pct: float) -> None:
        """Set a single uniform demo SOC across all candidate buses."""
        soc_val = max(0.0, min(100.0, round(float(soc_pct), 1)))
        for bus in self._buses.values():
            bus.current_soc_pct = soc_val

    def set_bus_soc(self, bm_no: str, soc_pct: float, manually_confirmed: bool = True) -> bool:
        """Set an individual bus SOC with manual confirmation tracking."""
        bus = self.get_bus(bm_no)
        if not bus:
            return False
        bus.current_soc_pct = max(0.0, min(100.0, round(float(soc_pct), 1)))
        bus.is_manually_confirmed = manually_confirmed
        return True

    def update_manual_soc(self, bm_no: str, soc_pct: float) -> bool:
        """Manual update workflow (Section 7): Operator manually enters latest SOC after charging."""
        return self.set_bus_soc(bm_no, soc_pct, manually_confirmed=True)

    def update_projected_soc(self, bm_no: str, soc_pct: float) -> bool:
        """Same-day bus reuse (Section 8): Set calculated projected SOC without manual confirmation."""
        return self.set_bus_soc(bm_no, soc_pct, manually_confirmed=False)

    def randomize_demo_soc(self, min_soc: float = 60.0, max_soc: float = 100.0, seed: Optional[int] = None) -> None:
        """Randomize demo current SOC for all buses (clearly labeled as manual demo SOC)."""
        rng = random.Random(seed) if seed is not None else random.Random()
        for bus in self._buses.values():
            # Generate random SOC with 1 decimal place
            val = round(rng.uniform(min_soc, max_soc), 1)
            bus.current_soc_pct = val

    def get_current_soc_dict(self) -> Dict[str, float]:
        """Return a mapping of BM_NO -> current_soc_pct."""
        return {b.bm_no: b.current_soc_pct for b in self._buses.values()}

    # --- Defect & Inspection Management ---

    def mark_bus_faulty(self, bm_no: str, reason: str = "Reported defective") -> FaultyBusReport:
        """Mark a bus as faulty/defective, immediately pulling it from duty and auto-allocation."""
        bus = self.get_bus(bm_no)
        if not bus:
            raise ValueError(f"Bus '{bm_no}' not found in fleet.")

        prev_status = bus.status
        bus.status = BusStatus.NOT_READY
        bus.inspection_status = InspectionStatus.DEFECT
        bus.defect_flag = True

        affected_keys = []
        assigned_key = self._active_assignments.pop(bus.bm_no, None)
        if assigned_key:
            affected_keys.append(assigned_key)
            self._schedule_to_bus.pop(assigned_key, None)
            bus.current_duty = None

        return FaultyBusReport(
            faulty_bm_no=bus.bm_no,
            faulty_reg_no=bus.reg_no,
            previous_status=prev_status,
            new_status=bus.status,
            affected_duty_keys=affected_keys,
            uncovered_schedules=[],
            replacements_by_schedule={},
            action_summary=(
                f"Bus {bus.bm_no} marked DEFECT / NOT READY ({reason}). "
                f"Removed from active allocation. Affected duties: {affected_keys or 'None'}."
            )
        )

    def clear_bus_defect(self, bm_no: str, new_inspection_status: InspectionStatus = InspectionStatus.UNKNOWN_NO_RECORD) -> bool:
        """Clear defect flag for a bus."""
        bus = self.get_bus(bm_no)
        if not bus:
            return False
        bus.inspection_status = new_inspection_status
        bus.defect_flag = (new_inspection_status == InspectionStatus.DEFECT)
        if not bus.defect_flag:
            bus.status = BusStatus.AVAILABLE
        return True

    # --- Duty Assignment Tracking ---

    def assign_bus(self, bm_no: str, schedule_key: str) -> None:
        """Record bus assignment to a schedule duty."""
        bus = self.get_bus(bm_no)
        if not bus:
            raise ValueError(f"Bus '{bm_no}' not found.")
        self._active_assignments[bus.bm_no] = schedule_key
        self._schedule_to_bus[schedule_key] = bus.bm_no
        bus.status = BusStatus.ON_DUTY
        bus.current_duty = schedule_key

    def unassign_bus(self, bm_no: str) -> Optional[str]:
        """Release bus from active duty."""
        bus = self.get_bus(bm_no)
        if not bus:
            return None
        duty = self._active_assignments.pop(bus.bm_no, None)
        if duty:
            self._schedule_to_bus.pop(duty, None)
        bus.current_duty = None
        if not bus.defect_flag and bus.status != BusStatus.UNDER_MAINTENANCE:
            bus.status = BusStatus.AVAILABLE
        return duty

    def get_bus_assigned_duty(self, bm_no: str) -> Optional[str]:
        return self._active_assignments.get(bm_no.upper())

    def get_duty_assigned_bus(self, schedule_key: str) -> Optional[str]:
        return self._schedule_to_bus.get(schedule_key)
