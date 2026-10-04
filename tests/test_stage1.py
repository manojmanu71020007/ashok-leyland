"""Pytest test suite for Stage 1 Battery-Based Bus Allocation prototype.

Verifies:
1. 500DC/14 exact math (91.9 km stretch, 101.09 km target, BM273 ~74.14%, BM004 ~97.91%)
2. KBS3F/15-18 feasibility (146.9 km stretch, 161.59 km target, BM273 ~118.51% -> PHYSICALLY IMPOSSIBLE)
3. Midnight crossing duty parsing
4. Case-insensitive and whitespace-tolerant charging detection
5. Stretch-rule comparison reporting for candidate rules A, B, C, D
6. Form 4 longest stretch usage when STRETCH_SOURCE = FORM4
7. First-stretch calculation from trip model when STRETCH_SOURCE = FORM4
8. No silent fallback for missing Form 4 stretch
9. Absolute reserve additions (0%, 5%, 10%, 15%)
10. Theoretical schedule sensitivity against highest-range bus (BM273)
11. Current SOC input forms: single float vs per-bus dictionary
12. BM NO to REG NO mapping integrity
13. Projected SOC calculation (reserve not subtracted twice)
14. [CORRECTION 1] Ambiguous schedule ID handling across Shift A / Shift B without silent fallback
15. [CORRECTION 2] 3-state inspection logic (UNKNOWN_NO_RECORD, DEFECT, CONFIRMED_OK) and policy toggle
16. [CORRECTION 3] Explicit turnaround charging evaluation for bus reuse
17. [CORRECTION 4] CSB deadhead unknown handling and prevention of double-counting
18. [CORRECTION 5] Form 4 / Calculated consistency status classification
"""

import pytest
from pathlib import Path

from models import (
    FeasibilityStatus, BusStatus, BusVehicle, ScheduleDuty,
    TripLeg, SocCalculationResult, InspectionStatus, ConsistencyStatus
)
from data_loader import (
    load_bus_fleet, load_consolidation_schedules, load_trip_legs,
    is_charging_event, parse_excel_time, load_inspection_audit
)
from validation import (
    evaluate_candidate_rules, enrich_schedules_with_stretches,
    segment_schedule_stretches, split_rule_a, split_rule_c
)
from allocator import (
    calculate_target_distance, calculate_soc_requirement,
    calculate_reserve_sensitivity, allocate_bus, get_schedule_longest_stretch_km,
    evaluate_bus_reuse, evaluate_deadhead, AllocatorConfig
)


@pytest.fixture(scope="module")
def fleet():
    return load_bus_fleet(
        consolidation_path=Path("data/Form_4_Consolidation_-_Chandapura.xlsx"),
        veh_master_path=Path("data/SCH_DATA_NH_new__1_.xlsx")
    )


@pytest.fixture(scope="module")
def schedules():
    return load_consolidation_schedules(
        consolidation_path=Path("data/Form_4_Consolidation_-_Chandapura.xlsx")
    )


@pytest.fixture(scope="module")
def trip_legs():
    return load_trip_legs(data_dir=Path("data"))


@pytest.fixture(scope="module")
def enriched_schedules(schedules, trip_legs):
    enrich_schedules_with_stretches(schedules, trip_legs, selected_rule="Rule C", dead_km_factor=1.10)
    return schedules


# =========================================================================
# 1. Test 500DC/14 Target Distance and Base SOC
# =========================================================================
def test_500dc_14_soc_math(fleet, enriched_schedules):
    sched = next(s for s in enriched_schedules if s.schedule_id == "500DC/14")
    assert sched.form4_single_charge_km == 91.9
    
    target_dist = calculate_target_distance(sched.form4_single_charge_km, 1.10)
    assert abs(target_dist - 101.09) < 0.01

    bm273 = next(b for b in fleet if b.bm_no == "BM273")
    bm004 = next(b for b in fleet if b.bm_no == "BM004")

    res_273 = calculate_soc_requirement(target_dist, bm273.actual_range_km, reserve_pct=0.0)
    assert abs(res_273.base_required_soc_pct - 74.14) < 0.05
    assert res_273.feasibility_status == FeasibilityStatus.ELIGIBLE

    res_004 = calculate_soc_requirement(target_dist, bm004.actual_range_km, reserve_pct=0.0)
    assert abs(res_004.base_required_soc_pct - 97.91) < 0.05
    assert res_004.feasibility_status == FeasibilityStatus.ELIGIBLE


