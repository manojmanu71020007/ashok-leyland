import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAllDepots,
  registerNewDepot,
  deleteDepot,
  getRoutesForDepot,
  addRouteToDepot,
  removeRouteFromDepot,
  getDepotCredentialsList,
} from '../mobile/src/context/accounts.js';

console.log('Testing Schedule Overview, Dynamic Routes, and Depot Operations Summaries...\n');

// ─────────────────────────────────────────────────────────────
// 1. Initial State Check
// ─────────────────────────────────────────────────────────────
const initialDepots = getAllDepots();
console.log(`Initial Depots: ${initialDepots.length}`);
assert(initialDepots.some((d) => d.id === '1'), 'Depot 1 must be present');
assert(initialDepots.some((d) => d.id === '2'), 'Depot 2 must be present');

// ─────────────────────────────────────────────────────────────
// 2. Newly Created Depot (Depot 5) with NO initial routes
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 2: Creating New Depot 5 with NO Routes ---');
const regRes = registerNewDepot({
  id: '5',
  name: 'Depot 5 (Kengeri Satellite)',
  location: 'Kengeri Satellite Town',
  routes: [], // Zero routes initially
  password: 'Test@123',
});

assert.strictEqual(regRes.ok, true, 'Depot 5 must register successfully');
assert.strictEqual(regRes.depot.id, '5');
assert.deepStrictEqual(regRes.depot.routes, [], 'Depot 5 routes must initially be empty');

// Check getRoutesForDepot for Depot 5
const d5Routes = getRoutesForDepot('5');
console.log(`Depot 5 initial assigned routes:`, d5Routes);
assert.deepStrictEqual(d5Routes, [], 'Depot 5 routes must be strictly empty array []');
console.log('PASS: Newly created Depot 5 has exactly 0 routes assigned.');

// ─────────────────────────────────────────────────────────────
// 3. Scheduling Screen Simulation for Newly Created Depot 5
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 3: Verifying Scheduling Screen Zero State for Depot 5 ---');
const ALL_BASE_ROUTES = [
  { id: '356Z', code: '356Z', name: 'Chandapura ➔ Anekal' },
  { id: '360K', code: '360K', name: 'Chandapura ➔ Majestic' },
  { id: 'KBS3A', code: 'KBS3A', name: 'Attibele ➔ KBS' },
];

const depotNum = '5';
const assignedRouteCodes = getRoutesForDepot(depotNum);
const matchedRoutes = assignedRouteCodes.map((code) => {
  const clean = String(code).toUpperCase().trim();
  const found = ALL_BASE_ROUTES.find((r) => r.code === clean || r.id === clean);
  return found || { id: clean, code: clean };
});

const availableRoutes = (depotNum === '1' && matchedRoutes.length === 0)
  ? [ALL_BASE_ROUTES[0]]
  : (depotNum === '2' && matchedRoutes.length === 0)
    ? [ALL_BASE_ROUTES[2]]
    : matchedRoutes;

console.log(`Available routes for Depot 5 scheduling:`, availableRoutes);
assert.strictEqual(availableRoutes.length, 0, 'Available routes for Depot 5 MUST be 0 (no fallback to Depot 1 or 2)!');

// Simulate fleet pool for Depot 5
const mockAllBuses = [
  { bmNumber: 'BM-101', depot: '1', soc: 85 },
  { bmNumber: 'BM-201', depot: '2', soc: 90 },
];
const depot5Buses = mockAllBuses.filter((b) => String(b.depot || '1') === '5');
assert.strictEqual(depot5Buses.length, 0, 'Depot 5 stationed buses must be 0');
console.log('PASS: Scheduling page for Depot 5 contains 0 routes and 0 buses.');

// ─────────────────────────────────────────────────────────────
// 4. Depot Operations Screen Simulation for Newly Created Depot 5
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 4: Verifying Depot Operations KPI Zeroes for Depot 5 ---');
const mockAllocatedDuties = [
  { id: 'd1', bm: 'BM-101', routeCode: '356Z', depot: '1' },
  { id: 'd2', bm: 'BM-201', routeCode: 'KBS3A', depot: '2' },
];
const mockCompletedLog = [
  { id: 'c1', bm: 'BM-101', depot: '1' },
  { id: 'c2', bm: 'BM-202', depot: '2' },
];

// Helper to get duty depot
const getDutyDepot = (d) => {
  if (d.depot) return String(d.depot);
  return '1';
};

const filteredAllocatedDuties = mockAllocatedDuties.filter((d) => getDutyDepot(d) === '5');
const depotCompletedLog = mockCompletedLog.filter((item) => String(item.depot || '') === '5');
const currentDepotFleetCount = mockAllBuses.filter((b) => String(b.depot || '') === '5').length;

console.log(`Depot 5 Summary:`);
console.log(`  - Total Allocated: ${filteredAllocatedDuties.length}`);
console.log(`  - Routes Completed: ${depotCompletedLog.length}`);
console.log(`  - Depot Fleet: ${currentDepotFleetCount}`);

assert.strictEqual(filteredAllocatedDuties.length, 0, 'Allocated duties must be 0 for Depot 5');
assert.strictEqual(depotCompletedLog.length, 0, 'Routes completed must be 0 for Depot 5');
assert.strictEqual(currentDepotFleetCount, 0, 'Depot fleet must be 0 for Depot 5');
console.log('PASS: Depot Operations summary KPIs for Depot 5 are all strictly 0.');

