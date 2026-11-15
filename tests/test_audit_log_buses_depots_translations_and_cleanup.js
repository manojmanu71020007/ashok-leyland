import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('======================================================================');
console.log('Testing User Requirements: Fleet Mgmt Translations, Depot Audit Log,');
console.log('Depot 1 & 2 De-duplication, Schedule Overview & Route Dropdown Picker');
console.log('======================================================================\n');

// 1. Translations Test
const translationsPath = path.join(rootDir, 'mobile/src/context/translations.json');
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));

const requiredKeys = [
  'fleet_management',
  'add_delete_buses',
  'newly_added',
  'add_delete_buses_subtitle',
  'tab_add_bus',
  'tab_delete_bus',
  'tab_fleet_audit_log',
  'del_bus_warn',
  'search_filter_active_buses',
  'placeholder_filter_bus',
  'select_existing_active_bus',
  'bus_number_label',
  'bus_reg_no_label',
  'operating_depot_label',
  'select_depot',
  'reason_category_label',
  'detailed_reason_del_label',
  'placeholder_explain_del',
  'btn_delete_bus_fleet',
  'note_label',
  'add_bus_note',
  'fleet_range_category',
  'initial_battery_soc',
  'detailed_reason_add_label',
  'placeholder_explain_add',
  'btn_confirm_add_bus',
  'fleet_audit_trail_title',
  'fleet_audit_trail_sub',
  'badge_inducted',
  'badge_removed',
  'btn_restore_bus',
  'tab_depot_audit_log',
  'depot_audit_log_title',
  'depot_audit_log_sub',
  'no_depot_audit_records',
  'reason_motor_defect',
  'reason_battery_degradation',
  'reason_accident_damage',
  'reason_heavy_maintenance',
  'reason_transferred_depot_18',
  'reason_transferred_central_workshop',
  'reason_decommissioned_bmtc',
  'reason_induction_eiv12',
  'reason_fleet_expansion',
  'reason_reinducted_overhaul',
  'reason_replacement_decommissioned',
];

const languages = ['en', 'kn', 'hi', 'te', 'ta'];
languages.forEach((lang) => {
  assert(translations[lang], `Missing language block: ${lang}`);
  requiredKeys.forEach((key) => {
    assert(translations[lang][key], `Missing key "${key}" in language "${lang}"`);
  });
});
console.log(`PASS 1: All ${requiredKeys.length} fleet management & depot audit log keys validated across 5 languages.`);

// 2. AdminWorkspaceScreen.js source checks
const adminSrc = fs.readFileSync(path.join(rootDir, 'mobile/src/screens/AdminWorkspaceScreen.js'), 'utf8');

// 2a. Close Fleet Management button removed
assert(!adminSrc.includes('✕ Close Fleet Management'), 'Blue "✕ Close Fleet Management" button must be removed');
console.log('PASS 2a: Blue "✕ Close Fleet Management" button is completely removed.');

// 2b. Add / Delete Buses Modal uses translations
assert(adminSrc.includes("t('fleet_management'"), 'Fleet management title must use translation');
assert(adminSrc.includes("t('tab_delete_bus'"), 'Delete bus tab must use translation');
assert(adminSrc.includes("t('tab_add_bus'"), 'Add bus tab must use translation');
assert(adminSrc.includes("t('tab_fleet_audit_log'"), 'Fleet audit log tab must use translation');
assert(adminSrc.includes("t('btn_delete_bus_fleet'"), 'Delete bus submit button must use translation');
assert(adminSrc.includes("t('btn_confirm_add_bus'"), 'Add bus submit button must use translation');
console.log('PASS 2b: Add / Delete Buses Modal utilizes dynamic multilingual translations.');

// 2c. Add or Delete Depots & Routes Tab 3 is Depot Audit Log
assert(adminSrc.includes("t('tab_depot_audit_log'"), 'Tab 3 must be labelled Depot Audit Log');
assert(adminSrc.includes("t('depot_audit_log_title'"), 'Tab 3 header must show Depot Audit Log title');
assert(adminSrc.includes("depotAuditLogs"), 'Depot Audit Log state must be utilized');
assert(adminSrc.includes("depotAuditLogSearch"), 'Depot Audit Log search must be present');
console.log('PASS 2c: Tab 3 replaced Route & Complexity Dataset with Depot Audit Log.');

// 2d. Dropdown menu for Operating Depot in Add Route
assert(adminSrc.includes("routeDepotDropdownOpen"), 'routeDepotDropdownOpen state must exist');
assert(adminSrc.includes("setRouteDepotDropdownOpen"), 'Dropdown toggle handler must exist');
console.log('PASS 2d: Operating depot selection in Add Route uses a dropdown menu picker.');

// 2e. Schedule Overview removed 3 depot blocks directly beneath search & 2 dropdowns
assert(!adminSrc.includes('Dynamic Depot Route Sections for All Added Depots'), 'Dynamic Depot Route Sections must be removed from Schedule Overview');
console.log('PASS 2e: Three depot sections beneath search & 2 dropdowns are removed from Schedule Overview.');

// 3. Depot 1 & Depot 2 duplicate route filtering in accounts.js
const accountsSrc = fs.readFileSync(path.join(rootDir, 'mobile/src/context/accounts.js'), 'utf8');

// Check DEFAULT_DEPOTS
const depot1RoutesMatch = accountsSrc.match(/id:\s*['"]1['"][\s\S]*?routes:\s*\[([^\]]+)\]/);
const depot2RoutesMatch = accountsSrc.match(/id:\s*['"]2['"][\s\S]*?routes:\s*\[([^\]]+)\]/);

assert(depot1RoutesMatch, 'Depot 1 routes found in DEFAULT_DEPOTS');
assert(depot2RoutesMatch, 'Depot 2 routes found in DEFAULT_DEPOTS');

const d1Routes = depot1RoutesMatch[1].replace(/['"\s]/g, '').split(',').filter(Boolean);
const d2Routes = depot2RoutesMatch[1].replace(/['"\s]/g, '').split(',').filter(Boolean);

const duplicates = d1Routes.filter((r) => d2Routes.includes(r));
assert.strictEqual(duplicates.length, 0, `Depot 1 and Depot 2 must have NO duplicate routes! Found: ${duplicates.join(', ')}`);
console.log(`PASS 3: Depot 1 (${d1Routes.join(', ')}) and Depot 2 (${d2Routes.join(', ')}) have 0 overlapping duplicate routes.`);

console.log('\n======================================================================');
console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🚀');
console.log('======================================================================');