# =========================================================================
# 2. Test KBS3F/15 to KBS3F/18 Infeasibility
# =========================================================================
def test_kbs3f_15_to_18_physically_impossible(fleet, enriched_schedules):
    bm273 = next(b for b in fleet if b.bm_no == "BM273")
    
    for sched_id in ["KBS3F/15", "KBS3F/16", "KBS3F/17", "KBS3F/18"]:
        sched = next(s for s in enriched_schedules if s.schedule_id == sched_id)
        assert sched.form4_single_charge_km == 146.9
        
        target_dist = calculate_target_distance(sched.form4_single_charge_km, 1.10)
        assert abs(target_dist - 161.59) < 0.01
        
        res = calculate_soc_requirement(target_dist, bm273.actual_range_km, reserve_pct=0.0)
        assert abs(res.base_required_soc_pct - 118.51) < 0.05
        assert res.feasibility_status == FeasibilityStatus.PHYSICALLY_IMPOSSIBLE


# =========================================================================
# 3. Test Midnight Crossing Parsing
# =========================================================================
def test_midnight_handling():
    dep_min = parse_excel_time("22:30")
    arr_min = parse_excel_time("01:15")
    assert dep_min == 22 * 60 + 30
    assert arr_min == 1 * 60 + 15
    assert arr_min < dep_min


# =========================================================================
# 4. Test Case-Insensitive Charging Detection
# =========================================================================
def test_charging_case_insensitivity():
    assert is_charging_event("CHARGING") is True
    assert is_charging_event("Charging") is True
    assert is_charging_event("charging") is True
    assert is_charging_event("  CHARGING  ") is True
    assert is_charging_event("CHarging") is True
    assert is_charging_event("BMT-32") is False


# =========================================================================
# 5. Test Stretch-Rule Comparison Match Counts
# =========================================================================
def test_stretch_rule_comparison(schedules, trip_legs):
    results = evaluate_candidate_rules(schedules, trip_legs)
    assert "Rule A" in results
    assert "Rule C" in results

    rule_a = results["Rule A"]
    assert rule_a.total_evaluated == 130
    assert rule_a.exact_matches == 45
    assert abs(rule_a.exact_match_pct - 34.6) < 0.5

    rule_c = results["Rule C"]
    assert rule_c.total_evaluated == 130
    assert rule_c.exact_matches >= 100
    assert rule_c.within_tolerance_matches >= 110


# =========================================================================
# 6. Test Form 4 Longest Stretch Source
# =========================================================================
def test_form4_longest_stretch_source(enriched_schedules):
    sched = next(s for s in enriched_schedules if s.schedule_id == "500DC/14")
    longest_km, warnings = get_schedule_longest_stretch_km(sched, stretch_source="FORM4")
    assert longest_km == 91.9
    assert len(warnings) == 0


# =========================================================================
# 7. Test First-Stretch Comes from Calculated Model
# =========================================================================
def test_first_stretch_source(enriched_schedules):
    sched = next(s for s in enriched_schedules if s.schedule_id == "500DC/14")
    assert abs(sched.first_stretch_km - 79.5) < 0.1
    assert sched.first_stretch_km != sched.form4_single_charge_km


# =========================================================================
# 8. Test No Silent Fallback for Missing Form 4
# =========================================================================
def test_no_silent_fallback():
    dummy_sched = ScheduleDuty(
        schedule_key="Test|Dummy/1",
        shift="General shift",
        schedule_id="Dummy/1",
        route="Dummy",
        route_length_km=250.0,
        dead_km=25.0,
        actual_km=275.0,
        form4_single_charge_km=None,
        category="Complex",
        longest_calculated_stretch_km=120.0
    )
    longest_km, warnings = get_schedule_longest_stretch_km(dummy_sched, stretch_source="FORM4")
    assert longest_km == 0.0
    assert "MISSING FORM4 STRETCH" in warnings


# =========================================================================
# 9. Test Reserve Calculation (0%, 5%, 10%, 15%)
# =========================================================================
def test_reserve_calculations():
    base_dist = 100.0
    bus_range = 100.0
    r0 = calculate_soc_requirement(base_dist, bus_range, reserve_pct=0.0)
    assert r0.base_required_soc_pct == 100.0
    assert r0.required_soc_with_reserve_pct == 100.0
    assert r0.feasibility_status == FeasibilityStatus.ELIGIBLE

    r5 = calculate_soc_requirement(base_dist, bus_range, reserve_pct=5.0)
    assert r5.base_required_soc_pct == 100.0
    assert r5.required_soc_with_reserve_pct == 105.0
    assert r5.feasibility_status == FeasibilityStatus.RESERVE_INFEASIBLE

    r10 = calculate_soc_requirement(base_dist, bus_range, reserve_pct=10.0)
    assert r10.required_soc_with_reserve_pct == 110.0
    assert r10.feasibility_status == FeasibilityStatus.RESERVE_INFEASIBLE

    r15 = calculate_soc_requirement(base_dist, bus_range, reserve_pct=15.0)
    assert r15.required_soc_with_reserve_pct == 115.0
    assert r15.feasibility_status == FeasibilityStatus.RESERVE_INFEASIBLE


