"""Pytest test suite for Stage 2 Battery-Based Bus Allocation prototype.

Verifies:
1. Fleet management: 122 buses, BM/REG mapping, category A/B/C, range, 3-state inspection.
2. Demo SOC controls: bulk, individual, and randomized demo SOC.
3. Candidate bus ranking (Section 18): prioritizing eligible buses with minimal range surplus.
4. Manual assignment and manager override logic with constraint warnings.
5. Infeasible schedule report (Section 24): dynamic detection of physically impossible duties (KBS3F/15-18).
6. Faulty-bus workflow (Section 23): marking bus faulty, removing from active duty, and suggesting top 3 valid replacements without duty overlap.
"""

import pytest
from pathlib import Path

from models import (
    FeasibilityStatus, BusStatus, BusVehicle, ScheduleDuty,
    TripLeg, InspectionStatus, ConsistencyStatus
)
from fleet import FleetManager
from data_loader import load_consolidation_schedules, load_trip_legs
from validation import enrich_schedules_with_stretches
from allocator import (
    rank_candidate_buses, manual_assign_bus, generate_infeasible_schedules_report,
    handle_faulty_bus_workflow, allocate_bus
)


@pytest.fixture(scope="module")
def schedules():
    scheds = load_consolidation_schedules()
    trips = load_trip_legs()
    enrich_schedules_with_stretches(scheds, trips, selected_rule="Rule C", dead_km_factor=1.10)
    return scheds


@pytest.fixture
def fleet_mgr():
    return FleetManager()


# =========================================================================
# 1. Test Fleet Manager Initialization and Master Data Preservation
# =========================================================================
def test_fleet_initialization(fleet_mgr):
    """Verify 122 buses loaded with range, categories, REG NO mapping, and UNKNOWN_NO_RECORD inspection."""
    assert fleet_mgr.total_buses == 122
    
    buses = fleet_mgr.get_all_buses()
    assert len(buses) == 122
    
    # Check REG NO mapping preserved
    bm001 = fleet_mgr.get_bus("BM001")
    assert bm001 is not None
    assert bm001.reg_no == "KA51AH4144"
    assert bm001.inspection_status == InspectionStatus.UNKNOWN_NO_RECORD
    assert bm001.defect_flag is False
    assert bm001.status == BusStatus.AVAILABLE
    
    # Range bounds
    max_bus = fleet_mgr.get_highest_range_bus()
    min_bus = fleet_mgr.get_lowest_range_bus()
    assert max_bus.bm_no == "BM273"
    assert abs(max_bus.actual_range_km - 136.34) < 0.05
    assert min_bus.bm_no == "BM221"
    assert abs(min_bus.actual_range_km - 62.05) < 0.05


# =========================================================================
# 2. Test Demo SOC Controls (Bulk, Individual, and Randomized)
# =========================================================================
def test_demo_soc_controls(fleet_mgr):
    """Verify demo SOC controls operate correctly across fleet."""
    # 1. Bulk set
    fleet_mgr.set_bulk_soc(85.0)
    for b in fleet_mgr.get_all_buses():
        assert b.current_soc_pct == 85.0
        
    # 2. Individual set
    fleet_mgr.set_bus_soc("BM273", 92.5)
    assert fleet_mgr.get_bus("BM273").current_soc_pct == 92.5
    assert fleet_mgr.get_bus("BM001").current_soc_pct == 85.0
    
    # 3. Randomize
    fleet_mgr.randomize_demo_soc(min_soc=65.0, max_soc=95.0, seed=42)
    soc_vals = [b.current_soc_pct for b in fleet_mgr.get_all_buses()]
    assert all(65.0 <= s <= 95.0 for s in soc_vals)
    assert len(set(soc_vals)) > 10  # distinct randomized values


