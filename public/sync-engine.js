/**
 * DepotSyncEngine - Real-Time Cross-Device Synchronization Client
 * 
 * Ensures that changes made on ANY device (phone, tablet, laptop, desktop)
 * are instantly reflected across ALL connected devices viewing the website.
 */
(function(window) {
    'use strict';

    const SYNC_STATE_ENDPOINT = '/api/sync-state';
    const EVENTS_ENDPOINT = '/api/events';
    const ALLOCATED_DUTIES_ENDPOINT = '/api/allocated-duties';
    const LOCKED_BUSES_ENDPOINT = '/api/locked-buses';
    const BUS_STATE_ENDPOINT = '/api/bus-state';

    const ALLOCATED_KEY = 'smartbus_allocated_duties';
    const LOCKED_KEY = 'depot_locked_buses';
    const BUS_STATES_KEY = 'depot_bus_states';

    let currentVersion = 0;
    let eventSource = null;
    let pollIntervalTimer = null;
    let isSyncing = false;
    let reconnectDelay = 1000;
    const listeners = {
        'bus-state': new Set(),
        'allocated-duties': new Set(),
        'locked-buses': new Set(),
        'depot-updated': new Set(),
        'sync': new Set()
    };

    function notify(type, data) {
        if (listeners[type]) {
            listeners[type].forEach(fn => {
                try { fn(data); } catch (e) { console.warn('[SyncEngine] listener error:', e); }
            });
        }
        if (listeners['sync'] && type !== 'sync') {
            listeners['sync'].forEach(fn => {
                try { fn({ type, data }); } catch (e) { console.warn('[SyncEngine] sync listener error:', e); }
            });
        }
        window.dispatchEvent(new CustomEvent('depot-sync-event', { detail: { type, data } }));
    }

    // Apply synchronized data to local storage and trigger updates
    function applySyncState(stateData) {
        if (!stateData) return;
        if (stateData.version) currentVersion = stateData.version;

        // 1. Sync allocated duties
        if (Array.isArray(stateData.allocatedDuties)) {
            try {
                localStorage.setItem(ALLOCATED_KEY, JSON.stringify(stateData.allocatedDuties));
            } catch (e) {}
            notify('allocated-duties', stateData.allocatedDuties);
        }

        // 2. Sync locked buses
        if (Array.isArray(stateData.lockedBuses)) {
            try {
                localStorage.setItem(LOCKED_KEY, JSON.stringify(stateData.lockedBuses));
            } catch (e) {}
            notify('locked-buses', stateData.lockedBuses);
        }

        // 3. Sync bus states (SoC, condition, status, driver)
        if (stateData.busState && typeof stateData.busState === 'object') {
            try {
                const existing = JSON.parse(localStorage.getItem(BUS_STATES_KEY) || '{}');
                const merged = Object.assign({}, existing, stateData.busState);
                localStorage.setItem(BUS_STATES_KEY, JSON.stringify(merged));

                // Update individual bus SoC keys for direct lookup compatibility
                Object.keys(stateData.busState).forEach(k => {
                    const item = stateData.busState[k];
                    if (item && item.soc !== undefined && item.soc !== null) {
                        localStorage.setItem('depot_bus_soc_' + k, String(item.soc));
                        localStorage.setItem('depot_bus_soc_' + k.toUpperCase(), String(item.soc));
                    }
                });
            } catch (e) {}
            notify('bus-state', stateData.busState);
        }

        // 4. Sync depot assignments
        if (stateData.depotAssignments && typeof stateData.depotAssignments === 'object') {
            try {
                localStorage.setItem('depot_bus_assignments', JSON.stringify(stateData.depotAssignments));
            } catch (e) {}
            const counts = (typeof stateData.depot1Count === 'number' && typeof stateData.depot2Count === 'number')
                ? { depot1Count: stateData.depot1Count, depot2Count: stateData.depot2Count }
                : getDepotCountsLocal();
            notify('depot-updated', {
                assignments: stateData.depotAssignments,
                depot1Count: counts.depot1Count,
                depot2Count: counts.depot2Count
            });
        }

        notify('sync', stateData);
    }

    // Full fetch from server
    async function fetchFullSync() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const url = currentVersion ? `${SYNC_STATE_ENDPOINT}?v=${currentVersion}` : SYNC_STATE_ENDPOINT;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && data.ok) {
                    if (data.upToDate) {
                        // Current client already has latest version
                    } else {
                        applySyncState(data);
                    }
                }
            }
        } catch (e) {
            console.warn('[SyncEngine] Full sync failed:', e.message);
        } finally {
            isSyncing = false;
        }
    }

    // Setup real-time Server-Sent Events (SSE)
    function initEventSource() {
        if (eventSource) {
            try { eventSource.close(); } catch (e) {}
            eventSource = null;
        }

        if (typeof window.EventSource === 'undefined') {
            console.log('[SyncEngine] EventSource not supported; falling back to periodic polling.');
            startPolling(2500);
            return;
        }

        try {
            eventSource = new EventSource(EVENTS_ENDPOINT);

            eventSource.onopen = () => {
                reconnectDelay = 1000;
                fetchFullSync();
            };

            eventSource.addEventListener('connected', (e) => {
                try {
                    const d = JSON.parse(e.data);
                    if (d && d.version) currentVersion = d.version;
                } catch (err) {}
            });

            eventSource.addEventListener('bus-state-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    if (payload && payload.data) {
                        const { bus, state, allAllocatedDuties, lockedBuses } = payload.data;
                        if (bus && state) {
                            try {
                                const currentStates = JSON.parse(localStorage.getItem(BUS_STATES_KEY) || '{}');
                                currentStates[bus] = Object.assign({}, currentStates[bus] || {}, state);
                                localStorage.setItem(BUS_STATES_KEY, JSON.stringify(currentStates));
                                if (state.soc !== undefined && state.soc !== null) {
                                    localStorage.setItem('depot_bus_soc_' + bus, String(state.soc));
                                    localStorage.setItem('depot_bus_soc_' + bus.toUpperCase(), String(state.soc));
                                }
                            } catch (err) {}
                            notify('bus-state', { bus, state });
                        }
                        if (Array.isArray(allAllocatedDuties)) {
                            localStorage.setItem(ALLOCATED_KEY, JSON.stringify(allAllocatedDuties));
                            notify('allocated-duties', allAllocatedDuties);
                        }
                        if (Array.isArray(lockedBuses)) {
                            localStorage.setItem(LOCKED_KEY, JSON.stringify(lockedBuses));
                            notify('locked-buses', lockedBuses);
                        }
                    }
                } catch (err) {
                    fetchFullSync();
                }
            });

            eventSource.addEventListener('allocated-duties-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    const duties = payload && payload.data && payload.data.duties;
                    if (Array.isArray(duties)) {
                        localStorage.setItem(ALLOCATED_KEY, JSON.stringify(duties));
                        notify('allocated-duties', duties);
                    } else {
                        fetchFullSync();
                    }
                } catch (err) {
                    fetchFullSync();
                }
            });

            eventSource.addEventListener('locked-buses-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    const locked = payload && payload.data && payload.data.lockedBuses;
                    if (Array.isArray(locked)) {
                        localStorage.setItem(LOCKED_KEY, JSON.stringify(locked));
                        notify('locked-buses', locked);
                    } else {
                        fetchFullSync();
                    }
                } catch (err) {
                    fetchFullSync();
                }
            });

            eventSource.addEventListener('depot-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    const d = payload && payload.data;
                    if (d && d.assignments) {
                        try { localStorage.setItem('depot_bus_assignments', JSON.stringify(d.assignments)); } catch(e){}
                        notify('depot-updated', d);
                    } else {
                        fetchFullSync();
                    }
                } catch (err) {
                    fetchFullSync();
                }
            });

            eventSource.addEventListener('sync-all', () => {
                fetchFullSync();
            });

            eventSource.onerror = () => {
                try { eventSource.close(); } catch (err) {}
                eventSource = null;
                setTimeout(initEventSource, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
            };
        } catch (e) {
            console.warn('[SyncEngine] Error creating EventSource:', e);
            startPolling(2500);
        }
    }

    // Fail-safe periodic polling
    function startPolling(intervalMs = 3000) {
        if (pollIntervalTimer) clearInterval(pollIntervalTimer);
        pollIntervalTimer = setInterval(() => {
            fetchFullSync();
        }, intervalMs);
    }

    // Trigger instant sync when window is focused or becomes visible (e.g., unlocking phone, switching tabs)
    window.addEventListener('focus', () => fetchFullSync());
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) fetchFullSync();
    });

    // Helper functions for any client to push mutations to the server:
    async function pushAllocatedDuties(duties) {
        try {
            localStorage.setItem(ALLOCATED_KEY, JSON.stringify(duties));
        } catch (e) {}
        notify('allocated-duties', duties);
        try {
            const res = await fetch(ALLOCATED_DUTIES_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duties })
            });
            return res.ok;
        } catch (e) {
            console.warn('[SyncEngine] pushAllocatedDuties failed:', e);
            return false;
        }
    }

    async function pushLockedBuses(lockedBuses) {
        try {
            localStorage.setItem(LOCKED_KEY, JSON.stringify(lockedBuses));
        } catch (e) {}
        notify('locked-buses', lockedBuses);
        try {
            const res = await fetch(LOCKED_BUSES_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lockedBuses })
            });
            return res.ok;
        } catch (e) {
            console.warn('[SyncEngine] pushLockedBuses failed:', e);
            return false;
        }
    }

    async function pushBusState(busId, updates) {
        const payload = Object.assign({ unique_id: busId, bus: busId }, updates);
        try {
            const res = await fetch(BUS_STATE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.state) {
                    notify('bus-state', { bus: busId, state: data.state });
                }
                return true;
            }
        } catch (e) {
            console.warn('[SyncEngine] pushBusState failed:', e);
        }
        return false;
    }

    async function pushDepotAssignment(bm, depot) {
        const cleanBm = String(bm || '').toUpperCase().trim();
        const targetDepot = String(depot || '1').trim();
        try {
            const local = JSON.parse(localStorage.getItem('depot_bus_assignments') || '{}');
            local[cleanBm] = targetDepot;
            localStorage.setItem('depot_bus_assignments', JSON.stringify(local));
            const counts = getDepotCountsLocal();
            notify('depot-updated', { assignments: local, depot1Count: counts.depot1Count, depot2Count: counts.depot2Count });
        } catch (e) {}

        try {
            const res = await fetch('/api/depot-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bm: cleanBm, depot: targetDepot })
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.assignments) {
                    try { localStorage.setItem('depot_bus_assignments', JSON.stringify(data.assignments)); } catch(e){}
                    notify('depot-updated', data);
                }
                return data;
            }
        } catch (e) {
            console.warn('[SyncEngine] pushDepotAssignment failed:', e);
        }
        return null;
    }

    function getDepotForBus(bm) {
        const clean = String(bm || '').toUpperCase().trim();
        try {
            const map = JSON.parse(localStorage.getItem('depot_bus_assignments') || '{}');
            if (map[clean]) return String(map[clean]);
        } catch (e) {}
        return null;
    }

    function getDepotCountsLocal() {
        let d1 = 0, d2 = 0;
        try {
            const map = JSON.parse(localStorage.getItem('depot_bus_assignments') || '{}');
            const keys = Object.keys(map);
            if (keys.length >= 100) {
                for (const k of keys) {
                    if (String(map[k]) === '2') d2++;
                    else d1++;
                }
                return { depot1Count: d1, depot2Count: d2, total: d1 + d2 };
            }
        } catch (e) {}
        return { depot1Count: 61, depot2Count: 61, total: 122 };
    }

    // Initialize immediately on load
    initEventSource();
    startPolling(3000); // watchdog poll every 3s
    fetchFullSync();

    window.DepotSyncEngine = {
        on: (type, fn) => {
            if (listeners[type]) listeners[type].add(fn);
            return () => { if (listeners[type]) listeners[type].delete(fn); };
        },
        syncNow: fetchFullSync,
        saveAllocatedDuties: pushAllocatedDuties,
        saveLockedBuses: pushLockedBuses,
        saveBusState: pushBusState,
        saveDepotAssignment: pushDepotAssignment,
        getDepotForBus: getDepotForBus,
        getDepotCounts: getDepotCountsLocal,
        getVersion: () => currentVersion
    };
})(window);
