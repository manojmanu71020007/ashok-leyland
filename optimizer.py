"""Depot optimization, duty-chaining, Night Halt swap engine, dynamic spare pool,
and headway gap finder for Chandapura electric bus depot.

Pure business logic - no UI/Streamlit dependencies.
Implements:
- Compatible duty chain construction (Shift A -> Shift B chaining with turnaround validation)
- Multi-duty auto-allocation using scipy.optimize.linear_sum_assignment
- Mathematical cost matrix penalizing infeasibility, range waste, and excessive SOC surplus
- Strict hard constraint enforcement (defects, range shortfall, SOC, turnaround, maintenance)
- Night Halt assignment and swap detection from SCH DATA NH master roster
- General-shift unknown assignment handling for the 39 duties without NH records
- Dynamic operational spare pool engine based on temporal duty timeline (0..1439 min)
- Route headway gap finder (>60 min service intervals) with candidate spare bus recommendations
"""

from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any, Union
from collections import defaultdict
import numpy as np
from scipy.optimize import linear_sum_assignment

from models import (
    BusVehicle, BusStatus, InspectionStatus, ScheduleDuty, FeasibilityStatus,
    DutyChain, OptimizationAssignment, DepotOptimizationResult,
    NightHaltRecord, NightHaltSwapReport, DynamicSparePoolReport,
    HeadwayGapRecord, HeadwayGapReport, TripLeg
)
from allocator import (
    AllocatorConfig, calculate_target_distance, calculate_soc_requirement,
    get_schedule_longest_stretch_km, allocate_bus
)
from data_loader import load_night_halt_roster, format_minutes_to_time


