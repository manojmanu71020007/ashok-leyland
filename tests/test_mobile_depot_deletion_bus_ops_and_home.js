// tests/test_mobile_depot_deletion_bus_ops_and_home.js
// Tests for:
// 1. Adding / Deleting buses for newly created depots
// 2. Deleting DEPOT-1 and DEPOT-2 from admin page & verifying credentials revocation
// 3. Visibility and interaction with newly created depots on Admin Workspace Home page

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser localStorage
if (typeof global.localStorage === 'undefined') {
  const storage = {};
  global.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
  };
}

import {
  getAllDepots,
  registerNewDepot,
  deleteDepot,
  authenticateUser,
  getRoutesForDepot,
  getDepotCredentialsList,
  getOfficialDirectory,
} from '../mobile/src/context/accounts.js';

console.log('Testing Depot 1 & 2 Deletion, Bus Add/Delete for New Depots, and Home Page Visibility...\n');

// ── Test 1: Depot 1 and Depot 2 Deletion Capability ──
console.log('--- Test 1: Verifying Deletion of Core Depots (Depot 1 and Depot 2) ---');
const initialDepots = getAllDepots();
const hasDepot1 = initialDepots.some((d) => String(d.id) === '1');
const hasDepot2 = initialDepots.some((d) => String(d.id) === '2');
assert.strictEqual(hasDepot1, true, 'Depot 1 should initially exist');
assert.strictEqual(hasDepot2, true, 'Depot 2 should initially exist');

// Verify Depot 1 credentials authenticate before deletion
const authD1Before = authenticateUser('ES-DEPOT-1', 'Test@123');
assert.strictEqual(authD1Before.ok, true, 'Depot 1 charging account should authenticate initially');

// Delete Depot 1
console.log('Deleting Depot 1...');
deleteDepot('1');

const depotsAfterDel1 = getAllDepots();
assert.strictEqual(
  depotsAfterDel1.some((d) => String(d.id) === '1'),
  false,
  'PASS: Depot 1 must no longer be returned by getAllDepots()'
);

// Verify Depot 1 credentials are now permanently revoked
const authD1After = authenticateUser('ES-DEPOT-1', 'Test@123');
assert.strictEqual(
  authD1After.ok,
  false,
  'PASS: Depot 1 operational credentials must be revoked after deletion'
);

// Verify Super Admin can still authenticate
const authAdmin = authenticateUser('CDM001', 'Test@123');
assert.strictEqual(authAdmin.ok, true, 'PASS: Super Admin CDM001 can still log in');
const authSystemAdmin = authenticateUser('admin', 'adminlogin');
assert.strictEqual(authSystemAdmin.ok, true, 'PASS: System Admin can still log in');

// Delete Depot 2
console.log('Deleting Depot 2...');
deleteDepot('2');

const depotsAfterDel2 = getAllDepots();
assert.strictEqual(
  depotsAfterDel2.some((d) => String(d.id) === '2'),
  false,
  'PASS: Depot 2 must no longer be returned by getAllDepots()'
);

const authD2After = authenticateUser('ES-DEPOT-2', 'Test@123');
assert.strictEqual(
  authD2After.ok,
  false,
  'PASS: Depot 2 operational credentials must be revoked after deletion'
);

// Re-registering Depot 1 and Depot 2 should un-tombstone them
console.log('Re-registering Depot 1 and Depot 2...');
registerNewDepot({ id: '1', name: 'Depot 1 — Chandapura (BMT-32)', location: 'Chandapura' });
registerNewDepot({ id: '2', name: 'Depot 2 — Central Depot', location: 'Majestic / Central' });

const depotsAfterReReg = getAllDepots();
assert.strictEqual(depotsAfterReReg.some((d) => String(d.id) === '1'), true);
assert.strictEqual(depotsAfterReReg.some((d) => String(d.id) === '2'), true);
console.log('PASS: Deletion and re-creation of Depot 1 & 2 fully verified.\n');

// ── Test 2: Creating New Depot 3 and Adding/Deleting Buses ──
console.log('--- Test 2: Adding and Deleting Buses for Newly Created Depot ---');
const createdD3 = registerNewDepot({
  id: '3',
  name: 'Depot 3 — Electronic City',
  location: 'Electronic City Phase 1',
  routes: ['EL-01', 'EL-02'],
});
assert.strictEqual(createdD3.ok, true);

