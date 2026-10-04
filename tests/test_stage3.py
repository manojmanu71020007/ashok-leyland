"""Stage 3 Unit and Integration Test Suite.

Verifies:
1. Compatible duty chain construction (Shift A -> Shift B chaining, turnaround >= 20 min)
2. Auto-allocation with scipy.optimize.linear_sum_assignment (cost matrix, hard constraints)
3. Category conservation (Standard duties conserve Category A buses)
4. Turnaround charging for bus reuse
5. Night Halt and swap engine (detects mismatches, midnight crossings, 39 General-shift unknowns)
6. Dynamic operational spare pool engine (peak demand timeline, spare count)
7. Route headway gap finder (>60 min service gaps, spare candidate bus recommendation)
8. CSB Deadhead and bus reuse evaluation
"""

import pytest
from pathlib import Path

from models import (
    BusVehicle, BusStatus, InspectionStatus, ScheduleDuty, FeasibilityStatus,
    DutyChain, DepotOptimizationResult, NightHaltSwapReport, DynamicSparePoolReport,
    HeadwayGapReport
)
from data_loader import load_bus_fleet, load_consolidation_schedules, load_trip_legs, load_night_halt_roster
from validation import enrich_schedules_with_stretches
from allocator import (
    AllocatorConfig, calculate_target_distance, calculate_soc_requirement,
    evaluate_bus_reuse, evaluate_deadhead
)
from optimizer import (
    build_compatible_duty_chains, optimize_depot_allocation,
    evaluate_night_halt_and_swaps, calculate_dynamic_spare_pool,
    find_route_headway_gaps
)


@pytest.fixture(scope="module")
def loaded_data():
    """Module-level fixture loading all Chandapura data."""
    buses = load_bus_fleet()
    schedules = load_consolidation_schedules()
    trips = load_trip_legs()
    enrich_schedules_with_stretches(schedules, trips)
    return buses, schedules, trips


# --- 1. Compatible Duty Chain Construction ---

def test_compatible_duty_chain_pairing(loaded_data):
    """Test Shift A -> Shift B compatible duty chaining with turnaround >= 20 min."""
    buses, schedules, trips = loaded_data

    chains = build_compatible_duty_chains(schedules, min_turnaround_min=20)

    # 10 Shift A schedules pair with 10 Shift B schedules -> 10 multi-duty chains
    multi_chains = [c for c in chains if c.is_multi_duty]
    assert len(multi_chains) == 10

    # Total chains = 10 (A->B) + 39 (General) + 71 (Night Halt) = 120 chains for 130 schedules
    assert len(chains) == 120
    assert sum(len(c.schedule_keys) for c in chains) == 130

    # Every chained pair must have turnaround between 40 and 45 minutes
    for mc in multi_chains:
        assert mc.turnaround_duration_min >= 20
        assert 40 <= mc.turnaround_duration_min <= 45
        assert len(mc.schedules) == 2
        # Shifts must be Shift A then Shift B
        assert mc.shifts == ["Shift A", "Shift B"]


def test_duty_chain_same_schedule_matching(loaded_data):
    """Verify that Shift A duties pair with their exact matching schedule IDs in Shift B."""
    buses, schedules, trips = loaded_data

    chains = build_compatible_duty_chains(schedules)
    multi_chains = {c.schedules[0].schedule_id.lower(): c for c in chains if c.is_multi_duty}

    # Verify canonical pairs
    assert "356z/6" in multi_chains
    assert multi_chains["356z/6"].schedules[1].schedule_id.lower() == "356z/6"

    assert "600f/53" in multi_chains
    assert multi_chains["600f/53"].schedules[1].schedule_id.lower() == "600f/53"

    assert "360k/15" in multi_chains
    assert multi_chains["360k/15"].schedules[1].schedule_id.lower() == "360k/15"


# --- 2. Auto-Allocation with linear_sum_assignment ---

def test_hungarian_depot_allocation_hard_constraints(loaded_data):
    """Verify linear_sum_assignment respects all hard constraints."""
    buses, schedules, trips = loaded_data
    chains = build_compatible_duty_chains(schedules)

    # Mark some buses defective or under maintenance
    test_buses = [b.model_copy(deep=True) for b in buses]
    test_buses[0].defect_flag = True
    test_buses[0].status = BusStatus.NOT_READY
    test_buses[1].status = BusStatus.UNDER_MAINTENANCE

    result = optimize_depot_allocation(
        chains, test_buses,
        allow_unknown_inspection=True,
        turnaround_charging_enabled=True,
        turnaround_charge_duration_min=30
    )

    assert isinstance(result, DepotOptimizationResult)
    assert result.total_chains == 120
    assert result.total_schedules == 130

    # Defective/Maintenance buses MUST NEVER be assigned
    assigned_bms = {a.assigned_bm_no for a in result.assignments if a.is_feasible}
    assert test_buses[0].bm_no not in assigned_bms
    assert test_buses[1].bm_no not in assigned_bms

    # Allocated duties must satisfy physical range
    bus_map = {b.bm_no: b for b in test_buses}
    for a in result.assignments:
        if a.is_feasible:
            assigned_bus = bus_map[a.assigned_bm_no]
            assert assigned_bus.actual_range_km >= (a.surplus_range_km or 0)
            assert not assigned_bus.defect_flag
            assert assigned_bus.status == BusStatus.AVAILABLE


