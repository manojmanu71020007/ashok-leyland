// Official Allocated Credentials Directory
// Exactly mirrors Webpage_Credentials.xlsx, Webpage_Logins.xlsx, and login.html

import { api } from '../api/client.js';

export const WEBPAGE_ACCOUNTS = {
  // ── 1. Admin Dashboard & Fleet Overview ──
  'cdm001': {
    username: 'CDM001',
    password: 'Test@123',
    role: 'Central Depot Manager',
    name: 'Central Depot Manager',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Admin Dashboard / Fleet Overview',
    email: 'cdm001@ashokleyland.com',
  },
  'for_admin_login': {
    username: 'for_admin_login',
    password: 'Test@123',
    role: 'Central Depot Manager',
    name: 'Central Depot Manager',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Admin Dashboard / Fleet Overview',
  },
  'admin': {
    username: 'admin',
    password: 'adminlogin',
    role: 'System Administrator',
    name: 'Admin',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Admin Dashboard / Fleet Overview',
    email: 'admin@gmail.com',
  },
  'admin@gmail.com': {
    username: 'admin@gmail.com',
    password: 'adminlogin',
    role: 'System Administrator',
    name: 'Admin',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Admin Dashboard / Fleet Overview',
    email: 'admin@gmail.com',
  },
  'superadmin': {
    username: 'superadmin',
    password: 'SuperAdmin@2026',
    role: 'Executive Super Admin',
    name: 'Executive Super Admin',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Super Administrator Portal',
    email: 'superadmin@ashokleyland.com',
  },
  'admin_master': {
    username: 'admin_master',
    password: 'SuperAdmin@2026',
    role: 'Executive Super Admin',
    name: 'Executive Super Admin',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Super Administrator Portal',
    email: 'admin_master@ashokleyland.com',
  },

  // ── 2. Smart Bus Scheduling - Depot 1 ──
  'is-depot-1': {
    username: 'IS-DEPOT-1',
    password: 'Test@123',
    role: 'Scheduling In-Charge (Depot 1)',
    name: 'Scheduling Planner - Depot 1',
    depot: '1',
    targetScreen: 'SCHEDULING',
    pageName: 'Smart Bus Scheduling - Depot 1',
    email: 'is_depot1@ashokleyland.com',
  },
  'for_scheduling_depot_1': {
    username: 'for_scheduling_depot_1',
    password: 'Test@123',
    role: 'Scheduling In-Charge (Depot 1)',
    name: 'Scheduling Planner - Depot 1',
    depot: '1',
    targetScreen: 'SCHEDULING',
    pageName: 'Smart Bus Scheduling - Depot 1',
  },
  'scheduling': {
    username: 'scheduling',
    password: 'Schedule@2026',
    role: 'Fleet Scheduling Officer',
    name: 'Scheduling Planner',
    depot: '1',
    targetScreen: 'SCHEDULING',
    pageName: 'Smart Bus Scheduling Portal',
    email: 'scheduling@ashokleyland.com',
  },
  'scheduler': {
    username: 'scheduler',
    password: 'Schedule@2026',
    role: 'Fleet Scheduling Officer',
    name: 'Scheduling Planner',
    depot: '1',
    targetScreen: 'SCHEDULING',
    pageName: 'Smart Bus Scheduling Portal',
    email: 'scheduler@ashokleyland.com',
  },

  // ── 3. Charging Operations - Depot 1 ──
  'es-depot-1': {
    username: 'ES-DEPOT-1',
    password: 'Test@123',
    role: 'Electrical Supervisor (Depot 1)',
    name: 'Charging Lead - Depot 1',
    depot: '1',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 1)',
    email: 'es_depot1@ashokleyland.com',
  },
  'for_charging_depot_1': {
    username: 'for_charging_depot_1',
    password: 'Test@123',
    role: 'Electrical Supervisor (Depot 1)',
    name: 'Charging Lead - Depot 1',
    depot: '1',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 1)',
  },
  'charging': {
    username: 'charging',
    password: 'Charge@2026',
    role: 'Charging Supervisor',
    name: 'Charging Supervisor',
    depot: '1',
    targetScreen: 'CHARGING',
    pageName: 'Charging Station Operations',
    email: 'charging@ashokleyland.com',
  },
  'charger_ops': {
    username: 'charger_ops',
    password: 'Charge@2026',
    role: 'Charging Supervisor',
    name: 'Charging Supervisor',
    depot: '1',
    targetScreen: 'CHARGING',
    pageName: 'Charging Station Operations',
    email: 'charging@ashokleyland.com',
  },
  'charging_depot1': {
    username: 'charging_depot1',
    password: 'ChargeDepot1@2026',
    role: 'Depot 1 Charging Lead',
    name: 'Depot 1 Charging Lead',
    depot: '1',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 1)',
    email: 'charging1@ashokleyland.com',
  },
  'charging1': {
    username: 'charging1',
    password: 'ChargeDepot1@2026',
    role: 'Depot 1 Charging Lead',
    name: 'Depot 1 Charging Lead',
    depot: '1',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 1)',
    email: 'charging1@ashokleyland.com',
  },

  // ── 4. Cleaning & Sanitization - Depot 1 ──
  'insp-depot-1-01': {
    username: 'INSP-DEPOT-1-01',
    password: 'Test@123',
    role: 'Sanitization Inspector (Depot 1)',
    name: 'Inspector - Depot 1',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning & Sanitization (Depot 1)',
    email: 'insp_depot1_01@ashokleyland.com',
  },
  'insp-depot-1-02': {
    username: 'INSP-DEPOT-1-02',
    password: 'Test@123',
    role: 'Sanitization Inspector (Depot 1)',
    name: 'Inspector - Depot 1',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning & Sanitization (Depot 1)',
    email: 'insp_depot1_02@ashokleyland.com',
  },
  'for_cleaning_depot_1': {
    username: 'for_cleaning_depot_1',
    password: 'Test@123',
    role: 'Sanitization Inspector (Depot 1)',
    name: 'Inspector - Depot 1',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning & Sanitization (Depot 1)',
  },
  'cleaning': {
    username: 'cleaning',
    password: 'Clean@2026',
    role: 'Sanitization Supervisor',
    name: 'Cleaning Supervisor',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Bus Cleaning & Sanitization',
    email: 'cleaning@ashokleyland.com',
  },
  'cleaner_ops': {
    username: 'cleaner_ops',
    password: 'Clean@2026',
    role: 'Sanitization Supervisor',
    name: 'Cleaning Supervisor',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Bus Cleaning & Sanitization',
    email: 'cleaning@ashokleyland.com',
  },
  'cleaning_depot1': {
    username: 'cleaning_depot1',
    password: 'CleanDepot1@2026',
    role: 'Depot 1 Cleaning Lead',
    name: 'Depot 1 Cleaning Lead',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning Operations (Depot 1)',
    email: 'cleaning1@ashokleyland.com',
  },
  'cleaning1': {
    username: 'cleaning1',
    password: 'CleanDepot1@2026',
    role: 'Depot 1 Cleaning Lead',
    name: 'Depot 1 Cleaning Lead',
    depot: '1',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning Operations (Depot 1)',
    email: 'cleaning1@ashokleyland.com',
  },

  // ── 5. Depot Operations & Dispatch - Depot 1 ──
  'dm-depot-1': {
    username: 'DM-DEPOT-1',
    password: 'Test@123',
    role: 'Depot 1 Manager',
    name: 'Depot 1 Manager',
    depot: '1',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 1 Operations Wing',
    email: 'dm_depot1@ashokleyland.com',
  },
  'for_depot_operations_depot_1': {
    username: 'for_depot_operations_depot_1',
    password: 'Test@123',
    role: 'Depot 1 Manager',
    name: 'Depot 1 Manager',
    depot: '1',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 1 Operations Wing',
  },
  'depot_operations': {
    username: 'depot_operations',
    password: 'Depot@2026',
    role: 'Depot Operations Dispatcher',
    name: 'Operations Dispatcher',
    depot: '1',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot Operations & Dispatch',
    email: 'depotops@ashokleyland.com',
  },
  'depot_ops': {
    username: 'depot_ops',
    password: 'Depot@2026',
    role: 'Depot Operations Dispatcher',
    name: 'Operations Dispatcher',
    depot: '1',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot Operations & Dispatch',
    email: 'depotops@ashokleyland.com',
  },
  'depot1_ops': {
    username: 'depot1_ops',
    password: 'Depot1Ops@2026',
    role: 'Depot 1 Operations Controller',
    name: 'Depot 1 Controller',
    depot: '1',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 1 Operations & Dispatch',
    email: 'depot1@ashokleyland.com',
  },
  'depot_ops_d1': {
    username: 'depot_ops_d1',
    password: 'Depot1Ops@2026',
    role: 'Depot 1 Operations Controller',
    name: 'Depot 1 Controller',
    depot: '1',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 1 Operations & Dispatch',
    email: 'depot1@ashokleyland.com',
  },

  // ── 6. Smart Bus Scheduling - Depot 2 ──
  'is-depot-2': {
    username: 'IS-DEPOT-2',
    password: 'Test@123',
    role: 'Scheduling In-Charge (Depot 2)',
    name: 'Scheduling Planner - Depot 2',
    depot: '2',
    targetScreen: 'SCHEDULING',
    pageName: 'Smart Bus Scheduling - Depot 2',
    email: 'is_depot2@ashokleyland.com',
  },
  'for_scheduling_depot_2': {
    username: 'for_scheduling_depot_2',
    password: 'Test@123',
    role: 'Scheduling In-Charge (Depot 2)',
    name: 'Scheduling Planner - Depot 2',
    depot: '2',
    targetScreen: 'SCHEDULING',
    pageName: 'Smart Bus Scheduling - Depot 2',
  },

  // ── 7. Charging Operations - Depot 2 ──
  'es-depot-2': {
    username: 'ES-DEPOT-2',
    password: 'Test@123',
    role: 'Electrical Supervisor (Depot 2)',
    name: 'Charging Lead - Depot 2',
    depot: '2',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 2)',
    email: 'es_depot2@ashokleyland.com',
  },
  'for_charging_depot_2': {
    username: 'for_charging_depot_2',
    password: 'Test@123',
    role: 'Electrical Supervisor (Depot 2)',
    name: 'Charging Lead - Depot 2',
    depot: '2',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 2)',
  },
  'charging_depot2': {
    username: 'charging_depot2',
    password: 'ChargeDepot2@2026',
    role: 'Depot 2 Charging Lead',
    name: 'Depot 2 Charging Lead',
    depot: '2',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 2)',
    email: 'charging2@ashokleyland.com',
  },
  'charging2': {
    username: 'charging2',
    password: 'ChargeDepot2@2026',
    role: 'Depot 2 Charging Lead',
    name: 'Depot 2 Charging Lead',
    depot: '2',
    targetScreen: 'CHARGING',
    pageName: 'Charging Operations (Depot 2)',
    email: 'charging2@ashokleyland.com',
  },

  // ── 8. Cleaning & Sanitization - Depot 2 ──
  'insp-depot-2-01': {
    username: 'INSP-DEPOT-2-01',
    password: 'Test@123',
    role: 'Sanitization Inspector (Depot 2)',
    name: 'Inspector - Depot 2',
    depot: '2',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning & Sanitization (Depot 2)',
    email: 'insp_depot2_01@ashokleyland.com',
  },
  'insp-depot-2-02': {
    username: 'INSP-DEPOT-2-02',
    password: 'Test@123',
    role: 'Sanitization Inspector (Depot 2)',
    name: 'Inspector - Depot 2',
    depot: '2',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning & Sanitization (Depot 2)',
    email: 'insp_depot2_02@ashokleyland.com',
  },
  'for_cleaning_depot_2': {
    username: 'for_cleaning_depot_2',
    password: 'Test@123',
    role: 'Sanitization Inspector (Depot 2)',
    name: 'Inspector - Depot 2',
    depot: '2',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning & Sanitization (Depot 2)',
  },
  'cleaning_depot2': {
    username: 'cleaning_depot2',
    password: 'CleanDepot2@2026',
    role: 'Depot 2 Cleaning Lead',
    name: 'Depot 2 Cleaning Lead',
    depot: '2',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning Operations (Depot 2)',
    email: 'cleaning2@ashokleyland.com',
  },
  'cleaning2': {
    username: 'cleaning2',
    password: 'CleanDepot2@2026',
    role: 'Depot 2 Cleaning Lead',
    name: 'Depot 2 Cleaning Lead',
    depot: '2',
    targetScreen: 'CLEANING',
    pageName: 'Cleaning Operations (Depot 2)',
    email: 'cleaning2@ashokleyland.com',
  },

  // ── 9. Depot Operations & Dispatch - Depot 2 ──
  'dm-depot-2': {
    username: 'DM-DEPOT-2',
    password: 'Test@123',
    role: 'Depot 2 Manager',
    name: 'Depot 2 Manager',
    depot: '2',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 2 Operations Wing',
    email: 'dm_depot2@ashokleyland.com',
  },
  'for_depot_operations_depot_2': {
    username: 'for_depot_operations_depot_2',
    password: 'Test@123',
    role: 'Depot 2 Manager',
    name: 'Depot 2 Manager',
    depot: '2',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 2 Operations Wing',
  },
  'depot2_ops': {
    username: 'depot2_ops',
    password: 'Depot2Ops@2026',
    role: 'Depot 2 Operations Controller',
    name: 'Depot 2 Controller',
    depot: '2',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 2 Operations & Dispatch',
    email: 'depot2@ashokleyland.com',
  },
  'depot_ops_d2': {
    username: 'depot_ops_d2',
    password: 'Depot2Ops@2026',
    role: 'Depot 2 Operations Controller',
    name: 'Depot 2 Controller',
    depot: '2',
    targetScreen: 'DEPOT_OPS',
    pageName: 'Depot 2 Operations & Dispatch',
    email: 'depot2@ashokleyland.com',
  },

  // ── 10. Bus Details & Telemetry Analytics ──
  'bus_details': {
    username: 'bus_details',
    password: 'BusDetails@2026',
    role: 'Fleet Telemetry Specialist',
    name: 'Telemetry Specialist',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Bus Details & Telemetry Analytics',
    email: 'telemetry@ashokleyland.com',
  },
  'telemetry': {
    username: 'telemetry',
    password: 'BusDetails@2026',
    role: 'Fleet Telemetry Specialist',
    name: 'Telemetry Specialist',
    depot: '1',
    targetScreen: 'ADMIN_WORKSPACE',
    pageName: 'Bus Details & Telemetry Analytics',
    email: 'telemetry@ashokleyland.com',
  },
};