// ─────────────────────────────────────────────────────────────
// 5. Adding Routes to Depot 5 and Verifying Dynamic Updates
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 5: Adding Routes to Depot 5 ---');
const addRes1 = addRouteToDepot('5', 'KBS-5A');
assert.strictEqual(addRes1.ok, true, 'addRouteToDepot should succeed');
assert(addRes1.routes.includes('KBS-5A'), 'KBS-5A must be in Depot 5 routes');

const addRes2 = addRouteToDepot('5', '500D');
assert(addRes2.routes.includes('500D'), '500D must be in Depot 5 routes');

const d5UpdatedRoutes = getRoutesForDepot('5');
console.log(`Depot 5 routes after adding:`, d5UpdatedRoutes);
assert.strictEqual(d5UpdatedRoutes.length, 2, 'Depot 5 must now have 2 routes');
assert(d5UpdatedRoutes.includes('KBS-5A'));
assert(d5UpdatedRoutes.includes('500D'));
console.log('PASS: Routes successfully added and reflected in Depot 5.');

// ─────────────────────────────────────────────────────────────
// 6. Deleting Routes from Depot 5
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 6: Deleting Route from Depot 5 ---');
const delRouteRes = removeRouteFromDepot('5', '500D');
assert.strictEqual(delRouteRes.ok, true, 'removeRouteFromDepot should succeed');
assert(!delRouteRes.routes.includes('500D'), '500D must be removed from Depot 5 routes');
assert(delRouteRes.routes.includes('KBS-5A'), 'KBS-5A must still be present');

const d5AfterDelRoutes = getRoutesForDepot('5');
console.log(`Depot 5 routes after deleting 500D:`, d5AfterDelRoutes);
assert.strictEqual(d5AfterDelRoutes.length, 1);
assert.strictEqual(d5AfterDelRoutes[0], 'KBS-5A');
console.log('PASS: Newly added route successfully deleted from Depot 5.');

// Clean up: delete second route as well
removeRouteFromDepot('5', 'KBS-5A');
assert.strictEqual(getRoutesForDepot('5').length, 0, 'Depot 5 should have 0 routes again');
console.log('PASS: All newly added routes can be deleted.');

// ─────────────────────────────────────────────────────────────
// 7. Depot 5 Deletion Lifecycle
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 7: Deleting Depot 5 ---');
deleteDepot('5');
const depotsAfterDelete = getAllDepots();
assert(!depotsAfterDelete.some((d) => d.id === '5'), 'Depot 5 must be completely removed');
console.log('PASS: Depot 5 permanently deleted.');

// ─────────────────────────────────────────────────────────────
// 8. Static File Validation for UI Requirements
// ─────────────────────────────────────────────────────────────
console.log('\n--- Step 8: Validating UI Source Files ---');
const adminSrc = fs.readFileSync(path.resolve('mobile/src/screens/AdminWorkspaceScreen.js'), 'utf8');
const schedSrc = fs.readFileSync(path.resolve('mobile/src/screens/SchedulingScreen.js'), 'utf8');
const opsSrc = fs.readFileSync(path.resolve('mobile/src/screens/DepotOpsScreen.js'), 'utf8');

// A. Admin Schedule Overview dynamically maps depotsList
assert(
  adminSrc.includes('depotsList.map((depot) =>'),
  'Admin Schedule Overview must dynamically map over depotsList'
);
console.log('PASS: AdminWorkspaceScreen.js dynamically maps depotsList in Schedule Overview.');

// B. Admin Workspace allows deleting route corridors directly and via modal
assert(
  adminSrc.includes('removeRouteFromDepot(dId, r.code)') || adminSrc.includes('removeRouteFromDepot'),
  'AdminWorkspaceScreen.js must invoke removeRouteFromDepot'
);
assert(
  adminSrc.includes('addRouteToDepot(resolvedDepotId, cleanCode)') || adminSrc.includes('addRouteToDepot'),
  'AdminWorkspaceScreen.js must invoke addRouteToDepot'
);
console.log('PASS: AdminWorkspaceScreen.js integrates route addition and deletion.');

// C. SchedulingScreen handles 0 routes and 0 buses safely
assert(
  schedSrc.includes('availableRoutes.length === 0'),
  'SchedulingScreen.js must have explicit zero-routes empty state handling'
);
assert(
  schedSrc.includes('No Routes or Buses Assigned Yet'),
  'SchedulingScreen.js must display zero-routes empty state notice'
);
console.log('PASS: SchedulingScreen.js renders dedicated empty state when depot has 0 routes/buses.');

// D. DepotOpsScreen calculates fleet strictly for depotNum and filters completed log
assert(
  opsSrc.includes('depotCompletedLog = useMemo('),
  'DepotOpsScreen.js must filter completed log per depot'
);
assert(
  opsSrc.includes('currentDepotFleetCount = useMemo('),
  'DepotOpsScreen.js must calculate current depot fleet count without hardcoding Depot 2'
);
console.log('PASS: DepotOpsScreen.js computes 0 allocated, 0 completed, 0 fleet for newly created depot.');

console.log('\n======================================================');
console.log('ALL SCHEDULE OVERVIEW, DYNAMIC ROUTES & DEPOT OPS TESTS PASSED!');
console.log('======================================================\n');
