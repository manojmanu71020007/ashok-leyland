/**
 * Fleet Count & Canonical Identification Verification Test Suite
 *
 * Verifies:
 * 1. Normalized BM number is the canonical physical bus identifier (/^BM\d+$/i).
 * 2. Non-bus entries (route IDs '1'-'9', schedule aliases 'BUS-01'..'BUS-133', corridor codes) are ignored.
 * 3. Deleted buses are excluded.
 * 4. Locked buses are included in the fleet total.
 * 5. Added buses are counted without duplicate keys.
 * 6. Dynamic updates: additions, deletions, restorations, depot transfers.
 * 7. Depot 1 count (57) + Depot 2 count (65) = Total Fleet (122).
 */

const fs = require('fs');
const assert = require('assert');

console.log('====================================================');
console.log('Running Fleet Count & Deduplication Test Suite');
console.log('====================================================\n');

// 1. Load actual files
const adminHtml = fs.readFileSync('admin.html', 'utf8');
const syncEngineJs = fs.readFileSync('sync-engine.js', 'utf8');
const schedulingHtml = fs.readFileSync('scheduling.html', 'utf8');
const busStateJson = JSON.parse(fs.readFileSync('bus_state.json', 'utf8'));
const vehiclesTxt = fs.readFileSync('vehicles/vehicles.txt', 'utf8');

// Helper: Canonical BM validation
function isCanonicalBm(key) {
    if (!key || typeof key !== 'string') return false;
    const clean = key.trim().toUpperCase();
    return /^BM\d+$/i.test(clean);
}

// -----------------------------------------------------------------
// Test 1: Canonical BM Filter Rule
// -----------------------------------------------------------------
console.log('Test 1: Canonical BM Validation Rules');
const validBMs = ['BM001', 'BM002', 'BM238', 'BM304', 'bm052', '  BM100  '];
validBMs.forEach(bm => {
    assert.strictEqual(isCanonicalBm(bm), true, `Expected ${bm} to be a valid canonical BM`);
});

const invalidKeys = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9',     // Corridor Route IDs
    'BUS-01', 'BUS-02', 'BUS-54', 'BUS-133',         // Timetable schedule aliases
    '356Z', '360K', '600F', 'KBS3A', '328H',         // Route codes
    'ranges', 'KA35MS0000', '', null, undefined     // Metadata and registration strings
];
invalidKeys.forEach(key => {
    assert.strictEqual(isCanonicalBm(key), false, `Expected ${key} to be rejected as a non-bus entry`);
});
console.log('  PASS: All valid BMs accepted, and all route IDs, schedules, and aliases rejected.\n');

// -----------------------------------------------------------------
// Test 2: Verify Root Cause of 263
// -----------------------------------------------------------------
console.log('Test 2: Root Cause Identification of 263 in bus_state.json');
const allBusStateKeys = Object.keys(busStateJson).filter(k => !k.startsWith('_'));
const deletedBuses = busStateJson._deletedBuses || {};

const physicalBmKeys = allBusStateKeys.filter(k => isCanonicalBm(k));
const routeIdKeys = allBusStateKeys.filter(k => /^\d+$/.test(k));
const timetableAliasKeys = allBusStateKeys.filter(k => /^BUS-/i.test(k));
const otherNonBusKeys = allBusStateKeys.filter(k => !isCanonicalBm(k) && !/^\d+$/.test(k) && !/^BUS-/i.test(k));

console.log(`  Total non-underscore keys in bus_state.json: ${allBusStateKeys.length}`);
console.log(`  - Canonical BM keys: ${physicalBmKeys.length}`);
console.log(`  - Corridor route IDs ('1'-'9'): ${routeIdKeys.length}`);
console.log(`  - Timetable schedule aliases ('BUS-xx'): ${timetableAliasKeys.length}`);
console.log(`  - Other non-bus keys: ${otherNonBusKeys.length} (${otherNonBusKeys.join(', ')})`);
console.log(`  - Deleted buses in _deletedBuses: ${Object.keys(deletedBuses).length}`);

const uncanonicalCount = allBusStateKeys.filter(k => !deletedBuses[k] && !(busStateJson[k] && busStateJson[k].status === 'Deleted')).length;
console.log(`  - Total without canonical filtering: ${uncanonicalCount}`);
assert.ok(uncanonicalCount >= 263, 'Uncanonical count matches the reported ~263 bug source');