// ── Default System Depots ──
export const DEFAULT_DEPOTS = [
  {
    id: '1',
    number: '1',
    name: 'Depot 1 (Chandapura)',
    shortName: 'Depot 1',
    location: 'Chandapura (BMT-32)',
    routes: ['356Z', '360K', '600F', '361C', '399C'],
    isDefault: true,
  },
  {
    id: '2',
    number: '2',
    name: 'Depot 2 (Attibele / Hoskote)',
    shortName: 'Depot 2',
    location: 'Attibele / Hoskote',
    routes: ['KBS3A', 'KBS3F', '328H', '500DC'],
    isDefault: true,
  },
];

const CUSTOM_DEPOTS_KEY = 'depot_app_custom_depots';
const CUSTOM_ACCOUNTS_KEY = 'depot_app_custom_accounts';
const CUSTOM_DELETED_DEPOTS_KEY = 'depot_app_custom_deleted_depots';

let dynamicDepots = [];
let dynamicAccounts = {};
let deletedDepotIds = new Set();

function persistLocalDepotState() {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem(CUSTOM_DEPOTS_KEY, JSON.stringify(dynamicDepots));
      localStorage.setItem(CUSTOM_ACCOUNTS_KEY, JSON.stringify(dynamicAccounts));
      localStorage.setItem(CUSTOM_DELETED_DEPOTS_KEY, JSON.stringify(Array.from(deletedDepotIds)));
    }
  } catch (e) {
    console.warn('Failed to persist dynamic depot state:', e);
  }
}