def test_hungarian_allocation_withheld_unknown_inspection(loaded_data):
    """When allow_unknown_inspection=False, all UNKNOWN_NO_RECORD buses are withheld."""
    buses, schedules, trips = loaded_data
    chains = build_compatible_duty_chains(schedules)

    result = optimize_depot_allocation(
        chains, buses,
        allow_unknown_inspection=False
    )

    # Since all 122 buses currently have UNKNOWN_NO_RECORD, 0 must be allocated
    assert result.allocated_chains_count == 0
    assert result.allocated_schedules_count == 0
    assert result.unallocated_schedules_count == 130


def test_optimization_conserves_category_a_on_standard_routes():
    """Verify that Hungarian optimization cost structure conserves Category A buses for demanding duties."""
    # Create two synthetic chains: one Standard, one Complex
    sched_standard = ScheduleDuty(
        schedule_key="Test|STD/1", shift="General", schedule_id="STD/1", route="STD",
        route_length_km=40.0, dead_km=4.0, actual_km=44.0, form4_single_charge_km=40.0,
        category="Standard", first_stretch_km=40.0, longest_calculated_stretch_km=40.0
    )
    sched_complex = ScheduleDuty(
        schedule_key="Test|CMP/1", shift="General", schedule_id="CMP/1", route="CMP",
        route_length_km=110.0, dead_km=11.0, actual_km=121.0, form4_single_charge_km=110.0,
        category="Complex", first_stretch_km=110.0, longest_calculated_stretch_km=110.0
    )
    chains = [
        DutyChain(
            chain_id="STD_CHAIN", schedule_keys=[sched_standard.schedule_key], schedules=[sched_standard],
            shifts=[sched_standard.shift], route=sched_standard.route, total_target_distance_km=44.0,
            max_target_distance_km=44.0, first_stretch_target_km=44.0, category="Standard"
        ),
        DutyChain(
            chain_id="CMP_CHAIN", schedule_keys=[sched_complex.schedule_key], schedules=[sched_complex],
            shifts=[sched_complex.shift], route=sched_complex.route, total_target_distance_km=121.0,
            max_target_distance_km=121.0, first_stretch_target_km=121.0, category="Complex"
        )
    ]

    # Two available buses: Bus A (High range, Cat A) and Bus C (Medium range, Cat C)
    bus_a = BusVehicle(bm_no="BM-A", actual_range_km=135.0, category="A", inspection_status=InspectionStatus.CONFIRMED_OK)
    bus_c = BusVehicle(bm_no="BM-C", actual_range_km=90.0, category="C", inspection_status=InspectionStatus.CONFIRMED_OK)

    res = optimize_depot_allocation(chains, [bus_a, bus_c], allow_unknown_inspection=True)

    # Complex route MUST get Category A (Bus C cannot physically do 121 km)
    # Standard route MUST get Category C (conserving Bus A)
    assignments_by_chain = {a.chain_id: a for a in res.assignments}
    assert assignments_by_chain["CMP_CHAIN"].assigned_bm_no == "BM-A"
    assert assignments_by_chain["STD_CHAIN"].assigned_bm_no == "BM-C"


# --- 3. Bus Reuse & Turnaround Charging ---

def test_bus_reuse_turnaround_charging_evaluation():
    """Verify turnaround charging enables reuse when combined duty distance exceeds battery range."""
    duty_a = ScheduleDuty(
        schedule_key="Shift A|TEST/1", shift="Shift A", schedule_id="TEST/1", route="TEST",
        route_length_km=70.0, dead_km=7.0, actual_km=77.0, form4_single_charge_km=70.0,
        category="Standard", first_stretch_km=70.0, arrival_min=800, arrival_time_str="13:20"
    )
    duty_b = ScheduleDuty(
        schedule_key="Shift B|TEST/1", shift="Shift B", schedule_id="TEST/1", route="TEST",
        route_length_km=70.0, dead_km=7.0, actual_km=77.0, form4_single_charge_km=70.0,
        category="Standard", first_stretch_km=70.0, departure_min=850, departure_time_str="14:10"
    )
    # Bus with 110 km range. Combined duty target = 77 + 77 = 154 km (exceeds 110 km).
    bus = BusVehicle(bm_no="BM_TEST", actual_range_km=110.0, category="B")

    # 1. Without turnaround charging -> Infeasible
    eval_no_charge = evaluate_bus_reuse(duty_a, duty_b, bus, charging_enabled=False)
    assert eval_no_charge.reuse_feasible is False
    assert "Insufficient SOC" in eval_no_charge.reason

    # 2. With turnaround charging (50 min turnaround >= 45 min duration) -> Feasible
    eval_with_charge = evaluate_bus_reuse(duty_a, duty_b, bus, charging_enabled=True, charge_duration_min=45)
    assert eval_with_charge.reuse_feasible is True
    assert eval_with_charge.soc_after_turnaround_charge_pct == 100.0


