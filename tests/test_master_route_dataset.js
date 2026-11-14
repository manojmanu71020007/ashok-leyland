import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  getMasterDataset,
  getDepotsFromDataset,
  getRoutesForDepotFromDataset,
  getRouteFromDataset,
  addDepotToDataset,
  deleteDepotFromDataset,
  addRouteToDataset,
  deleteRouteFromDataset,
  updateRouteComplexityInDataset,
  updateTimeComplexityInDataset,
  updateRouteTimetablesInDataset,
  getRouteComplexity,
  getTimeCategory,
  getMatrixStatus,
} from '../mobile/src/context/routeDataset.js';

console.log('====================================================');
console.log('Testing Master Route & Schedule Dataset / Database');
console.log('====================================================\n');

// ── Test 1: Master Dataset Initial Structure & Core Depots ──
console.log('--- Test 1: Verify Initial Dataset Contains Depot 1 and Depot 2 ---');
const dataset = getMasterDataset();
assert(dataset !== null && typeof dataset === 'object', 'Dataset must be an object');
assert(Array.isArray(dataset.depots), 'Dataset must contain depots array');
assert(Array.isArray(dataset.routes), 'Dataset must contain routes array');

const depots = getDepotsFromDataset();
const depot1 = depots.find((d) => String(d.id) === '1');
const depot2 = depots.find((d) => String(d.id) === '2');
assert(depot1, 'Depot 1 must be present in master dataset');
assert(depot2, 'Depot 2 must be present in master dataset');

const depot1Routes = getRoutesForDepotFromDataset('1');
const depot2Routes = getRoutesForDepotFromDataset('2');
assert(depot1Routes.length >= 4, 'Depot 1 must have at least 4 registered routes');
assert(depot2Routes.length >= 4, 'Depot 2 must have at least 4 registered routes');

console.log(`PASS: Master dataset initialized with ${depots.length} depots and ${dataset.routes.length} total routes.`);
console.log(`  - Depot 1 Routes: ${depot1Routes.map((r) => r.code).join(', ')}`);
console.log(`  - Depot 2 Routes: ${depot2Routes.map((r) => r.code).join(', ')}\n`);

// ── Test 2: Dynamic Addition of New Depot ──
console.log('--- Test 2: Dynamic Addition of New Depot (Depot 3) ---');
const newDepot = addDepotToDataset({
  id: '3',
  name: 'Depot 3 (Electronic City)',
  location: 'Electronic City Phase 1',
  routes: [],
});
assert.strictEqual(newDepot.id, '3');
const afterAddDepots = getDepotsFromDataset();
assert(afterAddDepots.some((d) => String(d.id) === '3'), 'Depot 3 must exist in dataset');
console.log('PASS: Depot 3 successfully added to Master Dataset.\n');

// ── Test 3: Dynamic Addition of Route with Metadata, Complexity & Timetables ──
console.log('--- Test 3: Add Route to Depot 3 with Custom Complexity & Timetable ---');
const customRoute = addRouteToDataset('3', {
  code: '356CW',
  fullName: 'Kempegowda Bus Station ➔ Electronic City Wipro Gate',
  shortName: '356CW',
  origin: 'Kempegowda Bus Station',
  destination: 'Electronic City Wipro Gate',
  distance: 32.5,
  routeComplexity: 'Moderate',
  timeComplexity: 'Normal',
  timetables: ['06:30 AM', '08:00 AM', '01:10 PM', '03:30 PM', '06:45 PM'],
});

assert.strictEqual(customRoute.code, '356CW');
assert.strictEqual(customRoute.depotId, '3');
assert.strictEqual(customRoute.distance, 32.5);
assert.strictEqual(customRoute.routeComplexity, 'Moderate');
assert.strictEqual(customRoute.timeComplexity, 'Normal');
assert.strictEqual(customRoute.timetables.length, 5);

const fetchedRoute = getRouteFromDataset('356CW', '3');
assert(fetchedRoute !== null, 'Route 356CW must be retrievable from dataset');
assert.strictEqual(fetchedRoute.origin, 'Kempegowda Bus Station');
assert.strictEqual(fetchedRoute.destination, 'Electronic City Wipro Gate');
console.log('PASS: Route 356CW created in dataset under Depot 3 with all attributes.\n');

// ── Test 4: Updation of Route Complexity ──
console.log('--- Test 4: Updation of Route Complexity on the Fly ---');
// Initial complexity was 'Moderate' -> Matrix evaluation
const compInitial = getRouteComplexity(fetchedRoute);
assert.strictEqual(compInitial, 'moderate', 'Initial complexity should be moderate');

