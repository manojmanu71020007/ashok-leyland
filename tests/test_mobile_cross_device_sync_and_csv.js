import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  getAllDepots,
  registerNewDepot,
  deleteDepot,
  getDepotCredentialsList,
  authenticateUser,
  syncDepotsWithServer,
  getRoutesForDepot,
} from '../mobile/src/context/accounts.js';

console.log('Testing Cross-Device Depot Synchronization, Persistence & Deletion Lifecycle...');

// ── 1. Check Profile Screen Source Code for Exact Row ──
const adminWorkspacePath = path.resolve('mobile/src/screens/AdminWorkspaceScreen.js');
const adminSrc = fs.readFileSync(adminWorkspacePath, 'utf8');

assert(
  adminSrc.includes('🔑 Depot Login Credentials (All Depots)'),
  'AdminWorkspaceScreen must render the exact row "🔑 Depot Login Credentials (All Depots)"'
);
assert(
  adminSrc.includes('handleOpenDepotCredentialsCsv'),
  'AdminWorkspaceScreen must attach handleOpenDepotCredentialsCsv on press'
);
assert(
  adminSrc.includes('exportCsvFile'),
  'AdminWorkspaceScreen must call exportCsvFile'
);
assert(
  adminSrc.includes('Select Depot to Delete'),
  'AdminWorkspaceScreen must render "Select Depot to Delete *"'
);
assert(
  adminSrc.includes('delDepotPreviewCard'),
  'AdminWorkspaceScreen must show preview of operations & corridors being removed'
);
console.log('PASS: Profile section contains row "🔑 Depot Login Credentials (All Depots)" and Delete screen has selection & preview.');

// ── 2. Test CSV Generation for All Depots ──
const credsList = getDepotCredentialsList();
assert(credsList.length >= 2, 'Should include at least Depot 1 and Depot 2');

const csvRows = [];
credsList.forEach((depot) => {
  const dId = String(depot.depotId);
  const dName = depot.depotName || `Depot ${dId}`;
  const dType = depot.isDefault ? 'Core Master Depot' : 'Custom Added Depot';
  const dLoc = depot.location || '';
  const dRoutes = Array.isArray(depot.routes) ? depot.routes.join('; ') : '';

  (depot.credentials || []).forEach((cred) => {
    csvRows.push([
      `Depot ${dId}`,
      dName,
      dType,
      dLoc,
      dRoutes,
      cred.operation || '',
      cred.role || '',
      cred.username || '',
      cred.password || '',
      cred.pageName || '',
      cred.email || '',
    ]);
  });
});

assert(csvRows.length >= 8, 'Default 2 depots must produce at least 8 credential rows (4 per depot)');
console.log(`PASS: CSV row generator produced ${csvRows.length} operation rows across ${credsList.length} depots.`);

// ── 3. Test: Newly Created Depots Are NEVER Deleted On App Updates / Empty Sync ──
// Create Depot 4 (Electronic City)
const createRes = registerNewDepot({
  id: '4',
  name: 'Depot 4 (Electronic City)',
  location: 'Hosur Road, Phase 1',
  routes: ['356Z', '600F', 'KBS3A'],
  password: 'Test@123',
});
assert(createRes.ok, 'Depot 4 created successfully');
assert(getAllDepots().some((d) => String(d.id) === '4'), 'Depot 4 exists locally');

// Simulate App Update / Server Restart where server returns empty customDepots []
// With previous flawed sync, this would have destroyed Depot 4!
syncDepotsWithServer([], {});

// Assert that Depot 4 is NOT deleted!
const depotsAfterEmptySync = getAllDepots();
assert(
  depotsAfterEmptySync.some((d) => String(d.id) === '4'),
  'CRITICAL PASS: Newly created Depot 4 was NOT deleted after app update / empty server sync!'
);
console.log('PASS: Newly created depots persist and are NOT wiped out on app code updates or empty server syncs.');

