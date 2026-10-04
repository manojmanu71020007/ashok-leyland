"""Data models for Battery-Based Bus Allocation tool.

Pure Pydantic models representing domain entities:
- Trips, legs, and stretches
- Schedules and consolidation duties with canonical Schedule Keys
- Fleet vehicles with 3-state inspection and range categories
- Candidate bus ranking and manual assignment override
- Infeasible schedule reporting and shortfall metrics
- Faulty-bus workflow and replacement suggestion models
- SOC engine calculation results and bus reuse evaluation
- Feasibility classifications, consistency statuses, and reserve sensitivity
"""

from typing import List, Optional, Dict, Any, Union
from enum import Enum
from pydantic import BaseModel, Field


class FeasibilityStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE_FROM_FULL_CHARGE"
    RESERVE_INFEASIBLE = "RESERVE-INFEASIBLE"
    PHYSICALLY_IMPOSSIBLE = "PHYSICALLY IMPOSSIBLE"


class BusStatus(str, Enum):
    AVAILABLE = "Available"
    ON_DUTY = "On Duty"
    UNDER_MAINTENANCE = "Under Maintenance"
    NOT_READY = "Not Ready"


class InspectionStatus(str, Enum):
    CONFIRMED_OK = "CONFIRMED_OK"
    DEFECT = "DEFECT"
    UNKNOWN_NO_RECORD = "UNKNOWN_NO_RECORD"


class ConsistencyStatus(str, Enum):
    OK = "OK"
    FIRST_STRETCH_EXCEEDS_FORM4 = "FIRST_STRETCH_EXCEEDS_FORM4"
    CALCULATED_LONGEST_EXCEEDS_FORM4 = "CALCULATED_LONGEST_EXCEEDS_FORM4"
    MISSING_FORM4 = "MISSING_FORM4"
    DATA_CONFLICT = "DATA_CONFLICT"


class TripLeg(BaseModel):
    sl_no: Optional[int] = None
    route: str
    schedule: str
    shift: str
    origin: str
    destination: str
    departure_min: Optional[int] = None  # minute of day (0..1439)
    arrival_min: Optional[int] = None    # minute of day (0..1439)
    crosses_midnight: bool = False
    route_length_km: float = 0.0
    rest_str: Optional[str] = None
    is_charging_event: bool = False
    raw_departure: Optional[str] = None
    raw_arrival: Optional[str] = None


class StretchInfo(BaseModel):
    stretch_index: int
    route_length_km: float
    target_distance_km: float
    legs: List[TripLeg] = Field(default_factory=list)
    is_first_stretch: bool = False
    is_longest_stretch: bool = False


class ScheduleDuty(BaseModel):
    schedule_key: str  # Canonical internal identifier: f"{shift}|{schedule_id}"
    shift: str
    schedule_id: str
    route: str
    route_length_km: float
    dead_km: float
    actual_km: float
    form4_single_charge_km: Optional[float] = None
    category: str
    remarks: Optional[str] = None
    departure_time_str: Optional[str] = None
    arrival_time_str: Optional[str] = None
    departure_min: Optional[int] = None
    arrival_min: Optional[int] = None
    first_stretch_km: float = 0.0
    longest_calculated_stretch_km: float = 0.0
    stretches: List[StretchInfo] = Field(default_factory=list)
    has_charging_event: bool = False
    charging_event_count: int = 0
    consistency_status: ConsistencyStatus = ConsistencyStatus.OK
    stretch_diff_km: Optional[float] = None
    warning_flags: List[str] = Field(default_factory=list)


class BusVehicle(BaseModel):
    bm_no: str
    reg_no: Optional[str] = None
    actual_range_km: float
    category: str  # 'A', 'B', 'C'
    current_soc_pct: float = 100.0
    is_manually_confirmed: bool = True
    status: BusStatus = BusStatus.AVAILABLE
    inspection_status: InspectionStatus = InspectionStatus.UNKNOWN_NO_RECORD
    defect_flag: bool = False
    current_duty: Optional[str] = None
    next_available_min: Optional[int] = None