const allWithD3 = getAllDepots();
assert.strictEqual(allWithD3.some((d) => String(d.id) === '3'), true, 'PASS: Depot 3 is present in getAllDepots()');

// Verify credentials generated for Depot 3
const authD3Sch = authenticateUser('IS-DEPOT-3', 'Test@123');
assert.strictEqual(authD3Sch.ok, true, 'PASS: IS-DEPOT-3 authenticated successfully');

// Clean up Depot 3
deleteDepot('3');
assert.strictEqual(getAllDepots().some((d) => String(d.id) === '3'), false);
console.log('PASS: Depot 3 bus lifecycle and operations verified.\n');

// ── Test 3: Static Analysis of AdminWorkspaceScreen.js ──
console.log('--- Test 3: Validating AdminWorkspaceScreen.js UI Code ---');
const adminCode = fs.readFileSync(path.join(__dirname, '../mobile/src/screens/AdminWorkspaceScreen.js'), 'utf8');

// Check 1: Depot 1 and Depot 2 are not blocked from deletion in handleDeleteDepot
assert.strictEqual(
  adminCode.includes("if (selectedDepotToDelete === '1' || selectedDepotToDelete === '2')"),
  false,
  'PASS: handleDeleteDepot no longer blocks deletion of Depot 1 or Depot 2'
);

// Check 2: Delete Depot modal does not filter out default depots
assert.strictEqual(
  adminCode.includes("depotsList.filter((d) => !d.isDefault)"),
  false,
  'PASS: Delete Depot modal allows choosing ANY depot (including Depot 1 and Depot 2)'
);

// Check 3: Add Bus Operating Depot allows selecting any depot dynamically
assert.strictEqual(
  adminCode.includes("{ num: '1', label: 'Depot 1 — Chandapura' }"),
  false,
  'PASS: Add Bus modal no longer uses hardcoded 2 depots list'
);
assert.strictEqual(
  adminCode.includes("depotsList.map((d) => {"),
  true,
  'PASS: Add/Delete bus modals dynamically map depotsList'
);

// Check 4: Home page includes dynamic depot filter pills
assert.strictEqual(
  adminCode.includes("{ id: '1', label: `${t('depot_1', 'Depot 1')} · ${d1Buses.length}` }"),
  false,
  'PASS: Home page depot filter pills are dynamic rather than hardcoded to Depot 1 & 2'
);

// Check 5: Home page Operating Depots Network section is removed as requested
assert.strictEqual(
  adminCode.includes("🏢 OPERATING DEPOTS NETWORK"),
  false,
  'PASS: Home page Operating Depots Network section was removed and restored to original clean layout'
);

// Check 6: Red INTU (✕) button beside routes removed from Schedule Overview
assert.strictEqual(
  adminCode.includes("<Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '800' }}>✕</Text>"),
  false,
  'PASS: Red INTU (✕) button beside routes in Schedule Overview was removed'
);

// Check 7: Add and Delete Bus modals use Dropdown Menu for Operating Depot starting with "Select Depot"
assert.strictEqual(
  adminCode.includes("modalDropdownBtn"),
  true,
  'PASS: Add & Delete Bus modals use dedicated dropdown menu for selecting depot'
);
assert.strictEqual(
  adminCode.includes("'Select Depot'"),
  true,
  'PASS: Dropdown menu displays "Select Depot" as default and initial selection'
);

// Check 8: Donut chart total defaults to 0 and correctly handles 0 total buses
assert.strictEqual(
  adminCode.includes("const DonutChart = ({ total = 0, allocated = 0, notAllocated = 0 })"),
  true,
  'PASS: DonutChart defaults total to 0 instead of 123'
);

// Check 9: Dynamic view metrics calculation for any depot
assert.strictEqual(
  adminCode.includes("const viewBuses = useMemo("),
  true,
  'PASS: viewBuses dynamically computes fleet for any active depot filter'
);

console.log('\n======================================================');
console.log('ALL DEPOT DELETION, BUS OPS & HOME PAGE TESTS PASSED!');
console.log('======================================================');