// Load persisted dynamic depots & accounts (supports Web localStorage)
try {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    const savedDeleted = localStorage.getItem(CUSTOM_DELETED_DEPOTS_KEY);
    if (savedDeleted) {
      const arr = JSON.parse(savedDeleted);
      if (Array.isArray(arr)) {
        deletedDepotIds = new Set(arr.map(String));
      }
    }
    const savedDepots = localStorage.getItem(CUSTOM_DEPOTS_KEY);
    if (savedDepots) {
      const loaded = JSON.parse(savedDepots);
      if (Array.isArray(loaded)) {
        dynamicDepots = loaded.filter((d) => d && d.id && !deletedDepotIds.has(String(d.id)));
      }
    }
    const savedAccounts = localStorage.getItem(CUSTOM_ACCOUNTS_KEY);
    if (savedAccounts) {
      const loadedAcc = JSON.parse(savedAccounts);
      if (loadedAcc && typeof loadedAcc === 'object') {
        dynamicAccounts = loadedAcc;
        for (const k of Object.keys(dynamicAccounts)) {
          if (dynamicAccounts[k] && deletedDepotIds.has(String(dynamicAccounts[k].depot))) {
            delete dynamicAccounts[k];
          }
        }
      }
    }
  }
} catch (e) {
  console.warn('Failed to load saved dynamic depots:', e);
}

const depotListeners = new Set();

export function subscribeDepotChanges(callback) {
  if (typeof callback === 'function') {
    depotListeners.add(callback);
    return () => depotListeners.delete(callback);
  }
  return () => {};
}

function notifyDepotListeners() {
  depotListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('Error in depot listener:', e);
    }
  });
}

/**
 * Synchronizes in-memory and local dynamic depots with data received from backend server.
 * Ensures that newly created depots are NEVER prematurely deleted when updating app code or on server restarts,
 * while respecting tombstones when an administrator explicitly deletes a depot.
 */
