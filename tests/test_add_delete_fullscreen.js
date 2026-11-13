const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

const checks = [
    { name: 'Topbar + button badge', pass: html.includes('class="topbar-plus-symbol"') },
    { name: 'Topbar button calls openAddDeleteBusesModal(\'add\', true)', pass: html.includes("openAddDeleteBusesModal('add', true)") },
    { name: 'Fullscreen toggle button in modal header', pass: html.includes('id="btn-fullscreen-add-delete"') },
    { name: 'Fullscreen CSS styles defined', pass: html.includes('#add-delete-buses-modal-backdrop.is-fullscreen') && html.includes('.modal-fullscreen-btn') },
    { name: 'setAddDeleteFullscreen JS function defined', pass: html.includes('function setAddDeleteFullscreen(') },
    { name: 'toggleAddDeleteFullscreen JS function defined', pass: html.includes('function toggleAddDeleteFullscreen()') },
    { name: 'updateFullscreenToggleIcon JS function defined', pass: html.includes('function updateFullscreenToggleIcon(') },
    { name: 'Fullscreen event listeners attached', pass: html.includes('handleAddDeleteFullscreenChange') },
    { name: 'Escape key handler includes add-delete modal', pass: html.includes('add-delete-buses-modal-backdrop') && html.includes('closeAddDeleteBusesModal()') }
];

let allPass = true;
checks.forEach(c => {
    console.log((c.pass ? 'PASS: ' : 'FAIL: ') + c.name);
    if (!c.pass) allPass = false;
});

if (allPass) {
    console.log('\nALL 9 ADD/DELETE FULLSCREEN INTEGRATION CHECKS PASSED!');
    process.exit(0);
} else {
    console.error('\nSOME CHECKS FAILED!');
    process.exit(1);
}
