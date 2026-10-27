// API Client for Ashok Leyland Fleet & Depot Tracking Backend

export const DEFAULT_SERVER_URL = typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.includes('file://')
  ? window.location.origin
  : 'https://ashok-leyland-bus-tracking.onrender.com';

let currentServerUrl = DEFAULT_SERVER_URL;

export const setServerUrl = (url) => {
  if (url && typeof url === 'string') {
    currentServerUrl = url.trim().replace(/\/+$/, '');
  }
};

export const getServerUrl = () => currentServerUrl;

/**
 * Helper to make API requests with timeout and error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${currentServerUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      error: err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error'),
    };
  }
}

// ── API Methods ──

export const api = {
  // Check backend server health
  checkHealth: async () => {
    return apiRequest('/api/sync-state');
  },

  // Get live bus state (contains manual SOC, assignments, locks)
  getBusState: async () => {
    return apiRequest('/api/bus-state');
  },

  // Get fleet status distribution per depot (Depot 1 vs Depot 2)
  getFleetDistribution: async () => {
    return apiRequest('/api/fleet-distribution');
  },

  // Get full fleet dataset with categories and metadata
  getFleet: async () => {
    return apiRequest('/api/fleet');
  },

  // Get depot assignments
  getDepotState: async () => {
    return apiRequest('/api/depot-state');
  },

  // Assign or transfer bus to a depot (Depot 1 <-> Depot 2)
  assignDepot: async (bm, depot) => {
    return apiRequest('/api/depot-assign', {
      method: 'POST',
      body: JSON.stringify({
        bm: String(bm).toUpperCase().trim(),
        depot: String(depot).trim(),
      }),
    });
  },

  // Get locked buses (charging/cleaning)
  getLockedBuses: async () => {
    return apiRequest('/api/locked-buses');
  },

  // Complete a route duty atomically
  completeRouteDuty: async ({ bm, depot, remarks = '', route = '', driver = '' }) => {
    return apiRequest('/api/complete-route', {
      method: 'POST',
      body: JSON.stringify({ bm, depot, remarks, route, driver }),
    });
  },

  // Save locked buses (charging/cleaning)
  saveLockedBuses: async (lockedBuses) => {
    return apiRequest('/api/locked-buses', {
      method: 'POST',
      body: JSON.stringify({ lockedBuses }),
    });
  },

  // Unlock an individual bus
  unlockBus: async (bm) => {
    return apiRequest('/api/unlock-bus', {
      method: 'POST',
      body: JSON.stringify({ bm: String(bm).toUpperCase().trim() }),
    });
  },

  // Unlock all locked buses in the fleet
  unlockAllBuses: async () => {
    return apiRequest('/api/unlock-all-buses', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },


  // Get servicing status
  getServicingStatus: async () => {
    return apiRequest('/api/servicing-status');
  },

  // Update Manual SoC for a bus
  updateSoc: async (busId, socValue) => {
    return apiRequest('/api/bus-state', {
      method: 'POST',
      body: JSON.stringify({
        bus: busId,
        soc: Number(socValue),
        manual_soc: Number(socValue),
        confirmedSoc: Number(socValue),
        timestamp: new Date().toISOString(),
      }),
    });
  },

  // Post full charging bus state update
  postChargingBusState: async (data) => {
    return apiRequest('/api/bus-state', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update servicing status (e.g., 'charging', 'cleaning', 'completed', 'available')
  updateServicing: async (busId, status, patch = {}) => {
    return apiRequest('/api/servicing-status', {
      method: 'POST',
      body: JSON.stringify({
        bus: busId,
        bm: String(busId).toUpperCase(),
        status,
        patch,
      }),
    });
  },

  updateServicingStatus: async (bm, patch = {}) => {
    return apiRequest('/api/servicing-status', {
      method: 'POST',
      body: JSON.stringify({
        bm: String(bm).toUpperCase(),
        patch,
      }),
    });
  },

  // Get routes for scheduling
  getRoutes: async () => {
    return apiRequest('/api/routes');
  },

  // Get corridor schedules
  getSchedules: async () => {
    return apiRequest('/api/corridor-schedules');
  },

  // Get bus categories (A, B, C degradation tiers)
  getBusCategories: async () => {
    return apiRequest('/api/bus-categories');
  },

  // Get allocated duties
  getAllocatedDuties: async () => {
    return apiRequest('/api/allocated-duties');
  },

  // Save allocated duties
  saveAllocatedDuties: async (duties) => {
    return apiRequest('/api/allocated-duties', {
      method: 'POST',
      body: JSON.stringify({ duties }),
    });
  },

  // Add a newly inducted bus to the fleet
  addBusToFleet: async (busData) => {
    return apiRequest('/api/fleet/add-bus', {
      method: 'POST',
      body: JSON.stringify(busData),
    });
  },

  // Delete a bus from the available fleet
  deleteBusFromFleet: async (deleteData) => {
    return apiRequest('/api/fleet/delete-bus', {
      method: 'POST',
      body: JSON.stringify(deleteData),
    });
  },

  // Restore a previously deleted bus to the available fleet
  restoreBusToFleet: async (restoreData) => {
    return apiRequest('/api/fleet/restore-bus', {
      method: 'POST',
      body: JSON.stringify(restoreData),
    });
  },

  // Get depot charging verification history
  getChargingHistory: async () => {
    return apiRequest('/api/charging-history');
  },

  // Save depot charging verification history
  saveChargingHistory: async (chargingHistory) => {
    return apiRequest('/api/charging-history', {
      method: 'POST',
      body: JSON.stringify({ chargingHistory }),
    });
  },

  // Get depot cleaning verification history
  getCleaningHistory: async () => {
    return apiRequest('/api/cleaning-history');
  },

  // Save depot cleaning verification history
  saveCleaningHistory: async (cleaningHistory) => {
    return apiRequest('/api/cleaning-history', {
      method: 'POST',
      body: JSON.stringify({ cleaningHistory }),
    });
  },

  // Get completed routes log
  getCompletedRoutes: async () => {
    return apiRequest('/api/completed-routes');
  },

  // Save completed routes log
  saveCompletedRoutes: async (completedRoutesLog) => {
    return apiRequest('/api/completed-routes', {
      method: 'POST',
      body: JSON.stringify({ completedRoutesLog }),
    });
  },
};
