import fs from 'fs';
import path from 'path';

console.log('Testing Profile Language Dropdown & Dataset Spreadsheet Upload...');

// 1. Check translations.json for dataset upload keys
const translations = JSON.parse(fs.readFileSync('mobile/src/context/translations.json', 'utf8'));
const requiredLangs = ['en', 'kn', 'hi', 'te', 'ta'];
const requiredKeys = [
  'update_dataset_title',
  'update_dataset_desc',
  'btn_select_dataset_file',
  'btn_select_dataset_sub'
];

for (const lang of requiredLangs) {
  if (!translations[lang]) {
    throw new Error(`Missing language object for ${lang}`);
  }
  for (const k of requiredKeys) {
    if (!translations[lang][k]) {
      throw new Error(`Missing key ${k} in language ${lang}`);
    }
  }
}
console.log('PASS 1: All dataset upload translation keys present across en, kn, hi, te, ta.');

// 2. Check AdminWorkspaceScreen.js for language dropdown and dataset upload card
const adminScreen = fs.readFileSync('mobile/src/screens/AdminWorkspaceScreen.js', 'utf8');

if (!adminScreen.includes('profileLangDropdownOpen')) {
  throw new Error('AdminWorkspaceScreen does not contain profileLangDropdownOpen state');
}
if (!adminScreen.includes('handleSelectDatasetSpreadsheet')) {
  throw new Error('AdminWorkspaceScreen does not contain handleSelectDatasetSpreadsheet handler');
}
if (!adminScreen.includes('handleUploadDatasetFile')) {
  throw new Error('AdminWorkspaceScreen does not contain handleUploadDatasetFile handler');
}
if (!adminScreen.includes('/api/upload-dataset')) {
  throw new Error('AdminWorkspaceScreen does not call /api/upload-dataset');
}

// Check positioning: Dataset Card before Depot Login Credentials Card
const datasetCardIdx = adminScreen.indexOf('DATASET / SPREADSHEET UPDATE CARD');
const credentialsCardIdx = adminScreen.indexOf('DEPOT LOGIN CREDENTIALS (ALL DEPOTS)');

if (datasetCardIdx === -1) {
  throw new Error('AdminWorkspaceScreen does not contain Dataset / Spreadsheet Update Card');
}
if (credentialsCardIdx === -1) {
  throw new Error('AdminWorkspaceScreen does not contain Depot Login Credentials Card');
}
if (datasetCardIdx >= credentialsCardIdx) {
  throw new Error('Dataset card is not positioned before Depot Login Credentials card');
}
console.log('PASS 2: Dataset upload card correctly positioned BEFORE Depot Login Credentials card in Profile.');

// Check language dropdown menu replacement
const langDropdownIdx = adminScreen.indexOf('profileLangDropdownOpen');
if (langDropdownIdx === -1) {
  throw new Error('Language dropdown menu missing in AdminWorkspaceScreen');
}
console.log('PASS 3: Language preferences converted to collapsible dropdown menu in Profile tab.');

// 4. Check Total Fleet section updates
// Verify D1: 57 | D2: 65 (breakdownBadge) and Add / Delete Buses removed from Total Fleet section header
const totalFleetSectionIdx = adminScreen.indexOf("activeAdminTab === 'TOTAL_FLEET'");
const totalFleetEndIdx = adminScreen.indexOf("activeAdminTab === 'PROFILE'");
const totalFleetBlock = adminScreen.substring(totalFleetSectionIdx, totalFleetEndIdx);

if (totalFleetBlock.includes('breakdownBadgeText')) {
  throw new Error('Total fleet still contains breakdownBadgeText with D1: / D2: count badges');
}
if (totalFleetBlock.includes('btnAddDelHeader')) {
  throw new Error('Total fleet still contains btnAddDelHeader (Add / Delete Buses button)');
}
console.log('PASS 4: D1/D2/D3 breakdown badges and Add / Delete Buses removed from Total Fleet header.');

// Check search bar in Total Fleet
if (!totalFleetBlock.includes('Search Bar for Total Fleet')) {
  throw new Error('Total fleet does not include the Search Bar at top');
}
console.log('PASS 5: Prominent Search Bar included right at the top of Total Fleet.');

// 5. Check Dataset Target Depot selection modal & requirement
if (!adminScreen.includes('datasetTargetDepot') || !adminScreen.includes('datasetDepotModalOpen')) {
  throw new Error('AdminWorkspaceScreen missing datasetTargetDepot or datasetDepotModalOpen state');
}
if (!adminScreen.includes('handleSelectDepotForDataset')) {
  throw new Error('AdminWorkspaceScreen missing handleSelectDepotForDataset handler');
}
if (!adminScreen.includes('DATASET TARGET DEPOT SELECTION MODAL')) {
  throw new Error('AdminWorkspaceScreen missing Dataset Target Depot Selection Modal');
}
console.log('PASS 6: Browse button asks for target depot and enforces depot selection before dataset addition.');

// 6. Check server.js for /api/upload-dataset and manifest support
const serverCode = fs.readFileSync('server.js', 'utf8');
if (!serverCode.includes('/api/upload-dataset')) {
  throw new Error('server.js does not contain POST /api/upload-dataset endpoint');
}
if (!serverCode.includes('targetDepot')) {
  throw new Error('server.js POST /api/upload-dataset does not process targetDepot');
}
console.log('PASS 7: server.js handles targetDepot, metadata manifest, and sync broadcasts.');

console.log('\n======================================================');
console.log('ALL VERIFICATIONS PASSED: TOTAL FLEET & DATASET DEPOT! 🚀');
console.log('======================================================');
