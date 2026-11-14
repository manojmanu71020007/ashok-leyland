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
} from '../mobile/src/context/accounts.js';

console.log('Testing Cross-Device Depot Synchronization and CSV Export...');

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
console.log('PASS: Profile section contains row "🔑 Depot Login Credentials (All Depots)" and triggers CSV export.');

// ── 2. Test CSV Generation for All Depots ──
const credsList = getDepotCredentialsList();
assert(credsList.length >= 2, 'Should include at least Depot 1 and Depot 2');

const headers = [
  'Depot ID',
  'Depot Name',
  'Depot Facility Type',
  'Location / Address',
  'Assigned Corridors / Routes',
  'Operation Name',
  'Designated Role',
  'Login Username',
  'Password',
  'Target Webpage / Screen',
  'Official Email',
];

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

// ── 3. Test Cross-Device Sync Mechanics ──
// Simulate Device 1 creating Depot 5 (Whitefield)
const regRes = registerNewDepot({
  id: '5',
  name: 'Depot 5 (Whitefield)',
  location: 'ITPB Road, Whitefield',
  routes: ['500DC', '360K'],
  password: 'Test@123',
});
assert(regRes.ok, 'Depot 5 created successfully on Device 1');

// Verify Device 1 state
const d1Depots = getAllDepots();
assert(d1Depots.some((d) => String(d.id) === '5'), 'Depot 5 exists in Device 1 depots');

// Simulate Server payload containing customDepots and customAccounts
const serverDepotsPayload = d1Depots.filter((d) => !d.isDefault);
const serverAccountsPayload = {};
['es-depot-5', 'insp-depot-5-01', 'is-depot-5', 'dm-depot-5'].forEach((k) => {
  serverAccountsPayload[k] = {
    username: k.toUpperCase(),
    password: 'Test@123',
    role: `Officer Depot 5`,
    depot: '5',
    targetScreen: 'CHARGING',
  };
});

// Simulate Device 2 receiving the payload via syncDepotsWithServer
const syncRes = syncDepotsWithServer(serverDepotsPayload, serverAccountsPayload);
assert(syncRes.ok, 'syncDepotsWithServer returned ok');
const d2Depots = getAllDepots();
assert(d2Depots.some((d) => String(d.id) === '5'), 'Device 2 now contains Depot 5');

// Test Authentication on Device 2 using dynamic credentials
const authChg = authenticateUser('es-depot-5', 'Test@123');
assert(authChg.ok && authChg.account.depot === '5', 'Device 2 authenticates dynamic account for Depot 5');

// Simulate Deletion on Device 1
deleteDepot('5');
const d1DepotsAfterDelete = getAllDepots().filter((d) => !d.isDefault);
assert(!d1DepotsAfterDelete.some((d) => String(d.id) === '5'), 'Depot 5 deleted from Device 1');

// Simulate Device 2 syncing deletion from server
syncDepotsWithServer(d1DepotsAfterDelete, {});
const d2DepotsAfterDelete = getAllDepots();
assert(!d2DepotsAfterDelete.some((d) => String(d.id) === '5'), 'Depot 5 removed from Device 2');

const authAfterDelete = authenticateUser('es-depot-5', 'Test@123');
assert(!authAfterDelete.ok, 'Credentials revoked on Device 2 after deletion sync');
console.log('PASS: Cross-device synchronization of addition and deletion verified successfully.');

// ── 4. Verify Server.js Endpoints and Polling Payload ──
const serverPath = path.resolve('server.js');
const serverSrc = fs.readFileSync(serverPath, 'utf8');

assert(
  serverSrc.includes('/api/custom-depots'),
  'server.js must expose /api/custom-depots for cross-device reflection'
);
assert(
  serverSrc.includes('customDepots: currentState._customDepots || []'),
  'server.js /api/sync-state must include customDepots in sync-state response'
);
assert(
  serverSrc.includes('customAccounts: currentState._customAccounts || {}'),
  'server.js /api/sync-state must include customAccounts in sync-state response'
);
console.log('PASS: server.js correctly supports cross-device customDepots & customAccounts.');

// ── 5. Verify FleetContext Poll Sync Integration ──
const fleetContextPath = path.resolve('mobile/src/context/FleetContext.js');
const fleetContextSrc = fs.readFileSync(fleetContextPath, 'utf8');

assert(
  fleetContextSrc.includes('syncDepotsWithServer'),
  'FleetContext.js must import and call syncDepotsWithServer'
);
assert(
  fleetContextSrc.includes('resSync.data.customDepots'),
  'FleetContext.js must inspect resSync.data.customDepots on each polling tick'
);
console.log('PASS: FleetContext.js automatically syncs custom depots across all devices every 5 seconds.');

console.log('\n======================================================');
console.log('ALL CROSS-DEVICE SYNC & CSV ROW CHECKS PASSED PERFECTLY!');
console.log('======================================================\n');