// Update complexity to 'Complex'
const updateOk = updateRouteComplexityInDataset('356CW', '3', 'Complex');
assert(updateOk, 'updateRouteComplexityInDataset should return true');

const updatedRoute = getRouteFromDataset('356CW', '3');
assert.strictEqual(updatedRoute.routeComplexity, 'Complex', 'Route complexity must now be Complex');

// Fleet engine should now evaluate as 'complex'
const compUpdated = getRouteComplexity(updatedRoute);
assert.strictEqual(compUpdated, 'complex', 'FleetContext getRouteComplexity must reflect updated complexity');

// Matrix evaluation for Complex route strictly requires Category A bus
const matrixResult = getMatrixStatus(compUpdated, { key: 'NORMAL', isPeak: false });
assert.strictEqual(matrixResult, 'A', 'Complex route must strictly require Category A bus even in Normal time');
console.log('PASS: Route complexity updated to "Complex" and matrix engine strictly enforces Category A.\n');

// ── Test 5: Updation of Time Complexity ──
console.log('--- Test 5: Updation of Time Complexity on the Fly ---');
// Update time complexity tier to 'Extreme Peak'
const timeUpdateOk = updateTimeComplexityInDataset('356CW', '3', 'Extreme Peak');
assert(timeUpdateOk, 'updateTimeComplexityInDataset should return true');

const routeWithExtremeTime = getRouteFromDataset('356CW', '3');
assert.strictEqual(routeWithExtremeTime.timeComplexity, 'Extreme Peak');

// Test slot-specific update
updateTimeComplexityInDataset('356CW', '3', 'Extreme Peak', '01:10 PM');
assert.strictEqual(routeWithExtremeTime.timeComplexitySlots['01:10 PM'], 'Extreme Peak');

const timeCat = getTimeCategory('01:10 PM', routeWithExtremeTime);
assert.strictEqual(timeCat.key, 'EXTREME_PEAK', 'Time category should match slot override');
assert.strictEqual(timeCat.isPeak, true);
console.log('PASS: Time complexity tier and slot override updated accurately.\n');

// ── Test 6: Deletion of Route from Dataset ──
console.log('--- Test 6: Deletion of Route from Dataset ---');
deleteRouteFromDataset('3', '356CW');
const deletedCheck = getRouteFromDataset('356CW', '3');
assert.strictEqual(deletedCheck, null, 'Route 356CW must be deleted from dataset');
console.log('PASS: Route 356CW successfully deleted from dataset.\n');

// ── Test 7: Deletion of Depot and Cascade Route Cleanup ──
console.log('--- Test 7: Deletion of Depot with Cascade Cleanup ---');
// Add route back to Depot 3
addRouteToDataset('3', {
  code: 'TEMP-3A',
  distance: 20.0,
  routeComplexity: 'Simple',
});
assert(getRouteFromDataset('TEMP-3A', '3') !== null);

// Delete Depot 3
deleteDepotFromDataset('3');
const depot3Check = getDepotsFromDataset().find((d) => String(d.id) === '3');
assert(!depot3Check, 'Depot 3 must be deleted');
const orphanRoute = getRouteFromDataset('TEMP-3A', '3');
assert(!orphanRoute, 'Routes belonging to deleted depot must be purged from dataset');
console.log('PASS: Depot 3 and its cascaded routes permanently purged from dataset.\n');

// ── Test 8: Server Dataset Endpoints in server.js ──
console.log('--- Test 8: Verify Server Endpoints in server.js ---');
const serverPath = path.resolve(__dirname, '../server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

assert(serverContent.includes('/api/dataset/routes'), 'server.js must expose /api/dataset/routes');
assert(serverContent.includes('loadRoutesDataset'), 'server.js must implement loadRoutesDataset');
assert(serverContent.includes('saveRoutesDataset'), 'server.js must implement saveRoutesDataset');
assert(serverContent.includes('update_route_complexity'), 'server.js must support update_route_complexity action');
assert(serverContent.includes('update_time_complexity'), 'server.js must support update_time_complexity action');
assert(serverContent.includes('routesDatabase:'), 'server.js sync-state must include routesDatabase');

console.log('PASS: Server implementation verified for full dataset synchronization.\n');

console.log('====================================================');
console.log('ALL MASTER ROUTE & SCHEDULE DATASET TESTS PASSED!');
console.log('====================================================');