export function syncDepotsWithServer(remoteDepots, remoteAccounts, remoteDeletedIds, remoteRouteDefinitions) {
  let changed = false;

  // 0. Ingest any remote route definitions
  if (remoteRouteDefinitions && typeof remoteRouteDefinitions === 'object') {
    Object.values(remoteRouteDefinitions).forEach((rObj) => {
      if (rObj && (rObj.code || rObj.id)) {
        registerRouteDefinition(rObj);
      }
    });
  }

  // 1. Ingest any remote tombstones (permanently deleted depot IDs)
  if (Array.isArray(remoteDeletedIds)) {
    remoteDeletedIds.forEach((id) => {
      const cleanId = String(id || '').trim();
      if (cleanId && !deletedDepotIds.has(cleanId)) {
        deletedDepotIds.add(cleanId);
        changed = true;
      }
    });
  }

  // 2. Remove any local depots or accounts that are marked deleted
  const initialDepotCount = dynamicDepots.length;
  dynamicDepots = dynamicDepots.filter((d) => !deletedDepotIds.has(String(d.id)));
  if (dynamicDepots.length !== initialDepotCount) {
    changed = true;
  }
  for (const k of Object.keys(dynamicAccounts)) {
    if (dynamicAccounts[k] && deletedDepotIds.has(String(dynamicAccounts[k].depot))) {
      delete dynamicAccounts[k];
      changed = true;
    }
  }

  // 3. Merge incoming remote depots - DO NOT blindly overwrite local custom depots!
  if (Array.isArray(remoteDepots)) {
    remoteDepots.forEach((rDepot) => {
      if (!rDepot || !rDepot.id) return;
      const cleanId = String(rDepot.id).trim();
      if (deletedDepotIds.has(cleanId)) return; // Permanently deleted, ignore

      // Ingest any routeObjects attached to remote depot
      if (Array.isArray(rDepot.routeObjects)) {
        rDepot.routeObjects.forEach((ro) => {
          if (ro && (ro.code || ro.id)) {
            registerRouteDefinition({ ...ro, depotId: cleanId });
          }
        });
      }

      const existingIdx = dynamicDepots.findIndex((d) => String(d.id) === cleanId);
      if (existingIdx >= 0) {
        const mergedRouteObjects = Array.isArray(rDepot.routeObjects) && rDepot.routeObjects.length > 0
          ? rDepot.routeObjects
          : (dynamicDepots[existingIdx].routeObjects || []);
        const mergedRoutes = Array.isArray(rDepot.routes) && rDepot.routes.length > 0
          ? rDepot.routes
          : (dynamicDepots[existingIdx].routes || []);

        const mergedDepot = {
          ...dynamicDepots[existingIdx],
          ...rDepot,
          routes: mergedRoutes,
          routeObjects: mergedRouteObjects,
        };

        if (JSON.stringify(dynamicDepots[existingIdx]) !== JSON.stringify(mergedDepot)) {
          dynamicDepots[existingIdx] = mergedDepot;
          changed = true;
        }
      } else {
        dynamicDepots.push(rDepot);
        changed = true;
      }
    });
  }

  // 4. Merge incoming remote accounts
  if (remoteAccounts && typeof remoteAccounts === 'object') {
    for (const [k, acc] of Object.entries(remoteAccounts)) {
      if (acc && acc.depot && !deletedDepotIds.has(String(acc.depot))) {
        if (!dynamicAccounts[k] || JSON.stringify(dynamicAccounts[k]) !== JSON.stringify(acc)) {
          dynamicAccounts[k] = acc;
          changed = true;
        }
      }
    }
  }

  // 5. CRITICAL: If local device has dynamic depots that the server does NOT know about yet,
  // push them up to the server so the server NEVER wipes them out!
  const serverMissingLocalDepots = dynamicDepots.some((localD) => {
    return !Array.isArray(remoteDepots) || !remoteDepots.some((rD) => String(rD.id) === String(localD.id));
  });

  if (serverMissingLocalDepots && dynamicDepots.length > 0) {
    try {
      if (typeof api !== 'undefined' && api && typeof api.saveCustomDepot === 'function') {
        api.saveCustomDepot({
          action: 'sync',
          customDepots: dynamicDepots,
          customAccounts: dynamicAccounts,
          customRouteDefinitions: dynamicRouteDefinitions,
          deletedDepotIds: Array.from(deletedDepotIds),
        }).catch(() => {});
      }
    } catch (_) {}
  }

  if (changed) {
    persistLocalDepotState();
    notifyDepotListeners();
  }

  return { ok: true, changed, depots: getAllDepots() };
}

// Initial eager server hydration on startup
try {
  if (typeof api !== 'undefined' && api && typeof api.getCustomDepots === 'function') {
    api.getCustomDepots().then((res) => {
      if (res && res.ok && res.data) {
        syncDepotsWithServer(
          res.data.customDepots || [],
          res.data.customAccounts || {},
          res.data.deletedDepotIds || [],
          res.data.customRouteDefinitions || {}
        );
      }
    }).catch(() => {});
  }
} catch (_) {}

/**
 * Returns all active depots in the system (Default + Dynamic Custom Depots)
 */
export function getAllDepots() {
  return [...DEFAULT_DEPOTS, ...dynamicDepots].filter((d) => !deletedDepotIds.has(String(d.id)));
}

/**
 * Returns display name for a depot id
 */
export function getDepotDisplayName(depotId) {
  const cleanId = String(depotId || '1').trim();
  const found = getAllDepots().find((d) => String(d.id) === cleanId || String(d.number) === cleanId);
  if (found) return found.name;
  return `Depot ${cleanId}`;
}

/**
 * Returns route codes assigned to a specific depot
 */
export function getRoutesForDepot(depotId) {
  const cleanId = String(depotId || '').trim();
  if (deletedDepotIds.has(cleanId)) return [];
  const found = getAllDepots().find((d) => String(d.id) === cleanId || String(d.number) === cleanId);
  if (found && Array.isArray(found.routes)) {
    return found.routes;
  }
  if (cleanId === '1') return ['356Z', '360K', '600F', '361C', '399C'];
  if (cleanId === '2') return ['KBS3A', 'KBS3F', '328H', '500DC'];
  return [];
}

/**
 * Adds a route code to a depot's assigned routes list and syncs across devices.
 */
// Shared registry for dynamic route definitions (stores full name, short name, origin, destination, distance, etc.)
let dynamicRouteDefinitions = {};

try {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('al_dynamic_routes_v1');
    if (saved) {
      dynamicRouteDefinitions = JSON.parse(saved);
    }
  }
} catch (_) {}

function persistRouteDefinitions() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('al_dynamic_routes_v1', JSON.stringify(dynamicRouteDefinitions));
    }
  } catch (_) {}
}

export function registerRouteDefinition(routeObj) {
  if (!routeObj) return;
  const cleanCode = String(routeObj.code || routeObj.shortName || routeObj.id || '').trim().toUpperCase();
  if (!cleanCode) return;
  const origin = String(routeObj.origin || 'Depot Terminal').trim();
  const destination = String(routeObj.destination || 'City Terminal').trim();
  const fullName = String(routeObj.fullName || routeObj.name || `${origin} ➔ ${destination}`).trim();
  const dist = Number(routeObj.distance) || 25.0;

  dynamicRouteDefinitions[cleanCode] = {
    id: cleanCode,
    code: cleanCode,
    shortName: routeObj.shortName ? String(routeObj.shortName).trim() : cleanCode,
    fullName: fullName,
    name: `${origin} ➔ ${destination} (${cleanCode})`,
    origin: origin,
    destination: destination,
    distance: dist,
    fullDutyKm: routeObj.fullDutyKm || parseFloat((dist * 2).toFixed(1)),
    shift: routeObj.shift || 'General Shift',
    timetables: Array.isArray(routeObj.timetables) ? routeObj.timetables : ['06:30 AM', '08:00 AM', '01:10 PM', '03:00 PM', '06:45 PM'],
    category: routeObj.category || 'Standard',
    requiredCat: routeObj.requiredCat || 'B',
    drainSoc: routeObj.drainSoc || Math.min(95, Math.max(10, Math.round(dist * 0.85))),
    depotId: String(routeObj.depotId || '1'),
    custom: true,
  };
  persistRouteDefinitions();
}