class RouteRequirement(BaseModel):
    """Step 3 output: Pure duty distance requirement, completely independent of any bus."""
    schedule_key: str
    schedule_id: str
    shift: str
    route: str
    origin: str = ""
    destination: str = ""
    departure_time_str: str = "--:--"
    arrival_time_str: str = "--:--"
    route_complexity: str = "Standard"
    first_stretch_km: float
    longest_stretch_km: float
    selected_stretch_source: str
    first_target_distance_km: float
    longest_target_distance_km: float
    dead_km_factor: float
    form4_single_charge_km: Optional[float] = None
    consistency_status: ConsistencyStatus = ConsistencyStatus.OK
    has_charging_event: bool = False
    charging_event_count: int = 0
    warning_flags: List[str] = Field(default_factory=list)


class BusSocRequirement(BaseModel):
    """Step 4 output: Bus-specific SOC requirement calculated using bus Actual Range Final."""
    schedule_key: str
    bm_no: str
    reg_no: Optional[str] = None
    bus_actual_range_km: float
    bus_category: str
    target_distance_km: float
    base_required_soc_pct: float
    reserve_pct: float
    required_soc_with_reserve_pct: float
    confirmed_manual_soc_pct: float
    soc_margin_pct: float
    is_battery_feasible: bool
    is_departure_soc_eligible: bool
    feasibility_status: FeasibilityStatus
    soc_label: str = "Confirmed Manual SOC"
    complexity_compatibility: str = ""


class RouteSocEstimate(BaseModel):
    """Output of pure Route SOC Estimator answering: 'How much SOC does this bus need to perform this duty?'"""
    schedule_key: str
    schedule_id: str
    shift: str
    route: str
    category: str  # 'Standard', 'Moderate', 'Complex'
    first_stretch_km: float
    longest_stretch_km: float
    selected_stretch_source: str
    first_target_distance_km: float
    longest_target_distance_km: float
    dead_km_factor: float
    reserve_pct: float
    bus_bm_no: Optional[str] = None
    bus_actual_range_km: Optional[float] = None
    first_stretch_base_soc_pct: Optional[float] = None
    first_stretch_required_soc_pct: Optional[float] = None
    longest_stretch_base_soc_pct: Optional[float] = None
    longest_stretch_required_soc_pct: Optional[float] = None
    current_bus_soc_pct: Optional[float] = None
    soc_margin_pct: Optional[float] = None
    is_manually_confirmed: bool = True
    soc_label: str = "MANUALLY UPDATED SOC"
    feasibility_status: Optional[FeasibilityStatus] = None
    complexity_compatibility: str = ""
    summary_text: str = ""


class SocCalculationResult(BaseModel):
    target_distance_km: float
    bus_actual_range_km: float
    base_required_soc_pct: float
    reserve_pct: float
    required_soc_with_reserve_pct: float
    feasibility_status: FeasibilityStatus
    current_soc_pct: Optional[float] = None
    departure_soc_eligible: Optional[bool] = None
    projected_soc_after_stretch_pct: Optional[float] = None
    soc_margin_pct: Optional[float] = None


class RuleEvaluationResult(BaseModel):
    rule_name: str
    rule_description: str
    total_evaluated: int
    exact_matches: int
    exact_match_pct: float
    within_tolerance_matches: int  # within 2.0 km
    within_tolerance_pct: float
    mismatches: int


class ReserveSensitivityRow(BaseModel):
    reserve_pct: float
    physically_impossible_count: int
    reserve_infeasible_count: int
    feasible_count: int
    total_schedules: int


class SensitivityReport(BaseModel):
    reference_bus_bm: str
    reference_bus_range_km: float
    stretch_source: str
    dead_km_factor: float
    table: List[ReserveSensitivityRow]


class BusReuseEvaluation(BaseModel):
    first_duty_key: str
    second_duty_key: str
    first_duty_arrival_min: Optional[int] = None
    second_duty_departure_min: Optional[int] = None
    first_duty_arrival_str: str = "--:--"
    second_duty_departure_str: str = "--:--"
    turnaround_duration_min: int = 0
    charging_enabled: bool = False
    charging_duration_min: int = 0
    soc_after_first_duty_pct: float = 0.0
    soc_after_turnaround_charge_pct: float = 0.0
    soc_required_second_duty_pct: float = 0.0
    reuse_feasible: bool = False
    reason: str = ""


class DeadheadEvaluation(BaseModel):
    schedule_key: str
    base_stretch_km: float
    explicit_deadhead_km: Optional[float] = None
    generic_dead_km_allowance: float = 0.0
    final_target_distance_km: float = 0.0
    bus_actual_range_km: Optional[float] = None
    base_required_soc_pct: Optional[float] = None
    status: str = "UNKNOWN"
    notes: str = ""


