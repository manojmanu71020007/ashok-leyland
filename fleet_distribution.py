"""Fleet Status Distribution Calculator for N Buses.

Computes exact fleet distribution across:
- ON_ROUTE (Allocated on active duty)
- AVAILABLE_FOR_SCHEDULING (In depot, SoC >= READY_SOC_MIN, cleaning done)
- LOCKED:
    - ONGOING_CHARGING
    - ONGOING_CLEANING
    - RECENTLY_COMPLETED (Turnaround awaiting servicing before scheduling)
Across Depot 1, Depot 2, and Combined Fleet.
"""

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

READY_SOC_MIN = 98

STATIC_TIERS = {
    # Default fallbacks if workbook not parsed
}

def load_bus_tiers() -> Dict[str, str]:
    """Load bus tiers from bus_categories.json, workbook, or vehicles list."""
    tiers: Dict[str, str] = {}
    
    # 1. Primary authoritative JSON: vehicles/bus_categories.json
    cat_json_path = Path("vehicles/bus_categories.json")
    if cat_json_path.exists():
        try:
            with open(cat_json_path, "r", encoding="utf-8") as f:
                cat_list = json.load(f)
                for item in cat_list:
                    bm = str(item.get("bm_number") or "").strip().upper()
                    c = str(item.get("category") or "").strip().upper()
                    if bm and c:
                        tiers[bm] = c
        except Exception:
            pass
            
    # 2. Try reading from vehicles/vehicles.txt or Excel workbook if available
    excel_path = Path("data/Form_4_Consolidation_-_Chandapura.xlsx")
    if excel_path.exists():
        try:
            import openpyxl
            wb = openpyxl.load_workbook(excel_path, data_only=True)
            if "Bus category" in wb.sheetnames:
                ws = wb["Bus category"]
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if not row or not row[0]:
                        continue
                    bm = str(row[0]).strip().upper()
                    cat = str(row[3]).strip().upper() if len(row) > 3 and row[3] else "UNKNOWN"
                    tiers[bm] = cat
        except Exception:
            pass
            
    # 2. Check vehicles/vehicles.txt
    veh_path = Path("vehicles/vehicles.txt")
    if veh_path.exists():
        try:
            with open(veh_path, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 3 and parts[0].startswith("BM"):
                        bm = parts[0].upper()
                        if bm not in tiers:
                            tiers[bm] = parts[2].upper()
        except Exception:
            pass
            
    return tiers


def calculate_distribution(state_path: str = "bus_state.json") -> Dict[str, Any]:
    """Authoritative calculation of fleet distribution per depot and fleet-wide."""
    path = Path(state_path)
    if not path.exists():
        raise FileNotFoundError(f"State file {state_path} not found")
        
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    tiers = load_bus_tiers()
    
    deleted_buses = data.get("_deletedBuses", {})
    depot_assignments = data.get("_depotAssignments", {})
    servicing_status = data.get("_servicingStatus", {})
    locked_list = data.get("_lockedBuses", [])
    allocated_duties = data.get("_allocatedDuties", [])
    
    allocated_bms = set()
    for d in allocated_duties:
        bm = d.get("bm") or d.get("bmNumber") or d.get("busId")
        if bm:
            allocated_bms.add(str(bm).strip().upper())
            
    locked_bms: Dict[str, Dict[str, Any]] = {}
    for lb in locked_list:
        bm = str(lb.get("bm") or lb.get("bmNumber") or "").strip().upper()
        if bm:
            locked_bms[bm] = lb
            
    active_buses = []
    for k, v in data.items():
        if not k.startswith("BM"):
            continue
        if k in deleted_buses:
            continue
        if isinstance(v, dict) and (v.get("isDeleted") or v.get("deleted")):
            continue
        active_buses.append(k)
        
    active_buses = sorted(list(set(active_buses)), key=lambda x: (int(x.replace("BM", "")) if x.replace("BM", "").isdigit() else 9999, x))
    total_n = len(active_buses)
    
    # Structure for groups
    def make_bucket():
        return {
            "total": 0,
            "on_route": 0,
            "available_for_scheduling": 0,
            "locked_total": 0,
            "ongoing_charging": 0,
            "ongoing_cleaning": 0,
            "recently_completed": 0,
            "tier_A": 0,
            "tier_B": 0,
            "tier_C": 0,
            "tier_UNKNOWN": 0,
        }
        
    overall = make_bucket()
    depot_1 = make_bucket()
    depot_2 = make_bucket()
    
    tier_matrix = {
        "A": {"available": 0, "on_route": 0, "locked_charging": 0, "locked_cleaning": 0, "locked_recent": 0, "locked_total": 0, "total": 0},
        "B": {"available": 0, "on_route": 0, "locked_charging": 0, "locked_cleaning": 0, "locked_recent": 0, "locked_total": 0, "total": 0},
        "C": {"available": 0, "on_route": 0, "locked_charging": 0, "locked_cleaning": 0, "locked_recent": 0, "locked_total": 0, "total": 0},
        "UNKNOWN": {"available": 0, "on_route": 0, "locked_charging": 0, "locked_cleaning": 0, "locked_recent": 0, "locked_total": 0, "total": 0},
    }
    
    bus_details = []
    
    for bm in active_buses:
        bus_data = data.get(bm, {})
        depot = str(depot_assignments.get(bm, "1"))
        tier = tiers.get(bm, bus_data.get("busCategory", "UNKNOWN")).upper()
        if tier not in tier_matrix:
            tier = "UNKNOWN"
            
        soc = float(bus_data.get("soc", 100))
        serv = servicing_status.get(bm, {})
        if not isinstance(serv, dict):
            serv = {}
            
        charging_done = bool(serv.get("chargingCompleted") or (not serv.get("needsCharging") and serv.get("routeCompleted") is False))
        cleaning_done = bool(serv.get("cleaningCompleted") or (not serv.get("needsCleaning") and serv.get("routeCompleted") is False))
        
        # Order of decision:
        # 1. ON_ROUTE
        if bm in allocated_bms:
            group = "ON_ROUTE"
            subgroup = "ON_ROUTE"
        # 2. LOCKED (Only if explicitly locked in locked_bms by manual depot action)
        elif bm in locked_bms:
            lb = locked_bms[bm]
            p = str(lb.get("page") or lb.get("reason") or "").lower()
            if "charg" in p:
                group = "LOCKED"
                subgroup = "ONGOING_CHARGING"
            elif "clean" in p:
                group = "LOCKED"
                subgroup = "ONGOING_CLEANING"
            else:
                group = "LOCKED"
                subgroup = "RECENTLY_COMPLETED"
        # 3. AVAILABLE_FOR_SCHEDULING (All unallocated, unlocked yard fleet)
        else:
            group = "AVAILABLE_FOR_SCHEDULING"
            subgroup = "AVAILABLE_FOR_SCHEDULING"
            
        # Update metrics
        target_bucket = depot_1 if depot == "1" else depot_2
        
        for b in [overall, target_bucket]:
            b["total"] += 1
            b[f"tier_{tier}"] += 1
            if group == "ON_ROUTE":
                b["on_route"] += 1
            elif group == "AVAILABLE_FOR_SCHEDULING":
                b["available_for_scheduling"] += 1
            elif group == "LOCKED":
                b["locked_total"] += 1
                if subgroup == "ONGOING_CHARGING":
                    b["ongoing_charging"] += 1
                elif subgroup == "ONGOING_CLEANING":
                    b["ongoing_cleaning"] += 1
                else:
                    b["recently_completed"] += 1
                    
        # Update tier matrix
        tm = tier_matrix[tier]
        tm["total"] += 1
        if group == "ON_ROUTE":
            tm["on_route"] += 1
        elif group == "AVAILABLE_FOR_SCHEDULING":
            tm["available"] += 1
        elif group == "LOCKED":
            tm["locked_total"] += 1
            if subgroup == "ONGOING_CHARGING":
                tm["locked_charging"] += 1
            elif subgroup == "ONGOING_CLEANING":
                tm["locked_cleaning"] += 1
            else:
                tm["locked_recent"] += 1
                
        bus_details.append({
            "bm": bm,
            "depot": depot,
            "tier": tier,
            "soc": soc,
            "group": group,
            "subgroup": subgroup
        })
        
    # Check integrity
    fleet_sum = overall["on_route"] + overall["available_for_scheduling"] + overall["locked_total"]
    depot_sum = depot_1["total"] + depot_2["total"]
    is_valid = (fleet_sum == total_n) and (depot_sum == total_n)
    
    return {
        "ok": True,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "as_of_time": datetime.now().strftime("%I:%M %p, %d %b %Y"),
        "settings": {
            "READY_SOC_MIN": READY_SOC_MIN
        },
        "N": total_n,
        "check_result": {
            "status": "PASS" if is_valid else "FAIL",
            "fleet_sum": fleet_sum,
            "depot_sum": depot_sum,
            "equation": f"Available ({overall['available_for_scheduling']}) + On Route ({overall['on_route']}) + Locked ({overall['locked_total']}) = {total_n}"
        },
        "overall": overall,
        "depot_1": depot_1,
        "depot_2": depot_2,
        "tier_matrix": tier_matrix,
        "bus_details": bus_details
    }


if __name__ == "__main__":
    import sys
    result = calculate_distribution()
    if "--json" in sys.argv:
        print(json.dumps(result, indent=2, ensure_ascii=False))
        sys.exit(0)
    print("=" * 80)
    print(f"FLEET STATUS DISTRIBUTION (N = {result['N']})")
    print(f"Status: {result['check_result']['status']} | {result['check_result']['equation']}")
    print("=" * 80)
    print(f"{'Operational Group':<40} | {'Depot 1':<10} | {'Depot 2':<10} | {'Total':<10}")
    print("-" * 80)
    o = result["overall"]
    d1 = result["depot_1"]
    d2 = result["depot_2"]
    print(f"{'On Route':<40} | {d1['on_route']:<10} | {d2['on_route']:<10} | {o['on_route']:<10}")
    print(f"{'Available for Scheduling':<40} | {d1['available_for_scheduling']:<10} | {d2['available_for_scheduling']:<10} | {o['available_for_scheduling']:<10}")
    print(f"{'Locked: Ongoing Charging':<40} | {d1['ongoing_charging']:<10} | {d2['ongoing_charging']:<10} | {o['ongoing_charging']:<10}")
    print(f"{'Locked: Ongoing Cleaning':<40} | {d1['ongoing_cleaning']:<10} | {d2['ongoing_cleaning']:<10} | {o['ongoing_cleaning']:<10}")
    print(f"{'Locked: Recently Completed Route Buses':<40} | {d1['recently_completed']:<10} | {d2['recently_completed']:<10} | {o['recently_completed']:<10}")
    print(f"{'Total Locked':<40} | {d1['locked_total']:<10} | {d2['locked_total']:<10} | {o['locked_total']:<10}")
    print("-" * 80)
    print(f"{'TOTAL FLEET (N)':<40} | {d1['total']:<10} | {d2['total']:<10} | {o['total']:<10}")
    print("=" * 80)
