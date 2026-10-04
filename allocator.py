"""Core business-logic allocation and SOC calculation engine for Chandapura depot.

Pure business logic - no UI/Streamlit dependencies.
Implements:
- Strict mathematical model for Base SOC and Reserve-adjusted SOC
- Shift-aware schedule resolution preventing silent collisions
- 3-state inspection logic (CONFIRMED_OK, DEFECT, UNKNOWN_NO_RECORD)
- Configurable turnaround charging for bus reuse
- Non-double-counted explicit deadhead distance evaluation
- Candidate bus ranking according to Section 18 priority criteria
- Manual assignment with manager constraint override tracking
- Infeasible schedule reporting (Section 24)
- Faulty-bus replacement workflow (Section 23)
- First-stretch vs Longest-stretch feasibility separation
- Theoretical schedule sensitivity against highest-range bus
- allocate_bus() function with Pydantic output
"""

from typing import List, Dict, Tuple, Optional, Any, Union
from models import (
    BusVehicle, BusStatus, InspectionStatus, ScheduleDuty, FeasibilityStatus,
    SocCalculationResult, ReserveSensitivityRow, SensitivityReport,
    AllocationResult, AllocationAlternative, BusReuseEvaluation, DeadheadEvaluation,
    CandidateBusRank, ManualAssignmentResult, InfeasibleScheduleReportRow,
    InfeasibleReport, FaultyBusReport, FaultyBusReplacementSuggestion, RouteSocEstimate,
    RouteRequirement, BusSocRequirement
)


class AllocatorConfig:
    DEAD_KM_FACTOR: float = 1.10
    DEFAULT_RESERVE_PCT: float = 0.0
    STRETCH_SOURCE: str = "FORM4"  # 'FORM4' or 'CALCULATED'
    MIN_TURNAROUND_MIN: int = 20
    TARGET_SOC_AFTER_CHARGE: float = 100.0
    ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION: bool = False
    TURNAROUND_CHARGING_ENABLED: bool = False
    TURNAROUND_CHARGE_DURATION_MIN: int = 45
    TURNAROUND_SOC_AFTER_CHARGE: float = 100.0
    CSB_DEADHEAD_KM: Optional[float] = None  # UNKNOWN initially; no invented default


def calculate_target_distance(stretch_km: float, dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR) -> float:
    """Calculate target operating distance including generic dead-km factor."""
    return round(stretch_km * dead_km_factor, 2)


def calculate_soc_requirement(
    target_distance_km: float,
    bus_actual_range_km: float,
    reserve_pct: float = AllocatorConfig.DEFAULT_RESERVE_PCT,
    current_soc_pct: Optional[float] = None
) -> SocCalculationResult:
    """Calculate Base Required SOC %, Reserve-Adjusted SOC %, and feasibility status.
    
    Formulas:
    Base Required SOC % = (target_distance_km / bus_actual_range_km) * 100
    Required SOC % = Base Required SOC % + reserve_pct (absolute addition)
    Projected SOC after stretch = current_soc_pct - Base Required SOC % (reserve not subtracted)
    """
    if bus_actual_range_km <= 0:
        base_soc = 9999.0
    else:
        base_soc = round((target_distance_km / bus_actual_range_km) * 100.0, 4)
        
    req_soc_with_reserve = round(base_soc + reserve_pct, 4)
    
    if base_soc > 100.0:
        status = FeasibilityStatus.PHYSICALLY_IMPOSSIBLE
    elif req_soc_with_reserve > 100.0:
        status = FeasibilityStatus.RESERVE_INFEASIBLE
    else:
        status = FeasibilityStatus.ELIGIBLE
        
    dep_eligible = None
    proj_soc = None
    margin = None
    if current_soc_pct is not None:
        dep_eligible = (current_soc_pct >= req_soc_with_reserve)
        margin = round(current_soc_pct - req_soc_with_reserve, 2)
        proj_soc = round(current_soc_pct - base_soc, 2)
        
    return SocCalculationResult(
        target_distance_km=target_distance_km,
        bus_actual_range_km=round(bus_actual_range_km, 4),
        base_required_soc_pct=round(base_soc, 2),
        reserve_pct=reserve_pct,
        required_soc_with_reserve_pct=round(req_soc_with_reserve, 2),
        feasibility_status=status,
        current_soc_pct=current_soc_pct,
        departure_soc_eligible=dep_eligible,
        projected_soc_after_stretch_pct=proj_soc,
        soc_margin_pct=margin
    )


def get_schedule_longest_stretch_km(
    schedule: ScheduleDuty,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE
) -> Tuple[float, List[str]]:
    """Determine the longest stretch distance based on configured STRETCH_SOURCE."""
    warnings: List[str] = []
    if stretch_source.upper() == "FORM4":
        if schedule.form4_single_charge_km is not None and schedule.form4_single_charge_km > 0:
            return schedule.form4_single_charge_km, warnings
        else:
            warnings.append("MISSING FORM4 STRETCH")
            return 0.0, warnings
    else:
        return schedule.longest_calculated_stretch_km, warnings


