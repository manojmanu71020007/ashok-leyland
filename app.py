"""Streamlit Web Dashboard for Chandapura Electric Bus Depot.

Battery-Based Bus Allocation Tool
Primary Workflow: Manual-SOC Route Feasibility and Bus Allocation System

Features:
1. Core Operational Workflow:
   - Step 1: Operator manually updates confirmed SOC after charging
   - Step 2: Select Shift -> Route -> Schedule
   - Step 3: Pure Route/Stretch Distance Estimator (estimate_route_requirement)
   - Step 4: Bus-Specific SOC Estimator (estimate_bus_soc_requirement)
   - Step 5: Candidate Bus Ranking & Optimal Allocation (preserves Category A)
   - Step 6: Next allocation / re-charging update loop
2. Depot Optimization (Hungarian linear_sum_assignment on 120 duty chains)
3. Fleet State & Management (122 buses, BM/REG, degradation range, defect workflow)
4. Night Halt & Swap Audit (FIX BM vs actual BM, midnight crossing, 39 General-shift Unknowns)
5. Dynamic Operational Spare Pool (Peak demand 119 buses at 16:25, 24h timeline)
6. Route Headway Gap Finder (>60 min service gaps, spare bus recommendation)
7. Infeasible Schedule Report & Sensitivity Analysis
8. CSB Deadhead & Bus Reuse Evaluation
9. Multi-sheet Excel Export (11 sheets matching Section 33)
"""

import sys
from pathlib import Path
import io
import pandas as pd
import streamlit as st

from models import (
    BusVehicle, BusStatus, InspectionStatus, ScheduleDuty, FeasibilityStatus,
    DutyChain, DepotOptimizationResult, NightHaltSwapReport, DynamicSparePoolReport,
    HeadwayGapReport, RouteRequirement, BusSocRequirement
)
from data_loader import (
    load_bus_fleet, load_consolidation_schedules, load_trip_legs,
    load_night_halt_roster, format_minutes_to_time
)
from validation import enrich_schedules_with_stretches
from fleet import FleetManager
from allocator import (
    AllocatorConfig, calculate_target_distance, calculate_soc_requirement,
    estimate_route_requirement, estimate_bus_soc_requirement, rank_candidate_buses,
    allocate_bus, manual_assign_bus, generate_infeasible_schedules_report,
    calculate_reserve_sensitivity, evaluate_bus_reuse, evaluate_deadhead
)
from optimizer import (
    build_compatible_duty_chains, optimize_depot_allocation,
    evaluate_night_halt_and_swaps, calculate_dynamic_spare_pool,
    find_route_headway_gaps
)
from export_excel import generate_depot_excel_export


