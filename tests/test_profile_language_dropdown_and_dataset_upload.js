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

// 3. Check server.js for /api/upload-dataset and /api/uploaded-datasets endpoints
const serverCode = fs.readFileSync('server.js', 'utf8');
if (!serverCode.includes('/api/upload-dataset')) {
  throw new Error('server.js does not contain POST /api/upload-dataset endpoint');
}
if (!serverCode.includes('/api/uploaded-datasets')) {
  throw new Error('server.js does not contain GET /api/uploaded-datasets endpoint');
}
console.log('PASS 4: server.js includes /api/upload-dataset and /api/uploaded-datasets endpoints.');

console.log('\n========================================');
console.log('ALL PROFILE DROPDOWN & DATASET UPLOAD TESTS PASSED! 🚀');
console.log('========================================');
