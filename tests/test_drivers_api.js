const assert = require('assert');

// Test driver logic in memory similar to server.js
let _driversList = [
  { id: 'DRV-101', name: 'Ramesh Kumar (BMTC-4101)', depot: '1', phone: '+91 98450 11001', shift: 'General Shift', status: 'Active', category: 'A' },
  { id: 'DRV-102', name: 'Suresh Gowda (BMTC-4102)', depot: '1', phone: '+91 98450 11002', shift: 'General Shift', status: 'Active', category: 'B' },
  { id: 'DRV-201', name: 'Basavaraju K. (BMTC-4201)', depot: '2', phone: '+91 98450 22001', shift: 'General Shift', status: 'Active', category: 'A' },
];

let _driverAuditLog = [];

function addDriver(driver) {
  if (!driver || !driver.name) throw new Error('Driver name is required');
  const dId = driver.id || `DRV-${Date.now().toString().slice(-4)}`;
  const newEntry = {
    id: dId,
    name: driver.name,
    depot: String(driver.depot || '1'),
    phone: driver.phone || '',
    shift: driver.shift || 'General Shift',
    category: driver.category || 'B',
    status: 'Active',
    created_at: new Date().toISOString(),
  };
  _driversList.unshift(newEntry);
  _driverAuditLog.unshift({
    id: `audit_drv_${Date.now()}`,
    action: 'ADDED',
    id_ref: dId,
    name: newEntry.name,
    depot: newEntry.depot,
    shift: newEntry.shift,
    reason: driver.reason || 'New EV Driver Induction',
    time: new Date().toLocaleTimeString(),
  });
  return newEntry;
}

function deleteDrivers(ids, reason) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('No driver IDs provided');
  const removed = [];
  _driversList = _driversList.filter(dr => {
    if (ids.includes(dr.id)) {
      removed.push(dr);
      return false;
    }
    return true;
  });
  removed.forEach(dr => {
    _driverAuditLog.unshift({
      id: `audit_del_${Date.now()}_${dr.id}`,
      action: 'DELETED',
      id_ref: dr.id,
      name: dr.name,
      depot: dr.depot,
      reason: reason || 'Withdrawn from active duty',
      time: new Date().toLocaleTimeString(),
    });
  });
  return removed;
}

console.log('Testing driver addition...');
const newDr = addDriver({ name: 'Anil Kumar', id: 'DRV-103', depot: '1', shift: 'Morning Shift', category: 'A' });
assert.strictEqual(_driversList.length, 4);
assert.strictEqual(_driverAuditLog.length, 1);
assert.strictEqual(_driversList[0].name, 'Anil Kumar');

console.log('Testing driver batch deletion...');
const delRes = deleteDrivers(['DRV-103', 'DRV-102'], 'Depot Transfer');
assert.strictEqual(delRes.length, 2);
assert.strictEqual(_driversList.length, 2);
assert.strictEqual(_driverAuditLog.length, 3);

console.log('✓ ALL DRIVER MANAGEMENT TESTS PASSED!');
