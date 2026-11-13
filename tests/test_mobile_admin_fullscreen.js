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
    name: 'State addDeleteFullscreen defined',
    pass: code.includes('const [addDeleteFullscreen, setAddDeleteFullscreen] = useState(true);')
  },
  {
    name: 'Header Add/Delete button opens in fullscreen and add tab',
    pass: code.includes("setAddDeleteTab('add')") && code.includes('setAddDeleteFullscreen(true)') && code.includes('setAddDeleteModalOpen(true)')
  },
  {
    name: 'Center FAB (+) button triggers fullscreen add mode',
    pass: code.includes('adminNavFab') && code.includes("setAddDeleteTab('add')") && code.includes('setAddDeleteFullscreen(true)')
  },
  {
    name: 'Modal 3 uses fullscreen presentationStyle & safe area',
    pass: code.includes("presentationStyle={addDeleteFullscreen ? 'fullScreen' : 'overFullScreen'}") &&
          code.includes('styles.modalBackdropFullScreen') &&
          code.includes('styles.modalCardFullScreen')
  },
  {
    name: 'Fullscreen toggle button included in modal header',
    pass: code.includes('modalFullscreenToggleBtn') && code.includes('modalFullscreenToggleText')
  },
  {
    name: 'ScrollView expands to flex: 1 in fullscreen',
    pass: code.includes('style={addDeleteFullscreen ? { flex: 1 } : { maxHeight: 460 }}')
  },
  {
    name: 'Modal styles for fullscreen backdrop & card defined',
    pass: code.includes('modalBackdropFullScreen:') && code.includes('modalCardFullScreen:')
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