export function getRouteDefinition(code, depotId) {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  if (dynamicRouteDefinitions[clean]) {
    return dynamicRouteDefinitions[clean];
  }
  // Check dynamicDepots routeObjects
  for (const d of dynamicDepots) {
    if (depotId && String(d.id) !== String(depotId)) continue;
    if (Array.isArray(d.routeObjects)) {
      const match = d.routeObjects.find((ro) => String(ro.code || ro.id || ro.shortName || '').toUpperCase().trim() === clean);
      if (match) {
        registerRouteDefinition({ ...match, depotId: String(d.id) });
        return dynamicRouteDefinitions[clean];
      }
    }
  }
  // Check DEFAULT_DEPOTS if any
  for (const d of DEFAULT_DEPOTS) {
    if (depotId && String(d.id) !== String(depotId)) continue;
    if (Array.isArray(d.routeObjects)) {
      const match = d.routeObjects.find((ro) => String(ro.code || ro.id || ro.shortName || '').toUpperCase().trim() === clean);
      if (match) {
        registerRouteDefinition({ ...match, depotId: String(d.id) });
        return dynamicRouteDefinitions[clean];
      }
    }
  }
  return null;
}

export function getAllRouteDefinitions() {
  return dynamicRouteDefinitions;
}

/**
 * Adds a route to a depot's assigned routes list and syncs across devices.
 * Accepts either a route code string (e.g. '356CW') or a full route definition object.
 */
export function addRouteToDepot(depotId, routeData) {
  const cleanId = String(depotId || '').trim();
  const isObj = typeof routeData === 'object' && routeData !== null;
  const rawCode = isObj ? (routeData.code || routeData.shortName || routeData.id) : routeData;
  const cleanRoute = String(rawCode || '').trim().toUpperCase();
  if (!cleanId || !cleanRoute) {
    return { ok: false, error: 'Depot ID and Route code are required.' };
  }

  const routeObjToStore = isObj ? { ...routeData, depotId: cleanId, code: cleanRoute } : {
    id: cleanRoute,
    code: cleanRoute,
    shortName: cleanRoute,
    fullName: `Route ${cleanRoute}`,
    origin: 'Depot Terminal',
    destination: 'City Terminal',
    distance: 25.0,
    depotId: cleanId,
  };

  registerRouteDefinition(routeObjToStore);

  let updatedRoutes = [];
  const dIndex = dynamicDepots.findIndex((d) => String(d.id) === cleanId);
  if (dIndex >= 0) {
    if (!Array.isArray(dynamicDepots[dIndex].routes)) {
      dynamicDepots[dIndex].routes = [];
    }
    if (!dynamicDepots[dIndex].routes.includes(cleanRoute)) {
      dynamicDepots[dIndex].routes = [...dynamicDepots[dIndex].routes, cleanRoute];
    }
    if (!Array.isArray(dynamicDepots[dIndex].routeObjects)) {
      dynamicDepots[dIndex].routeObjects = [];
    }
    const roIdx = dynamicDepots[dIndex].routeObjects.findIndex((ro) => String(ro.code || ro.id || ro.shortName || '').toUpperCase().trim() === cleanRoute);
    if (roIdx >= 0) {
      dynamicDepots[dIndex].routeObjects[roIdx] = routeObjToStore;
    } else {
      dynamicDepots[dIndex].routeObjects.push(routeObjToStore);
    }
    updatedRoutes = dynamicDepots[dIndex].routes;
  } else {
    const defDepot = DEFAULT_DEPOTS.find((d) => String(d.id) === cleanId);
    if (defDepot) {
      if (!Array.isArray(defDepot.routes)) defDepot.routes = [];
      if (!defDepot.routes.includes(cleanRoute)) {
        defDepot.routes = [...defDepot.routes, cleanRoute];
      }
      if (!Array.isArray(defDepot.routeObjects)) {
        defDepot.routeObjects = [];
      }
      const roIdx = defDepot.routeObjects.findIndex((ro) => String(ro.code || ro.id || ro.shortName || '').toUpperCase().trim() === cleanRoute);
      if (roIdx >= 0) {
        defDepot.routeObjects[roIdx] = routeObjToStore;
      } else {
        defDepot.routeObjects.push(routeObjToStore);
      }
      updatedRoutes = defDepot.routes;
    }
  }

  persistLocalDepotState();
  notifyDepotListeners();

  try {
    if (typeof api !== 'undefined' && api && typeof api.saveCustomDepot === 'function') {
      api.saveCustomDepot({
        action: 'sync',
        customDepots: dynamicDepots,
        customAccounts: dynamicAccounts,
        customRouteDefinitions: dynamicRouteDefinitions,
        deletedDepotIds: Array.from(deletedDepotIds),
      }).catch(() => {});
    }
  } catch (_) {}

  return { ok: true, routes: updatedRoutes };
}

/**
 * Removes a route code from a depot's assigned routes list and syncs across devices.
 */
