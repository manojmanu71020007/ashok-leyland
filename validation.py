"""Validation and stretch analysis engine for Form 4 operational schedules.

Provides:
- 4 candidate stretch rule implementations (Rule A, Rule B, Rule C, Rule D)
- Evaluation against Consolidation Form 4 Single-Charge values
- Operational stretch segmentation (First Stretch, Longest Stretch)
- Form 4 vs Calculated consistency status classification:
  - OK
  - FIRST_STRETCH_EXCEEDS_FORM4
  - CALCULATED_LONGEST_EXCEEDS_FORM4
  - MISSING_FORM4
  - DATA_CONFLICT
"""

from typing import List, Dict, Tuple, Optional, Callable
from models import TripLeg, ScheduleDuty, StretchInfo, RuleEvaluationResult, ConsistencyStatus


def split_rule_a(prev_leg: Optional[TripLeg], curr_leg: TripLeg) -> bool:
    """Rule A: Split at charging rows only."""
    return curr_leg.is_charging_event


def split_rule_b(prev_leg: Optional[TripLeg], curr_leg: TripLeg) -> bool:
    """Rule B: Split at charging rows + explicit break / rest stops."""
    if curr_leg.is_charging_event:
        return True
    if prev_leg is not None and prev_leg.rest_str is not None and prev_leg.rest_str.strip() != "":
        return True
    return False


def split_rule_c(prev_leg: Optional[TripLeg], curr_leg: TripLeg) -> bool:
    """Rule C: Split at charging rows + overnight operational boundaries.
    
    Overnight boundary occurs when:
    - Next departure clock time < previous arrival clock time (crossed midnight)
    - Or overnight gap between scheduled trips >= 240 minutes (4+ hours layover)
    """
    if curr_leg.is_charging_event:
        return True
    if prev_leg is None:
        return False
    if prev_leg.arrival_min is None or curr_leg.departure_min is None:
        return False
        
    if curr_leg.departure_min < prev_leg.arrival_min:
        return True
        
    gap = curr_leg.departure_min - prev_leg.arrival_min
    if gap >= 240:
        return True
        
    return False


def split_rule_d(prev_leg: Optional[TripLeg], curr_leg: TripLeg) -> bool:
    """Rule D: Split at charging rows + significant scheduled stops (>= 45 min)."""
    if curr_leg.is_charging_event:
        return True
    if prev_leg is None:
        return False
    if prev_leg.arrival_min is None or curr_leg.departure_min is None:
        return False
        
    if curr_leg.departure_min < prev_leg.arrival_min:
        gap = (curr_leg.departure_min + 1440) - prev_leg.arrival_min
    else:
        gap = curr_leg.departure_min - prev_leg.arrival_min
        
    return gap >= 45


CANDIDATE_RULES: Dict[str, Tuple[str, Callable[[Optional[TripLeg], TripLeg], bool]]] = {
    "Rule A": ("Charging Only (Splits only at explicit charging events)", split_rule_a),
    "Rule B": ("Charging + Explicit Breaks (Splits at charging + Rest column entries)", split_rule_b),
    "Rule C": ("Charging + Overnight Boundaries (Splits at charging + overnight halts / midnight reset)", split_rule_c),
    "Rule D": ("Charging + Significant Stops (Splits at charging + scheduled layovers >= 45 min)", split_rule_d),
}


def segment_schedule_stretches(
    legs: List[TripLeg],
    split_fn: Callable[[Optional[TripLeg], TripLeg], bool],
    dead_km_factor: float = 1.10
) -> List[StretchInfo]:
    """Segment an ordered list of duty legs into operational battery stretches."""
    stretches: List[StretchInfo] = []
    current_stretch_legs: List[TripLeg] = []
    current_stretch_km = 0.0
    prev_leg: Optional[TripLeg] = None
    stretch_idx = 1
    
    for leg in legs:
        if leg.is_charging_event:
            if current_stretch_km > 0:
                stretches.append(StretchInfo(
                    stretch_index=stretch_idx,
                    route_length_km=round(current_stretch_km, 2),
                    target_distance_km=round(current_stretch_km * dead_km_factor, 2),
                    legs=current_stretch_legs,
                ))
                stretch_idx += 1
                current_stretch_km = 0.0
                current_stretch_legs = []
            prev_leg = leg
            continue
            
        if prev_leg is not None and split_fn(prev_leg, leg):
            if current_stretch_km > 0:
                stretches.append(StretchInfo(
                    stretch_index=stretch_idx,
                    route_length_km=round(current_stretch_km, 2),
                    target_distance_km=round(current_stretch_km * dead_km_factor, 2),
                    legs=current_stretch_legs,
                ))
                stretch_idx += 1
                current_stretch_km = 0.0
                current_stretch_legs = []
                
        current_stretch_km += leg.route_length_km
        current_stretch_legs.append(leg)
        prev_leg = leg
        
    if current_stretch_km > 0 or not stretches:
        stretches.append(StretchInfo(
            stretch_index=stretch_idx,
            route_length_km=round(current_stretch_km, 2),
            target_distance_km=round(current_stretch_km * dead_km_factor, 2),
            legs=current_stretch_legs,
        ))
        
    if stretches:
        stretches[0].is_first_stretch = True
        max_stretch = max(stretches, key=lambda s: s.route_length_km)
        max_stretch.is_longest_stretch = True
        
    return stretches