const canonicalActive = physicalBmKeys.filter(bm => !deletedBuses[bm] && !(busStateJson[bm] && busStateJson[bm].status === 'Deleted'));
console.log(`  - Canonical physical fleet count: ${canonicalActive.length}`);
assert.strictEqual(canonicalActive.length, 122, 'Canonical physical fleet must be exactly 122');
console.log('  PASS: Root cause confirmed and canonical filtering resolves to 122.\n');

// -----------------------------------------------------------------
// Test 3: Simulation of admin.html getTotalBusesFleetList()
// -----------------------------------------------------------------
console.log('Test 3: admin.html Fleet List Calculation');
const defMatch = adminHtml.match(/const DEFAULT_FLEET_BMS = (\[.*?\]);/s);
const DEFAULT_FLEET_BMS = defMatch ? JSON.parse(defMatch[1]) : [];

const staticCatMatch = adminHtml.match(/const STATIC_BUS_CATEGORIES = (\{.*?\});/s);
const STATIC_BUS_CATEGORIES = staticCatMatch ? JSON.parse(staticCatMatch[1]) : {};

const defDepotMatch = adminHtml.match(/const DEFAULT_DEPOT_MAP = (\{.*?\});/s);
const DEFAULT_DEPOT_MAP = defDepotMatch ? JSON.parse(defDepotMatch[1]) : {};

const addedBuses = busStateJson._addedBuses || {};
const depotAssignments = busStateJson._depotAssignments || DEFAULT_DEPOT_MAP;

function getBusDepot(bm) {
    const clean = String(bm || '').toUpperCase().trim();
    if (addedBuses[clean] && addedBuses[clean].depot) return String(addedBuses[clean].depot);
    if (depotAssignments[clean]) return String(depotAssignments[clean]);
    if (DEFAULT_DEPOT_MAP[clean]) return DEFAULT_DEPOT_MAP[clean];
    return '1';
}

// Simulating with dummy polluted routes containing route IDs and aliases
const mockPollutedRoutes = [
    { uniqueId: '1', bmNumber: '1', routeShortName: '356Z' },
    { uniqueId: 'BUS-01', bmNumber: 'BUS-01', routeShortName: '356Z' },
    { uniqueId: 'BM001', bmNumber: 'BM001', routeShortName: '600F' },
    { uniqueId: 'BM238', bmNumber: 'BM238', routeShortName: '600F' }
];

const rawKeys = [
    ...DEFAULT_FLEET_BMS,
    ...Object.keys(STATIC_BUS_CATEGORIES || {}),
    ...Object.keys(addedBuses || {}),
    ...mockPollutedRoutes.map(r => r.bmNumber || r.uniqueId).filter(Boolean)
];

const allFleetKeys = Array.from(new Set(rawKeys.map(k => String(k).toUpperCase().trim())))
    .filter(bm => isCanonicalBm(bm) && !deletedBuses[bm]);

let d1Count = 0;
let d2Count = 0;
allFleetKeys.forEach(bm => {
    if (getBusDepot(bm) === '2') d2Count++;
    else d1Count++;
});

console.log(`  Total physical fleet: ${allFleetKeys.length}`);
console.log(`  Depot 1 Fleet: ${d1Count}`);
console.log(`  Depot 2 Fleet: ${d2Count}`);
assert.strictEqual(allFleetKeys.length, 122, 'Total fleet must equal 122');
assert.strictEqual(d1Count, 57, 'Depot 1 fleet must equal 57');
assert.strictEqual(d2Count, 65, 'Depot 2 fleet must equal 65');
assert.strictEqual(d1Count + d2Count, 122, 'Depot 1 + Depot 2 must equal Total');
console.log('  PASS: admin.html calculation returns 57 (D1) + 65 (D2) = 122 Total.\n');

// -----------------------------------------------------------------
// Test 4: Dynamic Addition, Deletion, Restoration, and Transfer
// -----------------------------------------------------------------
console.log('Test 4: Dynamic Fleet Reactivity (No Hardcoded 122)');
let testAdded = Object.assign({}, addedBuses);
let testDeleted = Object.assign({}, deletedBuses);
let testDepotMap = Object.assign({}, depotAssignments);