# =========================================================================
# 3. Test Candidate Bus Ranking (Section 18 Priority Criteria)
# =========================================================================
def test_candidate_bus_ranking_minimal_waste(schedules, fleet_mgr):
    """Verify ranking prefers buses with smallest sufficient surplus (preserves high-range buses)."""
    sched = next(s for s in schedules if s.schedule_key == "General shift|500DC/14")
    # 500DC/14 longest target distance is 101.09 km
    buses = fleet_mgr.get_all_buses()
    
    # With 100% SOC and unknown inspection permitted
    ranked = rank_candidate_buses(
        sched, buses, current_soc=100.0, reserve_pct=0.0, allow_unknown_inspection=True
    )
    
    eligible = [r for r in ranked if r.is_eligible_for_auto_allocation]
    assert len(eligible) > 0
    
    # Rank 1 must be eligible with smallest positive surplus
    best = eligible[0]
    assert best.surplus_range_km >= 0
    # BM273 has massive surplus (~35 km) so it should NOT be rank 1 if a tighter fitting bus exists
    bm273_rank = next(r for r in ranked if r.bm_no == "BM273")
    assert best.surplus_range_km <= bm273_rank.surplus_range_km


# =========================================================================
# 4. Test Manual Assignment and Override Functionality
# =========================================================================
def test_manual_assign_with_and_without_override(schedules, fleet_mgr):
    """Verify manual assignment respects constraints and records manager override."""
    sched = next(s for s in schedules if s.schedule_key == "General shift|500DC/14")
    buses = fleet_mgr.get_all_buses()
    
    # 1. Compliant assignment (BM273 at 100% SOC)
    res_compliant = manual_assign_bus(
        sched.schedule_key, "BM273", buses, schedules,
        override=False, current_soc=100.0, reserve_pct=0.0
    )
    assert res_compliant.assignment_approved is True
    assert res_compliant.is_override is False
    assert len(res_compliant.constraint_warnings) == 0

    # 2. Incompliant assignment: BM221 (range 62.05 km < target 101.09 km)
    # Without override -> REJECTED
    res_rejected = manual_assign_bus(
        sched.schedule_key, "BM221", buses, schedules,
        override=False, current_soc=100.0, reserve_pct=0.0
    )
    assert res_rejected.assignment_approved is False
    assert res_rejected.is_override is False
    assert any("RANGE_INSUFFICIENT" in w for w in res_rejected.constraint_warnings)

    # With override -> APPROVED under override with warnings
    res_override = manual_assign_bus(
        sched.schedule_key, "BM221", buses, schedules,
        override=True, current_soc=100.0, reserve_pct=0.0
    )
    assert res_override.assignment_approved is True
    assert res_override.is_override is True
    assert any("RANGE_INSUFFICIENT" in w for w in res_override.constraint_warnings)


# =========================================================================
# 5. Test Infeasible Schedule Report (Section 24)
# =========================================================================
def test_infeasible_schedules_report(schedules, fleet_mgr):
    """Verify report dynamically identifies KBS3F/15-18 as physically impossible for BM273."""
    buses = fleet_mgr.get_all_buses()
    report = generate_infeasible_schedules_report(
        schedules, buses, stretch_source="FORM4", dead_km_factor=1.10, reserve_pct=0.0
    )
    
    assert report.highest_range_bm == "BM273"
    assert report.infeasible_count >= 4
    
    # Check KBS3F/15 to 18 are present
    infeasible_sched_ids = {r.schedule_id for r in report.rows}
    for kbs_id in ["KBS3F/15", "KBS3F/16", "KBS3F/17", "KBS3F/18"]:
        assert kbs_id in infeasible_sched_ids
        
    kbs15_row = next(r for r in report.rows if r.schedule_id == "KBS3F/15")
    assert kbs15_row.selected_stretch_km == 146.9
    assert kbs15_row.target_distance_km == 161.59
    assert kbs15_row.status == FeasibilityStatus.PHYSICALLY_IMPOSSIBLE
    assert abs(kbs15_row.shortfall_km - (161.59 - 136.34)) < 0.1
    assert "additional charging stop" in kbs15_row.recommended_action