def build_compatible_duty_chains(
    schedules: List[ScheduleDuty],
    min_turnaround_min: int = AllocatorConfig.MIN_TURNAROUND_MIN,
    stretch_source: str = AllocatorConfig.STRETCH_SOURCE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> List[DutyChain]:
    """Construct compatible duty chains for vehicle reuse.
    
    A bus can perform Duty A -> Duty B only when:
    Duty B departure >= Duty A arrival + min_turnaround_min (with midnight normalization).
    
    Compatible pairs between Shift A and Shift B on the same or compatible route are linked.
    General shift duties, Night Halt duties, and remaining unlinked duties become single-duty chains.
    """
    shift_a = [s for s in schedules if s.shift.strip().lower() == "shift a"]
    shift_b = [s for s in schedules if s.shift.strip().lower() == "shift b"]
    other_schedules = [s for s in schedules if s.shift.strip().lower() not in ("shift a", "shift b")]

    chains: List[DutyChain] = []
    used_shift_b_keys = set()
    used_shift_a_keys = set()

    # 1. Attempt to pair Shift A with Shift B on the same route with valid turnaround
    for s_a in shift_a:
        if s_a.arrival_min is None:
            continue
            
        best_b: Optional[ScheduleDuty] = None
        best_gap = 999999
        
        for s_b in shift_b:
            if s_b.schedule_key in used_shift_b_keys or s_b.departure_min is None:
                continue
                
            dep_b = s_b.departure_min
            arr_a = s_a.arrival_min
            
            # Calculate turnaround gap (handling 24h wraps if any)
            if dep_b >= arr_a:
                gap = dep_b - arr_a
            else:
                gap = (dep_b + 1440) - arr_a
                
            if gap >= min_turnaround_min:
                # Same schedule ID gets highest priority, then same route
                is_same_sched = (s_a.schedule_id.strip().lower() == s_b.schedule_id.strip().lower())
                is_same_route = (s_a.route.strip().upper() == s_b.route.strip().upper())
                if is_same_sched:
                    score = gap
                elif is_same_route:
                    score = gap + 1000
                else:
                    score = gap + 10000

                if score < best_gap:
                    best_gap = score
                    best_b = s_b
                    
        if best_b is not None and best_gap < 5000:  # Valid same schedule or same route match
            used_shift_a_keys.add(s_a.schedule_key)
            used_shift_b_keys.add(best_b.schedule_key)
            
            km_a, _ = get_schedule_longest_stretch_km(s_a, stretch_source)
            km_b, _ = get_schedule_longest_stretch_km(best_b, stretch_source)
            target_a = calculate_target_distance(km_a, dead_km_factor)
            target_b = calculate_target_distance(km_b, dead_km_factor)
            first_target_a = calculate_target_distance(s_a.first_stretch_km, dead_km_factor)
            
            # Turnaround duration
            dep_b = best_b.departure_min or 0
            arr_a = s_a.arrival_min or 0
            turnaround = (dep_b - arr_a) if dep_b >= arr_a else (dep_b + 1440 - arr_a)
            
            cat_priority = {"Complex": 3, "Moderate": 2, "Standard": 1}
            cat = "Complex" if max(cat_priority.get(s_a.category, 1), cat_priority.get(best_b.category, 1)) == 3 else (
                "Moderate" if max(cat_priority.get(s_a.category, 1), cat_priority.get(best_b.category, 1)) == 2 else "Standard"
            )
            
            chains.append(DutyChain(
                chain_id=f"CHAIN|{s_a.schedule_key}-->{best_b.schedule_key}",
                schedule_keys=[s_a.schedule_key, best_b.schedule_key],
                schedules=[s_a, best_b],
                shifts=[s_a.shift, best_b.shift],
                route=s_a.route,
                total_target_distance_km=round(target_a + target_b, 2),
                max_target_distance_km=round(max(target_a, target_b), 2),
                first_stretch_target_km=first_target_a,
                category=cat,
                departure_min=s_a.departure_min,
                arrival_min=best_b.arrival_min,
                departure_time_str=s_a.departure_time_str or "--:--",
                arrival_time_str=best_b.arrival_time_str or "--:--",
                turnaround_duration_min=turnaround,
                is_multi_duty=True
            ))

    # 2. Add unchained Shift A schedules
    for s_a in shift_a:
        if s_a.schedule_key not in used_shift_a_keys:
            km, _ = get_schedule_longest_stretch_km(s_a, stretch_source)
            target = calculate_target_distance(km, dead_km_factor)
            first_target = calculate_target_distance(s_a.first_stretch_km, dead_km_factor)
            chains.append(DutyChain(
                chain_id=s_a.schedule_key,
                schedule_keys=[s_a.schedule_key],
                schedules=[s_a],
                shifts=[s_a.shift],
                route=s_a.route,
                total_target_distance_km=target,
                max_target_distance_km=target,
                first_stretch_target_km=first_target,
                category=s_a.category,
                departure_min=s_a.departure_min,
                arrival_min=s_a.arrival_min,
                departure_time_str=s_a.departure_time_str or "--:--",
                arrival_time_str=s_a.arrival_time_str or "--:--",
                turnaround_duration_min=0,
                is_multi_duty=False
            ))

    # 3. Add unchained Shift B schedules
    for s_b in shift_b:
        if s_b.schedule_key not in used_shift_b_keys:
            km, _ = get_schedule_longest_stretch_km(s_b, stretch_source)
            target = calculate_target_distance(km, dead_km_factor)
            first_target = calculate_target_distance(s_b.first_stretch_km, dead_km_factor)
            chains.append(DutyChain(
                chain_id=s_b.schedule_key,
                schedule_keys=[s_b.schedule_key],
                schedules=[s_b],
                shifts=[s_b.shift],
                route=s_b.route,
                total_target_distance_km=target,
                max_target_distance_km=target,
                first_stretch_target_km=first_target,
                category=s_b.category,
                departure_min=s_b.departure_min,
                arrival_min=s_b.arrival_min,
                departure_time_str=s_b.departure_time_str or "--:--",
                arrival_time_str=s_b.arrival_time_str or "--:--",
                turnaround_duration_min=0,
                is_multi_duty=False
            ))

    # 4. Add all other schedules (General Shift & Night Halt)
    for s in other_schedules:
        km, _ = get_schedule_longest_stretch_km(s, stretch_source)
        target = calculate_target_distance(km, dead_km_factor)
        first_target = calculate_target_distance(s.first_stretch_km, dead_km_factor)
        chains.append(DutyChain(
            chain_id=s.schedule_key,
            schedule_keys=[s.schedule_key],
            schedules=[s],
            shifts=[s.shift],
            route=s.route,
            total_target_distance_km=target,
            max_target_distance_km=target,
            first_stretch_target_km=first_target,
            category=s.category,
            departure_min=s.departure_min,
            arrival_min=s.arrival_min,
            departure_time_str=s.departure_time_str or "--:--",
            arrival_time_str=s.arrival_time_str or "--:--",
            turnaround_duration_min=0,
            is_multi_duty=False
        ))

    return chains


def optimize_depot_allocation(
    duty_chains: List[DutyChain],
    buses: List[BusVehicle],
    current_soc: Union[float, Dict[str, float]] = 100.0,
    reserve_pct: float = AllocatorConfig.DEFAULT_RESERVE_PCT,
    allow_unknown_inspection: bool = AllocatorConfig.ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION,
    turnaround_charging_enabled: bool = AllocatorConfig.TURNAROUND_CHARGING_ENABLED,
    turnaround_charge_duration_min: int = AllocatorConfig.TURNAROUND_CHARGE_DURATION_MIN,
    turnaround_soc_after_charge: float = AllocatorConfig.TURNAROUND_SOC_AFTER_CHARGE,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> DepotOptimizationResult:
    """Optimize bus-to-duty-chain assignment across the entire depot using linear_sum_assignment.
    
    Hard constraints:
    - Defective or Under-Maintenance buses are never allocated.
    - Buses with UNKNOWN_NO_RECORD inspection status are withheld unless allow_unknown_inspection=True.
    - Physical range feasibility: Bus Actual Range >= Target Distance.
    - Battery SOC feasibility: Current SOC >= First Stretch Required SOC + Reserve.
    - For duty chains: If turnaround charging is disabled, remaining SOC after Duty A must satisfy Duty B.
    
    Cost matrix formulation:
    - Severe penalty (10^7) for hard constraint violations.
    - Prefer matching complexity tiers:
      * Standard routes prefer Category C/B to conserve Category A.
      * Complex routes prefer Category A.
    - Penalize excessive surplus range (conserve high-range buses).
    - Penalize excessive SOC surplus.
    """
    num_chains = len(duty_chains)
    num_buses = len(buses)

    if num_chains == 0 or num_buses == 0:
        return DepotOptimizationResult(
            total_schedules=sum(len(c.schedule_keys) for c in duty_chains),
            total_chains=num_chains,
            allocated_chains_count=0,
            allocated_schedules_count=0,
            unallocated_schedules_count=sum(len(c.schedule_keys) for c in duty_chains),
            assignments=[],
            unallocated_schedules=[],
            metric_summary={"reason": "Empty duty chains or empty fleet"}
        )

    # Cost matrix initialized to a high penalty value
    INFEASIBLE_PENALTY = 10_000_000.0
    cost_matrix = np.full((num_chains, num_buses), INFEASIBLE_PENALTY, dtype=float)

    # Pre-cache bus SOC lookups
    def get_bus_soc(bm: str) -> float:
        if isinstance(current_soc, dict):
            return float(current_soc.get(bm.upper(), 100.0))
        return float(current_soc)

    # Evaluate each (chain, bus) pair
    for i, chain in enumerate(duty_chains):
        for j, bus in enumerate(buses):
            # --- Hard constraint 1: Defect and Inspection status ---
            if bus.defect_flag or bus.inspection_status == InspectionStatus.DEFECT:
                continue
            if bus.status in (BusStatus.UNDER_MAINTENANCE, BusStatus.NOT_READY):
                continue
            if not allow_unknown_inspection and bus.inspection_status == InspectionStatus.UNKNOWN_NO_RECORD:
                continue

            bus_soc = get_bus_soc(bus.bm_no)

            # --- Hard constraint 2: Physical Range Feasibility ---
            if chain.is_multi_duty and len(chain.schedules) == 2:
                s_a, s_b = chain.schedules[0], chain.schedules[1]
                km_a, _ = get_schedule_longest_stretch_km(s_a)
                km_b, _ = get_schedule_longest_stretch_km(s_b)
                target_a = calculate_target_distance(km_a, dead_km_factor)
                target_b = calculate_target_distance(km_b, dead_km_factor)

                if bus.actual_range_km < target_a or bus.actual_range_km < target_b:
                    continue  # Range physically impossible for one of the duties

                # Combined range check if turnaround charging is NOT enabled
                if not turnaround_charging_enabled:
                    if bus.actual_range_km < (target_a + target_b):
                        continue

                # --- Hard constraint 3: Battery SOC Feasibility ---
                calc_a = calculate_soc_requirement(target_a, bus.actual_range_km, reserve_pct, bus_soc)
                if not calc_a.departure_soc_eligible:
                    continue

                # SOC for second duty
                if turnaround_charging_enabled and chain.turnaround_duration_min >= turnaround_charge_duration_min:
                    soc_start_b = turnaround_soc_after_charge
                else:
                    soc_start_b = bus_soc - calc_a.base_required_soc_pct

                calc_b = calculate_soc_requirement(target_b, bus.actual_range_km, reserve_pct, soc_start_b)
                if not calc_b.departure_soc_eligible:
                    continue

                eval_target = chain.max_target_distance_km
                eval_req_soc = calc_a.required_soc_with_reserve_pct

            else:
                # Single duty chain
                target_dist = chain.max_target_distance_km
                if bus.actual_range_km < target_dist:
                    continue  # Physically impossible

                calc = calculate_soc_requirement(chain.first_stretch_target_km, bus.actual_range_km, reserve_pct, bus_soc)
                if not calc.departure_soc_eligible:
                    continue

                eval_target = target_dist
                eval_req_soc = calc.required_soc_with_reserve_pct

            # --- Feasible: Compute Optimization Cost ---
            base_cost = 10.0

            # 1. Complexity Tier Preservation Penalty
            cat_penalty = 0.0
            bus_cat = bus.category.upper()
            duty_cat = chain.category.lower()

            if "complex" in duty_cat:
                if bus_cat == "A":
                    cat_penalty = 0.0
                elif bus_cat == "B":
                    cat_penalty = 150.0
                else:
                    cat_penalty = 350.0
            elif "moderate" in duty_cat:
                if bus_cat == "B":
                    cat_penalty = 0.0
                elif bus_cat == "A":
                    cat_penalty = 60.0  # Slight penalty to save Cat A for Complex
                else:
                    cat_penalty = 120.0
            else:  # Standard / Simple
                if bus_cat == "C":
                    cat_penalty = 0.0
                elif bus_cat == "B":
                    cat_penalty = 40.0
                else:
                    cat_penalty = 200.0  # Strongly penalize wasting Cat A on Standard routes

            # 2. Range Surplus Penalty (conserve high-range buses)
            surplus_km = max(0.0, bus.actual_range_km - eval_target)
            surplus_cost = surplus_km * 0.4

            # 3. SOC Surplus Penalty (prefer closest safe margin)
            soc_margin = max(0.0, bus_soc - eval_req_soc)
            soc_cost = soc_margin * 0.15

            total_cost = base_cost + cat_penalty + surplus_cost + soc_cost
            cost_matrix[i, j] = total_cost

    # Run Hungarian algorithm
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    # Process assignment results
    assignments: List[OptimizationAssignment] = []
    unallocated: List[Dict[str, Any]] = []
    total_opt_cost = 0.0
    phys_imp_count = 0
    soc_const_count = 0

    assigned_row_set = set()

    for r_idx, c_idx in zip(row_ind, col_ind):
        chain = duty_chains[r_idx]
        bus = buses[c_idx]
        cost_val = cost_matrix[r_idx, c_idx]
        assigned_row_set.add(r_idx)

        bus_soc = get_bus_soc(bus.bm_no)

        if cost_val >= (INFEASIBLE_PENALTY / 2):
            # Assignment was forced on an infeasible bus
            status = "UNALLOCATED_INFEASIBLE"
            reason = "No eligible bus available meeting range, SOC, or inspection clearance"
            if bus.actual_range_km < chain.max_target_distance_km:
                phys_imp_count += 1
                reason = f"Target distance ({chain.max_target_distance_km:.1f} km) exceeds bus range ({bus.actual_range_km:.1f} km)"
            else:
                soc_const_count += 1
                reason = "Insufficient battery SOC or unconfirmed inspection clearance"

            assignments.append(OptimizationAssignment(
                chain_id=chain.chain_id,
                schedule_keys=chain.schedule_keys,
                shifts=chain.shifts,
                route=chain.route,
                duty_category=chain.category,
                assigned_bm_no=None,
                assigned_reg_no=None,
                bus_actual_range_km=None,
                bus_category=None,
                current_soc_pct=None,
                required_soc_pct=None,
                soc_margin_pct=None,
                surplus_range_km=None,
                cost=cost_val,
                is_feasible=False,
                allocation_status=status,
                reason=reason
            ))
            for skey in chain.schedule_keys:
                unallocated.append({
                    "schedule_key": skey,
                    "chain_id": chain.chain_id,
                    "route": chain.route,
                    "target_distance_km": chain.max_target_distance_km,
                    "reason": reason
                })
        else:
            # Successfully allocated
            total_opt_cost += cost_val
            surplus = round(bus.actual_range_km - chain.max_target_distance_km, 2)
            req_soc = round((chain.first_stretch_target_km / bus.actual_range_km) * 100.0 + reserve_pct, 2)
            margin = round(bus_soc - req_soc, 2)

            assignments.append(OptimizationAssignment(
                chain_id=chain.chain_id,
                schedule_keys=chain.schedule_keys,
                shifts=chain.shifts,
                route=chain.route,
                duty_category=chain.category,
                assigned_bm_no=bus.bm_no,
                assigned_reg_no=bus.reg_no,
                bus_actual_range_km=bus.actual_range_km,
                bus_category=bus.category,
                current_soc_pct=bus_soc,
                required_soc_pct=req_soc,
                soc_margin_pct=margin,
                surplus_range_km=surplus,
                cost=round(cost_val, 2),
                is_feasible=True,
                allocation_status="ALLOCATED",
                reason=(
                    f"Optimal match (Range: {bus.actual_range_km:.1f} km, Surplus: {surplus:+.1f} km, "
                    f"SOC Margin: {margin:+.1f}%, Cost: {cost_val:.1f})"
                )
            ))

    # Any unassigned chains (if num_chains > num_buses)
    for r_idx in range(num_chains):
        if r_idx not in assigned_row_set:
            chain = duty_chains[r_idx]
            assignments.append(OptimizationAssignment(
                chain_id=chain.chain_id,
                schedule_keys=chain.schedule_keys,
                shifts=chain.shifts,
                route=chain.route,
                duty_category=chain.category,
                assigned_bm_no=None,
                assigned_reg_no=None,
                bus_actual_range_km=None,
                bus_category=None,
                current_soc_pct=None,
                required_soc_pct=None,
                soc_margin_pct=None,
                surplus_range_km=None,
                cost=INFEASIBLE_PENALTY,
                is_feasible=False,
                allocation_status="UNALLOCATED_DEFICIT",
                reason="Fleet deficit: Total duty chains exceed available buses"
            ))
            for skey in chain.schedule_keys:
                unallocated.append({
                    "schedule_key": skey,
                    "chain_id": chain.chain_id,
                    "route": chain.route,
                    "target_distance_km": chain.max_target_distance_km,
                    "reason": "Fleet deficit: No remaining unassigned buses"
                })

    allocated_chains = sum(1 for a in assignments if a.is_feasible)
    allocated_scheds = sum(len(a.schedule_keys) for a in assignments if a.is_feasible)
    total_scheds = sum(len(c.schedule_keys) for c in duty_chains)

    return DepotOptimizationResult(
        total_schedules=total_scheds,
        total_chains=num_chains,
        allocated_chains_count=allocated_chains,
        allocated_schedules_count=allocated_scheds,
        unallocated_schedules_count=total_scheds - allocated_scheds,
        physically_impossible_count=phys_imp_count,
        soc_constrained_count=soc_const_count,
        total_optimization_cost=round(total_opt_cost, 2),
        assignments=assignments,
        unallocated_schedules=unallocated,
        metric_summary={
            "total_buses": num_buses,
            "allocated_chains": allocated_chains,
            "unallocated_chains": num_chains - allocated_chains,
            "allocation_rate_pct": round((allocated_scheds / total_scheds * 100), 1) if total_scheds > 0 else 0.0,
            "turnaround_charging_enabled": turnaround_charging_enabled
        }
    )


def evaluate_night_halt_and_swaps(
    schedules: List[ScheduleDuty],
    buses: List[BusVehicle],
    nh_roster_path: Path = Path("data/SCH_DATA_NH_new__1_.xlsx"),
    allow_unknown_inspection: bool = AllocatorConfig.ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> NightHaltSwapReport:
    """Implement Night Halt allocation and swap checking (Section 20 & Section 21).
    
    Compares:
    - FIX BM (fixed committed bus)
    - BM NO (actual operating bus recorded in SCH DATA NH)
    - REG NO
    - System Recommended BM (from allocation engine)
    
    Handles:
    - Midnight normalization (In Time < Out Time implies next calendar day)
    - Defect detection triggering immediate swap requirement
    - General-shift unknown assignments:
      For the ~39 General-shift schedules not in SCH DATA NH, sets Current Assignment = Unknown
      without guessing or inferring.
    """
    roster = load_night_halt_roster(nh_roster_path)
    buses_by_bm = {b.bm_no.upper(): b for b in buses}
    schedules_by_id = {s.schedule_id: s for s in schedules}

    nh_records: List[NightHaltRecord] = []
    general_records: List[NightHaltRecord] = []
    swaps_needed: List[NightHaltRecord] = []

    nh_scheds = [s for s in schedules if s.shift.strip().lower() == "night halt"]
    gen_scheds = [s for s in schedules if "gen" in s.shift.strip().lower()]

    # 1. Process Night Halt duties
    for sched in nh_scheds:
        r_entry = roster.get(sched.schedule_id, {})
        fix_bm = r_entry.get("fix_bm")
        fix_reg = r_entry.get("fix_reg")
        act_bm = r_entry.get("bm_no")
        act_reg = r_entry.get("reg_no")
        out_time = r_entry.get("out_time_min") or sched.departure_min
        in_time = r_entry.get("in_time_min") or sched.arrival_min

        crosses_midnight = False
        duration = 0
        if out_time is not None and in_time is not None:
            if in_time < out_time:
                crosses_midnight = True
                duration = (in_time + 1440) - out_time
            else:
                duration = in_time - out_time

        # Allocate optimal bus using system allocator
        alloc_res = allocate_bus(
            schedule_id=sched.schedule_key,
            buses=buses,
            schedules=schedules,
            current_soc=100.0,
            allow_unknown_inspection=allow_unknown_inspection,
            dead_km_factor=dead_km_factor
        )
        rec_bm = alloc_res.chosen_bm_no
        rec_reg = alloc_res.chosen_reg_no

        # Check mismatch & swap requirement
        is_mismatch = (fix_bm is not None and act_bm is not None and fix_bm.upper() != act_bm.upper())
        swap_required = False
        reasons = []

        if is_mismatch:
            reasons.append(f"Fixed bus {fix_bm} differs from actual running bus {act_bm}")
            swap_required = True

        # Check if actual bus is defective
        if act_bm:
            bus_obj = buses_by_bm.get(act_bm.upper())
            if bus_obj and (bus_obj.defect_flag or bus_obj.inspection_status == InspectionStatus.DEFECT):
                reasons.append(f"Actual bus {act_bm} has active DEFECT / NOT READY flag")
                swap_required = True

        # Check if actual bus has insufficient range
        if act_bm:
            bus_obj = buses_by_bm.get(act_bm.upper())
            km, _ = get_schedule_longest_stretch_km(sched)
            target = calculate_target_distance(km, dead_km_factor)
            if bus_obj and bus_obj.actual_range_km < target:
                reasons.append(f"Actual bus {act_bm} range ({bus_obj.actual_range_km:.1f} km) < target ({target:.1f} km)")
                swap_required = True

        if r_entry.get("swap_info"):
            reasons.append(f"Roster swap annotation: {r_entry['swap_info']}")
            swap_required = True

        if not reasons:
            reasons.append("Fixed and actual assignments aligned; compliant range and SOC")

        rec = NightHaltRecord(
            schedule_id=sched.schedule_id,
            schedule_key=sched.schedule_key,
            shift=sched.shift,
            route=sched.route,
            fix_bm=fix_bm,
            fix_reg=fix_reg,
            actual_bm=act_bm,
            actual_reg=act_reg,
            recommended_bm=rec_bm,
            recommended_reg=rec_reg,
            out_time_min=out_time,
            in_time_min=in_time,
            out_time_str=format_minutes_to_time(out_time),
            in_time_str=format_minutes_to_time(in_time),
            crosses_midnight=crosses_midnight,
            duration_min=duration,
            is_mismatch=is_mismatch,
            swap_required=swap_required,
            current_assignment_status="ASSIGNED" if act_bm else "UNASSIGNED",
            reason="; ".join(reasons)
        )
        nh_records.append(rec)
        if swap_required:
            swaps_needed.append(rec)

    # 2. Process General Shift duties (Unknown assignment logic)
    for sched in gen_scheds:
        r_entry = roster.get(sched.schedule_id)
        if r_entry:
            # Present in roster
            act_bm = r_entry.get("bm_no")
            act_reg = r_entry.get("reg_no")
            status = "ASSIGNED" if act_bm else "UNKNOWN"
        else:
            # 39 General-shift duties without NH records: MUST NOT GUESS
            act_bm = "Unknown"
            act_reg = "Unknown"
            status = "UNKNOWN"

        alloc_res = allocate_bus(
            schedule_id=sched.schedule_key,
            buses=buses,
            schedules=schedules,
            current_soc=100.0,
            allow_unknown_inspection=allow_unknown_inspection,
            dead_km_factor=dead_km_factor
        )

        rec = NightHaltRecord(
            schedule_id=sched.schedule_id,
            schedule_key=sched.schedule_key,
            shift=sched.shift,
            route=sched.route,
            fix_bm=None,
            fix_reg=None,
            actual_bm=act_bm,
            actual_reg=act_reg,
            recommended_bm=alloc_res.chosen_bm_no,
            recommended_reg=alloc_res.chosen_reg_no,
            out_time_min=sched.departure_min,
            in_time_min=sched.arrival_min,
            out_time_str=sched.departure_time_str or "--:--",
            in_time_str=sched.arrival_time_str or "--:--",
            crosses_midnight=(sched.arrival_min < sched.departure_min) if sched.arrival_min and sched.departure_min else False,
            duration_min=0,
            is_mismatch=False,
            swap_required=False,
            current_assignment_status=status,
            reason="Current assignment not present in SCH DATA NH roster (classified as Unknown)" if status == "UNKNOWN" else "Roster record exists"
        )
        general_records.append(rec)

    unknown_gen_count = sum(1 for g in general_records if g.current_assignment_status == "UNKNOWN")

    return NightHaltSwapReport(
        total_nh_schedules=len(nh_scheds),
        total_general_schedules=len(gen_scheds),
        general_unknown_count=unknown_gen_count,
        swap_required_count=len(swaps_needed),
        nh_records=nh_records,
        general_records=general_records,
        swaps_needed=swaps_needed
    )


def calculate_dynamic_spare_pool(
    schedules: List[ScheduleDuty],
    buses: List[BusVehicle],
    reference_time_min: Optional[int] = None,
) -> DynamicSparePoolReport:
    """Calculate the operational spare pool using temporal duty-chain model (Section 22).
    
    Computes simultaneous peak vehicle demand across the 24h timeline (0..1439 min).
    Spare pool = Total Fleet - Committed In-Service - Defective - Under Maintenance.
    Does not hardcode spare pool numbers or define spares merely as VEH.NO minus SCH DATA NH.
    """
    total_fleet = len(buses)

    # 1. Build minute-by-minute timeline of active duty demand
    timeline = [0] * 1440
    for s in schedules:
        if s.departure_min is not None and s.arrival_min is not None:
            dep = s.departure_min
            arr = s.arrival_min
            if arr < dep:  # Crosses midnight: active dep..1439 and 0..arr
                for m in range(dep, 1440):
                    timeline[m] += 1
                for m in range(0, arr + 1):
                    timeline[m] += 1
            else:
                for m in range(dep, arr + 1):
                    timeline[m] += 1

    peak_demand = max(timeline) if timeline else 0
    peak_min = timeline.index(peak_demand) if timeline else 0
    peak_str = f"{peak_min // 60:02d}:{peak_min % 60:02d}"

    # Hourly aggregated timeline
    hourly_timeline = []
    for h in range(24):
        sample_m = h * 60 + 30
        hourly_timeline.append({
            "hour": h,
            "time_str": f"{h:02d}:00",
            "active_buses": timeline[sample_m]
        })

    # 2. Bus status counts
    defective_count = sum(1 for b in buses if b.defect_flag or b.inspection_status == InspectionStatus.DEFECT)
    maintenance_count = sum(1 for b in buses if b.status == BusStatus.UNDER_MAINTENANCE)

    # Operational spare pool at peak
    operational_spares = max(0, total_fleet - peak_demand - defective_count - maintenance_count)

    # 3. Determine committed vs free buses at reference time
    ref_min = reference_time_min if reference_time_min is not None else peak_min
    active_buses_at_ref = timeline[ref_min]
    currently_free = max(0, total_fleet - active_buses_at_ref - defective_count - maintenance_count)

    # Spare bus list (available, non-defective buses)
    spare_buses_list = []
    for b in buses:
        if not b.defect_flag and b.status == BusStatus.AVAILABLE and b.inspection_status != InspectionStatus.DEFECT:
            spare_buses_list.append({
                "bm_no": b.bm_no,
                "reg_no": b.reg_no,
                "actual_range_km": b.actual_range_km,
                "category": b.category,
                "current_soc_pct": b.current_soc_pct,
                "status": b.status.value,
                "inspection_status": b.inspection_status.value
            })

    return DynamicSparePoolReport(
        total_fleet=total_fleet,
        peak_simultaneous_demand=peak_demand,
        peak_time_window_str=peak_str,
        committed_in_service=active_buses_at_ref,
        defective_count=defective_count,
        under_maintenance_count=maintenance_count,
        currently_free_count=currently_free,
        operational_spare_pool_count=operational_spares,
        spare_buses=spare_buses_list,
        demand_timeline=hourly_timeline
    )


def find_route_headway_gaps(
    schedules: List[ScheduleDuty],
    buses: List[BusVehicle],
    trips_by_key: Optional[Dict[str, List[TripLeg]]] = None,
    gap_threshold_min: int = 60,
    dead_km_factor: float = AllocatorConfig.DEAD_KM_FACTOR,
) -> HeadwayGapReport:
    """Identify service headway intervals exceeding gap_threshold_min (Section 27).
    
    For every route and origin:
    1. Sort departures chronologically.
    2. Calculate headway gaps between consecutive departures.
    3. Flag intervals > 60 min.
    4. Identify candidate spare buses with sufficient SOC and range.
    5. Prefer lower-range buses (Category C or B) for Standard routes to conserve Category A.
    """
    # Group schedules by (route, origin)
    route_origin_departures = defaultdict(list)

    for s in schedules:
        if s.departure_min is None:
            continue
        origin = "CHANDAPURA"
        if trips_by_key and s.schedule_key in trips_by_key:
            legs = trips_by_key[s.schedule_key]
            if legs and legs[0].origin:
                origin = legs[0].origin.strip().upper()
        elif s.stretches and s.stretches[0].legs:
            origin = s.stretches[0].legs[0].origin.strip().upper()

        route_origin_departures[(s.route.strip().upper(), origin)].append(s)

    gaps: List[HeadwayGapRecord] = []

    for (route_str, origin_str), sched_list in route_origin_departures.items():
        if len(sched_list) < 2:
            continue

        sched_list.sort(key=lambda s: s.departure_min or 0)

        for i in range(len(sched_list) - 1):
            s_curr = sched_list[i]
            s_next = sched_list[i + 1]

            dep_curr = s_curr.departure_min or 0
            dep_next = s_next.departure_min or 0
            gap_duration = dep_next - dep_curr

            if gap_duration > gap_threshold_min:
                # Find candidate spare buses with sufficient range & SOC
                km_needed, _ = get_schedule_longest_stretch_km(s_curr)
                target_dist = calculate_target_distance(km_needed, dead_km_factor)

                candidates = []
                for b in buses:
                    if b.defect_flag or b.status != BusStatus.AVAILABLE:
                        continue
                    if b.actual_range_km >= target_dist:
                        req_soc = calculate_soc_requirement(target_dist, b.actual_range_km, 0.0, b.current_soc_pct)
                        if req_soc.departure_soc_eligible:
                            surplus = b.actual_range_km - target_dist
                            candidates.append({
                                "bm_no": b.bm_no,
                                "reg_no": b.reg_no,
                                "actual_range_km": b.actual_range_km,
                                "category": b.category,
                                "current_soc_pct": b.current_soc_pct,
                                "surplus_range_km": round(surplus, 1),
                                "soc_margin_pct": req_soc.soc_margin_pct
                            })

                # Sort candidates: prefer lower surplus to conserve Category A buses
                # For Standard routes, prioritize Category C, then B, then A
                is_standard = "standard" in s_curr.category.lower()
                cat_order = {"C": 1, "B": 2, "A": 3} if is_standard else {"A": 1, "B": 2, "C": 3}
                candidates.sort(key=lambda c: (cat_order.get(c["category"], 9), c["surplus_range_km"]))

                rec_bus = candidates[0]["bm_no"] if candidates else None
                rec_reg = candidates[0]["reg_no"] if candidates else None
                notes = (
                    f"Selected {rec_bus} ({candidates[0]['category']}) conserving higher-range capacity"
                    if candidates else "No free spare bus with required range/SOC"
                )

                gaps.append(HeadwayGapRecord(
                    route=route_str,
                    origin=origin_str,
                    prev_departure_str=s_curr.departure_time_str or "--:--",
                    next_departure_str=s_next.departure_time_str or "--:--",
                    prev_schedule_key=s_curr.schedule_key,
                    next_schedule_key=s_next.schedule_key,
                    gap_minutes=gap_duration,
                    candidate_spare_buses=candidates[:5],
                    recommended_bus=rec_bus,
                    recommended_reg=rec_reg,
                    notes=notes
                ))

    return HeadwayGapReport(
        total_routes_analyzed=len(route_origin_departures),
        gap_threshold_min=gap_threshold_min,
        gaps_found_count=len(gaps),
        gaps=gaps
    )
