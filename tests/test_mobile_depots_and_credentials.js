const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Test accounts.js functions directly
const accounts = require('../mobile/src/context/accounts');

console.log('Testing dynamic depot creation, route selection, and credentials generation...');

// Initial state checks
const initialDepots = accounts.getAllDepots();
console.log('Initial depots count:', initialDepots.length);
assert.strictEqual(initialDepots.length >= 2, true, 'Should have at least Depot 1 and Depot 2');

const initialCredsList = accounts.getDepotCredentialsList();
console.log('Initial depot credentials groups:', initialCredsList.length);
assert.strictEqual(initialCredsList.length >= 2, true, 'Should have credentials for at least Depot 1 and Depot 2');

// Verify Depot 1 and Depot 2 have 4 operations each
initialCredsList.forEach((depot) => {
  assert.strictEqual(depot.credentials.length, 4, `Depot ${depot.depotId} must have 4 operational credentials`);
  const ops = depot.credentials.map((c) => c.targetScreen).sort();
  assert.deepStrictEqual(ops, ['CHARGING', 'CLEANING', 'DEPOT_OPS', 'SCHEDULING']);
});
console.log('PASS: Depot 1 and Depot 2 have 4 dedicated operations each.');

// 2. Test registerNewDepot (Creating Depot 3 with attached routes)
const newDepotResult = accounts.registerNewDepot({
  id: '3',
  name: 'Depot 3 (Electronic City)',
  location: 'Electronic City Phase 1, Bangalore',
  routes: ['600F', '356Z', 'KBS3A'],
  password: 'Test@123',
});

assert.strictEqual(newDepotResult.ok, true, 'Depot creation should succeed');
assert.strictEqual(newDepotResult.depot.id, '3', 'Depot ID should be 3');
assert.strictEqual(newDepotResult.depot.routes.length, 3, 'Depot should have 3 attached routes');
console.log('PASS: Depot 3 created with 3 attached routes.');

// Check getAllDepots includes Depot 3
const updatedDepots = accounts.getAllDepots();
const depot3 = updatedDepots.find((d) => d.id === '3');
assert(depot3, 'Depot 3 should be in getAllDepots()');
assert.strictEqual(depot3.name, 'Depot 3 (Electronic City)');
console.log('PASS: Depot 3 found in active depots list.');

// Check getRoutesForDepot returns attached routes
const d3Routes = accounts.getRoutesForDepot('3');
assert.deepStrictEqual(d3Routes, ['600F', '356Z', 'KBS3A']);
console.log('PASS: getRoutesForDepot("3") returned attached routes:', d3Routes);

// Check getDepotCredentialsList includes Depot 3 with 4 dedicated operations
const updatedCredsList = accounts.getDepotCredentialsList();
const depot3Creds = updatedCredsList.find((d) => d.depotId === '3');
assert(depot3Creds, 'Depot 3 should have credentials in getDepotCredentialsList()');
assert.strictEqual(depot3Creds.credentials.length, 4, 'Depot 3 must have 4 dedicated credentials');

const chgCred = depot3Creds.credentials.find((c) => c.targetScreen === 'CHARGING');
const clnCred = depot3Creds.credentials.find((c) => c.targetScreen === 'CLEANING');
const schCred = depot3Creds.credentials.find((c) => c.targetScreen === 'SCHEDULING');
const opsCred = depot3Creds.credentials.find((c) => c.targetScreen === 'DEPOT_OPS');

assert.strictEqual(chgCred.username, 'ES-DEPOT-3');
assert.strictEqual(clnCred.username, 'INSP-DEPOT-3-01');
assert.strictEqual(schCred.username, 'IS-DEPOT-3');
assert.strictEqual(opsCred.username, 'DM-DEPOT-3');
console.log('PASS: System auto-generated 4 dedicated credentials for Depot 3:', [
  chgCred.username,
  clnCred.username,
  schCred.username,
  opsCred.username,
]);

// 3. Test authenticateUser with the 4 newly generated credentials
const authChg = accounts.authenticateUser('ES-DEPOT-3', 'Test@123');
assert.strictEqual(authChg.ok, true, 'Charging login must succeed');
assert.strictEqual(authChg.account.targetScreen, 'CHARGING');
assert.strictEqual(authChg.account.depot, '3');