# =========================================================================
# 6. Test Faulty-Bus Workflow (Section 23)
# =========================================================================
def test_faulty_bus_replacement_workflow(schedules, fleet_mgr):
    """Verify marking bus faulty removes it, flags duty, and suggests valid replacements."""
    buses = fleet_mgr.get_all_buses()
    
    # Assign BM273 to 500DC/14
    duty_key = "General shift|500DC/14"
    active_assignments = {"BM273": duty_key}
    
    report = handle_faulty_bus_workflow(
        "BM273", buses, schedules, active_assignments=active_assignments,
        current_soc=100.0, reserve_pct=0.0, allow_unknown_inspection=True
    )
    
    # 1. Bus status updated
    faulty_bus = fleet_mgr.get_bus("BM273")
    assert faulty_bus.status == BusStatus.NOT_READY
    assert faulty_bus.defect_flag is True
    assert faulty_bus.inspection_status == InspectionStatus.DEFECT
    
    # 2. Assignment removed
    assert "BM273" not in active_assignments
    assert duty_key in report.affected_duty_keys
    
    # 3. Replacements suggested
    assert duty_key in report.replacements_by_schedule
    replacements = report.replacements_by_schedule[duty_key]
    assert len(replacements) <= 3
    assert len(replacements) > 0
    
    # Verify the faulty bus itself is not suggested
    assert all(r.bm_no != "BM273" for r in replacements)
    # Valid replacements must be eligible
    assert any(r.is_valid_replacement for r in replacements)


# =========================================================================
# 7. Test Route SOC Estimator (Operational Intent Sections 2 & 10)
# =========================================================================
def test_route_soc_estimator_and_complexity(schedules, fleet_mgr):
    """Verify estimate_route_soc calculates required SOC, margin, and complexity compatibility."""
    from allocator import estimate_route_soc

    sched = next(s for s in schedules if s.schedule_key == "General shift|500DC/14")
    bm273 = fleet_mgr.get_bus("BM273")
    fleet_mgr.update_manual_soc("BM273", 85.0)

    # 1. Evaluate with BM273 at 85% manual SOC
    est = estimate_route_soc(sched, bus=bm273)
    assert est.schedule_key == "General shift|500DC/14"
    assert est.first_target_distance_km == round(79.5 * 1.10, 2)
    assert est.longest_target_distance_km == round(91.9 * 1.10, 2)
    assert abs(est.first_stretch_base_soc_pct - (est.first_target_distance_km / 136.3438 * 100)) < 0.1
    assert est.current_bus_soc_pct == 85.0
    assert est.is_manually_confirmed is True
    assert est.soc_label == "MANUALLY UPDATED SOC"
    assert est.soc_margin_pct == round(85.0 - est.first_stretch_required_soc_pct, 2)
    assert est.feasibility_status == FeasibilityStatus.ELIGIBLE
    assert "Category A bus on Standard route" in est.complexity_compatibility


# =========================================================================
# 8. Test Step 3 Route Requirement & Step 4 Bus-Specific SOC Estimator
# =========================================================================
def test_step3_and_step4_estimator_pipeline(schedules, fleet_mgr):
    """Verify Step 3 produces pure route distance and Step 4 produces bus-specific SOC requirements."""
    from allocator import estimate_route_requirement, estimate_bus_soc_requirement

    sched = next(s for s in schedules if s.schedule_key == "General shift|500DC/14")
    
    # Step 3: Pure route requirement (independent of any bus)
    route_req = estimate_route_requirement(sched)
    assert route_req.schedule_key == "General shift|500DC/14"
    assert route_req.longest_target_distance_km == 101.09
    assert route_req.first_target_distance_km == 87.45
    assert route_req.route_complexity == "Standard"

    # Step 4: Bus-specific SOC estimator
    # Bus BM273 (Range 136.34 km)
    bm273 = fleet_mgr.get_bus("BM273")
    req_273 = estimate_bus_soc_requirement(route_req, bm273, reserve_pct=0.0, confirmed_manual_soc=84.0)
    assert abs(req_273.base_required_soc_pct - 74.14) < 0.05
    assert req_273.confirmed_manual_soc_pct == 84.0
    assert abs(req_273.soc_margin_pct - (84.0 - 64.14)) < 0.1  # 84 - first stretch req 64.14%

    # Bus BM004 (Range 103.24 km)
    bm004 = fleet_mgr.get_bus("BM004")
    req_004 = estimate_bus_soc_requirement(route_req, bm004, reserve_pct=0.0, confirmed_manual_soc=90.0)
    assert abs(req_004.base_required_soc_pct - 97.91) < 0.05
    assert req_004.confirmed_manual_soc_pct == 90.0