def evaluate_candidate_rules(
    schedules: List[ScheduleDuty],
    trips_by_key: Dict[str, List[TripLeg]],
    tolerance_km: float = 2.0
) -> Dict[str, RuleEvaluationResult]:
    """Compare all 4 candidate stretch rules against Form 4 Consolidation values."""
    results: Dict[str, RuleEvaluationResult] = {}
    total = len(schedules)
    
    for rule_code, (desc, split_fn) in CANDIDATE_RULES.items():
        exact = 0
        within_tol = 0
        mismatches = 0
        
        for sched in schedules:
            legs = trips_by_key.get(sched.schedule_key, [])
            stretches = segment_schedule_stretches(legs, split_fn)
            calc_longest = max([s.route_length_km for s in stretches], default=0.0)
            
            f4 = sched.form4_single_charge_km
            if f4 is None:
                mismatches += 1
                continue
                
            diff = abs(calc_longest - f4)
            if diff < 0.01:
                exact += 1
                within_tol += 1
            elif diff <= tolerance_km:
                within_tol += 1
            else:
                mismatches += 1
                
        exact_pct = round((exact / total) * 100, 1) if total > 0 else 0.0
        tol_pct = round((within_tol / total) * 100, 1) if total > 0 else 0.0
        
        results[rule_code] = RuleEvaluationResult(
            rule_name=rule_code,
            rule_description=desc,
            total_evaluated=total,
            exact_matches=exact,
            exact_match_pct=exact_pct,
            within_tolerance_matches=within_tol,
            within_tolerance_pct=tol_pct,
            mismatches=mismatches
        )
        
    return results


def enrich_schedules_with_stretches(
    schedules: List[ScheduleDuty],
    trips_by_key: Dict[str, List[TripLeg]],
    selected_rule: str = "Rule C",
    dead_km_factor: float = 1.10
) -> None:
    """Enrich ScheduleDuty objects in-place with calculated stretches and consistency status."""
    split_fn = CANDIDATE_RULES.get(selected_rule, CANDIDATE_RULES["Rule C"])[1]
    
    for sched in schedules:
        legs = trips_by_key.get(sched.schedule_key, [])
        stretches = segment_schedule_stretches(legs, split_fn, dead_km_factor)
        sched.stretches = stretches
        
        valid_deps = [l.departure_min for l in legs if l.departure_min is not None]
        valid_arrs = [l.arrival_min for l in legs if l.arrival_min is not None]
        if valid_deps:
            sched.departure_min = valid_deps[0]
            sched.departure_time_str = f"{sched.departure_min // 60:02d}:{sched.departure_min % 60:02d}"
        if valid_arrs:
            sched.arrival_min = valid_arrs[-1]
            sched.arrival_time_str = f"{sched.arrival_min // 60:02d}:{sched.arrival_min % 60:02d}"
            
        sched.has_charging_event = any(l.is_charging_event for l in legs)
        sched.charging_event_count = sum(1 for l in legs if l.is_charging_event)
        
        first_km = stretches[0].route_length_km if stretches else 0.0
        longest_calc_km = max([s.route_length_km for s in stretches], default=0.0)
        
        sched.first_stretch_km = round(first_km, 2)
        sched.longest_calculated_stretch_km = round(longest_calc_km, 2)
        
        # Determine Form-4 / Calculated Consistency Status
        if sched.form4_single_charge_km is None or sched.form4_single_charge_km <= 0:
            sched.consistency_status = ConsistencyStatus.MISSING_FORM4
            if "MISSING FORM4 STRETCH" not in sched.warning_flags:
                sched.warning_flags.append("MISSING FORM4 STRETCH")
            sched.stretch_diff_km = None
        else:
            diff = round(sched.longest_calculated_stretch_km - sched.form4_single_charge_km, 2)
            sched.stretch_diff_km = diff
            
            if sched.first_stretch_km > sched.form4_single_charge_km + 0.05:
                sched.consistency_status = ConsistencyStatus.FIRST_STRETCH_EXCEEDS_FORM4
                sched.warning_flags.append(
                    f"FIRST STRETCH EXCEEDS FORM4 VALUE ({sched.first_stretch_km} km > {sched.form4_single_charge_km} km)"
                )
            elif diff > 2.0:
                sched.consistency_status = ConsistencyStatus.CALCULATED_LONGEST_EXCEEDS_FORM4
                sched.warning_flags.append(
                    f"CALCULATED LONGEST EXCEEDS FORM4: Calc={sched.longest_calculated_stretch_km} km > Form4={sched.form4_single_charge_km} km (Diff={diff:+0.2f} km)"
                )
            elif diff < -2.0:
                sched.consistency_status = ConsistencyStatus.DATA_CONFLICT
                sched.warning_flags.append(
                    f"DATA CONFLICT: Calc={sched.longest_calculated_stretch_km} km < Form4={sched.form4_single_charge_km} km (Diff={diff:+0.2f} km)"
                )
            else:
                sched.consistency_status = ConsistencyStatus.OK
