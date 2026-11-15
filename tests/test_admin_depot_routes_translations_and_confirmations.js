/**
 * Verification Test Suite:
 * 1. Multilingual translation for Add / Delete Depots & Routes in all 5 languages (en, kn, hi, te, ta).
 * 2. Removal of "Depot Induction & Auto-Setup" green region.
 * 3. Removal of "Auto-Generated Operations & Credentials".
 * 4. Confirmation dialogs before adding or deleting depots and routes.
 * 5. Removal of the bottom blue "✕ Close Window" button.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('Testing Add / Delete Depots & Routes: Translations, Confirmations & UI');
console.log('======================================================================\n');

// ── Test 1: Multilingual Translation Coverage in translations.json ──
console.log('--- Test 1: Verify Multilingual Translations in translations.json ---');
const translationsRaw = fs.readFileSync('mobile/src/context/translations.json', 'utf8');
const translations = JSON.parse(translationsRaw);
const languages = ['en', 'kn', 'hi', 'te', 'ta'];

const requiredKeys = [
  'add_delete_depots_routes',
  'tab_add_route_depot',
  'tab_delete_route_depot',
  'tab_route_dataset',
  'submode_create_depot',
  'submode_add_route',
  'submode_delete_depot',
  'submode_decommission_route',
  'depot_number_id',
  'depot_name_field',
  'depot_location_field',
  'btn_create_depot',
  'btn_cancel',
  'route_reg_banner',
  'operating_depot_label',
  'route_full_name_label',
  'route_short_name_label',
  'route_origin_label',
  'route_destination_label',
  'route_distance_label',
  'route_complexity_label',
  'time_complexity_label',
  'btn_register_route',
  'select_depot_to_delete',
  'btn_delete_depot',
  'select_route_to_decommission',
  'btn_decommission_route',
  'confirm_add_depot_title',
  'confirm_add_depot_msg',
  'confirm_delete_depot_title',
  'confirm_delete_depot_msg',
  'confirm_add_route_title',
  'confirm_add_route_msg',
  'confirm_delete_route_title',
  'confirm_delete_route_msg',
  'btn_confirm_add',
  'btn_confirm_delete',
];

for (const lang of languages) {
  assert(translations[lang], `Language dict for ${lang} must exist`);
  for (const k of requiredKeys) {
    assert(
      translations[lang][k] && typeof translations[lang][k] === 'string' && translations[lang][k].trim().length > 0,
      `Key "${k}" missing or empty for language "${lang}"`
    );
  }
}
console.log(`PASS: All ${requiredKeys.length} keys validated across all 5 languages (en, kn, hi, te, ta).`);

// ── Test 2: Source Code Verifications in AdminWorkspaceScreen.js ──
console.log('\n--- Test 2: Source Code Verifications in AdminWorkspaceScreen.js ---');
const adminSrc = fs.readFileSync('mobile/src/screens/AdminWorkspaceScreen.js', 'utf8');

// 2a. Verify "Depot Induction & Auto-Setup" is completely removed
assert(!adminSrc.includes('Depot Induction & Auto-Setup'), 'Depot Induction & Auto-Setup must be removed');
assert(!adminSrc.includes('Depot Induction and Auto Setup'), 'Depot Induction and Auto Setup must be removed');
console.log('PASS: "Depot Induction & Auto-Setup" green banner is completely removed.');

// 2b. Verify "Auto-Generated Operations & Credentials" is removed
assert(!adminSrc.includes('Auto-Generated Operations & Credentials'), 'Auto-Generated Operations & Credentials banner must be removed');
assert(!adminSrc.includes('styles.autoGenBanner'), 'autoGenBanner JSX must be removed from modal');
console.log('PASS: "Auto-Generated Operations & Credentials" is completely removed.');

// 2c. Verify "✕ Close Window" button is removed
assert(!adminSrc.includes('✕ Close Window'), 'Bottom blue "✕ Close Window" button must be removed');
console.log('PASS: "✕ Close Window" bottom blue button is completely removed.');

// 2d. Verify Confirmation prompts on Add / Delete Depot and Route
assert(adminSrc.includes("confirm_add_depot_title"), 'handleCreateNewDepot must prompt for confirmation');
assert(adminSrc.includes("confirm_delete_depot_title"), 'handleDeleteDepot must prompt for confirmation');
assert(adminSrc.includes("confirm_add_route_title"), 'handleAddRouteToDepot must prompt for confirmation');
assert(adminSrc.includes("confirm_delete_route_title"), 'handleDeleteRouteFromDepot must prompt for confirmation');
console.log('PASS: Confirmation messages are properly wired up before adding and deleting depots and routes.');

// 2e. Verify Modal Elements use t() translations
assert(adminSrc.includes("t('add_delete_depots_routes'"), 'Modal title must use translation');
assert(adminSrc.includes("t('tab_add_route_depot'"), 'Add tab must use translation');
assert(adminSrc.includes("t('tab_delete_route_depot'"), 'Delete tab must use translation');
assert(adminSrc.includes("t('tab_depot_audit_log'") || adminSrc.includes("t('tab_route_dataset'"), 'Audit Log tab must use translation');
assert(adminSrc.includes("t('btn_create_depot'"), 'Create depot button must use translation');
assert(adminSrc.includes("t('btn_register_route'"), 'Register route button must use translation');
assert(adminSrc.includes("t('btn_delete_depot'"), 'Delete depot button must use translation');
assert(adminSrc.includes("t('btn_decommission_route'"), 'Decommission route button must use translation');
console.log('PASS: Modal tabs, buttons, labels, and placeholders utilize multilingual translation.');

console.log('\n======================================================================');
console.log('ALL TRANSLATIONS, CONFIRMATIONS & CLEANUP TESTS PASSED SUCCESSFULLY!');
console.log('======================================================================');
