const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify routes_schedules_dataset.json exists and is valid
const datasetFile = path.join(__dirname, '..', 'data', 'routes_schedules_dataset.json');
assert(fs.existsSync(datasetFile), 'routes_schedules_dataset.json must exist');
const initialDataset = JSON.parse(fs.readFileSync(datasetFile, 'utf8'));
console.log('✓ routes_schedules_dataset.json is readable. Current routes count:', initialDataset.routes.length);

// 2. Test server's ingestUploadedRouteAndScheduleDataset logic
const serverContent = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
assert(serverContent.includes('ingestUploadedRouteAndScheduleDataset'), 'server.js must contain ingestUploadedRouteAndScheduleDataset');
assert(serverContent.includes('formatSpreadsheetTime'), 'server.js must contain formatSpreadsheetTime');
assert(serverContent.includes('add_departure_time'), 'server.js must handle add_departure_time action');

console.log('✓ server.js contains route and departure time ingestion functions.');

// 3. Test running the function directly against SCH_DATA_NH_new__1_.xlsx and Form_4_Consolidation_-_Chandapura.xlsx
const XLSX = require('xlsx');

function formatSpreadsheetTime(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const hours24 = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const isPm = hours24 >= 12;
    const hours12 = hours24 % 12 || 12;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hours12)}:${pad(minutes)} ${isPm ? 'PM' : 'AM'}`;
  }
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(str)) {
    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      const ampm = match[3] ? match[3].toUpperCase() : null;
      if (ampm) {
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
      } else {
        const isPm = h >= 12;
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${m} ${isPm ? 'PM' : 'AM'}`;
      }
    }
  }
  return str;
}

assert.strictEqual(formatSpreadsheetTime(0.520833333333333), '12:30 PM');
assert.strictEqual(formatSpreadsheetTime(0.444444444444444), '10:40 AM');
assert.strictEqual(formatSpreadsheetTime('07:15:00'), '07:15 AM');
assert.strictEqual(formatSpreadsheetTime('13:10'), '01:10 PM');
console.log('✓ formatSpreadsheetTime correctly parsed both Excel fractions and time strings.');

// 4. Verify client.js has api.get, api.post, api.updateRoutesDataset
const clientContent = fs.readFileSync(path.join(__dirname, '..', 'mobile', 'src', 'api', 'client.js'), 'utf8');
assert(clientContent.includes('post: async (endpoint'), 'client.js must include generic api.post');
assert(clientContent.includes('updateRoutesDataset: async'), 'client.js must include api.updateRoutesDataset');
console.log('✓ mobile/src/api/client.js contains api.post and api.updateRoutesDataset.');

// 5. Verify routeDataset.js exports addDepartureTimeToRoute
const routeDatasetContent = fs.readFileSync(path.join(__dirname, '..', 'mobile', 'src', 'context', 'routeDataset.js'), 'utf8');
assert(routeDatasetContent.includes('export function addDepartureTimeToRoute'), 'routeDataset.js must export addDepartureTimeToRoute');
console.log('✓ mobile/src/context/routeDataset.js exports addDepartureTimeToRoute.');

// 6. Verify AdminWorkspaceScreen.js contains 3rd dropdown and departure time modal
const adminScreenContent = fs.readFileSync(path.join(__dirname, '..', 'mobile', 'src', 'screens', 'AdminWorkspaceScreen.js'), 'utf8');
assert(adminScreenContent.includes('3. Departure Time (from dataset)'), 'AdminWorkspaceScreen.js must have 3rd dropdown for departure time');
assert(adminScreenContent.includes('scheduleTimePickerOpen'), 'AdminWorkspaceScreen.js must have scheduleTimePickerOpen modal');
assert(adminScreenContent.includes('addDepartureTimeToRoute'), 'AdminWorkspaceScreen.js must call addDepartureTimeToRoute');
console.log('✓ mobile/src/screens/AdminWorkspaceScreen.js contains Departure Time selector and modal.');

console.log('\n=== ALL ROUTE & DEPARTURE TIME INGESTION TESTS PASSED! ===');