# --- 4. Night Halt and Swap Engine ---

def test_night_halt_swap_engine(loaded_data):
    """Verify Night Halt swap checking, midnight crossings, and 39 General-shift unknowns."""
    buses, schedules, trips = loaded_data

    nh_report = evaluate_night_halt_and_swaps(schedules, buses, allow_unknown_inspection=True)

    assert isinstance(nh_report, NightHaltSwapReport)
    assert nh_report.total_nh_schedules == 71
    assert nh_report.total_general_schedules == 39

    # The 39 General-shift schedules not in SCH DATA NH MUST be classified as Unknown
    assert nh_report.general_unknown_count == 39
    for rec in nh_report.general_records:
        assert rec.current_assignment_status == "UNKNOWN"
        assert rec.actual_bm == "Unknown"
        assert rec.actual_reg == "Unknown"

    # 70 of the 71 Night Halt duties cross midnight
    midnight_crossings = sum(1 for r in nh_report.nh_records if r.crosses_midnight)
    assert midnight_crossings >= 70

    # Swaps are correctly identified where FIX BM != actual BM or range shortfall
    assert nh_report.swap_required_count > 0
    sample_swap = nh_report.swaps_needed[0]
    assert sample_swap.swap_required is True
    assert sample_swap.reason != ""


# --- 5. Dynamic Operational Spare Pool ---

def test_dynamic_operational_spare_pool(loaded_data):
    """Verify dynamic spare pool calculation across the 24h timeline."""
    buses, schedules, trips = loaded_data

    spare_report = calculate_dynamic_spare_pool(schedules, buses)

    assert isinstance(spare_report, DynamicSparePoolReport)
    assert spare_report.total_fleet == 122

    # Peak simultaneous demand is 119 buses at 16:25
    assert spare_report.peak_simultaneous_demand == 119
    assert spare_report.peak_time_window_str == "16:25"

    # Operational spare pool at peak = 122 - 119 = 3 buses (assuming 0 defects)
    assert spare_report.operational_spare_pool_count == 3

    # Dynamic reaction: If 2 buses are marked defective, spare pool decreases by 2
    buses_with_defects = [b.model_copy(deep=True) for b in buses]
    buses_with_defects[0].defect_flag = True
    buses_with_defects[1].status = BusStatus.UNDER_MAINTENANCE

    spare_report_defects = calculate_dynamic_spare_pool(schedules, buses_with_defects)
    assert spare_report_defects.defective_count == 1
    assert spare_report_defects.under_maintenance_count == 1
    assert spare_report_defects.operational_spare_pool_count == 1  # 3 - 2 = 1


# --- 6. Route Headway Gap Finder ---

def test_route_headway_gap_finder(loaded_data):
    """Verify detection of service headway gaps > 60 min and spare candidate ranking."""
    buses, schedules, trips = loaded_data

    gap_report = find_route_headway_gaps(schedules, buses, trips, gap_threshold_min=60)

    assert isinstance(gap_report, HeadwayGapReport)
    assert gap_report.gap_threshold_min == 60
    assert gap_report.gaps_found_count > 0

    # Verify each gap has valid duration > 60 and candidate buses
    for gap in gap_report.gaps:
        assert gap.gap_minutes > 60
        assert gap.route != ""
        assert gap.origin != ""
        if gap.candidate_spare_buses:
            assert gap.recommended_bus is not None


# --- 7. CSB Deadhead Evaluation ---

def test_deadhead_evaluation(loaded_data):
    """Verify explicit CSB deadhead calculation without double-counting generic dead km."""
    _, schedules, _ = loaded_data
    sched = schedules[0]

    # Explicit deadhead of 12.5 km
    eval_deadhead = evaluate_deadhead(sched, explicit_deadhead_km=12.5, bus_actual_range_km=130.0)
    assert eval_deadhead.status == "EXPLICIT_DEADHEAD_APPLIED"
    assert eval_deadhead.explicit_deadhead_km == 12.5
    # Final target = base * 1.10 + 12.5
    expected_target = round(sched.first_stretch_km * 1.10 + 12.5, 2)
    assert eval_deadhead.final_target_distance_km == expected_target
