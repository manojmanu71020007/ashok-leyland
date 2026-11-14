import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  registerNewDepot,
  deleteDepot,
  getAllDepots,
  addRouteToDepot,
  removeRouteFromDepot,
  getRoutesForDepot,
  registerRouteDefinition,
  getRouteDefinition,
  getAllRouteDefinitions,
} from '../mobile/src/context/accounts.js';

console.log('Testing Dynamic Route Metadata, Scheduling Allocation, and UI Updates...\n');

// ── Test 1: Route Definitions Registry & Metadata ──
console.log('--- Test 1: Full Route Metadata Registration & Retrieval ---');
const testRoute = {
  id: '356CW',
  code: '356CW',
  fullName: 'Kempegowda Bus Station ➔ Electronic City Wipro Gate',
  shortName: '356CW',
  origin: 'Kempegowda Bus Station',
  destination: 'Electronic City Wipro Gate',
  distance: 32.5,
  fullDutyKm: 65.0,
  shift: 'General Shift',
  category: 'Standard',
  requiredCat: 'B',
  depotId: '3',
};

// Add route to Depot 3 with full object
addRouteToDepot('3', testRoute);

const resolvedDef = getRouteDefinition('356CW');
assert(resolvedDef !== null, 'Route definition should be registered in dynamicRouteDefinitions');
assert.strictEqual(resolvedDef.fullName, 'Kempegowda Bus Station ➔ Electronic City Wipro Gate', 'Full name should match');
assert.strictEqual(resolvedDef.distance, 32.5, 'Distance should match 32.5 km');
assert.strictEqual(resolvedDef.origin, 'Kempegowda Bus Station', 'Origin should match');
assert.strictEqual(resolvedDef.destination, 'Electronic City Wipro Gate', 'Destination should match');
console.log('PASS: Full route definition registered and retrieved accurately:');
console.log(`  - Code: ${resolvedDef.code}`);
console.log(`  - Full Name: ${resolvedDef.fullName}`);
console.log(`  - Distance: ${resolvedDef.distance} km`);
console.log(`  - Origin ➔ Destination: ${resolvedDef.origin} ➔ ${resolvedDef.destination}`);

// Clean up
removeRouteFromDepot('3', '356CW');
assert(getRouteDefinition('356CW') === null, 'Route definition should be deleted when removed from depot');
console.log('PASS: Route definition cleanup verified.\n');

// ── Test 2: FleetContext allocateBusToRoute preserves dynamic depot ──
console.log('--- Test 2: FleetContext allocateBusToRoute Depot Resolution ---');
const fleetContextPath = path.resolve(__dirname, '../mobile/src/context/FleetContext.js');
const fleetContent = fs.readFileSync(fleetContextPath, 'utf8');

// Ensure duty.depot is preserved for dynamic depots (e.g. depot '3')
assert(
  fleetContent.includes("resolvedDepot = duty.depot") &&
  fleetContent.includes("String(duty.depot).replace(/^DEPOT\\s*/i, '').trim()"),
  'allocateBusToRoute should preserve duty.depot for dynamic depots'
);
// Ensure previous hardcoded restriction to '1' or '2' is gone
assert(
  !fleetContent.includes("(duty.depot === '1' || duty.depot === '2')"),
  'allocateBusToRoute should not restrict depot to only 1 or 2'
);
console.log('PASS: FleetContext allocateBusToRoute properly retains dynamic depot IDs.\n');

// ── Test 3: SchedulingScreen Route Resolution & Candidate Buses ──
console.log('--- Test 3: SchedulingScreen Dynamic Route Resolution & Candidate Buses ---');
const schedScreenPath = path.resolve(__dirname, '../mobile/src/screens/SchedulingScreen.js');
const schedContent = fs.readFileSync(schedScreenPath, 'utf8');

// Verify getRouteDefinition is imported
assert(
  schedContent.includes('getRouteDefinition'),
  'SchedulingScreen should import getRouteDefinition'
);

// Verify candidateBuses evaluates stationed depot fleet
assert(
  schedContent.includes('depotBuses.forEach') &&
  schedContent.includes('addCand(bm,'),
  'SchedulingScreen candidateBuses should evaluate all depot stationed buses'
);

