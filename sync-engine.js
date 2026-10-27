
    function mergeHistoryLists(serverList, localList) {
        if (!Array.isArray(serverList)) return Array.isArray(localList) ? localList : [];
        if (!Array.isArray(localList)) return serverList;
        const map = new Map();
        serverList.forEach(item => {
            if (!item) return;
            const key = String(item.id || (item.bm + '_' + (item.unlockTime || item.completedAt || item.startTime || item.completedTs || '')));
            map.set(key, item);
        });
        const extraLocal = [];
        localList.forEach(item => {
            if (!item) return;
            const key = String(item.id || (item.bm + '_' + (item.unlockTime || item.completedAt || item.startTime || item.completedTs || '')));
            if (!map.has(key)) {
                map.set(key, item);
                extraLocal.push(item);
            }
        });
        return [...extraLocal, ...serverList];
    }
/**
 * DepotSyncEngine - Real-Time Cross-Device Synchronization Client
 * 
 * Ensures that changes made on ANY device (phone, tablet, laptop, desktop)
 * are instantly reflected across ALL connected devices viewing the website.
 */
(function(window) {
    'use strict';

    const API_BASE = (typeof window !== 'undefined' && (window.location.protocol === 'file:' || !window.location.host))
        ? 'https://ashok-leyland-bus-tracking.onrender.com'
        : '';
    const SYNC_STATE_ENDPOINT = API_BASE + '/api/sync-state';
    const EVENTS_ENDPOINT = API_BASE + '/api/events';
    const ALLOCATED_DUTIES_ENDPOINT = API_BASE + '/api/allocated-duties';
    const LOCKED_BUSES_ENDPOINT = API_BASE + '/api/locked-buses';
    const BUS_STATE_ENDPOINT = API_BASE + '/api/bus-state';
    const SERVICING_STATUS_ENDPOINT = API_BASE + '/api/servicing-status';

    const ALLOCATED_KEY = 'smartbus_allocated_duties';
    const LOCKED_KEY = 'depot_locked_buses';
    const BUS_STATES_KEY = 'depot_bus_states';
    const ADDED_BUSES_KEY = 'depot_added_buses';
    const DELETED_BUSES_KEY = 'depot_deleted_buses';
    const SERVICING_STATUS_KEY = 'smartbus_servicing_status';
    const CHARGING_HISTORY_KEY = 'depot_charging_history';
    const CLEANING_HISTORY_KEY = 'depot_cleaning_history';
    const COMPLETED_LOG_KEY = 'depot_route_completed_log';

    let currentVersion = 0;
    let eventSource = null;
    let pollIntervalTimer = null;
    let isSyncing = false;
    let reconnectDelay = 1000;
    let serverDepotCounts = null;
    const listeners = {
        'bus-state': new Set(),
        'allocated-duties': new Set(),
        'locked-buses': new Set(),
        'depot-updated': new Set(),
        'fleet-updated': new Set(),
        'servicing-status': new Set(),
        'charging-history': new Set(),
        'cleaning-history': new Set(),
        'completed-routes': new Set(),
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
            if (typeof stateData.depot1Count === 'number' && typeof stateData.depot2Count === 'number') {
                serverDepotCounts = {
                    depot1Count: stateData.depot1Count,
                    depot2Count: stateData.depot2Count,
                    total: typeof stateData.total === 'number' ? stateData.total : (stateData.depot1Count + stateData.depot2Count)
                };
            }
            const counts = serverDepotCounts || getDepotCountsLocal();
            notify('depot-updated', {
                assignments: stateData.depotAssignments,
                depot1Count: counts.depot1Count,
                depot2Count: counts.depot2Count,
                total: counts.total || (counts.depot1Count + counts.depot2Count)
            });
        }
        // 5. Sync added buses (newly inducted fleet)
        if (stateData.addedBuses && typeof stateData.addedBuses === 'object') {
            try {
                localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(stateData.addedBuses));
            } catch (e) {}
            notify('fleet-updated', { type: 'added-sync', buses: stateData.addedBuses });
        }

        // 6. Sync deleted buses (withdrawn from available fleet)
        if (stateData.deletedBuses && typeof stateData.deletedBuses === 'object') {
            try {
                localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(stateData.deletedBuses));
            } catch (e) {}
            notify('fleet-updated', { type: 'deleted-sync', buses: stateData.deletedBuses });
        }

        // 7. Sync servicing status (post-route charging & cleaning requirements)
        if (stateData.servicingStatus && typeof stateData.servicingStatus === 'object') {
            try {
                localStorage.setItem(SERVICING_STATUS_KEY, JSON.stringify(stateData.servicingStatus));
            } catch (e) {}
            notify('servicing-status', stateData.servicingStatus);
        }

        // 8. Sync charging history (merge to prevent vanishing recent records)
        if (Array.isArray(stateData.chargingHistory)) {
            try {
                const local = getChargingHistoryLocal();
                const merged = mergeHistoryLists(stateData.chargingHistory, local);
                localStorage.setItem(CHARGING_HISTORY_KEY, JSON.stringify(merged));
                notify('charging-history', merged);
            } catch (e) {}
        }

        // 9. Sync cleaning history (merge to prevent vanishing recent records)
        if (Array.isArray(stateData.cleaningHistory)) {
            try {
                const local = getCleaningHistoryLocal();
                const merged = mergeHistoryLists(stateData.cleaningHistory, local);
                localStorage.setItem(CLEANING_HISTORY_KEY, JSON.stringify(merged));
                notify('cleaning-history', merged);
            } catch (e) {}
        }

        // 10. Sync completed routes log (merge to prevent vanishing recent records)
        if (Array.isArray(stateData.completedRoutesLog)) {
            try {
                const local = getCompletedRoutesLocal();
                const merged = mergeHistoryLists(stateData.completedRoutesLog, local);
                localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(merged));
                notify('completed-routes', merged);
            } catch (e) {}
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

            eventSource.addEventListener('charging-history-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    const history = payload?.data?.chargingHistory || payload?.chargingHistory;
                    if (Array.isArray(history)) {
                        localStorage.setItem(CHARGING_HISTORY_KEY, JSON.stringify(history));
                        notify('charging-history', history);
                    } else {
                        fetchFullSync();
                    }
                } catch (err) { fetchFullSync(); }
            });

            eventSource.addEventListener('cleaning-history-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    const history = payload?.data?.cleaningHistory || payload?.cleaningHistory;
                    if (Array.isArray(history)) {
                        localStorage.setItem(CLEANING_HISTORY_KEY, JSON.stringify(history));
                        notify('cleaning-history', history);
                    } else {
                        fetchFullSync();
                    }
                } catch (err) { fetchFullSync(); }
            });

            eventSource.addEventListener('completed-routes-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    const log = payload?.data?.completedRoutesLog || payload?.completedRoutesLog;
                    if (Array.isArray(log)) {
                        localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(log));
                        notify('completed-routes', log);
                    } else {
                        fetchFullSync();
                    }
                } catch (err) { fetchFullSync(); }
            });

            eventSource.addEventListener('servicing-status-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    const servicing = payload && payload.data && payload.data.servicingStatus;
                    if (servicing && typeof servicing === 'object') {
                        localStorage.setItem(SERVICING_STATUS_KEY, JSON.stringify(servicing));
                        notify('servicing-status', servicing);
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

            eventSource.addEventListener('fleet-bus-added', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    if (payload && payload.data) {
                        const { bm, addedInfo, addedBuses, deletedBuses } = payload.data;
                        if (addedBuses) localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(addedBuses));
                        if (deletedBuses) localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(deletedBuses));
                        notify('fleet-updated', { type: 'add', bm, data: addedInfo });
                    }
                } catch (err) {
                    fetchFullSync();
                }
            });

            eventSource.addEventListener('fleet-bus-deleted', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    if (payload && payload.data) {
                        const { bm, deletedInfo, addedBuses, deletedBuses } = payload.data;
                        if (addedBuses) localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(addedBuses));
                        if (deletedBuses) localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(deletedBuses));
                        notify('fleet-updated', { type: 'delete', bm, data: deletedInfo });
                    }
                } catch (err) {
                    fetchFullSync();
                }
            });

            eventSource.addEventListener('fleet-updated', (e) => {
                try {
                    const payload = JSON.parse(e.data);
                    if (payload && payload.version) currentVersion = payload.version;
                    if (payload && payload.data) {
                        const { addedBuses, deletedBuses } = payload.data;
                        if (addedBuses) localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(addedBuses));
                        if (deletedBuses) localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(deletedBuses));
                        notify('fleet-updated', payload.data);
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

    function isCanonicalBm(key) {
        if (!key || typeof key !== 'string') return false;
        const clean = key.trim().toUpperCase();
        return /^BM\d+$/i.test(clean);
    }

    const DEFAULT_FLEET_BMS = ["BM001","BM002","BM003","BM004","BM005","BM010","BM012","BM019","BM020","BM024","BM032","BM033","BM038","BM052","BM054","BM056","BM057","BM058","BM062","BM068","BM075","BM080","BM081","BM082","BM086","BM088","BM107","BM116","BM119","BM124","BM151","BM152","BM153","BM157","BM174","BM183","BM185","BM187","BM191","BM193","BM197","BM198","BM199","BM200","BM201","BM202","BM203","BM204","BM205","BM206","BM207","BM208","BM209","BM210","BM212","BM213","BM214","BM215","BM216","BM217","BM218","BM219","BM220","BM221","BM222","BM223","BM224","BM225","BM227","BM238","BM239","BM240","BM245","BM248","BM249","BM250","BM253","BM255","BM256","BM257","BM258","BM259","BM260","BM261","BM263","BM264","BM265","BM267","BM268","BM269","BM271","BM272","BM273","BM274","BM275","BM276","BM277","BM278","BM279","BM280","BM281","BM282","BM283","BM284","BM285","BM286","BM287","BM288","BM289","BM290","BM291","BM292","BM293","BM294","BM295","BM296","BM297","BM298","BM299","BM300","BM303","BM304"];

    const DEFAULT_DEPOT_MAP = {"BM001":"1","BM002":"1","BM003":"1","BM004":"1","BM005":"1","BM010":"1","BM012":"1","BM019":"1","BM020":"1","BM024":"1","BM032":"1","BM033":"1","BM038":"1","BM052":"2","BM054":"1","BM056":"1","BM057":"1","BM058":"1","BM062":"1","BM068":"1","BM075":"1","BM080":"1","BM081":"1","BM082":"1","BM086":"1","BM088":"1","BM107":"1","BM116":"1","BM119":"1","BM124":"1","BM151":"1","BM152":"1","BM153":"1","BM157":"1","BM174":"1","BM183":"1","BM185":"1","BM187":"1","BM191":"1","BM193":"1","BM197":"1","BM198":"1","BM199":"1","BM200":"1","BM201":"1","BM202":"1","BM203":"1","BM204":"1","BM205":"1","BM206":"1","BM207":"1","BM208":"1","BM209":"1","BM210":"1","BM212":"1","BM213":"1","BM214":"1","BM215":"1","BM216":"1","BM217":"1","BM218":"1","BM219":"2","BM220":"2","BM221":"2","BM222":"2","BM223":"2","BM224":"2","BM225":"2","BM227":"2","BM238":"2","BM239":"2","BM240":"2","BM245":"2","BM248":"2","BM249":"2","BM250":"2","BM253":"2","BM255":"2","BM256":"2","BM257":"2","BM258":"2","BM259":"2","BM260":"2","BM261":"2","BM263":"2","BM264":"2","BM265":"2","BM267":"2","BM268":"2","BM269":"2","BM271":"2","BM272":"2","BM273":"2","BM274":"2","BM275":"2","BM276":"2","BM277":"2","BM278":"2","BM279":"1","BM280":"2","BM281":"2","BM282":"2","BM283":"2","BM284":"2","BM285":"2","BM286":"2","BM287":"2","BM288":"2","BM289":"2","BM290":"2","BM291":"2","BM292":"2","BM293":"2","BM294":"2","BM295":"2","BM296":"2","BM297":"2","BM298":"2","BM299":"2","BM300":"2","BM303":"1","BM304":"2"};

    async function pushDepotAssignment(bm, depot) {
        const cleanBm = String(bm || '').toUpperCase().trim();
        const targetDepot = String(depot || '1').trim();
        try {
            let local = JSON.parse(localStorage.getItem('depot_bus_assignments') || '{}');
            if (Object.keys(local).length < DEFAULT_FLEET_BMS.length) {
                const fullMap = {};
                DEFAULT_FLEET_BMS.forEach((b) => {
                    fullMap[b] = local[b] || DEFAULT_DEPOT_MAP[b] || '1';
                });
                local = fullMap;
            }
            local[cleanBm] = targetDepot;
            localStorage.setItem('depot_bus_assignments', JSON.stringify(local));
            const counts = getDepotCountsLocal();
            notify('depot-updated', { assignments: local, depot1Count: counts.depot1Count, depot2Count: counts.depot2Count });
        } catch (e) {}

        try {
            const res = await fetch(API_BASE + '/api/depot-assign', {
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
        if (DEFAULT_DEPOT_MAP[clean]) return DEFAULT_DEPOT_MAP[clean];
        return '1';
    }

    function getDepotCountsLocal() {
        let d1 = 0, d2 = 0;
        let map = {};
        try {
            map = JSON.parse(localStorage.getItem('depot_bus_assignments') || '{}');
        } catch (e) {}

        const deleted = getDeletedBusesLocal();
        const added = getAddedBusesLocal();
        const allBms = Array.from(new Set([...DEFAULT_FLEET_BMS, ...Object.keys(map), ...Object.keys(added)]));

        allBms.forEach((bm) => {
            const clean = String(bm).toUpperCase().trim();
            // Strictly exclude route IDs, schedule aliases, or non-BM entries
            if (!isCanonicalBm(clean)) return;
            if (deleted[clean] || isDeletedBus(clean)) return;
            const assigned = map[clean] || (added[clean] ? added[clean].depot : null) || DEFAULT_DEPOT_MAP[clean] || '1';
            if (String(assigned) === '2') d2++;
            else d1++;
        });

        return { depot1Count: d1, depot2Count: d2, total: d1 + d2 };
    }

    function getDepotCounts() {
        if (serverDepotCounts && typeof serverDepotCounts.depot1Count === 'number' && typeof serverDepotCounts.depot2Count === 'number') {
            return Object.assign({}, serverDepotCounts);
        }
        return getDepotCountsLocal();
    }

    // ── Fleet Bus Management Helper Functions ──
    function getAddedBusesLocal() {
        try {
            return JSON.parse(localStorage.getItem(ADDED_BUSES_KEY) || '{}');
        } catch(e) { return {}; }
    }

    function getDeletedBusesLocal() {
        try {
            return JSON.parse(localStorage.getItem(DELETED_BUSES_KEY) || '{}');
        } catch(e) { return {}; }
    }

    const NEWLY_ADDED_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month)

    function isNewlyAddedBus(bm) {
        if (!bm) return false;
        const clean = String(bm).toUpperCase().trim();
        const added = getAddedBusesLocal();
        const entry = added[clean];
        if (entry) {
            const addedTime = entry.addedAt ? new Date(entry.addedAt).getTime() : (entry.timestamp ? Number(entry.timestamp) : null);
            if (addedTime && !isNaN(addedTime)) {
                return (Date.now() - addedTime) < NEWLY_ADDED_MAX_AGE_MS;
            }
            return true;
        }
        try {
            const states = JSON.parse(localStorage.getItem(BUS_STATES_KEY) || '{}');
            if (states[clean] && states[clean].isNewlyAdded) {
                const addedTime = states[clean].addedAt ? new Date(states[clean].addedAt).getTime() : (states[clean].timestamp ? Number(states[clean].timestamp) : null);
                if (addedTime && !isNaN(addedTime)) {
                    return (Date.now() - addedTime) < NEWLY_ADDED_MAX_AGE_MS;
                }
                return true;
            }
        } catch(e) {}
        return false;
    }

    function getNewlyAddedInfo(bm) {
        if (!bm) return null;
        const clean = String(bm).toUpperCase().trim();
        const added = getAddedBusesLocal();
        if (added[clean]) return added[clean];
        try {
            const states = JSON.parse(localStorage.getItem(BUS_STATES_KEY) || '{}');
            if (states[clean] && states[clean].isNewlyAdded) {
                return {
                    bm: clean,
                    regNo: states[clean].regNo || '',
                    reason: states[clean].additionReason || 'Newly added to fleet',
                    addedAt: states[clean].addedAt || ''
                };
            }
        } catch(e) {}
        return null;
    }

    function isDeletedBus(bm) {
        if (!bm) return false;
        const clean = String(bm).toUpperCase().trim();
        const deleted = getDeletedBusesLocal();
        if (deleted[clean]) return true;
        try {
            const states = JSON.parse(localStorage.getItem(BUS_STATES_KEY) || '{}');
            if (states[clean] && (states[clean].status === 'Deleted' || states[clean].deleted === true)) return true;
        } catch(e) {}
        return false;
    }

    function getDeletedInfo(bm) {
        if (!bm) return null;
        const clean = String(bm).toUpperCase().trim();
        const deleted = getDeletedBusesLocal();
        if (deleted[clean]) {
            const item = deleted[clean];
            return Object.assign({
                bm: clean,
                busNumber: clean,
                regNo: item.regNo || item.regNumber || '',
                regNumber: item.regNo || item.regNumber || '',
                model: item.model || 'ELECTRIC BUS AC EiV12',
                make: item.make || 'Ashok Leyland',
                reason: item.reason || item.deletionReason || 'Removed from fleet',
                deletedAt: item.deletedAt || ''
            }, item);
        }
        try {
            const states = JSON.parse(localStorage.getItem(BUS_STATES_KEY) || '{}');
            if (states[clean] && (states[clean].status === 'Deleted' || states[clean].deleted === true)) {
                return {
                    bm: clean,
                    busNumber: clean,
                    regNo: states[clean].regNo || states[clean].regNumber || '',
                    regNumber: states[clean].regNo || states[clean].regNumber || '',
                    model: states[clean].model || 'ELECTRIC BUS AC EiV12',
                    make: states[clean].make || 'Ashok Leyland',
                    reason: states[clean].deletionReason || 'Removed from fleet',
                    deletedAt: states[clean].deletedAt || ''
                };
            }
        } catch(e) {}
        return null;
    }

    async function addFleetBusApi(data) {
        try {
            const bm = String(data.bm || data.busNumber || data.bmNumber || '').toUpperCase().trim();
            const regNo = String(data.regNo || data.regNumber || data.registrationNo || '').toUpperCase().trim();
            const payload = Object.assign({}, data, {
                bm,
                busNumber: bm,
                regNo,
                regNumber: regNo,
                model: data.model || 'ELECTRIC BUS AC EiV12',
                make: data.make || 'Ashok Leyland'
            });
            const res = await fetch(API_BASE + '/api/fleet/add-bus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result && result.ok) {
                const busData = Object.assign({}, payload, result.bus || {});
                busData.bm = busData.bm || bm;
                busData.busNumber = busData.busNumber || bm;
                busData.regNo = busData.regNo || regNo;
                busData.regNumber = busData.regNumber || regNo;
                busData.model = busData.model || 'ELECTRIC BUS AC EiV12';
                busData.make = busData.make || 'Ashok Leyland';
                const added = getAddedBusesLocal();
                added[bm] = busData;
                localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(added));
                const deleted = getDeletedBusesLocal();
                delete deleted[bm];
                localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(deleted));

                const counts = getDepotCountsLocal();
                serverDepotCounts = counts;

                try {
                    const bc = new BroadcastChannel('depot_operations_sync');
                    bc.postMessage({ type: 'FLEET_BUS_ADDED', bm, data: busData, counts });
                } catch(e) {}

                notify('fleet-updated', { type: 'add', bm, data: busData });
                notify('depot-updated', {
                    depot1Count: counts.depot1Count,
                    depot2Count: counts.depot2Count,
                    total: counts.total
                });
                return result;
            } else {
                throw new Error(result.error || 'Failed to add bus');
            }
        } catch(e) {
            console.error('[SyncEngine] addFleetBusApi error:', e);
            throw e;
        }
    }

    async function deleteFleetBusApi(data) {
        try {
            const bm = String(data.bm || data.busNumber || data.bmNumber || '').toUpperCase().trim();
            const regNo = String(data.regNo || data.regNumber || data.registrationNo || '').toUpperCase().trim();
            const payload = Object.assign({}, data, {
                bm,
                busNumber: bm,
                regNo,
                regNumber: regNo,
                model: data.model || 'ELECTRIC BUS AC EiV12',
                make: data.make || 'Ashok Leyland'
            });
            const res = await fetch(API_BASE + '/api/fleet/delete-bus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result && result.ok) {
                const busData = Object.assign({}, payload, result.bus || {});
                busData.bm = busData.bm || bm;
                busData.busNumber = busData.busNumber || bm;
                busData.regNo = busData.regNo || regNo;
                busData.regNumber = busData.regNumber || regNo;
                busData.model = busData.model || 'ELECTRIC BUS AC EiV12';
                busData.make = busData.make || 'Ashok Leyland';
                const deleted = getDeletedBusesLocal();
                deleted[bm] = busData;
                localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(deleted));
                const added = getAddedBusesLocal();
                delete added[bm];
                localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(added));

                const counts = getDepotCountsLocal();
                serverDepotCounts = counts;

                try {
                    const bc = new BroadcastChannel('depot_operations_sync');
                    bc.postMessage({ type: 'FLEET_BUS_DELETED', bm, data: busData, counts });
                } catch(e) {}

                notify('fleet-updated', { type: 'delete', bm, data: busData });
                notify('depot-updated', {
                    depot1Count: counts.depot1Count,
                    depot2Count: counts.depot2Count,
                    total: counts.total
                });
                return result;
            } else {
                throw new Error(result.error || 'Failed to delete bus');
            }
        } catch(e) {
            console.error('[SyncEngine] deleteFleetBusApi error:', e);
            throw e;
        }
    }

    // Servicing Status Helpers (Charging & Cleaning requirement after route completion)
    function getServicingStatusLocal() {
        try {
            return JSON.parse(localStorage.getItem(SERVICING_STATUS_KEY) || '{}');
        } catch(e) {
            return {};
        }
    }

    function getBusServicingLocal(bm) {
        if (!bm) return null;
        const clean = String(bm).toUpperCase().trim();
        const map = getServicingStatusLocal();
        return map[clean] || null;
    }

    async function pushServicingStatus(statusMap) {
        try {
            localStorage.setItem(SERVICING_STATUS_KEY, JSON.stringify(statusMap));
        } catch(e) {}
        notify('servicing-status', statusMap);
        try {
            await fetch(SERVICING_STATUS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ servicingStatus: statusMap })
            });
        } catch(e) {
            console.warn('[SyncEngine] pushServicingStatus error:', e);
        }
    }

    async function updateBusServicingApi(bm, patch) {
        if (!bm) return;
        const clean = String(bm).toUpperCase().trim();
        const current = getServicingStatusLocal();
        current[clean] = Object.assign({}, current[clean] || {}, patch, { bm: clean });
        try {
            localStorage.setItem(SERVICING_STATUS_KEY, JSON.stringify(current));
        } catch(e) {}
        notify('servicing-status', current);

        try {
            const bc = new BroadcastChannel('depot_operations_sync');
            bc.postMessage({ type: 'SERVICING_STATUS_UPDATED', bm: clean, status: current[clean] });
        } catch(e) {}

        try {
            await fetch(SERVICING_STATUS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bm: clean, patch })
            });
        } catch(e) {
            console.warn('[SyncEngine] updateBusServicingApi error:', e);
        }
        return current[clean];
    }

    async function clearBusServicingApi(bm) {
        if (!bm) return;
        const clean = String(bm).toUpperCase().trim();
        const current = getServicingStatusLocal();
        delete current[clean];
        try {
            localStorage.setItem(SERVICING_STATUS_KEY, JSON.stringify(current));
        } catch(e) {}
        notify('servicing-status', current);

        try {
            const bc = new BroadcastChannel('depot_operations_sync');
            bc.postMessage({ type: 'SERVICING_STATUS_UPDATED', bm: clean, clear: true });
        } catch(e) {}

        try {
            await fetch(SERVICING_STATUS_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bm: clean, clear: true })
            });
        } catch(e) {
            console.warn('[SyncEngine] clearBusServicingApi error:', e);
        }
    }

    async function restoreFleetBusApi(data) {
        try {
            const rawBm = (typeof data === 'string') ? data : (data && (data.bm || data.busNumber || data.bmNumber || ''));
            const bm = String(rawBm).toUpperCase().trim();
            const payload = (typeof data === 'object' && data !== null) ? Object.assign({ bm, busNumber: bm }, data) : { bm, busNumber: bm };
            const res = await fetch(API_BASE + '/api/fleet/restore-bus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result && result.ok) {
                const busData = Object.assign({}, payload, result.bus || {});
                const busBm = String(busData.bm || busData.busNumber || bm).toUpperCase().trim();
                const deleted = getDeletedBusesLocal();
                delete deleted[busBm];
                localStorage.setItem(DELETED_BUSES_KEY, JSON.stringify(deleted));
                const added = getAddedBusesLocal();
                added[busBm] = busData;
                localStorage.setItem(ADDED_BUSES_KEY, JSON.stringify(added));

                const counts = getDepotCountsLocal();
                serverDepotCounts = counts;
                try {
                    const bc = new BroadcastChannel('depot_operations_sync');
                    bc.postMessage({ type: 'FLEET_BUS_ADDED', bm: busBm, data: busData, counts });
                } catch(e) {}

                notify('fleet-updated', { type: 'restore', bm: busBm, data: busData });
                notify('depot-updated', {
                    depot1Count: counts.depot1Count,
                    depot2Count: counts.depot2Count,
                    total: counts.total
                });
                return result;
            } else {
                throw new Error(result.error || 'Failed to restore bus');
            }
        } catch(e) {
            console.error('[SyncEngine] restoreFleetBusApi error:', e);
            throw e;
        }
    }


    function getChargingHistoryLocal() {
        try {
            const raw = localStorage.getItem(CHARGING_HISTORY_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    async function pushChargingHistory(data) {
        let list = Array.isArray(data) ? data : [data, ...getChargingHistoryLocal()];
        try { localStorage.setItem(CHARGING_HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
        notify('charging-history', list);
        try {
            await fetch(API_BASE + '/api/charging-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chargingHistory: list })
            });
        } catch (e) {
            console.warn('[SyncEngine] pushChargingHistory error:', e);
        }
    }

    function getCleaningHistoryLocal() {
        try {
            const raw = localStorage.getItem(CLEANING_HISTORY_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    async function pushCleaningHistory(data) {
        let list = Array.isArray(data) ? data : [data, ...getCleaningHistoryLocal()];
        try { localStorage.setItem(CLEANING_HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
        notify('cleaning-history', list);
        try {
            await fetch(API_BASE + '/api/cleaning-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cleaningHistory: list })
            });
        } catch (e) {
            console.warn('[SyncEngine] pushCleaningHistory error:', e);
        }
    }

    function getCompletedRoutesLocal() {
        try {
            const raw = localStorage.getItem(COMPLETED_LOG_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }

    async function pushCompletedRoutes(data) {
        let list = Array.isArray(data) ? data : [data, ...getCompletedRoutesLocal()];
        try { localStorage.setItem(COMPLETED_LOG_KEY, JSON.stringify(list)); } catch (e) {}
        notify('completed-routes', list);
        try {
            await fetch(API_BASE + '/api/completed-routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completedRoutesLog: list })
            });
        } catch (e) {
            console.warn('[SyncEngine] pushCompletedRoutes error:', e);
        }
    }

    // Cross-tab broadcast receiver
    try {
        const bc = new BroadcastChannel('depot_operations_sync');
        bc.onmessage = (ev) => {
            const msgType = String(ev.data?.type || '').toUpperCase();
            if (msgType === 'SERVICING_STATUS_UPDATED') {
                fetchFullSync();
                notify('servicing-status', getServicingStatusLocal());
            } else if (msgType === 'FLEET_BUS_ADDED' || msgType === 'FLEET_BUS_DELETED' || msgType === 'FLEET_UPDATED') {
                fetchFullSync();
                notify('fleet-updated', ev.data);
            }
        };
    } catch(e) {}

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
        getDepotCounts: getDepotCounts,
        getDepotCountsLocal: getDepotCountsLocal,
        isCanonicalBm: isCanonicalBm,
        getAddedBuses: getAddedBusesLocal,
        getDeletedBuses: getDeletedBusesLocal,
        isNewlyAddedBus: isNewlyAddedBus,
        getNewlyAddedInfo: getNewlyAddedInfo,
        isDeletedBus: isDeletedBus,
        getDeletedInfo: getDeletedInfo,
        addBus: addFleetBusApi,
        deleteBus: deleteFleetBusApi,
        restoreBus: restoreFleetBusApi,
        getServicingStatus: getServicingStatusLocal,
        getBusServicing: getBusServicingLocal,
        saveServicingStatus: pushServicingStatus,
        updateBusServicing: updateBusServicingApi,
        saveBusServicing: updateBusServicingApi,
        clearBusServicing: clearBusServicingApi,
        getChargingHistory: getChargingHistoryLocal,
        saveChargingHistory: pushChargingHistory,
        getCleaningHistory: getCleaningHistoryLocal,
        saveCleaningHistory: pushCleaningHistory,
        getCompletedRoutes: getCompletedRoutesLocal,
        saveCompletedRoutes: pushCompletedRoutes,
        unlockBus: unlockBusApi,
        unlockAllBuses: unlockAllBusesApi,
        getVersion: () => currentVersion
    };
})(window);
