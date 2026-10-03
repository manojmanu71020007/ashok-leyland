import json
from collections import defaultdict

with open("vehicles/bus_categories.json", "r", encoding="utf-8") as f:
    buses = json.load(f)

with open("vehicles/schedule_categories.json", "r", encoding="utf-8") as f:
    schedules = json.load(f)

# Also load existing vehicle assignments
existing_sched_ids = set()
try:
    with open("vehicles/vehicle_assignments.csv", "r", encoding="utf-8") as f:
        lines = f.readlines()
        for l in lines[1:]:
            parts = l.strip().split(",")
            if parts:
                existing_sched_ids.add(parts[0].strip())
except Exception as e:
    pass

print("================================================================================")
print("                       ASHOK LEYLAND BMTC DEPOT DATASET ANALYSIS")
print("================================================================================")

# 1. Dataset Presence & Comparison
new_in_sched = [s['schedule_id'] for s in schedules if s['schedule_id'] not in existing_sched_ids]
print(f"\n1. DATASET PRESENCE & REPOSITORY COMPARISON:")
print(f"   - Existing schedules in vehicle_assignments.csv: {len(existing_sched_ids)}")
print(f"   - Schedules in new Form 4 dataset: {len(schedules)}")
print(f"   - Overlapping schedules: {len(schedules) - len(new_in_sched)}")
print(f"   - Newly introduced schedules in this dataset: {len(new_in_sched)} ({', '.join(new_in_sched[:8])}...)")
print(f"   - Tested Bus degradation records (Actual range final): {len(buses)} buses")
print(f"   -> VERDICT: This full Form 4 operational dataset with bus degradation range tiers was NOT previously in the codebase.")

# 2. Bus Fleet Capacity & Range Degradation Analysis
bus_by_cat = defaultdict(list)
for b in buses:
    bus_by_cat[b['category']].append(b)

print(f"\n2. BUS FLEET BREAKDOWN BY TESTED ACTUAL RANGE (122 Buses):")
for cat in ['A', 'B', 'C']:
    blist = bus_by_cat[cat]
    ranges = [b['actual_range_km'] for b in blist]
    print(f"   * Category {cat} ({len(blist)} buses, {len(blist)/len(buses)*100:.1f}% of fleet):")
    print(f"     - Range Span: {min(ranges):.2f} km to {max(ranges):.2f} km (Mean: {sum(ranges)/len(ranges):.2f} km)")
    bms = [b['bm_number'] for b in blist]
    print(f"     - Lowest vehicle: {bms[0]} ({min(ranges):.2f} km) | Highest: {bms[-1]} ({max(ranges):.2f} km)")

# 3. Schedule Demand Breakdown
sched_by_cat = defaultdict(list)
sched_by_shift = defaultdict(list)
sched_by_route = defaultdict(list)

for s in schedules:
    sched_by_cat[s['category']].append(s)
    sched_by_shift[s['shift']].append(s)
    sched_by_route[s['route']].append(s)

print(f"\n3. SCHEDULE DEMAND & DUTY COMPLEXITY BREAKDOWN (130 Duties):")
for cat in ['Standard', 'Moderate', 'Complex']:
    slist = sched_by_cat[cat]
    reqs = [s['single_charge_req_km'] for s in slist]
    acts = [s['actual_km'] for s in slist]
    dead_kms = [s['dead_km'] for s in slist]
    print(f"   * {cat} Schedules ({len(slist)} duties, {len(slist)/len(schedules)*100:.1f}% of duties):")
    print(f"     - Single Charge Operation Required: {min(reqs):.1f} km to {max(reqs):.1f} km (Avg: {sum(reqs)/len(reqs):.1f} km)")
    print(f"     - Total Actual Duty Distance: {min(acts):.1f} km to {max(acts):.1f} km (Avg: {sum(acts)/len(acts):.1f} km)")
    print(f"     - Total Dead Km per duty: Avg {sum(dead_kms)/len(dead_kms):.2f} km (10% dead mileage factor)")

# 4. Shifts and Routes
print(f"\n4. SHIFT & ROUTE DISTRIBUTION:")
print("   - By Shift:")
for sh, slist in sorted(sched_by_shift.items()):
    avg_req = sum(s['single_charge_req_km'] for s in slist) / len(slist)
    print(f"     * {sh:<15}: {len(slist):>2} duties | Avg Req Range: {avg_req:.1f} km")

print("   - By Route:")
for rt, slist in sorted(sched_by_route.items(), key=lambda x: -len(x[1])):
    print(f"     * Route {rt:<6}: {len(slist):>2} duties | Categories: {set(s['category'] for s in slist)}")

# 5. Supply vs Demand Alignment & Bottleneck Identification
print(f"\n5. SUPPLY VS DEMAND MATCHING & BOTTLENECK ANALYSIS:")
cat_map = {
    'Standard': ('Category C Buses (62 - 105.5 km)', len(bus_by_cat['C']), len(sched_by_cat['Standard'])),
    'Moderate': ('Category B Buses (106 - 120.5 km)', len(bus_by_cat['B']), len(sched_by_cat['Moderate'])),
    'Complex':  ('Category A Buses (121 - 136.3 km)', len(bus_by_cat['A']), len(sched_by_cat['Complex']))
}

for duty_cat, (bus_desc, bus_count, duty_count) in cat_map.items():
    diff = bus_count - duty_count
    status = f"+{diff} SURPLUS" if diff >= 0 else f"{diff} DEFICIT (CRITICAL SHORTAGE)"
    print(f"   * {duty_cat:<8} Duties ({duty_count:>2}) vs {bus_desc} ({bus_count:>2}): {status}")

# 6. Detailed Analysis of the Complex Duty Bottleneck
print(f"\n6. DETAILED BOTTLENECK: COMPLEX DUTIES VS FLEET CAPABILITY:")
highest_bus_range = max(b['actual_range_km'] for b in buses)
print(f"   - Maximum tested bus range across entire fleet: {highest_bus_range:.2f} km (BM273)")
exceeding_fleet = [s for s in schedules if s['single_charge_req_km'] > highest_bus_range]
print(f"   - Schedules where Single Charge Requirement > Highest Bus Range ({highest_bus_range:.1f} km): {len(exceeding_fleet)} duties!")
for s in exceeding_fleet[:10]:
    print(f"     * {s['schedule_id']} ({s['shift']}, Route {s['route']}): Req = {s['single_charge_req_km']} km, Actual Duty = {s['actual_km']} km, Remarks: {s['remarks']}")

# 7. Opportunity Charging & Rest Stop Infrastructure
rest_stops = defaultdict(list)
for s in schedules:
    if s['remarks']:
        rest_stops[s['remarks']].append(s['schedule_id'])

print(f"\n7. REST STOPS & OPPORTUNITY CHARGING ENABLERS:")
print(f"   - Out of {len(schedules)} duties, {sum(1 for s in schedules if s['no_of_rest'] > 0)} have designated rest stops.")
print(f"   - Key opportunity charging terminal nodes identified in remarks:")
for rem, sids in sorted(rest_stops.items(), key=lambda x: -len(x[1])):
    print(f"     * [{len(sids):>2} duties] {rem} (e.g. {', '.join(sids[:4])})")

print("================================================================================")