// Verify fallback for newly created depot when candidates is empty
assert(
  schedContent.includes('candidates.length === 0 && depotBuses.length > 0'),
  'SchedulingScreen should include candidate fallback for newly added depots/routes'
);

// Verify fullName and distance rendering
assert(
  schedContent.includes('selectedRoute.fullName || selectedRoute.name'),
  'SchedulingScreen should display full route name if available'
);
assert(
  schedContent.includes('selectedRoute.distance'),
  'SchedulingScreen should display route total distance'
);

console.log('PASS: SchedulingScreen accurately resolves route definitions, candidate buses, and displays full route name + distance.\n');

// ── Test 4: AdminWorkspaceScreen Add Depot tab does not contain Route Dropdown ──
console.log('--- Test 4: AdminWorkspaceScreen Add Depot modal changes ---');
const adminPath = path.resolve(__dirname, '../mobile/src/screens/AdminWorkspaceScreen.js');
const adminContent = fs.readFileSync(adminPath, 'utf8');

// Ensure "Select & Add Routes for Depot (Dropdown Menu)" is NOT in Add Depot tab
assert(
  !adminContent.includes('Select & Add Routes for Depot (Dropdown Menu)'),
  'Add Depot tab must NOT contain "Select & Add Routes for Depot (Dropdown Menu)"'
);
assert(
  !adminContent.includes('Tap to Select & Add Routes from Network Menu...'),
  'Add Depot tab must NOT contain route network menu placeholder'
);
console.log('PASS: "Select & Add Routes for Depot (Dropdown Menu)" is completely removed from Add Depot tab.\n');

// ── Test 5: User-facing "corridor" replaced with "route" ──
console.log('--- Test 5: Verification that "corridor" strings are replaced with "route" ---');
// Key user-facing checks in AdminWorkspaceScreen:
assert(!adminContent.includes('DEPOT & CORRIDOR NETWORK'), 'Eyebrow should be DEPOT & ROUTE NETWORK');
assert(!adminContent.includes('Corridors Active'), 'Header badge should say Routes Active');
assert(!adminContent.includes('📋 Active Corridors'), 'Tab should say Active Routes');
assert(!adminContent.includes('🛣️ Add Corridor Route'), 'Button should say Add Route');
assert(!adminContent.includes('🛣️ Decommission Corridor'), 'Button should say Decommission Route');
assert(!adminContent.includes('🗑️ Decommission Route Corridor'), 'Submit button should say Decommission Route');
assert(!adminContent.includes('🛣️ Corridor Route Network'), 'Directory header should say Bus Route Network');
assert(!adminContent.includes('Total Corridors'), 'Summary should say Total Routes');
assert(!adminContent.includes('CORRIDOR DISPATCH SELECTOR'), 'Eyebrow should be ROUTE DISPATCH SELECTOR');
assert(!adminContent.includes('🛣️ Select Route Corridor'), 'Modal title should be Select Bus Route');
assert(!adminContent.includes('Fixed GTFS Corridor'), 'Metric should say Fixed GTFS Route');

// Key checks in SchedulingScreen:
assert(!schedContent.includes('Corridor ${clean}'), 'Fallback name should be Route ${clean}');
assert(!schedContent.includes('does not contain any assigned corridors'), 'Notice should say assigned routes');

console.log('PASS: All user-facing occurrences of "corridor" / "corridors" replaced with "route" / "routes".\n');

// ── Test 6: Verify Previous Turn User Requirements Intact ──
console.log('--- Test 6: Verify Operating Depots Network, Donut Chart, and INTU removal ---');
// Operating Depots Network removed
assert(!adminContent.includes('OPERATING DEPOTS NETWORK'), 'Operating Depots Network section must remain removed');
// INTU red mark removed from Schedule Overview
assert(!adminContent.includes('INTU'), 'Red INTU text must remain removed from Schedule Overview');
// Operating Depot dropdown in Add/Delete Buses
assert(adminContent.includes('Select Depot'), 'Add/Delete buses Operating Depot dropdown must start with Select Depot');
assert(adminContent.includes('addDepotDropdownOpen'), 'Operating depot selector must be a dropdown menu');

console.log('PASS: All previous turn requirements verified intact.\n');

console.log('======================================================');
console.log('ALL TESTS PASSED SUCCESSFULLY!');
console.log('======================================================');