export function removeRouteFromDepot(depotId, routeCode) {
  const cleanId = String(depotId || '').trim();
  const cleanRoute = String(routeCode || '').trim().toUpperCase();
  if (!cleanId || !cleanRoute) {
    return { ok: false, error: 'Depot ID and Route code are required.' };
  }

  if (dynamicRouteDefinitions[cleanRoute]) {
    delete dynamicRouteDefinitions[cleanRoute];
    persistRouteDefinitions();
  }

  let updatedRoutes = [];
  const dIndex = dynamicDepots.findIndex((d) => String(d.id) === cleanId);
  if (dIndex >= 0) {
    if (Array.isArray(dynamicDepots[dIndex].routes)) {
      dynamicDepots[dIndex].routes = dynamicDepots[dIndex].routes.filter((r) => r.toUpperCase() !== cleanRoute);
    }
    if (Array.isArray(dynamicDepots[dIndex].routeObjects)) {
      dynamicDepots[dIndex].routeObjects = dynamicDepots[dIndex].routeObjects.filter(
        (ro) => String(ro.code || ro.id || ro.shortName || '').toUpperCase().trim() !== cleanRoute
      );
    }
    updatedRoutes = dynamicDepots[dIndex].routes;
  } else {
    const defDepot = DEFAULT_DEPOTS.find((d) => String(d.id) === cleanId);
    if (defDepot && Array.isArray(defDepot.routes)) {
      defDepot.routes = defDepot.routes.filter((r) => r.toUpperCase() !== cleanRoute);
      if (Array.isArray(defDepot.routeObjects)) {
        defDepot.routeObjects = defDepot.routeObjects.filter(
          (ro) => String(ro.code || ro.id || ro.shortName || '').toUpperCase().trim() !== cleanRoute
        );
      }
      updatedRoutes = defDepot.routes;
    }
  }

  persistLocalDepotState();
  notifyDepotListeners();

  try {
    if (typeof api !== 'undefined' && api && typeof api.saveCustomDepot === 'function') {
      api.saveCustomDepot({
        action: 'sync',
        customDepots: dynamicDepots,
        customAccounts: dynamicAccounts,
        customRouteDefinitions: dynamicRouteDefinitions,
        deletedDepotIds: Array.from(deletedDepotIds),
        deletedRouteCode: cleanRoute,
      }).catch(() => {});
    }
  } catch (_) {}

  return { ok: true, routes: updatedRoutes };
}

/**
 * Registers a new depot in the system and automatically generates
 * the 4 dedicated operational accounts (Charging, Cleaning, Scheduling, Depot Ops).
 */