const authCln = accounts.authenticateUser('INSP-DEPOT-3-01', 'Test@123');
assert.strictEqual(authCln.ok, true, 'Cleaning login must succeed');
assert.strictEqual(authCln.account.targetScreen, 'CLEANING');
assert.strictEqual(authCln.account.depot, '3');

const authSch = accounts.authenticateUser('IS-DEPOT-3', 'Test@123');
assert.strictEqual(authSch.ok, true, 'Scheduling login must succeed');
assert.strictEqual(authSch.account.targetScreen, 'SCHEDULING');
assert.strictEqual(authSch.account.depot, '3');

const authOps = accounts.authenticateUser('DM-DEPOT-3', 'Test@123');
assert.strictEqual(authOps.ok, true, 'Depot Ops login must succeed');
assert.strictEqual(authOps.account.targetScreen, 'DEPOT_OPS');
assert.strictEqual(authOps.account.depot, '3');

console.log('PASS: All 4 generated credentials authenticated successfully into their dedicated pages.');

// 4. Test deleteDepot
console.log('Testing depot deletion and credential revocation...');
const delResult = accounts.deleteDepot('3');
assert.strictEqual(delResult.ok, true, 'Depot deletion should succeed');

// Check Depot 3 is removed from getAllDepots()
const postDeleteDepots = accounts.getAllDepots();
assert.strictEqual(postDeleteDepots.some((d) => d.id === '3'), false, 'Depot 3 must not exist after deletion');

// Check credentials revoked
const postDeleteCredsList = accounts.getDepotCredentialsList();
assert.strictEqual(postDeleteCredsList.some((d) => d.depotId === '3'), false, 'Depot 3 credentials must be removed');

// Authenticating with deleted credentials must now fail
const failedAuthChg = accounts.authenticateUser('ES-DEPOT-3', 'Test@123');
assert.strictEqual(failedAuthChg.ok, false, 'Deleted Charging account must fail authentication');

const failedAuthSch = accounts.authenticateUser('IS-DEPOT-3', 'Test@123');
assert.strictEqual(failedAuthSch.ok, false, 'Deleted Scheduling account must fail authentication');

const failedAuthCln = accounts.authenticateUser('INSP-DEPOT-3-01', 'Test@123');
assert.strictEqual(failedAuthCln.ok, false, 'Deleted Cleaning account must fail authentication');

const failedAuthOps = accounts.authenticateUser('DM-DEPOT-3', 'Test@123');
assert.strictEqual(failedAuthOps.ok, false, 'Deleted Ops account must fail authentication');

console.log('PASS: Deletion of depot completely purged all 4 operational accounts and revoked credentials.');

// 5. Check AdminWorkspaceScreen.js source code integration
const adminFile = path.join(__dirname, '..', 'mobile', 'src', 'screens', 'AdminWorkspaceScreen.js');
const adminCode = fs.readFileSync(adminFile, 'utf8');

assert(adminCode.includes('registerNewDepot'), 'AdminWorkspaceScreen must import/use registerNewDepot');
assert(adminCode.includes('deleteDepot'), 'AdminWorkspaceScreen must import/use deleteDepot');
assert(adminCode.includes('getDepotCredentialsList'), 'AdminWorkspaceScreen must import/use getDepotCredentialsList');
assert(adminCode.includes('routeDropdownBtn'), 'AdminWorkspaceScreen must render routeDropdownBtn');
assert(adminCode.includes('routeDropdownMenu'), 'AdminWorkspaceScreen must render routeDropdownMenu');
assert(adminCode.includes('selectedRouteChip'), 'AdminWorkspaceScreen must render selectedRouteChip');
assert(adminCode.includes('profileDepotBox'), 'AdminWorkspaceScreen Profile must render profileDepotBox');
assert(adminCode.includes('profileCredCard'), 'AdminWorkspaceScreen Profile must render profileCredCard');
assert(adminCode.includes('profileCredQuickOpenBtn'), 'AdminWorkspaceScreen Profile must render profileCredQuickOpenBtn');
assert(adminCode.includes('profileCredCopyBtn'), 'AdminWorkspaceScreen Profile must render profileCredCopyBtn');

console.log('PASS: AdminWorkspaceScreen.js has full UI support for Route Dropdown, Depot Lifecycle, and Profile Credentials.');

console.log('\n========================================');
console.log('ALL DEPOT LIFECYCLE & CREDENTIAL TESTS PASSED!');
console.log('========================================\n');