# =========================================================================
# 10. Test Highest-Range Bus Sensitivity
# =========================================================================
def test_highest_range_sensitivity(fleet, enriched_schedules):
    report = calculate_reserve_sensitivity(
        enriched_schedules, fleet, stretch_source="FORM4", dead_km_factor=1.10
    )
    assert report.reference_bus_bm == "BM273"
    assert abs(report.reference_bus_range_km - 136.34) < 0.05
    assert len(report.table) == 4
    row0 = next(r for r in report.table if r.reserve_pct == 0.0)
    assert row0.total_schedules == 130
    assert row0.physically_impossible_count > 0


# =========================================================================
# 11. Test Current SOC Support
# =========================================================================
def test_current_soc_options(fleet, enriched_schedules):
    res_a = allocate_bus("500DC/14", fleet, enriched_schedules, current_soc=80.0, allow_unknown_inspection=True)
    assert res_a.allocation_status == "ALLOCATED"
    assert res_a.current_soc_pct == 80.0

    soc_dict = {"BM273": 95.0, "BM004": 60.0}
    res_b = allocate_bus("500DC/14", fleet, enriched_schedules, current_soc=soc_dict, allow_unknown_inspection=True)
    assert res_b.allocation_status == "ALLOCATED"
    assert res_b.current_soc_pct is not None


# =========================================================================
# 12. Test BM NO to REG NO Mapping Integrity
# =========================================================================
def test_bm_to_reg_mapping(fleet):
    bm001 = next(b for b in fleet if b.bm_no == "BM001")
    assert bm001.reg_no == "KA51AH4144"
    bm273 = next(b for b in fleet if b.bm_no == "BM273")
    assert bm273.reg_no is not None


# =========================================================================
# 13. Test Projected SOC Calculation
# =========================================================================
def test_projected_soc_after_first_stretch():
    res = calculate_soc_requirement(target_distance_km=50.0, bus_actual_range_km=100.0, reserve_pct=10.0, current_soc_pct=90.0)
    assert res.base_required_soc_pct == 50.0
    assert res.required_soc_with_reserve_pct == 60.0
    assert res.projected_soc_after_stretch_pct == 40.0
    assert res.soc_margin_pct == 30.0


# =========================================================================
# 14. [CORRECTION 1] Ambiguous Schedule IDs Across Shift A / Shift B
# =========================================================================
def test_ambiguous_schedule_id_detection(fleet, enriched_schedules):
    """When schedule_id exists in both Shift A and Shift B and shift is omitted,
    allocate_bus must return AMBIGUOUS_SCHEDULE_ID with matching records."""
    res_ambig = allocate_bus("356Z/7", fleet, enriched_schedules, current_soc=90.0)
    assert res_ambig.allocation_status == "AMBIGUOUS_SCHEDULE_ID"
    assert len(res_ambig.matching_records) >= 2
    shifts_found = {r["shift"] for r in res_ambig.matching_records}
    assert "Shift A" in shifts_found
    assert "Shift B" in shifts_found

    # When shift is explicitly supplied with full charge, allocation proceeds disambiguated
    res_a = allocate_bus("356Z/7", fleet, enriched_schedules, current_soc=100.0, shift="Shift A", allow_unknown_inspection=True)
    assert res_a.allocation_status == "ALLOCATED"
    assert res_a.shift == "Shift A"
    assert res_a.schedule_key == "Shift A|356Z/7"

    # Canonical key lookup
    res_b = allocate_bus("Shift A|356Z/7", fleet, enriched_schedules, current_soc=100.0, allow_unknown_inspection=True)
    assert res_b.allocation_status == "ALLOCATED"
    assert res_b.shift == "Shift A"
    assert res_b.schedule_key == "Shift A|356Z/7"


# =========================================================================
# 15. [CORRECTION 2] 3-State Inspection Logic and Policy Enforcement
# =========================================================================
def test_3_state_inspection_policy(fleet, enriched_schedules):
    """Verify UNKNOWN_NO_RECORD is default and withheld unless allow_unknown_inspection=True."""
    # Check default fleet status is UNKNOWN_NO_RECORD
    for b in fleet:
        assert b.inspection_status == InspectionStatus.UNKNOWN_NO_RECORD

    # Policy 1: ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION = False -> No allocation
    res_withheld = allocate_bus(
        "500DC/14", fleet, enriched_schedules, current_soc=90.0, allow_unknown_inspection=False
    )
    assert res_withheld.allocation_status == "INFEASIBLE / NO ELIGIBLE BUS"
    assert "UNKNOWN_NO_RECORD inspection withheld" in res_withheld.reason

    # Policy 2: ALLOW_UNKNOWN_INSPECTION_FOR_ALLOCATION = True -> Allocated with warning
    res_allowed = allocate_bus(
        "500DC/14", fleet, enriched_schedules, current_soc=90.0, allow_unknown_inspection=True
    )
    assert res_allowed.allocation_status == "ALLOCATED"
    assert "UNKNOWN_INSPECTION_STATUS" in res_allowed.warning_flags

    # Defect check: Bus marked DEFECT cannot be allocated
    test_bus = BusVehicle(
        bm_no="TEST_DEFECT",
        actual_range_km=130.0,
        category="A",
        current_soc_pct=100.0,
        inspection_status=InspectionStatus.DEFECT,
        defect_flag=True
    )
    res_defect = allocate_bus("500DC/14", [test_bus], enriched_schedules, current_soc=100.0, allow_unknown_inspection=True)
    assert res_defect.allocation_status == "INFEASIBLE / NO ELIGIBLE BUS"


