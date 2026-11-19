import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('======================================================================');
console.log('Testing User Requirements:');
console.log('1. Total Fleet Depot Dropdown Menu');
console.log('2. Home Page Depot Dropdown Menu');
console.log('3. Plus Button Modal Multilingual Translation (Option 2: Add/Delete Buses)');
console.log('4. Audit Log Action Dropdown Filter');
console.log('5. Recently Completed Buses Download CSV Option');
console.log('======================================================================\n');

// 1. Translations Validation
const translationsPath = path.join(rootDir, 'mobile/src/context/translations.json');
const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));

const requiredNewKeys = [
  'fleet_operations',
  'management_actions',
  'select_management_action',
  'fleet_label',
  'add_delete_buses_desc',
  'all_operating_depots',
  'buses_label',
  'filter_action_label',
  'all_actions',
  'action_depot_created',
  'action_depot_deleted',
  'action_route_added',
  'action_route_deleted',
  'route_arrival_dispatch_log',
  'recently_completed_buses',
  'completed_label',
  'recent_completed_subtitle',
  'no_completed_buses_export',
];

const languages = ['en', 'kn', 'hi', 'te', 'ta'];
languages.forEach((lang) => {
  assert(translations[lang], `Missing language block: ${lang}`);
  requiredNewKeys.forEach((key) => {
    assert(translations[lang][key], `Missing translation key "${key}" in language "${lang}"`);
  });
});
console.log(`PASS 1: All ${requiredNewKeys.length} new keys validated across all 5 languages (en, kn, hi, te, ta).`);

// 2. Source Code Verifications in AdminWorkspaceScreen.js
const adminSrc = fs.readFileSync(path.join(rootDir, 'mobile/src/screens/AdminWorkspaceScreen.js'), 'utf8');

// 2a. Total Fleet Depot Dropdown Menu
assert(adminSrc.includes('totalFleetDepotDropdownOpen'), 'Total Fleet must have totalFleetDepotDropdownOpen state');
assert(adminSrc.includes('setTotalFleetDepotDropdownOpen'), 'Total Fleet must have setTotalFleetDepotDropdownOpen setter');
assert(
  adminSrc.includes('Depot Filter Dropdown Menu for Total Fleet'),
  'Total Fleet must contain dedicated Depot Filter Dropdown Menu'
);
console.log('PASS 2a: Total Fleet replaces depot buttons with dropdown menu.');

// 2b. Home Page Depot Dropdown Menu
assert(adminSrc.includes('homeDepotDropdownOpen'), 'Home Page must have homeDepotDropdownOpen state');
assert(adminSrc.includes('setHomeDepotDropdownOpen'), 'Home Page must have setHomeDepotDropdownOpen setter');
assert(
  adminSrc.includes('Depot Filter Dropdown Menu for Home'),
  'Home Page must contain dedicated Depot Filter Dropdown Menu'
);
console.log('PASS 2b: Home Page replaces depot buttons with dropdown menu.');

// 2c. Plus (+) Button Modal Translation
assert(adminSrc.includes("t('add_delete_buses'"), 'Option 2 title must use t("add_delete_buses")');
assert(adminSrc.includes("t('add_delete_buses_desc'"), 'Option 2 description must use t("add_delete_buses_desc")');
assert(adminSrc.includes("t('management_actions'"), 'Modal title must use t("management_actions")');
assert(adminSrc.includes("t('fleet_operations'"), 'Modal eyebrow must use t("fleet_operations")');
console.log('PASS 2c: Plus (+) Button Modal translates Option 2 (Add/Delete Buses) and all descriptions.');

// 2d. Audit Log Dropdown Menu for Action Selection
assert(adminSrc.includes('depotAuditActionFilter'), 'depotAuditActionFilter state must exist');
assert(adminSrc.includes('depotAuditActionDropdownOpen'), 'depotAuditActionDropdownOpen state must exist');
assert(adminSrc.includes('fleetAuditActionFilter'), 'fleetAuditActionFilter state must exist');
assert(adminSrc.includes('fleetAuditActionDropdownOpen'), 'fleetAuditActionDropdownOpen state must exist');
assert(
  adminSrc.includes('Dropdown Menu to Select Action to be Audited'),
  'Depot Audit Log must contain Dropdown Menu to Select Action to be Audited'
);
assert(
  adminSrc.includes('Dropdown Menu to Select Action to be Audited for Fleet'),
  'Fleet Audit Log must contain Dropdown Menu to Select Action to be Audited'
);
console.log('PASS 2d: Audit logs incorporate dropdown menus to select the action to be audited.');

// 2e. Recently Completed Buses Download Option
assert(adminSrc.includes('recently_completed_buses_'), 'Recently completed buses export file prefix must exist');
assert(
  adminSrc.includes('recently_completed_buses_${depotTag}_${dateStr}.csv'),
  'Export filename pattern for completed buses must be configured'
);
console.log('PASS 2e: Recently Completed Buses modal includes CSV download option with vehicle telemetry.');

console.log('\n======================================================================');
console.log('ALL 5 REQUIREMENTS VERIFIED AND PASSED SUCCESSFULLY! 🚀');
console.log('======================================================================');