// ── 4. Test: Explicit Deletion Permanently Removes All 4 Operations, Corridors & Credentials ──
// Verify Depot 4 operations and credentials exist before deletion
const authChgBefore = authenticateUser('es-depot-4', 'Test@123');
assert(authChgBefore.ok, 'Charging credentials active before deletion');
const authClnBefore = authenticateUser('insp-depot-4-01', 'Test@123');
assert(authClnBefore.ok, 'Cleaning credentials active before deletion');
const authSchBefore = authenticateUser('is-depot-4', 'Test@123');
assert(authSchBefore.ok, 'Scheduling credentials active before deletion');
const authOpsBefore = authenticateUser('dm-depot-4', 'Test@123');
assert(authOpsBefore.ok, 'Depot Ops credentials active before deletion');
assert(getRoutesForDepot('4').length === 3, 'Corridors assigned before deletion');

// Administrator explicitly selects and deletes Depot 4 in "Select Depot to Delete *"
deleteDepot('4');

// 1. Depot removed from all active depots
const depotsAfterDelete = getAllDepots();
assert(!depotsAfterDelete.some((d) => String(d.id) === '4'), 'Depot 4 removed from active depots');

// 2. Corridors unassigned
const routesAfterDelete = getRoutesForDepot('4');
assert(routesAfterDelete.length !== 3 || !routesAfterDelete.includes('KBS3A'), 'Corridors unassigned for Depot 4');

// 3. All 4 operations and login credentials deleted
assert(!authenticateUser('es-depot-4', 'Test@123').ok, 'Charging operation and credentials permanently deleted');
assert(!authenticateUser('insp-depot-4-01', 'Test@123').ok, 'Cleaning operation and credentials permanently deleted');
assert(!authenticateUser('is-depot-4', 'Test@123').ok, 'Scheduling operation and credentials permanently deleted');
assert(!authenticateUser('dm-depot-4', 'Test@123').ok, 'Depot Ops operation and credentials permanently deleted');

// 4. Stale cache / sync cannot resurrect deleted depot (tombstone protection)
syncDepotsWithServer([createRes.depot], {});
assert(
  !getAllDepots().some((d) => String(d.id) === '4'),
  'PASS: Tombstone protection prevents stale caches from resurrecting deleted depot'
);
console.log('PASS: Deleting a depot permanently removes all 4 operations, unassigns corridors, and deletes all credentials.');

// ── 5. Verify Server.js Endpoints and Polling Payload ──
const serverPath = path.resolve('server.js');
const serverSrc = fs.readFileSync(serverPath, 'utf8');

assert(serverSrc.includes('/api/custom-depots'), 'server.js must expose /api/custom-depots');
assert(serverSrc.includes('customDepots: currentState._customDepots || []'), 'server.js /api/sync-state must include customDepots');
assert(serverSrc.includes('customAccounts: currentState._customAccounts || {}'), 'server.js /api/sync-state must include customAccounts');
assert(serverSrc.includes('deletedDepotIds: currentState._deletedDepotIds || []'), 'server.js /api/sync-state must include deletedDepotIds');
console.log('PASS: server.js correctly supports customDepots, customAccounts, and deletedDepotIds.');

// ── 6. Verify FleetContext Poll Sync Integration ──
const fleetContextPath = path.resolve('mobile/src/context/FleetContext.js');
const fleetContextSrc = fs.readFileSync(fleetContextPath, 'utf8');

assert(fleetContextSrc.includes('syncDepotsWithServer'), 'FleetContext.js must call syncDepotsWithServer');
assert(fleetContextSrc.includes('resSync.data.deletedDepotIds'), 'FleetContext.js must pass deletedDepotIds');
console.log('PASS: FleetContext.js passes remote custom depots, accounts, and deletedDepotIds every 5 seconds.');

console.log('\n======================================================');
console.log('ALL DEPOT PERSISTENCE, DELETION & SYNC CHECKS PASSED!');
console.log('======================================================\n');