class CandidateBusRank(BaseModel):
    rank: int
    bm_no: str
    reg_no: Optional[str] = None
    actual_range_km: float
    category: str
    current_soc_pct: float
    status: BusStatus
    inspection_status: InspectionStatus
    defect_flag: bool
    is_range_eligible: bool
    is_dep_soc_eligible: bool
    has_duty_overlap: bool = False
    has_sufficient_turnaround: bool = True
    surplus_range_km: float
    first_stretch_base_soc_pct: float
    first_stretch_required_soc_pct: float
    longest_stretch_base_soc_pct: float
    longest_stretch_required_soc_pct: float
    soc_margin_pct: float
    projected_soc_after_first_stretch_pct: float
    is_eligible_for_auto_allocation: bool
    constraint_violations: List[str] = Field(default_factory=list)
    ranking_notes: str = ""


class ManualAssignmentResult(BaseModel):
    schedule_key: str
    schedule_id: str
    shift: str
    assigned_bm_no: str
    assigned_reg_no: Optional[str] = None
    is_override: bool
    assignment_approved: bool
    constraint_warnings: List[str] = Field(default_factory=list)
    soc_at_departure_pct: float
    projected_soc_after_first_stretch_pct: float
    message: str


class InfeasibleScheduleReportRow(BaseModel):
    schedule_key: str
    schedule_id: str
    shift: str
    route: str
    form4_stretch_km: Optional[float] = None
    calculated_stretch_km: float
    selected_stretch_source: str
    selected_stretch_km: float
    target_distance_km: float
    highest_range_bm: str
    highest_bus_range_km: float
    base_required_soc_pct: float
    reserve_adjusted_soc_pct: float
    shortfall_km: float
    shortfall_soc_pct: float
    status: FeasibilityStatus
    recommended_action: str


class InfeasibleReport(BaseModel):
    total_schedules: int
    infeasible_count: int
    highest_range_bm: str
    highest_bus_range_km: float
    stretch_source: str
    dead_km_factor: float
    reserve_pct: float
    rows: List[InfeasibleScheduleReportRow] = Field(default_factory=list)


class FaultyBusReplacementSuggestion(BaseModel):
    rank: int
    bm_no: str
    reg_no: Optional[str] = None
    actual_range_km: float
    current_soc_pct: float
    soc_margin_pct: float
    surplus_km: float
    inspection_status: InspectionStatus
    is_valid_replacement: bool
    reason: str


class FaultyBusReport(BaseModel):
    faulty_bm_no: str
    faulty_reg_no: Optional[str] = None
    previous_status: BusStatus
    new_status: BusStatus
    affected_duty_keys: List[str] = Field(default_factory=list)
    uncovered_schedules: List[Dict[str, Any]] = Field(default_factory=list)
    replacements_by_schedule: Dict[str, List[FaultyBusReplacementSuggestion]] = Field(default_factory=dict)
    action_summary: str


class AllocationAlternative(BaseModel):
    bm_no: str
    reg_no: Optional[str] = None
    actual_range_km: float
    inspection_status: InspectionStatus = InspectionStatus.UNKNOWN_NO_RECORD
    current_soc_pct: float
    base_required_soc_pct: float
    required_soc_with_reserve_pct: float
    soc_margin_pct: float
    reason: str


class AllocationResult(BaseModel):
    schedule_key: str
    schedule_id: str
    shift: str
    route: str
    chosen_bm_no: Optional[str] = None
    chosen_reg_no: Optional[str] = None
    allocation_status: str
    first_stretch_km: float
    longest_stretch_km: float
    first_stretch_target_km: float
    longest_stretch_target_km: float
    first_stretch_base_soc_pct: float
    first_stretch_required_soc_pct: float
    longest_stretch_base_soc_pct: float
    longest_stretch_required_soc_pct: float
    current_soc_pct: Optional[float] = None
    soc_margin_pct: Optional[float] = None
    projected_soc_after_first_stretch_pct: Optional[float] = None
    reason: str
    matching_records: List[Dict[str, Any]] = Field(default_factory=list)
    alternatives: List[AllocationAlternative] = Field(default_factory=list)
    warning_flags: List[str] = Field(default_factory=list)