# =========================================================================
# 16. [CORRECTION 3] Explicit Turnaround Charging for Bus Reuse
# =========================================================================
def test_turnaround_charging_bus_reuse(enriched_schedules):
    """Verify reuse calculation respects TURNAROUND_CHARGING_ENABLED and duration."""
    duty_a = next(s for s in enriched_schedules if s.schedule_key == "Shift A|600F/80")
    duty_b = next(s for s in enriched_schedules if s.schedule_key == "Shift B|600F/80")
    bus = BusVehicle(bm_no="BM273", actual_range_km=136.34, category="A", current_soc_pct=100.0)

    # 1. Charging disabled: second duty inherits depleted SOC
    reuse_no_charge = evaluate_bus_reuse(
        duty_a, duty_b, bus, duty_a_start_soc=100.0, charging_enabled=False
    )
    assert reuse_no_charge.charging_enabled is False
    assert reuse_no_charge.soc_after_turnaround_charge_pct == reuse_no_charge.soc_after_first_duty_pct
    assert reuse_no_charge.soc_after_turnaround_charge_pct < 100.0

    # 2. Charging enabled with sufficient turnaround: recharges to 100%
    reuse_with_charge = evaluate_bus_reuse(
        duty_a, duty_b, bus, duty_a_start_soc=100.0,
        charging_enabled=True, charge_duration_min=15, soc_after_charge=100.0
    )
    if reuse_with_charge.turnaround_duration_min >= 15:
        assert reuse_with_charge.soc_after_turnaround_charge_pct == 100.0


# =========================================================================
# 17. [CORRECTION 4] CSB Deadhead Evaluation (No Hardcoded 18.5, No Double-Counting)
# =========================================================================
def test_csb_deadhead_evaluation(enriched_schedules):
    """Verify CSB deadhead requires explicit input and adds linearly without double-counting."""
    sched = next(s for s in enriched_schedules if s.schedule_id == "500DC/14")
    
    # 1. Unconfigured deadhead returns UNKNOWN status
    dh_unk = evaluate_deadhead(sched, explicit_deadhead_km=None)
    assert dh_unk.status == "UNKNOWN_DEADHEAD_DISTANCE"
    assert dh_unk.explicit_deadhead_km is None

    # 2. Configured deadhead: Formula is (base_km * 1.10) + explicit_km
    explicit_km = 18.5
    dh_applied = evaluate_deadhead(sched, explicit_deadhead_km=explicit_km, dead_km_factor=1.10)
    assert dh_applied.status == "EXPLICIT_DEADHEAD_APPLIED"
    # Target distance must be (sched.first_stretch_km * 1.10) + 18.5
    expected_target = round((sched.first_stretch_km * 1.10) + explicit_km, 2)
    assert dh_applied.final_target_distance_km == expected_target
    # Double-counting check: MUST NOT equal (sched.first_stretch_km + explicit_km) * 1.10!
    double_counted_target = round((sched.first_stretch_km + explicit_km) * 1.10, 2)
    assert dh_applied.final_target_distance_km != double_counted_target


# =========================================================================
# 18. [CORRECTION 5] Form 4 / Calculated Consistency Statuses
# =========================================================================
def test_consistency_status_classification(enriched_schedules):
    """Verify schedules receive explicit consistency statuses."""
    statuses = {s.consistency_status for s in enriched_schedules}
    assert ConsistencyStatus.OK in statuses
    
    # 500DC/14 matches Form 4 exactly (91.9 km)
    sched_500 = next(s for s in enriched_schedules if s.schedule_id == "500DC/14")
    assert sched_500.consistency_status == ConsistencyStatus.OK
    assert sched_500.stretch_diff_km == 0.0

    # KBS3F/14 has calculated longest > Form 4
    sched_kbs14 = next((s for s in enriched_schedules if s.schedule_id == "KBS3F/14"), None)
    if sched_kbs14:
        assert sched_kbs14.consistency_status in (
            ConsistencyStatus.CALCULATED_LONGEST_EXCEEDS_FORM4, ConsistencyStatus.DATA_CONFLICT
        )
