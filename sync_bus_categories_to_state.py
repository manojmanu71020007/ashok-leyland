import json

with open('vehicles/bus_categories.json', 'r', encoding='utf-8') as f:
    bus_categories = {b['bm_number']: b for b in json.load(f)}

with open('bus_state.json', 'r', encoding='utf-8') as f:
    state = json.load(f)

# Update state entries for each bus
updated_count = 0
for bm, binfo in bus_categories.items():
    cat = binfo['category']
    actual_range = binfo['actual_range_km']
    
    # 1. Main entry
    if bm in state and isinstance(state[bm], dict):
        state[bm]['busCategory'] = cat
        state[bm]['testedRangeKm'] = actual_range
        state[bm]['actualRangeFinal'] = actual_range
        updated_count += 1
        
    # 2. _busAssignments
    if '_busAssignments' in state and bm in state['_busAssignments']:
        state['_busAssignments'][bm]['busCategory'] = cat
        state['_busAssignments'][bm]['testedRangeKm'] = actual_range
        state['_busAssignments'][bm]['actualRangeFinal'] = actual_range
        
    # 3. _vehicleAssignments
    if '_vehicleAssignments' in state and bm in state['_vehicleAssignments']:
        state['_vehicleAssignments'][bm]['busCategory'] = cat
        state['_vehicleAssignments'][bm]['testedRangeKm'] = actual_range
        state['_vehicleAssignments'][bm]['actualRangeFinal'] = actual_range

with open('bus_state.json', 'w', encoding='utf-8') as f:
    json.dump(state, f, indent=2)

print(f"Successfully updated bus_state.json with {len(bus_categories)} real bus categories and ranges! (Direct entries updated: {updated_count})")