class DutyChain(BaseModel):
    """A single duty or a chain of compatible non-overlapping duties for one vehicle."""
    chain_id: str
    schedule_keys: List[str]
    schedules: List[ScheduleDuty] = Field(default_factory=list)
    shifts: List[str] = Field(default_factory=list)
    route: str
    total_target_distance_km: float
    max_target_distance_km: float
    first_stretch_target_km: float
    category: str
    departure_min: Optional[int] = None
    arrival_min: Optional[int] = None
    departure_time_str: str = "--:--"
    arrival_time_str: str = "--:--"
    turnaround_duration_min: int = 0
    is_multi_duty: bool = False


class OptimizationAssignment(BaseModel):
    """Result of linear_sum_assignment auto-allocation for a single duty or duty chain."""
    chain_id: str
    schedule_keys: List[str]
    shifts: List[str]
    route: str
    duty_category: str
    assigned_bm_no: Optional[str] = None
    assigned_reg_no: Optional[str] = None
    bus_actual_range_km: Optional[float] = None
    bus_category: Optional[str] = None
    current_soc_pct: Optional[float] = None
    required_soc_pct: Optional[float] = None
    soc_margin_pct: Optional[float] = None
    surplus_range_km: Optional[float] = None
    cost: float = 0.0
    is_feasible: bool = True
    allocation_status: str = "ALLOCATED"
    reason: str = ""


class DepotOptimizationResult(BaseModel):
    """Full depot auto-allocation optimization outcome using linear_sum_assignment."""
    total_schedules: int
    total_chains: int
    allocated_chains_count: int
    allocated_schedules_count: int
    unallocated_schedules_count: int
    physically_impossible_count: int = 0
    soc_constrained_count: int = 0
    total_optimization_cost: float = 0.0
    assignments: List[OptimizationAssignment] = Field(default_factory=list)
    unallocated_schedules: List[Dict[str, Any]] = Field(default_factory=list)
    metric_summary: Dict[str, Any] = Field(default_factory=dict)


class NightHaltRecord(BaseModel):
    """Record comparing fixed, actual, and recommended vehicle for Night Halt duties."""
    schedule_id: str
    schedule_key: Optional[str] = None
    shift: str
    route: str
    fix_bm: Optional[str] = None
    fix_reg: Optional[str] = None
    actual_bm: Optional[str] = None
    actual_reg: Optional[str] = None
    recommended_bm: Optional[str] = None
    recommended_reg: Optional[str] = None
    out_time_min: Optional[int] = None
    in_time_min: Optional[int] = None
    out_time_str: str = "--:--"
    in_time_str: str = "--:--"
    crosses_midnight: bool = False
    duration_min: int = 0
    is_mismatch: bool = False
    swap_required: bool = False
    current_assignment_status: str = "ASSIGNED"
    reason: str = ""


class NightHaltSwapReport(BaseModel):
    """Depot Night Halt allocation and swap checking report."""
    total_nh_schedules: int
    total_general_schedules: int
    general_unknown_count: int
    swap_required_count: int
    nh_records: List[NightHaltRecord] = Field(default_factory=list)
    general_records: List[NightHaltRecord] = Field(default_factory=list)
    swaps_needed: List[NightHaltRecord] = Field(default_factory=list)


class DynamicSparePoolReport(BaseModel):
    """Dynamic operational spare pool based on temporal demand across schedule timeline."""
    total_fleet: int
    peak_simultaneous_demand: int
    peak_time_window_str: str
    committed_in_service: int
    defective_count: int
    under_maintenance_count: int
    currently_free_count: int
    operational_spare_pool_count: int
    spare_buses: List[Dict[str, Any]] = Field(default_factory=list)
    demand_timeline: List[Dict[str, Any]] = Field(default_factory=list)


class HeadwayGapRecord(BaseModel):
    """A flagged headway interval between consecutive departures exceeding GAP_THRESHOLD_MIN."""
    route: str
    origin: str
    prev_departure_str: str
    next_departure_str: str
    prev_schedule_key: str
    next_schedule_key: str
    gap_minutes: int
    candidate_spare_buses: List[Dict[str, Any]] = Field(default_factory=list)
    recommended_bus: Optional[str] = None
    recommended_reg: Optional[str] = None
    notes: str = ""


class HeadwayGapReport(BaseModel):
    """Depot headway gap audit identifying service intervals > 60 min and candidate buses."""
    total_routes_analyzed: int
    gap_threshold_min: int = 60
    gaps_found_count: int = 0
    gaps: List[HeadwayGapRecord] = Field(default_factory=list)