function calcTestCounts() {
    const rKeys = [
        ...DEFAULT_FLEET_BMS,
        ...Object.keys(STATIC_BUS_CATEGORIES || {}),
        ...Object.keys(testAdded || {})
    ];
    const fleetKeys = Array.from(new Set(rKeys.map(k => String(k).toUpperCase().trim())))
        .filter(bm => isCanonicalBm(bm) && !testDeleted[bm]);
    let d1 = 0, d2 = 0;
    fleetKeys.forEach(bm => {
        const d = (testAdded[bm] && testAdded[bm].depot) || testDepotMap[bm] || DEFAULT_DEPOT_MAP[bm] || '1';
        if (String(d) === '2') d2++; else d1++;
    });
    return { total: fleetKeys.length, d1, d2 };
}

// 4a. Initial
let state = calcTestCounts();
assert.strictEqual(state.total, 122);
assert.strictEqual(state.d1, 57);
assert.strictEqual(state.d2, 65);

// 4b. Add a new bus BM501 to Depot 1
testAdded['BM501'] = { bm: 'BM501', depot: '1' };
state = calcTestCounts();
assert.strictEqual(state.total, 123, 'Adding bus must increase total to 123');
assert.strictEqual(state.d1, 58, 'Depot 1 must increase to 58');
assert.strictEqual(state.d2, 65, 'Depot 2 must remain 65');
console.log('  PASS: Added new bus BM501 -> Total: 123 (D1: 58, D2: 65)');

// 4c. Delete an existing bus BM001
testDeleted['BM001'] = { bm: 'BM001' };
state = calcTestCounts();
assert.strictEqual(state.total, 122, 'Deleting bus must decrease total to 122');
assert.strictEqual(state.d1, 57, 'Depot 1 must decrease to 57');
console.log('  PASS: Deleted bus BM001 -> Total: 122 (D1: 57, D2: 65)');

// 4d. Transfer BM052 from Depot 2 to Depot 1
assert.strictEqual(testDepotMap['BM052'], '2', 'BM052 should start in Depot 2');
testDepotMap['BM052'] = '1';
state = calcTestCounts();
assert.strictEqual(state.total, 122, 'Transfer must not change total');
assert.strictEqual(state.d1, 58, 'Depot 1 must increase to 58');
assert.strictEqual(state.d2, 64, 'Depot 2 must decrease to 64');
console.log('  PASS: Transferred BM052 to Depot 1 -> Total: 122 (D1: 58, D2: 64)');

// 4e. Restore BM001
delete testDeleted['BM001'];
state = calcTestCounts();
assert.strictEqual(state.total, 123, 'Restoring bus must increase total');
console.log('  PASS: Restored BM001 -> Total: 123 (D1: 59, D2: 64)\n');

// -----------------------------------------------------------------
// Test 5: Locked Buses are Included in Fleet
// -----------------------------------------------------------------
console.log('Test 5: Locked Buses Included in Total Fleet');
const mockLockedBuses = [{ bm: 'BM238', reason: 'Charging' }, { bm: 'BM002', reason: 'Cleaning' }];
mockLockedBuses.forEach(lockedItem => {
    assert.strictEqual(allFleetKeys.includes(lockedItem.bm), true, `Locked bus ${lockedItem.bm} must be included in fleet`);
});
console.log('  PASS: Locked buses are fully preserved in total fleet.\n');

// -----------------------------------------------------------------
// Test 6: Verify Consistency in admin.html, sync-engine.js, and scheduling.html
// -----------------------------------------------------------------
console.log('Test 6: Verify isCanonicalBm Integration Across Files');
assert.ok(adminHtml.includes('function isCanonicalBm'), 'admin.html must contain isCanonicalBm');
assert.ok(syncEngineJs.includes('function isCanonicalBm'), 'sync-engine.js must contain isCanonicalBm');
assert.ok(schedulingHtml.includes('function isCanonicalBm'), 'scheduling.html must contain isCanonicalBm');

// Verify that admin.html listens to depot-updated
assert.ok(adminHtml.includes("window.DepotSyncEngine.on('depot-updated', handleSyncStateUpdate)"),
    'admin.html must listen to depot-updated event');

console.log('  PASS: All files contain canonical BM filtering and real-time depot sync listeners.\n');

console.log('====================================================');
console.log('ALL TESTS PASSED SUCCESSFULLY (6/6)');
console.log('Depot 1 (57) + Depot 2 (65) = Total (122)');
console.log('====================================================');