# =============================================================================
# Streamlit App Configuration & Responsive Styling
# =============================================================================
st.set_page_config(
    page_title="Chandapura EV Depot | Battery Allocation Tool",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for Phone-Friendly and Modern Clean UI
st.markdown("""
<style>
    /* Responsive container adjustments */
    .main .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }
    /* Metric Card Styling */
    .metric-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 12px 16px;
        border-left: 4px solid #1F497D;
        margin-bottom: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .metric-card h4 {
        margin: 0;
        font-size: 0.85rem;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .metric-card p {
        margin: 4px 0 0 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: #212529;
    }
    /* Workflow step header */
    .step-banner {
        background: linear-gradient(90deg, #1F497D 0%, #2E75B6 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 1.05rem;
        margin-top: 14px;
        margin-bottom: 10px;
    }
    /* Status tags */
    .badge-eligible {
        background-color: #d4edda;
        color: #155724;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: 600;
    }
    .badge-infeasible {
        background-color: #f8d7da;
        color: #721c24;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: 600;
    }
    .badge-warning {
        background-color: #fff3cd;
        color: #856404;
        padding: 3px 8px;
        border-radius: 4px;
        font-weight: 600;
    }
</style>
""", unsafe_allow_html=True)


# =============================================================================
# Cached Data Loader
# =============================================================================
@st.cache_resource
def get_initial_depot_data():
    """Load and cache raw fleet, schedules, and trip legs."""
    buses = load_bus_fleet()
    schedules = load_consolidation_schedules()
    trips = load_trip_legs()
    enrich_schedules_with_stretches(schedules, trips)
    return buses, schedules, trips


raw_buses, schedules, trips = get_initial_depot_data()

# Initialize FleetManager in Streamlit Session State
if "fleet_mgr" not in st.session_state:
    st.session_state.fleet_mgr = FleetManager(raw_buses)

fleet_mgr: FleetManager = st.session_state.fleet_mgr
active_buses = fleet_mgr.get_all_buses()


# =============================================================================
# Sidebar Configuration & Global Controls
# =============================================================================
with st.sidebar:
    st.title("⚡ Chandapura Depot")
    st.caption("Ashok Leyland Electric Bus Allocation")
    st.markdown("---")

    st.subheader("⚙️ Global Parameters")
    cfg_dead_km = st.number_input("Dead-KM Factor", min_value=1.00, max_value=1.50, value=1.10, step=0.01)
    cfg_reserve = st.selectbox("Battery Reserve %", options=[0.0, 5.0, 10.0, 15.0], index=0)
    cfg_stretch_source = st.radio("Stretch Source", options=["FORM4", "CALCULATED"], index=0)

    st.markdown("---")
    st.subheader("🛡️ Inspection Policy")
    cfg_allow_unknown_insp = st.checkbox(
        "Allow UNKNOWN Inspection Clearance",
        value=True,
        help="Since OHM_004 contains blank templates, checking this permits allocation with warning."
    )

    st.markdown("---")
    st.subheader("🔄 Turnaround Charging")
    cfg_turnaround_chg = st.checkbox("Enable Turnaround Charging", value=True)
    cfg_turnaround_dur = st.slider("Min Charge Time (min)", min_value=15, max_value=90, value=45, step=5)
    cfg_turnaround_soc = st.slider("Target SOC After Layover %", min_value=70, max_value=100, value=100)

    st.markdown("---")
    if st.button("🎲 Randomise Demo Fleet SOC", use_container_width=True):
        fleet_mgr.randomize_demo_soc(min_soc=65.0, max_soc=100.0, seed=42)
        st.success("Fleet SOC randomised for demonstration!")
        st.rerun()

    if st.button("🔄 Reset Fleet to 100% Confirmed", use_container_width=True):
        for b in fleet_mgr.get_all_buses():
            fleet_mgr.update_bus_soc(b.bm_no, 100.0)
            fleet_mgr.resolve_bus_defect(b.bm_no)
        st.success("All buses reset to 100% SOC (Available).")
        st.rerun()


# =============================================================================
# Navigation Tabs
# =============================================================================
tabs = st.tabs([
    "🎯 Core Operational Workflow",
    "⚡ Depot Auto-Allocation",
    "🚌 Fleet State & Defect Management",
    "🌙 Night Halt & Swaps",
    "⏱️ Dynamic Spare Pool & Timeline",
    "🔍 Route Headway Gap Finder",
    "⚠️ Infeasible & Sensitivity",
    "🔄 Bus Reuse & CSB Deadhead",
    "📥 11-Sheet Excel Export"
])


# =============================================================================
# TAB 1: Core Operational Workflow
# =============================================================================
with tabs[0]:
    st.markdown("### 🎯 Manual-SOC Route Feasibility & Bus Allocation Workflow")
    st.info(
        "**Core Depot Process:** Operator manually enters/updates the latest confirmed SOC after charging. "
        "The system estimates the duty distance, calculates bus-specific required SOC, compares available buses, "
        "and recommends the optimal vehicle with minimal battery/range waste."
    )

    # --- Step 1: Manual SOC Update ---
    st.markdown("<div class='step-banner'>STEP 1 — MANUAL SOC UPDATE AFTER CHARGING</div>", unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns([2, 2, 2, 2])
    with col1:
        sel_update_bus = st.selectbox(
            "Select Bus (BM NO)",
            options=[f"{b.bm_no} ({b.reg_no or 'No REG'}) - Range {b.actual_range_km:.1f}km" for b in active_buses],
            key="wf_bus_sel"
        )
        target_bm = sel_update_bus.split()[0]
    with col2:
        curr_b_obj = fleet_mgr.get_bus(target_bm)
        existing_soc = curr_b_obj.current_soc_pct if curr_b_obj else 100.0
        new_soc_val = st.number_input("New Confirmed SOC %", min_value=0.0, max_value=100.0, value=float(existing_soc), step=1.0)
    with col3:
        st.write("")
        st.write("")
        if st.button("💾 Save Confirmed Manual SOC", use_container_width=True):
            fleet_mgr.update_bus_soc(target_bm, new_soc_val)
            st.success(f"Updated {target_bm} to {new_soc_val:.1f}% Confirmed Manual SOC!")
            st.rerun()
    with col4:
        st.metric("Latest Bus State", f"{existing_soc:.1f}%", help="Confirmed manual reading")

    # --- Step 2: Select Duty ---
    st.markdown("<div class='step-banner'>STEP 2 — SELECT DUTY (Shift → Route → Schedule)</div>", unsafe_allow_html=True)
    shifts_available = sorted(list({s.shift for s in schedules}))
    c_s1, c_s2, c_s3 = st.columns(3)
    with c_s1:
        sel_shift = st.selectbox("1. Select Shift", options=shifts_available, index=0)
    filtered_by_shift = [s for s in schedules if s.shift == sel_shift]
    routes_available = sorted(list({s.route for s in filtered_by_shift}))
    with c_s2:
        sel_route = st.selectbox("2. Select Route", options=routes_available, index=0)
    filtered_by_route = [s for s in filtered_by_shift if s.route == sel_route]
    sched_options = [s.schedule_id for s in filtered_by_route]
    with c_s3:
        sel_sched_id = st.selectbox("3. Select Schedule", options=sched_options, index=0)

    selected_schedule = next((s for s in filtered_by_route if s.schedule_id == sel_sched_id), None)

    if selected_schedule:
        # --- Step 3: Pure Route / Stretch Estimator ---
        st.markdown("<div class='step-banner'>STEP 3 — ROUTE / STRETCH ESTIMATOR (Bus-Independent Distance)</div>", unsafe_allow_html=True)
        route_req = estimate_route_requirement(selected_schedule, cfg_stretch_source, cfg_dead_km)

        r_m1, r_m2, r_m3, r_m4, r_m5, r_m6 = st.columns(6)
        with r_m1:
            st.markdown(f"<div class='metric-card'><h4>Route & Complexity</h4><p>{route_req.route} ({route_req.route_complexity})</p></div>", unsafe_allow_html=True)
        with r_m2:
            st.markdown(f"<div class='metric-card'><h4>Timings</h4><p>{route_req.departure_time_str} → {route_req.arrival_time_str}</p></div>", unsafe_allow_html=True)
        with r_m3:
            st.markdown(f"<div class='metric-card'><h4>First Stretch</h4><p>{route_req.first_stretch_km} km</p></div>", unsafe_allow_html=True)
        with r_m4:
            st.markdown(f"<div class='metric-card'><h4>Longest Stretch</h4><p>{route_req.longest_stretch_km} km</p></div>", unsafe_allow_html=True)
        with r_m5:
            st.markdown(f"<div class='metric-card'><h4>Target (+10% Dead)</h4><p>{route_req.longest_target_distance_km} km</p></div>", unsafe_allow_html=True)
        with r_m6:
            st.markdown(f"<div class='metric-card'><h4>Charging Stops</h4><p>{route_req.charging_event_count} Stops</p></div>", unsafe_allow_html=True)

        if route_req.warning_flags:
            st.warning("⚠️ Schedule Flags: " + " | ".join(route_req.warning_flags))

        # --- Step 4: Bus-Specific SOC Estimator ---
        st.markdown("<div class='step-banner'>STEP 4 — BUS-SPECIFIC SOC ESTIMATOR (Degraded Range Dependent)</div>", unsafe_allow_html=True)
        st.caption("Notice: Because each bus has a different degraded Actual Range Final, the SAME duty requires a DIFFERENT SOC % for each bus!")

        # Calculate requirements for top representative buses across categories
        bus_soc_records = []
        for b in active_buses:
            b_req = estimate_bus_soc_requirement(route_req, b.actual_range_km, cfg_reserve, b.current_soc_pct)
            bus_soc_records.append({
                "BM NO": b.bm_no,
                "REG NO": b.reg_no or "None",
                "Category": b.category,
                "Actual Range (km)": b.actual_range_km,
                "Target Dist (km)": b_req.target_distance_km,
                "Base Req SOC %": b_req.base_required_soc_pct,
                "Req SOC (+Reserve) %": b_req.required_soc_with_reserve_pct,
                "Current SOC %": b.current_soc_pct,
                "SOC Margin %": b_req.soc_margin_pct,
                "Status": b.status.value,
                "Defect": "YES" if b.defect_flag else "NO",
                "Feasible": "✅ YES" if b_req.is_departure_soc_eligible and not b.defect_flag else "❌ NO"
            })

        df_bus_soc = pd.DataFrame(bus_soc_records)
        # Display sample comparison
        st.dataframe(
            df_bus_soc.sort_values(by=["Feasible", "SOC Margin %"], ascending=[False, True]),
            use_container_width=True,
            height=240
        )

        # --- Step 5: Candidate Ranking & Allocation Decision ---
        st.markdown("<div class='step-banner'>STEP 5 — CANDIDATE RANKING & ALLOCATION DECISION</div>", unsafe_allow_html=True)
        ranked_cands = rank_candidate_buses(
            selected_schedule, active_buses,
            current_soc={b.bm_no: b.current_soc_pct for b in active_buses},
            reserve_pct=cfg_reserve,
            allow_unknown_inspection=cfg_allow_unknown_insp,
            stretch_source=cfg_stretch_source,
            dead_km_factor=cfg_dead_km
        )

        if ranked_cands:
            best_cand = ranked_cands[0]
            if best_cand.is_eligible_for_auto_allocation:
                st.success(
                    f"🏆 **Recommended Bus: {best_cand.bm_no}** (REG: {best_cand.reg_no or 'N/A'}, Category: {best_cand.category}) | "
                    f"Actual Range: {best_cand.actual_range_km:.1f} km | Range Surplus: +{best_cand.surplus_range_km:.1f} km | "
                    f"Confirmed SOC: {best_cand.current_soc_pct:.1f}% vs Required: {best_cand.first_stretch_required_soc_pct:.1f}% | "
                    f"Margin: +{best_cand.soc_margin_pct:.1f}%"
                )
            else:
                st.error(f"❌ No eligible bus can safely cover this schedule under current constraints! Best candidate ({best_cand.bm_no}) violations: {', '.join(best_cand.constraint_violations)}")

            # Action Buttons
            btn_col1, btn_col2, btn_col3 = st.columns(3)
            with btn_col1:
                if st.button("✅ Approve & Allocate Recommended Bus", use_container_width=True, disabled=not best_cand.is_eligible_for_auto_allocation):
                    fleet_mgr.assign_bus_to_duty(best_cand.bm_no, selected_schedule.schedule_key, selected_schedule.arrival_min)
                    st.success(f"Assigned {best_cand.bm_no} to {selected_schedule.schedule_key}!")
                    st.rerun()

            with btn_col2:
                override_bm = st.selectbox("Manager Override Bus", options=[b.bm_no for b in active_buses if b.bm_no != best_cand.bm_no], key="wf_ovr")
                if st.button("⚠️ Force Manual Assignment (Override)", use_container_width=True):
                    res_ovr = manual_assign_bus(
                        selected_schedule.schedule_key, override_bm, active_buses, schedules,
                        allow_override=True, current_soc={b.bm_no: b.current_soc_pct for b in active_buses}
                    )
                    fleet_mgr.assign_bus_to_duty(override_bm, selected_schedule.schedule_key, selected_schedule.arrival_min)
                    st.warning(f"Overridden: Assigned {override_bm}. Note: {res_ovr.message}")
                    st.rerun()

            with btn_col3:
                if st.button(f"🚨 Mark {best_cand.bm_no} Faulty", use_container_width=True):
                    fleet_mgr.mark_bus_faulty(best_cand.bm_no)
                    st.error(f"Marked {best_cand.bm_no} as DEFECT / NOT READY! Pulled from assignments.")
                    st.rerun()

            # Candidate Ranking Table
            st.markdown("#### Candidate Buses Ranked by Section 18 Priorities (Conserving Category A)")
            ranking_table = []
            for c in ranked_cands[:10]:
                ranking_table.append({
                    "Rank": c.rank,
                    "BM NO": c.bm_no,
                    "REG NO": c.reg_no or "None",
                    "Range (km)": c.actual_range_km,
                    "Cat": c.category,
                    "Current SOC %": c.current_soc_pct,
                    "Req SOC %": c.first_stretch_required_soc_pct,
                    "SOC Margin %": c.soc_margin_pct,
                    "Surplus km": c.surplus_range_km,
                    "Eligible": "YES" if c.is_eligible_for_auto_allocation else "NO",
                    "Ranking Notes": c.ranking_notes
                })
            st.dataframe(pd.DataFrame(ranking_table), use_container_width=True)


# =============================================================================
# TAB 2: Depot Auto-Allocation (Hungarian Optimization)
# =============================================================================
with tabs[1]:
    st.markdown("### ⚡ Full-Shift Depot Multi-Duty Optimization (linear_sum_assignment)")
    st.info("Constructs compatible duty chains (Shift A → Shift B) and runs the Hungarian algorithm to minimize range waste and preserve high-range buses.")

    opt_c1, opt_c2 = st.columns([3, 1])
    with opt_c1:
        st.write("Configured with current fleet SOC states and turnaround charging settings.")
    with opt_c2:
        btn_run_opt = st.button("🚀 Re-Run Optimization Engine", use_container_width=True)

    duty_chains = build_compatible_duty_chains(schedules, min_turnaround_min=20, stretch_source=cfg_stretch_source, dead_km_factor=cfg_dead_km)
    
    current_soc_dict = {b.bm_no: b.current_soc_pct for b in active_buses}
    opt_result = optimize_depot_allocation(
        duty_chains=duty_chains,
        buses=active_buses,
        current_soc=current_soc_dict,
        reserve_pct=cfg_reserve,
        allow_unknown_inspection=cfg_allow_unknown_insp,
        turnaround_charging_enabled=cfg_turnaround_chg,
        turnaround_charge_duration_min=cfg_turnaround_dur,
        turnaround_soc_after_charge=cfg_turnaround_soc,
        dead_km_factor=cfg_dead_km
    )

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Total Schedules", opt_result.total_schedules)
    k2.metric("Duty Chains", opt_result.total_chains)
    k3.metric("Allocated Duties", f"{opt_result.allocated_schedules_count} / {opt_result.total_schedules}")
    k4.metric("Physically Impossible", opt_result.physically_impossible_count)
    k5.metric("Total Cost", f"{opt_result.total_optimization_cost:.1f}")

    opt_rows = []
    for a in opt_result.assignments:
        opt_rows.append({
            "Chain ID": a.chain_id,
            "Schedules": " | ".join(a.schedule_keys),
            "Route": a.route,
            "Category": a.duty_category,
            "Assigned BM": a.assigned_bm_no or "None",
            "REG NO": a.assigned_reg_no or "None",
            "Bus Range (km)": a.bus_actual_range_km or "",
            "Bus Cat": a.bus_category or "",
            "Current SOC %": a.current_soc_pct or "",
            "Req SOC %": a.required_soc_pct or "",
            "Margin %": a.soc_margin_pct or "",
            "Surplus Range (km)": a.surplus_range_km or "",
            "Status": a.allocation_status,
            "Cost": a.cost,
            "Reason": a.reason
        })

    st.dataframe(pd.DataFrame(opt_rows), use_container_width=True, height=450)


# =============================================================================
# TAB 3: Fleet State & Defect Management
# =============================================================================
with tabs[2]:
    st.markdown("### 🚌 Fleet State, 3-State Inspection & Defect Workflow")
    st.caption("Tracks degradation range, manual SOC updates, and active defect/not-ready statuses.")

    f_col1, f_col2, f_col3 = st.columns(3)
    with f_col1:
        st.metric("Total Fleet", len(active_buses))
    with f_col2:
        defective_num = sum(1 for b in active_buses if b.defect_flag)
        st.metric("Defective / Not Ready", defective_num)
    with f_col3:
        available_num = sum(1 for b in active_buses if b.status == BusStatus.AVAILABLE and not b.defect_flag)
        st.metric("Available Fleet", available_num)

    st.markdown("#### Quick Defect & Repair Action")
    d_c1, d_c2, d_c3 = st.columns([3, 2, 2])
    with d_c1:
        bm_defect_target = st.selectbox("Select Bus to Toggle Defect", options=[b.bm_no for b in active_buses], key="d_bm_sel")
    with d_c2:
        st.write("")
        st.write("")
        if st.button("🚨 Mark Bus Faulty", use_container_width=True, key="btn_faulty"):
            fleet_mgr.mark_bus_faulty(bm_defect_target)
            st.error(f"Bus {bm_defect_target} marked as DEFECT / NOT READY.")
            st.rerun()
    with d_c3:
        st.write("")
        st.write("")
        if st.button("✅ Clear Defect / Return to Service", use_container_width=True, key="btn_repair"):
            fleet_mgr.resolve_bus_defect(bm_defect_target)
            st.success(f"Bus {bm_defect_target} defect resolved; returned to Available status.")
            st.rerun()

    fleet_table = []
    for b in active_buses:
        fleet_table.append({
            "BM NO": b.bm_no,
            "REG NO": b.reg_no or "None",
            "Actual Range (km)": b.actual_range_km,
            "Category": b.category,
            "Current SOC %": b.current_soc_pct,
            "Manual Confirmed": "YES" if b.is_manually_confirmed else "NO",
            "Status": b.status.value,
            "Defect Flag": "DEFECT" if b.defect_flag else "OK",
            "Inspection": b.inspection_status.value,
            "Current Duty": b.current_duty or "Available",
            "Next Available": format_minutes_to_time(b.next_available_min)
        })
    st.dataframe(pd.DataFrame(fleet_table), use_container_width=True, height=450)


# =============================================================================
# TAB 4: Night Halt & Swap Engine
# =============================================================================
with tabs[3]:
    st.markdown("### 🌙 Night Halt Allocation & Swap Engine (SCH DATA NH)")
    st.caption("Normalizes midnight-crossing duties and identifies swap requirements where FIX BM != Actual BM or range shortfall.")

    nh_report = evaluate_night_halt_and_swaps(schedules, active_buses, allow_unknown_inspection=cfg_allow_unknown_insp, dead_km_factor=cfg_dead_km)

    nh_k1, nh_k2, nh_k3, nh_k4 = st.columns(4)
    nh_k1.metric("Night Halt Schedules", nh_report.total_nh_schedules)
    nh_k2.metric("Midnight Crossings", sum(1 for r in nh_report.nh_records if r.crosses_midnight))
    nh_k3.metric("Swaps Required", nh_report.swap_required_count)
    nh_k4.metric("General-Shift Unknowns", nh_report.general_unknown_count, help="39 General-shift duties missing from NH roster marked Unknown")

    st.markdown("#### Night Halt Duty Records")
    nh_rows = []
    for r in nh_report.nh_records:
        nh_rows.append({
            "Schedule ID": r.schedule_id,
            "Route": r.route,
            "Fixed BM": r.fix_bm or "None",
            "Actual BM": r.actual_bm or "None",
            "REG NO": r.actual_reg or "None",
            "Recommended BM": r.recommended_bm or "None",
            "Out Time": r.out_time_str,
            "In Time": r.in_time_str,
            "Midnight": "YES" if r.crosses_midnight else "NO",
            "Mismatch": "YES" if r.is_mismatch else "NO",
            "Swap Required": "SWAP" if r.swap_required else "OK",
            "Reason": r.reason
        })
    st.dataframe(pd.DataFrame(nh_rows), use_container_width=True, height=350)

    st.markdown("#### General Shift Duties (SCH DATA NH Unknown Assignment Policy)")
    st.caption("Exactly 39 General-shift duties are not in the master Night Halt roster. These are explicitly tagged Current Assignment = Unknown.")
    gen_rows = []
    for r in nh_report.general_records:
        gen_rows.append({
            "Schedule ID": r.schedule_id,
            "Route": r.route,
            "Shift": r.shift,
            "Current Assignment": r.current_assignment_status,
            "Actual BM": r.actual_bm,
            "Recommended BM": r.recommended_bm,
            "Policy Note": r.reason
        })
    st.dataframe(pd.DataFrame(gen_rows), use_container_width=True, height=250)


# =============================================================================
# TAB 5: Dynamic Operational Spare Pool & Timeline
# =============================================================================
with tabs[4]:
    st.markdown("### ⏱️ Dynamic Operational Spare Pool Engine (0..1439 min Timeline)")
    st.caption("Calculates simultaneous peak vehicle demand across the 24h timeline. Spare Pool = Total Fleet - Peak Demand - Defects - Maintenance.")

    spare_report = calculate_dynamic_spare_pool(schedules, active_buses)

    sp_1, sp_2, sp_3, sp_4, sp_5 = st.columns(5)
    sp_1.metric("Total Fleet", spare_report.total_fleet)
    sp_2.metric("Peak Demand", f"{spare_report.peak_simultaneous_demand} buses")
    sp_3.metric("Peak Time Window", spare_report.peak_time_window_str)
    sp_4.metric("Defective / Maintenance", spare_report.defective_count + spare_report.under_maintenance_count)
    sp_5.metric("Operational Spare Pool", f"{spare_report.operational_spare_pool_count} buses at peak")

    # 24h Demand Chart
    st.markdown("#### 24-Hour Simultaneous Vehicle Demand Profile")
    df_timeline = pd.DataFrame(spare_report.demand_timeline)
    st.bar_chart(df_timeline.set_index("time_str")["active_buses"], color="#1F497D")

    # Available spare bus list
    st.markdown("#### Currently Free Operational Spare Vehicles")
    st.dataframe(pd.DataFrame(spare_report.spare_buses), use_container_width=True, height=300)


# =============================================================================
# TAB 6: Route Headway Gap Finder
# =============================================================================
with tabs[5]:
    st.markdown("### 🔍 Route Headway Gap Finder (>60 min Service Intervals)")
    st.caption("Audits consecutive trip departures by Route & Origin. Recommends free spare buses conserving Category A.")

    gap_threshold = st.slider("Headway Gap Threshold (Minutes)", min_value=30, max_value=120, value=60, step=5)
    gap_rep = find_route_headway_gaps(schedules, active_buses, trips, gap_threshold_min=gap_threshold, dead_km_factor=cfg_dead_km)

    st.metric("Headway Gaps Flagged", f"{gap_rep.gaps_found_count} intervals > {gap_threshold} min")

    gap_rows = []
    for g in gap_rep.gaps:
        gap_rows.append({
            "Route": g.route,
            "Origin": g.origin,
            "Prev Departure": g.prev_departure_str,
            "Next Departure": g.next_departure_str,
            "Gap Duration (min)": g.gap_minutes,
            "Prev Schedule Key": g.prev_schedule_key,
            "Next Schedule Key": g.next_schedule_key,
            "Recommended Spare BM": g.recommended_bus or "None",
            "REG NO": g.recommended_reg or "None",
            "Candidates Count": len(g.candidate_spare_buses),
            "Optimization Note": g.notes
        })
    st.dataframe(pd.DataFrame(gap_rows), use_container_width=True, height=400)


# =============================================================================
# TAB 7: Infeasible Schedule Report & Sensitivity Analysis
# =============================================================================
with tabs[6]:
    st.markdown("### ⚠️ Infeasible Schedules & Reserve Sensitivity Analysis")
    st.caption("Identifies duties whose target distance exceeds the capability of the highest-range bus (BM273 - 136.34 km).")

    infeasible_report = generate_infeasible_schedules_report(schedules, active_buses, cfg_stretch_source, cfg_dead_km, cfg_reserve)
    sensitivity_report = calculate_reserve_sensitivity(schedules, active_buses, cfg_stretch_source, cfg_dead_km)

    inf_k1, inf_k2, inf_k3 = st.columns(3)
    inf_k1.metric("Physically Impossible Schedules", infeasible_report.infeasible_count)
    inf_k2.metric("Highest Fleet Range (BM273)", f"{infeasible_report.highest_bus_range_km:.1f} km")
    inf_k3.metric("Dead-KM Factor", f"{cfg_dead_km:.2f}")

    st.markdown("#### Physically Impossible Schedule Details")
    inf_rows = []
    for r in infeasible_report.rows:
        inf_rows.append({
            "Schedule Key": r.schedule_key,
            "Route": r.route,
            "Shift": r.shift,
            "Form 4 Stretch (km)": r.form4_stretch_km,
            "Calculated (km)": r.calculated_stretch_km,
            "Target (+10%) (km)": r.target_distance_km,
            "Highest Range (km)": r.highest_bus_range_km,
            "Base Req SOC %": r.base_required_soc_pct,
            "Shortfall (km)": r.shortfall_km,
            "Status": r.status.value,
            "Recommended Action": r.recommended_action
        })
    st.dataframe(pd.DataFrame(inf_rows), use_container_width=True, height=300)

    st.markdown("#### Theoretical Schedule Reserve Sensitivity Table")
    st.caption("Answers: 'How many schedules can theoretically be performed by at least the best bus at each reserve assumption?'")
    sens_rows = []
    for row in sensitivity_report.table:
        sens_rows.append({
            "Reserve %": f"{row.reserve_pct}%",
            "Physically Impossible": row.physically_impossible_count,
            "Reserve-Infeasible": row.reserve_infeasible_count,
            "Feasible": row.feasible_count,
            "Total Evaluated": row.total_schedules
        })
    st.dataframe(pd.DataFrame(sens_rows), use_container_width=True)


# =============================================================================
# TAB 8: Bus Reuse & CSB Deadhead Evaluation
# =============================================================================
with tabs[7]:
    st.markdown("### 🔄 Bus Reuse Analysis & Explicit CSB Deadhead Calculator")
    
    st.markdown("#### Shift A → Shift B Bus Reuse Audit")
    reuse_rows = []
    for c in duty_chains:
        if c.is_multi_duty and len(c.schedules) >= 2:
            s1, s2 = c.schedules[0], c.schedules[1]
            reuse_rows.append({
                "Chain ID": c.chain_id,
                "Route": c.route,
                "First Duty": s1.schedule_key,
                "Arrival A": s1.arrival_time_str,
                "Second Duty": s2.schedule_key,
                "Departure B": s2.departure_time_str,
                "Turnaround Layover (min)": c.turnaround_duration_min,
                "Combined Target (km)": c.total_target_distance_km,
                "Turnaround Charging Enabled": "YES" if cfg_turnaround_chg else "NO",
                "Assessment": "Feasible with turnaround fast-charging layover" if cfg_turnaround_chg else "Infeasible on single charge"
            })
    st.dataframe(pd.DataFrame(reuse_rows), use_container_width=True, height=300)

    st.markdown("#### Deadhead Distance Option (Deadhead from CSB)")
    st.caption("Evaluates explicit deadhead without double-counting generic 10% dead-km allowance.")
    dh_c1, dh_c2, dh_c3 = st.columns(3)
    with dh_c1:
        dh_sched_sel = st.selectbox("Select Schedule for Deadhead Analysis", options=[s.schedule_key for s in schedules[:20]])
    with dh_c2:
        dh_explicit_km = st.number_input("Explicit Deadhead from CSB (km)", min_value=0.0, max_value=50.0, value=12.5, step=0.5)
    with dh_c3:
        dh_bus_sel = st.selectbox("Select Candidate Bus", options=[b.bm_no for b in active_buses[:15]])

    sel_dh_sched = next(s for s in schedules if s.schedule_key == dh_sched_sel)
    sel_dh_bus = fleet_mgr.get_bus(dh_bus_sel)
    dh_eval = evaluate_deadhead(sel_dh_sched, explicit_deadhead_km=dh_explicit_km, bus_actual_range_km=sel_dh_bus.actual_range_km, dead_km_factor=cfg_dead_km)

    dh_r1, dh_r2, dh_r3, dh_r4 = st.columns(4)
    dh_r1.metric("Base Operating Distance", f"{dh_eval.base_stretch_km:.1f} km")
    dh_r2.metric("Explicit CSB Deadhead", f"+{dh_eval.explicit_deadhead_km:.1f} km")
    dh_r3.metric("Final Target Distance", f"{dh_eval.final_target_distance_km:.1f} km")
    dh_r4.metric("Base Required SOC", f"{dh_eval.base_required_soc_pct:.1f}%")
    st.info(f"Deadhead Status: {dh_eval.status} | Note: {dh_eval.notes}")


# =============================================================================
# TAB 9: Multi-Sheet Excel Export
# =============================================================================
with tabs[8]:
    st.markdown("### 📥 11-Sheet Excel Export Generation (Section 33 Compliance)")
    st.info("Generates a complete operational Excel workbook containing all 11 required sheets with frozen headers and styled layouts.")

    ex_c1, ex_c2 = st.columns([2, 1])
    with ex_c1:
        st.markdown("""
        **Sheets included:**
        1. `Schedule Allocation` (Full 130-duty allocation audit)
        2. `Fleet` (All 122 buses with degradation range & manual SOC)
        3. `Charging Stretches` (Detailed trip leg segmentation)
        4. `SOC Calculations` (Theoretical requirements against best range)
        5. `Infeasible Schedules` (Physically impossible duties > 136.34 km)
        6. `Reserve Sensitivity` (0%, 5%, 10%, 15% sensitivity matrix)
        7. `Gaps` (Route headway intervals > 60 min)
        8. `Bus Reuse` (Compatible Shift A → Shift B chains)
        9. `Night Halt` (SCH DATA NH comparison and 39 General Unknowns)
        10. `Data Quality` (Workbook audit findings and data dictionary)
        11. `Assumptions` (Configured factors, dead-km treatment, and evidence)
        """)

    with ex_c2:
        st.write("")
        st.write("")
        if st.button("📊 Generate Complete 11-Sheet Workbook", use_container_width=True):
            with st.spinner("Generating Excel export..."):
                export_buffer_path = Path("Chandapura_Depot_Battery_Allocation.xlsx")
                generate_depot_excel_export(
                    schedules=schedules,
                    buses=active_buses,
                    trips_by_key=trips,
                    output_path=export_buffer_path,
                    allow_unknown_inspection=cfg_allow_unknown_insp,
                    dead_km_factor=cfg_dead_km
                )
                with open(export_buffer_path, "rb") as f:
                    file_bytes = f.read()

                st.download_button(
                    label="⬇️ Download Excel File (.xlsx)",
                    data=file_bytes,
                    file_name="Chandapura_Depot_Battery_Allocation.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True
                )
                st.success("Excel export generated successfully!")