export function registerNewDepot({ id, name, location, routes = [], password = 'Test@123' }) {
  const cleanId = String(id || '').trim().replace(/^DEPOT\s*/i, '');
  if (!cleanId) {
    throw new Error('Depot ID or Number is required.');
  }
  const cleanName = String(name || `Depot ${cleanId}`).trim();
  const cleanLocation = String(location || cleanName).trim();
  const cleanRoutes = Array.isArray(routes) ? routes : [];
  const cleanPass = String(password || 'Test@123').trim();

  // If this depot ID was previously tombstoned, remove it from deletedDepotIds
  if (deletedDepotIds.has(cleanId)) {
    deletedDepotIds.delete(cleanId);
  }

  const newDepot = {
    id: cleanId,
    number: cleanId,
    name: cleanName,
    shortName: `Depot ${cleanId}`,
    location: cleanLocation,
    routes: cleanRoutes,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  const existingIdx = dynamicDepots.findIndex((d) => String(d.id) === cleanId);
  if (existingIdx >= 0) {
    dynamicDepots[existingIdx] = newDepot;
  } else {
    dynamicDepots.push(newDepot);
  }

  const idSanitized = cleanId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const idUpper = cleanId.toUpperCase();

  // 1. Charging Operations Account
  const chgKey = `es-depot-${cleanId.toLowerCase()}`;
  const chgAlias = `for_charging_depot_${idSanitized}`;
  const chgAccount = {
    username: `ES-DEPOT-${idUpper}`,
    password: cleanPass,
    role: `Electrical Supervisor (Depot ${cleanId})`,
    name: `Charging Lead - Depot ${cleanId}`,
    depot: cleanId,
    targetScreen: 'CHARGING',
    pageName: `Charging Operations (${cleanName})`,
    email: `es_depot${idSanitized}@ashokleyland.com`,
    operation: 'Charging',
    icon: '⚡',
  };
  dynamicAccounts[chgKey] = chgAccount;
  dynamicAccounts[chgAlias] = chgAccount;

  // 2. Cleaning & Sanitization Account
  const clnKey = `insp-depot-${cleanId.toLowerCase()}-01`;
  const clnAlias = `for_cleaning_depot_${idSanitized}`;
  const clnAccount = {
    username: `INSP-DEPOT-${idUpper}-01`,
    password: cleanPass,
    role: `Sanitization Inspector (Depot ${cleanId})`,
    name: `Inspector - Depot ${cleanId}`,
    depot: cleanId,
    targetScreen: 'CLEANING',
    pageName: `Cleaning & Sanitization (${cleanName})`,
    email: `insp_depot${idSanitized}_01@ashokleyland.com`,
    operation: 'Cleaning',
    icon: '🧹',
  };
  dynamicAccounts[clnKey] = clnAccount;
  dynamicAccounts[clnAlias] = clnAccount;

  // 3. Smart Bus Scheduling Account
  const schKey = `is-depot-${cleanId.toLowerCase()}`;
  const schAlias = `for_scheduling_depot_${idSanitized}`;
  const schAccount = {
    username: `IS-DEPOT-${idUpper}`,
    password: cleanPass,
    role: `Scheduling In-Charge (Depot ${cleanId})`,
    name: `Scheduling Planner - Depot ${cleanId}`,
    depot: cleanId,
    targetScreen: 'SCHEDULING',
    pageName: `Smart Bus Scheduling - ${cleanName}`,
    email: `is_depot${idSanitized}@ashokleyland.com`,
    operation: 'Scheduling',
    icon: '📅',
  };
  dynamicAccounts[schKey] = schAccount;
  dynamicAccounts[schAlias] = schAccount;

  // 4. Depot Operations & Dispatch Account
  const opsKey = `dm-depot-${cleanId.toLowerCase()}`;
  const opsAlias = `for_depot_operations_depot_${idSanitized}`;
  const opsAccount = {
    username: `DM-DEPOT-${idUpper}`,
    password: cleanPass,
    role: `Depot ${cleanId} Manager`,
    name: `Depot ${cleanId} Manager`,
    depot: cleanId,
    targetScreen: 'DEPOT_OPS',
    pageName: `${cleanName} Operations Wing`,
    email: `dm_depot${idSanitized}@ashokleyland.com`,
    operation: 'Depot Operations',
    icon: '🏢',
  };
  dynamicAccounts[opsKey] = opsAccount;
  dynamicAccounts[opsAlias] = opsAccount;

  // Persist state to localStorage
  persistLocalDepotState();
  notifyDepotListeners();

  // Cross-device sync: dispatch addition to server so all devices reflect it
  try {
    if (typeof api !== 'undefined' && api && typeof api.saveCustomDepot === 'function') {
      api.saveCustomDepot({
        action: 'add',
        depot: newDepot,
        accounts: {
          [chgKey]: chgAccount,
          [chgAlias]: chgAccount,
          [clnKey]: clnAccount,
          [clnAlias]: clnAccount,
          [schKey]: schAccount,
          [schAlias]: schAccount,
          [opsKey]: opsAccount,
          [opsAlias]: opsAccount,
        },
        deletedDepotIds: Array.from(deletedDepotIds),
      }).catch((err) => {
        console.warn('[registerNewDepot] Server sync failed (offline or unreachable):', err?.message || err);
      });
    }
  } catch (syncErr) {
    console.warn('[registerNewDepot] Sync dispatch error:', syncErr);
  }

  return {
    ok: true,
    depot: newDepot,
    generatedCredentials: [schAccount, chgAccount, clnAccount, opsAccount],
  };
}

/**
 * Deletes a depot and removes its charging, cleaning, scheduling, and depot operations
 * along with all generated login credentials.
 */
export function deleteDepot(depotId) {
  const cleanId = String(depotId || '').trim().replace(/^DEPOT\s*/i, '');
  deletedDepotIds.add(cleanId);
  dynamicDepots = dynamicDepots.filter((d) => String(d.id) !== cleanId);

  // Remove all dynamic accounts associated with this depot
  Object.keys(dynamicAccounts).forEach((k) => {
    if (dynamicAccounts[k] && String(dynamicAccounts[k].depot) === cleanId) {
      delete dynamicAccounts[k];
    }
  });

  persistLocalDepotState();
  notifyDepotListeners();

  // Cross-device sync: dispatch deletion to server so all devices reflect it
  try {
    if (typeof api !== 'undefined' && api && typeof api.deleteCustomDepot === 'function') {
      api.deleteCustomDepot(cleanId, Array.from(deletedDepotIds)).catch((err) => {
        console.warn('[deleteDepot] Server sync failed (offline or unreachable):', err?.message || err);
      });
    }
  } catch (syncErr) {
    console.warn('[deleteDepot] Sync dispatch error:', syncErr);
  }

  return { ok: true, deletedDepotId: cleanId };
}

/**
 * Returns structured credentials list for ALL depots (Depot 1, Depot 2, and custom depots).
 * Used directly by the Profile part in AdminWorkspaceScreen.
 */
export function getDepotCredentialsList() {
  const all = getAllDepots();
  return all.map((depot) => {
    const id = String(depot.id);
    const idUpper = id.toUpperCase();
    const idLower = id.toLowerCase();

    // Default credentials for Depot 1 & 2
    if (id === '1') {
      return {
        depotId: '1',
        depotName: depot.name,
        location: depot.location,
        isDefault: true,
        routes: depot.routes || [],
        credentials: [
          {
            operation: 'Charging Operations',
            icon: '⚡',
            username: 'ES-DEPOT-1',
            password: 'Test@123',
            role: 'Electrical Supervisor (Depot 1)',
            pageName: 'Charging Operations (Depot 1)',
            targetScreen: 'CHARGING',
            email: 'es_depot1@ashokleyland.com',
          },
          {
            operation: 'Cleaning & Sanitization',
            icon: '🧹',
            username: 'INSP-DEPOT-1-01',
            password: 'Test@123',
            role: 'Sanitization Inspector (Depot 1)',
            pageName: 'Cleaning & Sanitization (Depot 1)',
            targetScreen: 'CLEANING',
            email: 'insp_depot1_01@ashokleyland.com',
          },
          {
            operation: 'Smart Bus Scheduling',
            icon: '📅',
            username: 'IS-DEPOT-1',
            password: 'Test@123',
            role: 'Scheduling In-Charge (Depot 1)',
            pageName: 'Smart Bus Scheduling - Depot 1',
            targetScreen: 'SCHEDULING',
            email: 'is_depot1@ashokleyland.com',
          },
          {
            operation: 'Depot Operations & Dispatch',
            icon: '🏢',
            username: 'DM-DEPOT-1',
            password: 'Test@123',
            role: 'Depot 1 Manager',
            pageName: 'Depot 1 Operations Wing',
            targetScreen: 'DEPOT_OPS',
            email: 'dm_depot1@ashokleyland.com',
          },
        ],
      };
    }

    if (id === '2') {
      return {
        depotId: '2',
        depotName: depot.name,
        location: depot.location,
        isDefault: true,
        routes: depot.routes || [],
        credentials: [
          {
            operation: 'Charging Operations',
            icon: '⚡',
            username: 'ES-DEPOT-2',
            password: 'Test@123',
            role: 'Electrical Supervisor (Depot 2)',
            pageName: 'Charging Operations (Depot 2)',
            targetScreen: 'CHARGING',
            email: 'es_depot2@ashokleyland.com',
          },
          {
            operation: 'Cleaning & Sanitization',
            icon: '🧹',
            username: 'INSP-DEPOT-2-01',
            password: 'Test@123',
            role: 'Sanitization Inspector (Depot 2)',
            pageName: 'Cleaning & Sanitization (Depot 2)',
            targetScreen: 'CLEANING',
            email: 'insp_depot2_01@ashokleyland.com',
          },
          {
            operation: 'Smart Bus Scheduling',
            icon: '📅',
            username: 'IS-DEPOT-2',
            password: 'Test@123',
            role: 'Scheduling In-Charge (Depot 2)',
            pageName: 'Smart Bus Scheduling - Depot 2',
            targetScreen: 'SCHEDULING',
            email: 'is_depot2@ashokleyland.com',
          },
          {
            operation: 'Depot Operations & Dispatch',
            icon: '🏢',
            username: 'DM-DEPOT-2',
            password: 'Test@123',
            role: 'Depot 2 Manager',
            pageName: 'Depot 2 Operations Wing',
            targetScreen: 'DEPOT_OPS',
            email: 'dm_depot2@ashokleyland.com',
          },
        ],
      };
    }

    // Dynamic Depot Credentials
    const chg = dynamicAccounts[`es-depot-${idLower}`] || {
      operation: 'Charging Operations',
      icon: '⚡',
      username: `ES-DEPOT-${idUpper}`,
      password: 'Test@123',
      role: `Electrical Supervisor (Depot ${id})`,
      pageName: `Charging Operations (${depot.name})`,
      targetScreen: 'CHARGING',
      email: `es_depot${idLower}@ashokleyland.com`,
    };
    const cln = dynamicAccounts[`insp-depot-${idLower}-01`] || {
      operation: 'Cleaning & Sanitization',
      icon: '🧹',
      username: `INSP-DEPOT-${idUpper}-01`,
      password: 'Test@123',
      role: `Sanitization Inspector (Depot ${id})`,
      pageName: `Cleaning & Sanitization (${depot.name})`,
      targetScreen: 'CLEANING',
      email: `insp_depot${idLower}_01@ashokleyland.com`,
    };
    const sch = dynamicAccounts[`is-depot-${idLower}`] || {
      operation: 'Smart Bus Scheduling',
      icon: '📅',
      username: `IS-DEPOT-${idUpper}`,
      password: 'Test@123',
      role: `Scheduling In-Charge (Depot ${id})`,
      pageName: `Smart Bus Scheduling - ${depot.name}`,
      targetScreen: 'SCHEDULING',
      email: `is_depot${idLower}@ashokleyland.com`,
    };
    const ops = dynamicAccounts[`dm-depot-${idLower}`] || {
      operation: 'Depot Operations & Dispatch',
      icon: '🏢',
      username: `DM-DEPOT-${idUpper}`,
      password: 'Test@123',
      role: `Depot ${id} Manager`,
      pageName: `${depot.name} Operations Wing`,
      targetScreen: 'DEPOT_OPS',
      email: `dm_depot${idLower}@ashokleyland.com`,
    };

    return {
      depotId: id,
      depotName: depot.name,
      location: depot.location,
      isDefault: false,
      routes: depot.routes || [],
      credentials: [chg, cln, sch, ops],
    };
  });
}

/**
 * Validates credentials against authorized account directory.
 * Matching is case-insensitive for username, exact match for password.
 * Checks both official directory accounts and newly generated depot accounts.
 */
export function authenticateUser(username, password) {
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '');

  if (!cleanUser) {
    return { ok: false, error: 'Please enter your username.' };
  }
  if (!cleanPass) {
    return { ok: false, error: 'Please enter your password.' };
  }

  const lookupKey = cleanUser.toLowerCase();
  const account = dynamicAccounts[lookupKey] || WEBPAGE_ACCOUNTS[lookupKey];

  if (!account || account.password !== cleanPass) {
    return {
      ok: false,
      error: 'Invalid username or password. Please verify your credentials and try again.',
    };
  }

  // If this account is dedicated to a depot that has been deleted, deny access
  if (account.targetScreen !== 'ADMIN_WORKSPACE' && deletedDepotIds.has(String(account.depot))) {
    return {
      ok: false,
      error: 'This depot facility has been deleted and its login credentials have been permanently revoked.',
    };
  }

  return { ok: true, account };
}