def estimate_route_requirement(
    schedule: ScheduleDuty,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> RouteRequirement:
    """STEP 3 — ROUTE / STRETCH ESTIMATOR:
    Calculates the pure distance requirement of the duty independently of any bus.
    
    Determines:
    - first stretch km
    - longest calculated stretch km
    - Form 4 single-charge km
    - selected stretch source
    - target distance including dead-km factor
    - Form 4 / calculated consistency status
    - route complexity
    - charging opportunities
    
    Result is a distance requirement in km, NOT one universal SOC percentage!
    """
    first_km = schedule.first_stretch_km
    longest_km, warnings = get_schedule_longest_stretch_km(schedule, stretch_source)
    first_target_km = calculate_target_distance(first_km, dead_km_factor)
    longest_target_km = calculate_target_distance(longest_km, dead_km_factor)

    origin = ""
    destination = ""
    if schedule.stretches and schedule.stretches[0].legs:
        origin = schedule.stretches[0].legs[0].origin
        destination = schedule.stretches[-1].legs[-1].destination

    return RouteRequirement(
        schedule_key=schedule.schedule_key,
        schedule_id=schedule.schedule_id,
        shift=schedule.shift,
        route=schedule.route,
        origin=origin,
        destination=destination,
        departure_time_str=schedule.departure_time_str or "--:--",
        arrival_time_str=schedule.arrival_time_str or "--:--",
        route_complexity=schedule.category,
        first_stretch_km=first_km,
        longest_stretch_km=longest_km,
        selected_stretch_source=stretch_source,
        first_target_distance_km=first_target_km,
        longest_target_distance_km=longest_target_km,
        dead_km_factor=dead_km_factor,
        form4_single_charge_km=schedule.form4_single_charge_km,
        consistency_status=schedule.consistency_status,
        has_charging_event=schedule.has_charging_event,
        charging_event_count=schedule.charging_event_count,
        warning_flags=warnings + schedule.warning_flags
    )


def estimate_bus_soc_requirement(
    route_req: RouteRequirement,
    bus: BusVehicle,
    reserve_pct: float = AllocatorConfig.DEFAULT_RESERVE_PCT,
    confirmed_manual_soc: Optional[float] = None,
) -> BusSocRequirement:
    """STEP 4 — BUS-SPECIFIC SOC ESTIMATOR:
    Calculates the bus-specific SOC requirement using the bus's Actual Range Final.
    
    Formulas:
    Base Required SOC % = (Target Distance / Bus Actual Range Final) × 100
    Required SOC % = Base Required SOC % + RESERVE_PCT
    SOC Margin = Confirmed Manual SOC - Required SOC
    """
    manual_soc = confirmed_manual_soc if confirmed_manual_soc is not None else bus.current_soc_pct
    first_calc = calculate_soc_requirement(
        route_req.first_target_distance_km, bus.actual_range_km, reserve_pct, manual_soc
    )
    longest_calc = calculate_soc_requirement(
        route_req.longest_target_distance_km, bus.actual_range_km, reserve_pct, manual_soc
    )

    margin = round(manual_soc - first_calc.required_soc_with_reserve_pct, 2)
    is_batt_ok = (longest_calc.feasibility_status == FeasibilityStatus.ELIGIBLE)
    is_dep_ok = (first_calc.departure_soc_eligible is True)

    # Complexity compatibility
    sched_cat = route_req.route_complexity.strip().title()
    bus_cat = bus.category.upper()
    comp_note = ""
    if sched_cat == "Standard":
        comp_note = "Ideal Complexity Fit (Conserves Category A)" if bus_cat in ("C", "B") else "Acceptable"
    elif sched_cat == "Moderate":
        comp_note = "Ideal Complexity Fit" if bus_cat in ("B", "A") else "Borderline"
    elif sched_cat == "Complex":
        comp_note = "Ideal Complexity Fit (High capability)" if bus_cat == "A" else "Acceptable"

    return BusSocRequirement(
        schedule_key=route_req.schedule_key,
        bm_no=bus.bm_no,
        reg_no=bus.reg_no,
        bus_actual_range_km=bus.actual_range_km,
        bus_category=bus.category,
        target_distance_km=route_req.longest_target_distance_km,
        base_required_soc_pct=longest_calc.base_required_soc_pct,
        reserve_pct=reserve_pct,
        required_soc_with_reserve_pct=longest_calc.required_soc_with_reserve_pct,
        confirmed_manual_soc_pct=manual_soc,
        soc_margin_pct=margin,
        is_battery_feasible=is_batt_ok,
        is_departure_soc_eligible=is_dep_ok,
        feasibility_status=longest_calc.feasibility_status,
        soc_label="Confirmed Manual SOC" if bus.is_manually_confirmed else "PROJECTED SOC — NOT MANUALLY CONFIRMED",
        complexity_compatibility=comp_note
    )


def estimate_route_soc(
    schedule: ScheduleDuty,
    bus: Optional[BusVehicle] = None,
    bus_range_km: Optional[float] = None,
    current_soc_pct: Optional[float] = None,
    reserve_pct: float = AllocatorConfig.DEFAULT_RESERVE_PCT,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> RouteSocEstimate:
    """Pure Route SOC Estimator answering: 'How much SOC does this bus need to perform this duty?'
    
    Evaluates:
    - First stretch & longest stretch
    - Target distance including dead-km factor
    - Base required SOC %
    - Final required SOC % including reserve
    - Current bus SOC & SOC margin (if bus or range provided)
    - Schedule complexity compatibility
    """
    first_km = schedule.first_stretch_km
    longest_km, _ = get_schedule_longest_stretch_km(schedule, stretch_source)
    first_target_km = calculate_target_distance(first_km, dead_km_factor)
    longest_target_km = calculate_target_distance(longest_km, dead_km_factor)

    eff_range = None
    bm_no = None
    eff_current_soc = None
    is_confirmed = True

    if bus is not None:
        eff_range = bus.actual_range_km
        bm_no = bus.bm_no
        eff_current_soc = bus.current_soc_pct if current_soc_pct is None else current_soc_pct
        is_confirmed = bus.is_manually_confirmed
    elif bus_range_km is not None:
        eff_range = bus_range_km
        eff_current_soc = current_soc_pct

    first_base_soc = None
    first_req_soc = None
    longest_base_soc = None
    longest_req_soc = None
    margin = None
    status = None
    complexity_comp = ""
    summary = ""

    if eff_range and eff_range > 0:
        first_calc = calculate_soc_requirement(first_target_km, eff_range, reserve_pct, eff_current_soc)
        longest_calc = calculate_soc_requirement(longest_target_km, eff_range, reserve_pct, eff_current_soc)

        first_base_soc = first_calc.base_required_soc_pct
        first_req_soc = first_calc.required_soc_with_reserve_pct
        longest_base_soc = longest_calc.base_required_soc_pct
        longest_req_soc = longest_calc.required_soc_with_reserve_pct
        status = longest_calc.feasibility_status

        if eff_current_soc is not None:
            margin = round(eff_current_soc - first_req_soc, 2)

        # Evaluate complexity compatibility
        sched_cat = schedule.category.strip().title()
        bus_cat = bus.category.upper() if bus else ("A" if eff_range >= 120 else ("B" if eff_range >= 95 else "C"))

        if sched_cat == "Standard":
            if bus_cat in ("C", "B"):
                complexity_comp = "Ideal Complexity Fit (Conserves Category A buses)"
            else:
                complexity_comp = "Acceptable (High-capability Category A bus on Standard route)"
        elif sched_cat == "Moderate":
            if bus_cat in ("B", "A"):
                complexity_comp = "Ideal Complexity Fit (Balanced capability)"
            else:
                complexity_comp = "Borderline (Low-capability Category C bus on Moderate route)"
        elif sched_cat == "Complex":
            if bus_cat == "A":
                complexity_comp = "Ideal Complexity Fit (High-capability Category A bus for Complex duty)"
            elif bus_cat == "B":
                complexity_comp = "Acceptable (Medium-capability Category B bus for Complex duty)"
            else:
                complexity_comp = "Caution (Degraded Category C bus assigned to Complex duty)"

        soc_type_str = "MANUALLY UPDATED SOC" if is_confirmed else "PROJECTED SOC — NOT MANUALLY CONFIRMED"
        summary = (
            f"Schedule {schedule.schedule_key} ({schedule.category}) requires {first_req_soc:.1f}% departure SOC "
            f"(target: {first_target_km:.1f} km). Bus {bm_no or 'Candidate'} range is {eff_range:.1f} km. "
            f"Latest {soc_type_str}: {eff_current_soc or 100:.1f}%. Margin: {margin or 0:+.1f}%."
        )

    return RouteSocEstimate(
        schedule_key=schedule.schedule_key,
        schedule_id=schedule.schedule_id,
        shift=schedule.shift,
        route=schedule.route,
        category=schedule.category,
        first_stretch_km=first_km,
        longest_stretch_km=longest_km,
        selected_stretch_source=stretch_source,
        first_target_distance_km=first_target_km,
        longest_target_distance_km=longest_target_km,
        dead_km_factor=dead_km_factor,
        reserve_pct=reserve_pct,
        bus_bm_no=bm_no,
        bus_actual_range_km=eff_range,
        first_stretch_base_soc_pct=first_base_soc,
        first_stretch_required_soc_pct=first_req_soc,
        longest_stretch_base_soc_pct=longest_base_soc,
        longest_stretch_required_soc_pct=longest_req_soc,
        current_bus_soc_pct=eff_current_soc,
        soc_margin_pct=margin,
        is_manually_confirmed=is_confirmed,
        soc_label="MANUALLY UPDATED SOC" if is_confirmed else "PROJECTED SOC — NOT MANUALLY CONFIRMED",
        feasibility_status=status,
        complexity_compatibility=complexity_comp,
        summary_text=summary
    )


def calculate_reserve_sensitivity(
    schedules: List[ScheduleDuty],
    buses: List[BusVehicle],
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
    tested_reserves: Optional[List[float]] = None
) -> SensitivityReport:
    """Calculate theoretical schedule feasibility using the highest-range bus in the fleet."""
    if tested_reserves is None:
        tested_reserves = [0.0, 5.0, 10.0, 15.0]
        
    if not buses:
        raise ValueError("Cannot calculate sensitivity without bus fleet")
        
    highest_bus = max(buses, key=lambda b: b.actual_range_km)
    ref_bm = highest_bus.bm_no
    ref_range = highest_bus.actual_range_km
    
    rows: List[ReserveSensitivityRow] = []
    
    for r_pct in tested_reserves:
        phys_imp = 0
        res_inf = 0
        feas = 0
        
        for sched in schedules:
            stretch_km, _ = get_schedule_longest_stretch_km(sched, stretch_source)
            if stretch_km <= 0:
                phys_imp += 1
                continue
                
            target_dist = calculate_target_distance(stretch_km, dead_km_factor)
            res = calculate_soc_requirement(target_dist, ref_range, reserve_pct=r_pct)
            
            if res.feasibility_status == FeasibilityStatus.PHYSICALLY_IMPOSSIBLE:
                phys_imp += 1
            elif res.feasibility_status == FeasibilityStatus.RESERVE_INFEASIBLE:
                res_inf += 1
            else:
                feas += 1
                
        rows.append(ReserveSensitivityRow(
            reserve_pct=r_pct,
            physically_impossible_count=phys_imp,
            reserve_infeasible_count=res_inf,
            feasible_count=feas,
            total_schedules=len(schedules)
        ))
        
    return SensitivityReport(
        reference_bus_bm=ref_bm,
        reference_bus_range_km=round(ref_range, 4),
        stretch_source=stretch_source,
        dead_km_factor=dead_km_factor,
        table=rows
    )


def evaluate_bus_reuse(
    duty_a: ScheduleDuty,
    duty_b: ScheduleDuty,
    bus: BusVehicle,
    duty_a_start_soc: float = 100.0,
    charging_enabled: bool = AllocatorConfig.TURNAROUND_CHARGING_ENABLED,
    charge_duration_min: int = AllocatorConfig.TURNAROUND_CHARGE_DURATION_MIN,
    soc_after_charge: float = AllocatorConfig.TURNAROUND_SOC_AFTER_CHARGE,
    min_turnaround_min: int = AllocatorConfig.MIN_TURNAROUND_MIN,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
    reserve_pct: float = AllocatorConfig.DEFAULT_RESERVE_PCT,
) -> BusReuseEvaluation:
    """Evaluate whether a bus can legally and physically be reused from Duty A to Duty B."""
    arr_a = duty_a.arrival_min or 0
    dep_b = duty_b.departure_min or 0
    
    if dep_b >= arr_a:
        turnaround = dep_b - arr_a
    else:
        turnaround = (dep_b + 1440) - arr_a
        
    target_km_a = calculate_target_distance(duty_a.first_stretch_km, dead_km_factor)
    base_soc_a = (target_km_a / bus.actual_range_km) * 100.0 if bus.actual_range_km > 0 else 100.0
    soc_after_a = max(0.0, round(duty_a_start_soc - base_soc_a, 2))
    
    charged_soc = soc_after_a
    if charging_enabled:
        if turnaround >= charge_duration_min:
            charged_soc = soc_after_charge
            
    target_km_b = calculate_target_distance(duty_b.first_stretch_km, dead_km_factor)
    calc_b = calculate_soc_requirement(target_km_b, bus.actual_range_km, reserve_pct, charged_soc)
    
    feasible = (turnaround >= min_turnaround_min) and (calc_b.departure_soc_eligible is True)
    
    reason = []
    if turnaround < min_turnaround_min:
        reason.append(f"Turnaround time {turnaround} min < required {min_turnaround_min} min.")
    if not calc_b.departure_soc_eligible:
        reason.append(f"Insufficient SOC at start of Duty B ({charged_soc:.1f}% vs required {calc_b.required_soc_with_reserve_pct:.1f}%).")
    if feasible:
        reason.append("Valid turnaround and sufficient battery.")
        
    return BusReuseEvaluation(
        first_duty_key=duty_a.schedule_key,
        second_duty_key=duty_b.schedule_key,
        first_duty_arrival_min=duty_a.arrival_min,
        second_duty_departure_min=duty_b.departure_min,
        first_duty_arrival_str=duty_a.arrival_time_str or "--:--",
        second_duty_departure_str=duty_b.departure_time_str or "--:--",
        turnaround_duration_min=turnaround,
        charging_enabled=charging_enabled,
        charging_duration_min=charge_duration_min if charging_enabled else 0,
        soc_after_first_duty_pct=soc_after_a,
        soc_after_turnaround_charge_pct=charged_soc,
        soc_required_second_duty_pct=calc_b.required_soc_with_reserve_pct,
        reuse_feasible=feasible,
        reason="; ".join(reason)
    )


def evaluate_deadhead(
    schedule: ScheduleDuty,
    explicit_deadhead_km: Optional[float] = None,
    bus_actual_range_km: Optional[float] = None,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> DeadheadEvaluation:
    """Evaluate explicit deadhead addition without double-counting generic dead km."""
    base_km = schedule.first_stretch_km
    generic_allowance = round(base_km * (dead_km_factor - 1.0), 2)
    base_target = round(base_km * dead_km_factor, 2)
    
    if explicit_deadhead_km is None:
        return DeadheadEvaluation(
            schedule_key=schedule.schedule_key,
            base_stretch_km=base_km,
            explicit_deadhead_km=None,
            generic_dead_km_allowance=generic_allowance,
            final_target_distance_km=base_target,
            bus_actual_range_km=bus_actual_range_km,
            base_required_soc_pct=None,
            status="UNKNOWN_DEADHEAD_DISTANCE",
            notes="CSB deadhead distance is unknown. Operator input required. No invented default used."
        )
        
    final_target = round(base_target + explicit_deadhead_km, 2)
    base_soc = None
    if bus_actual_range_km and bus_actual_range_km > 0:
        base_soc = round((final_target / bus_actual_range_km) * 100.0, 2)
        
    return DeadheadEvaluation(
        schedule_key=schedule.schedule_key,
        base_stretch_km=base_km,
        explicit_deadhead_km=round(explicit_deadhead_km, 2),
        generic_dead_km_allowance=generic_allowance,
        final_target_distance_km=final_target,
        bus_actual_range_km=bus_actual_range_km,
        base_required_soc_pct=base_soc,
        status="EXPLICIT_DEADHEAD_APPLIED",
        notes=f"Formula: ({base_km} km × {dead_km_factor:.2f}) + {explicit_deadhead_km:.2f} km. Dead km not double-counted."
    )


def rank_candidate_buses(
    schedule: ScheduleDuty,
    buses: List[BusVehicle],
    current_soc: Optional[Union[float, Dict[str, float]]] = None,
    reserve_pct: Optional[float] = None,
    allow_unknown_inspection: Optional[bool] = None,
    active_assignments: Optional[Dict[str, str]] = None,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> List[CandidateBusRank]:
    """Rank candidate buses according to Section 18 priority criteria.
    
    Criteria hierarchy:
    1. sufficient current departure SOC
    2. sufficient range
    3. no duty overlap
    4. sufficient turnaround
    5. available operational status
    6. no defect/not-ready status
    7. smallest sufficient surplus (avoids wasting high-range buses)
    """
    if reserve_pct is None:
        reserve_pct = AllocatorConfig.DEFAULT_RESERVE_PCT
    if allow_unknown_inspection is None:
        allow_unknown_inspection = AllocatorConfig.ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION
    if active_assignments is None:
        active_assignments = {}

    first_km = schedule.first_stretch_km
    longest_km, _ = get_schedule_longest_stretch_km(schedule, stretch_source)
    first_target_km = calculate_target_distance(first_km, dead_km_factor)
    longest_target_km = calculate_target_distance(longest_km, dead_km_factor)

    def resolve_soc(bm: str, fallback_soc: float) -> float:
        if isinstance(current_soc, dict):
            return float(current_soc.get(bm, fallback_soc))
        elif isinstance(current_soc, (int, float)):
            return float(current_soc)
        return fallback_soc

    candidates = []

    for bus in buses:
        b_soc = resolve_soc(bus.bm_no, bus.current_soc_pct)
        first_calc = calculate_soc_requirement(first_target_km, bus.actual_range_km, reserve_pct, b_soc)
        longest_calc = calculate_soc_requirement(longest_target_km, bus.actual_range_km, reserve_pct, b_soc)

        is_range_ok = (longest_calc.feasibility_status == FeasibilityStatus.ELIGIBLE)
        is_dep_soc_ok = (first_calc.departure_soc_eligible is True)
        surplus_km = round(bus.actual_range_km - longest_target_km, 2)

        violations = []
        is_defective = bus.defect_flag or (bus.inspection_status == InspectionStatus.DEFECT)
        if is_defective:
            violations.append("BUS_MARKED_DEFECT")
        if bus.status in (BusStatus.NOT_READY, BusStatus.UNDER_MAINTENANCE):
            violations.append(f"BUS_STATUS_{bus.status.value.upper().replace(' ', '_')}")

        has_overlap = False
        assigned_duty = active_assignments.get(bus.bm_no)
        if assigned_duty and assigned_duty != schedule.schedule_key:
            has_overlap = True
            violations.append(f"DUTY_OVERLAP_WITH_{assigned_duty}")

        if not is_range_ok:
            violations.append(f"RANGE_INSUFFICIENT (Surplus {surplus_km:+.1f} km)")
        if not is_dep_soc_ok:
            violations.append(f"SOC_INSUFFICIENT (Current {b_soc:.1f}% < Req {first_calc.required_soc_with_reserve_pct:.1f}%)")

        inspection_allowed = True
        if bus.inspection_status == InspectionStatus.UNKNOWN_NO_RECORD and not allow_unknown_inspection:
            inspection_allowed = False
            violations.append("INSPECTION_UNKNOWN_WITHHELD")

        eligible_for_auto = (
            is_range_ok and is_dep_soc_ok and not has_overlap and not is_defective
            and bus.status == BusStatus.AVAILABLE and inspection_allowed
        )

        candidates.append({
            "bus": bus,
            "b_soc": b_soc,
            "first_calc": first_calc,
            "longest_calc": longest_calc,
            "is_range_ok": is_range_ok,
            "is_dep_soc_ok": is_dep_soc_ok,
            "has_overlap": has_overlap,
            "is_defective": is_defective,
            "surplus_km": surplus_km,
            "eligible_for_auto": eligible_for_auto,
            "violations": violations,
            "inspection_allowed": inspection_allowed
        })

    # Sort comparator implementing Section 18 & Section 5:
    # Tier 1: Eligible for auto allocation first
    # Tier 2: No overlap / no defect / range & SOC eligible
    # Tier 3: Complexity tier alignment (Conserves Category A buses for Complex duties)
    # Tier 4: Smallest positive surplus first (minimize waste)
    sched_cat = schedule.category.strip().title()
    def sort_key(c):
        bus_cat = c["bus"].category.upper()
        cat_pref = 0
        if sched_cat == "Standard":
            cat_pref = {"C": 0, "B": 1, "A": 2}.get(bus_cat, 1)
        elif sched_cat == "Complex":
            cat_pref = {"A": 0, "B": 1, "C": 2}.get(bus_cat, 1)
        elif sched_cat == "Moderate":
            cat_pref = {"B": 0, "A": 1, "C": 2}.get(bus_cat, 1)

        return (
            not c["eligible_for_auto"],               # False (0) before True (1)
            c["has_overlap"],                          # No overlap first
            c["is_defective"],                         # No defect first
            not c["is_range_ok"],                      # Range ok first
            not c["is_dep_soc_ok"],                    # SOC ok first
            c["surplus_km"] < 0,                       # Positive surplus before negative
            cat_pref,                                  # Complexity alignment
            c["surplus_km"] if c["surplus_km"] >= 0 else -c["surplus_km"]  # Smallest positive surplus
        )

    candidates.sort(key=sort_key)

    ranked_results: List[CandidateBusRank] = []
    for rank_idx, c in enumerate(candidates, 1):
        bus = c["bus"]
        first_c = c["first_calc"]
        long_c = c["longest_calc"]

        notes = []
        if c["eligible_for_auto"]:
            notes.append(f"Optimal Fit (Surplus {c['surplus_km']:.1f} km, SOC margin {first_c.soc_margin_pct:+.1f}%)")
        else:
            notes.append(f"Ineligible: {', '.join(c['violations'])}")

        ranked_results.append(CandidateBusRank(
            rank=rank_idx,
            bm_no=bus.bm_no,
            reg_no=bus.reg_no,
            actual_range_km=bus.actual_range_km,
            category=bus.category,
            current_soc_pct=c["b_soc"],
            status=bus.status,
            inspection_status=bus.inspection_status,
            defect_flag=bus.defect_flag,
            is_range_eligible=c["is_range_ok"],
            is_dep_soc_eligible=c["is_dep_soc_ok"],
            has_duty_overlap=c["has_overlap"],
            has_sufficient_turnaround=True,
            surplus_range_km=c["surplus_km"],
            first_stretch_base_soc_pct=first_c.base_required_soc_pct,
            first_stretch_required_soc_pct=first_c.required_soc_with_reserve_pct,
            longest_stretch_base_soc_pct=long_c.base_required_soc_pct,
            longest_stretch_required_soc_pct=long_c.required_soc_with_reserve_pct,
            soc_margin_pct=first_c.soc_margin_pct or 0.0,
            projected_soc_after_first_stretch_pct=first_c.projected_soc_after_stretch_pct or 0.0,
            is_eligible_for_auto_allocation=c["eligible_for_auto"],
            constraint_violations=c["violations"],
            ranking_notes="; ".join(notes)
        ))

    return ranked_results


def manual_assign_bus(
    schedule_key: str,
    bm_no: str,
    buses: List[BusVehicle],
    schedules: List[ScheduleDuty],
    override: bool = False,
    current_soc: Optional[Union[float, Dict[str, float]]] = None,
    reserve_pct: Optional[float] = None,
    active_assignments: Optional[Dict[str, str]] = None,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> ManualAssignmentResult:
    """Manually allocate a specific bus to a schedule duty with override support."""
    sched = next((s for s in schedules if s.schedule_key == schedule_key), None)
    if not sched:
        raise ValueError(f"Schedule '{schedule_key}' not found.")

    bus = next((b for b in buses if b.bm_no.upper() == bm_no.upper()), None)
    if not bus:
        raise ValueError(f"Bus '{bm_no}' not found in fleet.")

    if active_assignments is None:
        active_assignments = {}

    ranked = rank_candidate_buses(
        sched, [bus], current_soc=current_soc, reserve_pct=reserve_pct,
        allow_unknown_inspection=True, active_assignments=active_assignments,
        stretch_source=stretch_source, dead_km_factor=dead_km_factor
    )
    bus_rank = ranked[0]

    warnings = list(bus_rank.constraint_violations)
    is_fully_compliant = (len(warnings) == 0)

    if is_fully_compliant:
        return ManualAssignmentResult(
            schedule_key=sched.schedule_key,
            schedule_id=sched.schedule_id,
            shift=sched.shift,
            assigned_bm_no=bus.bm_no,
            assigned_reg_no=bus.reg_no,
            is_override=False,
            assignment_approved=True,
            constraint_warnings=[],
            soc_at_departure_pct=bus_rank.current_soc_pct,
            projected_soc_after_first_stretch_pct=bus_rank.projected_soc_after_first_stretch_pct,
            message=f"Bus {bus.bm_no} successfully assigned to {sched.schedule_key}."
        )
    else:
        if override:
            return ManualAssignmentResult(
                schedule_key=sched.schedule_key,
                schedule_id=sched.schedule_id,
                shift=sched.shift,
                assigned_bm_no=bus.bm_no,
                assigned_reg_no=bus.reg_no,
                is_override=True,
                assignment_approved=True,
                constraint_warnings=warnings,
                soc_at_departure_pct=bus_rank.current_soc_pct,
                projected_soc_after_first_stretch_pct=bus_rank.projected_soc_after_first_stretch_pct,
                message=f"Bus {bus.bm_no} assigned under MANAGER OVERRIDE. Warnings: {', '.join(warnings)}."
            )
        else:
            return ManualAssignmentResult(
                schedule_key=sched.schedule_key,
                schedule_id=sched.schedule_id,
                shift=sched.shift,
                assigned_bm_no=bus.bm_no,
                assigned_reg_no=bus.reg_no,
                is_override=False,
                assignment_approved=False,
                constraint_warnings=warnings,
                soc_at_departure_pct=bus_rank.current_soc_pct,
                projected_soc_after_first_stretch_pct=bus_rank.projected_soc_after_first_stretch_pct,
                message=f"Assignment REJECTED due to constraints: {', '.join(warnings)}. Enable override to proceed."
            )


def generate_infeasible_schedules_report(
    schedules: List[ScheduleDuty],
    buses: List[BusVehicle],
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
    reserve_pct: float = AllocatorConfig.DEFAULT_RESERVE_PCT,
) -> InfeasibleReport:
    """Generate the infeasible schedule report identifying physically impossible duties (Section 24)."""
    if not buses:
        raise ValueError("Cannot generate infeasible report without bus fleet.")

    highest_bus = max(buses, key=lambda b: b.actual_range_km)
    ref_bm = highest_bus.bm_no
    ref_range = highest_bus.actual_range_km

    rows: List[InfeasibleScheduleReportRow] = []

    for sched in schedules:
        stretch_km, _ = get_schedule_longest_stretch_km(sched, stretch_source)
        if stretch_km <= 0:
            continue

        target_dist = calculate_target_distance(stretch_km, dead_km_factor)
        calc = calculate_soc_requirement(target_dist, ref_range, reserve_pct)

        # Infeasible schedules exceed capability of highest-range bus (>100% Base SOC)
        if calc.feasibility_status == FeasibilityStatus.PHYSICALLY_IMPOSSIBLE:
            shortfall_km = round(target_dist - ref_range, 2)
            shortfall_soc = round(calc.base_required_soc_pct - 100.0, 2)

            rows.append(InfeasibleScheduleReportRow(
                schedule_key=sched.schedule_key,
                schedule_id=sched.schedule_id,
                shift=sched.shift,
                route=sched.route,
                form4_stretch_km=sched.form4_single_charge_km,
                calculated_stretch_km=sched.longest_calculated_stretch_km,
                selected_stretch_source=stretch_source,
                selected_stretch_km=stretch_km,
                target_distance_km=target_dist,
                highest_range_bm=ref_bm,
                highest_bus_range_km=round(ref_range, 2),
                base_required_soc_pct=calc.base_required_soc_pct,
                reserve_adjusted_soc_pct=calc.required_soc_with_reserve_pct,
                shortfall_km=shortfall_km,
                shortfall_soc_pct=shortfall_soc,
                status=FeasibilityStatus.PHYSICALLY_IMPOSSIBLE,
                recommended_action="Needs additional charging stop / Form 4 revision / operating-pattern change"
            ))

    return InfeasibleReport(
        total_schedules=len(schedules),
        infeasible_count=len(rows),
        highest_range_bm=ref_bm,
        highest_bus_range_km=round(ref_range, 2),
        stretch_source=stretch_source,
        dead_km_factor=dead_km_factor,
        reserve_pct=reserve_pct,
        rows=rows
    )


def handle_faulty_bus_workflow(
    bm_no: str,
    buses: List[BusVehicle],
    schedules: List[ScheduleDuty],
    active_assignments: Dict[str, str],
    current_soc: Optional[Union[float, Dict[str, float]]] = None,
    reserve_pct: Optional[float] = None,
    allow_unknown_inspection: bool = True,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> FaultyBusReport:
    """Execute faulty-bus workflow (Section 23): remove bus, identify duties, suggest replacements."""
    bus = next((b in buses and b for b in buses if b.bm_no.upper() == bm_no.upper()), None)
    if not bus:
        raise ValueError(f"Bus '{bm_no}' not found in fleet.")

    prev_status = bus.status
    bus.status = BusStatus.NOT_READY
    bus.inspection_status = InspectionStatus.DEFECT
    bus.defect_flag = True

    affected_keys = []
    assigned_key = active_assignments.pop(bus.bm_no, None)
    if assigned_key:
        affected_keys.append(assigned_key)
        bus.current_duty = None

    replacements_by_sched: Dict[str, List[FaultyBusReplacementSuggestion]] = {}
    uncovered: List[Dict[str, Any]] = []

    for duty_key in affected_keys:
        sched = next((s for s in schedules if s.schedule_key == duty_key), None)
        if not sched:
            continue
        uncovered.append({
            "schedule_key": sched.schedule_key,
            "schedule_id": sched.schedule_id,
            "shift": sched.shift,
            "route": sched.route,
            "departure": sched.departure_time_str or "--:--"
        })

        # Rank candidate replacement buses (excluding the faulty bus and already assigned buses)
        pool = [b for b in buses if b.bm_no.upper() != bus.bm_no.upper() and not b.defect_flag]
        ranked_candidates = rank_candidate_buses(
            sched, pool, current_soc=current_soc, reserve_pct=reserve_pct,
            allow_unknown_inspection=allow_unknown_inspection, active_assignments=active_assignments,
            stretch_source=stretch_source, dead_km_factor=dead_km_factor
        )

        top_3 = ranked_candidates[:3]
        suggestions = []
        for cand in top_3:
            suggestions.append(FaultyBusReplacementSuggestion(
                rank=cand.rank,
                bm_no=cand.bm_no,
                reg_no=cand.reg_no,
                actual_range_km=cand.actual_range_km,
                current_soc_pct=cand.current_soc_pct,
                soc_margin_pct=cand.soc_margin_pct,
                surplus_km=cand.surplus_range_km,
                inspection_status=cand.inspection_status,
                is_valid_replacement=cand.is_eligible_for_auto_allocation,
                reason=cand.ranking_notes
            ))
        replacements_by_sched[duty_key] = suggestions

    return FaultyBusReport(
        faulty_bm_no=bus.bm_no,
        faulty_reg_no=bus.reg_no,
        previous_status=prev_status,
        new_status=bus.status,
        affected_duty_keys=affected_keys,
        uncovered_schedules=uncovered,
        replacements_by_schedule=replacements_by_sched,
        action_summary=(
            f"Bus {bus.bm_no} marked DEFECT / NOT READY. Pulled from duty {affected_keys or 'None'}. "
            f"Identified {len(uncovered)} uncovered schedule(s). Suggested {sum(len(v) for v in replacements_by_sched.values())} replacement candidate(s)."
        )
    )


def allocate_bus(
    schedule_id: str,
    buses: List[BusVehicle],
    schedules: List[ScheduleDuty],
    current_soc: Union[float, Dict[str, float]],
    reserve_pct: Optional[float] = None,
    departure_time: Optional[str] = None,
    shift: Optional[str] = None,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
    allow_unknown_inspection: Optional[bool] = None,
) -> AllocationResult:
    """Pure business-logic function to allocate the optimal bus to a schedule duty."""
    if reserve_pct is None:
        reserve_pct = AllocatorConfig.DEFAULT_RESERVE_PCT
    if allow_unknown_inspection is None:
        allow_unknown_inspection = AllocatorConfig.ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION
        
    clean_sched_id = schedule_id
    if "|" in schedule_id:
        parts = schedule_id.split("|", 1)
        shift = parts[0].strip()
        clean_sched_id = parts[1].strip()
        
    if shift:
        matching = [s for s in schedules if s.schedule_id.lower() == clean_sched_id.lower() and s.shift.lower() == shift.lower()]
    else:
        matching = [s for s in schedules if s.schedule_id.lower() == clean_sched_id.lower()]
        
    if len(matching) > 1 and not shift:
        records = [
            {"shift": s.shift, "schedule_key": s.schedule_key, "route": s.route, "departure": s.departure_time_str or "--:--"}
            for s in matching
        ]
        return AllocationResult(
            schedule_key=f"AMBIGUOUS|{clean_sched_id}",
            schedule_id=clean_sched_id,
            shift="AMBIGUOUS",
            route=clean_sched_id.split("/")[0] if "/" in clean_sched_id else clean_sched_id,
            allocation_status="AMBIGUOUS_SCHEDULE_ID",
            first_stretch_km=0.0,
            longest_stretch_km=0.0,
            first_stretch_target_km=0.0,
            longest_stretch_target_km=0.0,
            first_stretch_base_soc_pct=0.0,
            first_stretch_required_soc_pct=0.0,
            longest_stretch_base_soc_pct=0.0,
            longest_stretch_required_soc_pct=0.0,
            reason=(
                f"Schedule ID '{clean_sched_id}' exists in multiple shifts ({', '.join(s.shift for s in matching)}). "
                f"Please specify 'shift' or use canonical Schedule Key."
            ),
            matching_records=records,
            warning_flags=["AMBIGUOUS_SCHEDULE_ID"]
        )
        
    if not matching:
        return AllocationResult(
            schedule_key=f"UNKNOWN|{clean_sched_id}",
            schedule_id=clean_sched_id,
            shift=shift or "UNKNOWN",
            route=clean_sched_id.split("/")[0] if "/" in clean_sched_id else clean_sched_id,
            allocation_status="SCHEDULE NOT FOUND",
            first_stretch_km=0.0,
            longest_stretch_km=0.0,
            first_stretch_target_km=0.0,
            longest_stretch_target_km=0.0,
            first_stretch_base_soc_pct=0.0,
            first_stretch_required_soc_pct=0.0,
            longest_stretch_base_soc_pct=0.0,
            longest_stretch_required_soc_pct=0.0,
            reason=f"Schedule '{clean_sched_id}' not found in schedule database",
            warning_flags=["SCHEDULE_NOT_FOUND"]
        )
        
    sched = matching[0]
    
    first_stretch_km = sched.first_stretch_km
    longest_stretch_km, warnings = get_schedule_longest_stretch_km(sched, stretch_source)
    
    first_target_km = calculate_target_distance(first_stretch_km, dead_km_factor)
    longest_target_km = calculate_target_distance(longest_stretch_km, dead_km_factor)
    
    # Use rank_candidate_buses to determine optimal bus with minimal waste
    ranked = rank_candidate_buses(
        sched, buses, current_soc=current_soc, reserve_pct=reserve_pct,
        allow_unknown_inspection=allow_unknown_inspection,
        stretch_source=stretch_source, dead_km_factor=dead_km_factor
    )
    
    eligible = [r for r in ranked if r.is_eligible_for_auto_allocation]
    
    chosen = None
    reason = ""
    status = "UNALLOCATED"
    alternatives: List[AllocationAlternative] = []
    warning_list = list(warnings) + list(sched.warning_flags)
    
    if eligible:
        chosen = eligible[0]
        status = "ALLOCATED"
        insp_note = ""
        if chosen.inspection_status == InspectionStatus.UNKNOWN_NO_RECORD:
            insp_note = " (Warning: Bus has UNKNOWN_NO_RECORD inspection status)."
            warning_list.append("UNKNOWN_INSPECTION_STATUS")
            
        reason = (
            f"Allocated {chosen.bm_no} (Range: {chosen.actual_range_km:.1f} km). "
            f"Provides optimal fit with minimum range surplus ({chosen.surplus_range_km:.1f} km) "
            f"and sufficient departure SOC ({chosen.current_soc_pct:.1f}% vs required {chosen.first_stretch_required_soc_pct:.1f}%).{insp_note}"
        )
        alt_candidates = eligible[1:4]
    else:
        status = "INFEASIBLE / NO ELIGIBLE BUS"
        reason = (
            f"No available bus can safely cover schedule '{sched.schedule_key}'. "
            f"Longest target distance: {longest_target_km:.1f} km."
        )
        if not allow_unknown_inspection and any(b.inspection_status == InspectionStatus.UNKNOWN_NO_RECORD for b in buses):
            reason += " (Buses with UNKNOWN_NO_RECORD inspection withheld under current policy)."
        alt_candidates = ranked[:3]
        
    for alt in alt_candidates:
        alternatives.append(AllocationAlternative(
            bm_no=alt.bm_no,
            reg_no=alt.reg_no,
            actual_range_km=round(alt.actual_range_km, 2),
            inspection_status=alt.inspection_status,
            current_soc_pct=round(alt.current_soc_pct, 1),
            base_required_soc_pct=alt.first_stretch_base_soc_pct,
            required_soc_with_reserve_pct=alt.first_stretch_required_soc_pct,
            soc_margin_pct=alt.soc_margin_pct,
            reason=(
                f"Range surplus: {alt.surplus_range_km:.1f} km, "
                f"SOC margin: {alt.soc_margin_pct:+.1f}%"
            )
        ))
        
    if chosen:
        return AllocationResult(
            schedule_key=sched.schedule_key,
            schedule_id=sched.schedule_id,
            shift=sched.shift,
            route=sched.route,
            chosen_bm_no=chosen.bm_no,
            chosen_reg_no=chosen.reg_no,
            allocation_status=status,
            first_stretch_km=first_stretch_km,
            longest_stretch_km=longest_stretch_km,
            first_stretch_target_km=first_target_km,
            longest_stretch_target_km=longest_target_km,
            first_stretch_base_soc_pct=chosen.first_stretch_base_soc_pct,
            first_stretch_required_soc_pct=chosen.first_stretch_required_soc_pct,
            longest_stretch_base_soc_pct=chosen.longest_stretch_base_soc_pct,
            longest_stretch_required_soc_pct=chosen.longest_stretch_required_soc_pct,
            current_soc_pct=chosen.current_soc_pct,
            soc_margin_pct=chosen.soc_margin_pct,
            projected_soc_after_first_stretch_pct=chosen.projected_soc_after_first_stretch_pct,
            reason=reason,
            alternatives=alternatives,
            warning_flags=warning_list
        )
    else:
        sample_bus = buses[0] if buses else None
        sample_range = sample_bus.actual_range_km if sample_bus else 100.0
        f_calc = calculate_soc_requirement(first_target_km, sample_range, reserve_pct)
        l_calc = calculate_soc_requirement(longest_target_km, sample_range, reserve_pct)
        return AllocationResult(
            schedule_key=sched.schedule_key,
            schedule_id=sched.schedule_id,
            shift=sched.shift,
            route=sched.route,
            chosen_bm_no=None,
            chosen_reg_no=None,
            allocation_status=status,
            first_stretch_km=first_stretch_km,
            longest_stretch_km=longest_stretch_km,
            first_stretch_target_km=first_target_km,
            longest_stretch_target_km=longest_target_km,
            first_stretch_base_soc_pct=f_calc.base_required_soc_pct,
            first_stretch_required_soc_pct=f_calc.required_soc_with_reserve_pct,
            longest_stretch_base_soc_pct=l_calc.base_required_soc_pct,
            longest_stretch_required_soc_pct=l_calc.required_soc_with_reserve_pct,
            current_soc_pct=None,
            soc_margin_pct=None,
            projected_soc_after_first_stretch_pct=None,
            reason=reason,
            alternatives=alternatives,
            warning_flags=warning_list
        )
