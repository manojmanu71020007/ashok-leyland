const fs = require('fs');
const path = require('path');
const babel = require('../mobile/node_modules/@babel/core');

const filePath = path.join(__dirname, '..', 'mobile', 'src', 'screens', 'AdminWorkspaceScreen.js');
const code = fs.readFileSync(filePath, 'utf8');

// 1. Syntax Validation
try {
  babel.parseSync(code, {
    presets: [require.resolve('../mobile/node_modules/babel-preset-expo')],
    filename: 'AdminWorkspaceScreen.js'
  });
  console.log('PASS: React Native Babel Syntax Validation');
} catch (e) {
  console.error('FAIL: React Native Babel Parse Error:', e.message);
  process.exit(1);
}

// 2. Feature Checks
const checks = [
  {
    name: 'State plusOptionsModalOpen defined',
    pass: code.includes('const [plusOptionsModalOpen, setPlusOptionsModalOpen] = useState(false);')
  },
  {
    name: 'State addDeleteFullscreen defined',
    pass: code.includes('const [addDeleteFullscreen, setAddDeleteFullscreen] = useState(true);')
  },
  {
    name: 'State addDeleteDepotsModalOpen & addDeleteDepotsFullscreen defined',
    pass: code.includes('const [addDeleteDepotsModalOpen, setAddDeleteDepotsModalOpen] = useState(false);') &&
          code.includes('const [addDeleteDepotsFullscreen, setAddDeleteDepotsFullscreen] = useState(true);')
  },
  {
    name: 'Center FAB (+) and Header Add/Delete button trigger plusOptionsModalOpen',
    pass: code.includes('adminNavFab') &&
          code.includes('btnAddDelHeader') &&
          code.includes('setPlusOptionsModalOpen(true)')
  },
  {
    name: 'Modal 0 Options Chooser renders 2 options (1: Add/Delete Depots, 2: Add/Delete Buses)',
    pass: code.includes('1. Add / Delete Depots') &&
          code.includes('2. Add / Delete Buses') &&
          code.includes('plusOptionCardDepot') &&
          code.includes('plusOptionCardBus')
  },
  {
    name: 'Option 2 (Add / Delete Buses) opens Add/Delete Buses modal in fullscreen add mode',
    pass: code.includes("setAddDeleteTab('add')") &&
          code.includes('setAddDeleteFullscreen(true)') &&
          code.includes('setAddDeleteModalOpen(true)')
  },
  {
    name: 'Option 1 (Add / Delete Depots) opens Add/Delete Depots modal in fullscreen mode',
    pass: code.includes("setDepotsTab('add')") &&
          code.includes('setAddDeleteDepotsFullscreen(true)') &&
          code.includes('setAddDeleteDepotsModalOpen(true)')
  },
  {
    name: 'Modal 3B takes Route [full name], route[short name], starting point, destination & distance',
    pass: code.includes('depotRouteFullName') &&
          code.includes('depotRouteShortName') &&
          code.includes('depotRouteOrigin') &&
          code.includes('depotRouteDestination') &&
          code.includes('depotRouteDistance')
  },
  {
    name: 'Modal 3 uses fullscreen presentationStyle & safe area',
    pass: code.includes("presentationStyle={addDeleteFullscreen ? 'fullScreen' : 'overFullScreen'}") &&
          code.includes('styles.modalBackdropFullScreen') &&
          code.includes('styles.modalCardFullScreen')
  },
  {
    name: 'Modal 3B uses fullscreen presentationStyle & safe area',
    pass: code.includes("presentationStyle={addDeleteDepotsFullscreen ? 'fullScreen' : 'overFullScreen'}")
  },
  {
    name: 'Fullscreen toggle button included in modal headers',
    pass: code.includes('modalFullscreenToggleBtn') && code.includes('modalFullscreenToggleText')
  },
  {
    name: 'ScrollView expands to flex: 1 in fullscreen',
    pass: code.includes('style={addDeleteFullscreen ? { flex: 1 } : { maxHeight: 460 }}')
  },
  {
    name: 'Modal styles for fullscreen backdrop & card defined',
    pass: code.includes('modalBackdropFullScreen:') && code.includes('modalCardFullScreen:')
  },
  {
    name: 'BellIcon red badge removed',
    pass: !code.includes('backgroundColor: \'#ef4444\', borderWidth: 1.5, borderColor: \'#ffffff\'')
  },
  {
    name: 'LanguagePickerPill removed from HOME dashboard header',
    pass: !code.includes('<View style={styles.homeContainer}') || !code.slice(code.indexOf('styles.homeContainer'), code.indexOf('depotPillBar')).includes('LanguagePickerPill')
  },
  {
    name: 'Bell button triggers recentCompletedFullscreen and opens modal',
    pass: code.includes('setRecentCompletedFullscreen(true)') && code.includes('setRecentCompletedModalOpen(true)')
  },
  {
    name: 'Modal 2B uses fullscreen presentationStyle & safe area',
    pass: code.includes("presentationStyle={recentCompletedFullscreen ? 'fullScreen' : 'overFullScreen'}") &&
          code.includes('style={recentCompletedFullscreen ? { flex: 1 } : { maxHeight: 360 }}')
  }
];

let allPass = true;
checks.forEach(c => {
  console.log((c.pass ? 'PASS: ' : 'FAIL: ') + c.name);
  if (!c.pass) allPass = false;
});

if (allPass) {
  console.log('\nALL APP ADMIN WORKSPACE FULLSCREEN CHECKS PASSED!');
  process.exit(0);
} else {
  console.error('\nSOME CHECKS FAILED!');
  process.exit(1);
}