// Master credential list for directory modal
export const OFFICIAL_DIRECTORY = [
  {
    category: 'Admin Dashboard',
    username: 'CDM001',
    password: 'Test@123',
    role: 'Central Depot Manager',
    destination: 'Admin Workspace (Full Fleet)',
  },
  {
    category: 'Depot 1 Scheduling',
    username: 'IS-DEPOT-1',
    password: 'Test@123',
    role: 'Scheduling In-Charge',
    destination: 'Smart Bus Scheduling (Depot 1)',
  },
  {
    category: 'Depot 1 Charging',
    username: 'ES-DEPOT-1',
    password: 'Test@123',
    role: 'Electrical Supervisor',
    destination: 'Charging Operations (Depot 1)',
  },
  {
    category: 'Depot 1 Cleaning',
    username: 'INSP-DEPOT-1-01',
    password: 'Test@123',
    role: 'Sanitization Inspector',
    destination: 'Cleaning & Sanitization (Depot 1)',
  },
  {
    category: 'Depot 1 Operations',
    username: 'DM-DEPOT-1',
    password: 'Test@123',
    role: 'Depot 1 Manager',
    destination: 'Depot 1 Operations Wing',
  },
  {
    category: 'Depot 2 Scheduling',
    username: 'IS-DEPOT-2',
    password: 'Test@123',
    role: 'Scheduling In-Charge',
    destination: 'Smart Bus Scheduling (Depot 2)',
  },
  {
    category: 'Depot 2 Charging',
    username: 'ES-DEPOT-2',
    password: 'Test@123',
    role: 'Electrical Supervisor',
    destination: 'Charging Operations (Depot 2)',
  },
  {
    category: 'Depot 2 Cleaning',
    username: 'INSP-DEPOT-2-01',
    password: 'Test@123',
    role: 'Sanitization Inspector',
    destination: 'Cleaning & Sanitization (Depot 2)',
  },
  {
    category: 'Depot 2 Operations',
    username: 'DM-DEPOT-2',
    password: 'Test@123',
    role: 'Depot 2 Manager',
    destination: 'Depot 2 Operations Wing',
  },
];

/**
 * Returns dynamic master directory combining official logins with all newly generated depot logins
 */
export function getOfficialDirectory() {
  const filteredOfficial = OFFICIAL_DIRECTORY.filter((entry) => {
    if (entry.category.startsWith('Depot 1') && deletedDepotIds.has('1')) return false;
    if (entry.category.startsWith('Depot 2') && deletedDepotIds.has('2')) return false;
    return true;
  });

  const customEntries = [];
  dynamicDepots.forEach((d) => {
    const id = d.id;
    if (deletedDepotIds.has(String(id))) return;
    const idUpper = id.toUpperCase();
    customEntries.push(
      {
        category: `Depot ${id} Scheduling`,
        username: `IS-DEPOT-${idUpper}`,
        password: 'Test@123',
        role: `Scheduling In-Charge (Depot ${id})`,
        destination: `Smart Bus Scheduling - ${d.name}`,
      },
      {
        category: `Depot ${id} Charging`,
        username: `ES-DEPOT-${idUpper}`,
        password: 'Test@123',
        role: `Electrical Supervisor (Depot ${id})`,
        destination: `Charging Operations (${d.name})`,
      },
      {
        category: `Depot ${id} Cleaning`,
        username: `INSP-DEPOT-${idUpper}-01`,
        password: 'Test@123',
        role: `Sanitization Inspector (Depot ${id})`,
        destination: `Cleaning & Sanitization (${d.name})`,
      },
      {
        category: `Depot ${id} Operations`,
        username: `DM-DEPOT-${idUpper}`,
        password: 'Test@123',
        role: `Depot ${id} Manager`,
        destination: `${d.name} Operations Wing`,
      }
    );
  });
  return [...filteredOfficial, ...customEntries];
}
