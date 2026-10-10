const fs = require("fs");
const path = require("path");

const BASE_DIR = __dirname;
const SOC_LOGS_DIR = path.join(BASE_DIR, "soc_logs");
const SUMMARIES_FILE = path.join(SOC_LOGS_DIR, "daily_summaries.json");
const BUS_STATE_FILE = path.join(BASE_DIR, "bus_state.json");

// Ensure logs directory exists
if (!fs.existsSync(SOC_LOGS_DIR)) {
    try {
        fs.mkdirSync(SOC_LOGS_DIR, { recursive: true });
    } catch (e) {
        console.warn("[SoC Logger] Could not create soc_logs directory:", e.message);
    }
}

// In-memory cache
let dailySummariesCache = null;
const dailyLogsCache = new Map(); // dateStr -> { busId: [entries] }
const pendingWrites = new Set();
let writeTimer = null;

function loadSummaries() {
    if (dailySummariesCache) return dailySummariesCache;
    try {
        if (fs.existsSync(SUMMARIES_FILE)) {
            const raw = fs.readFileSync(SUMMARIES_FILE, "utf8");
            dailySummariesCache = JSON.parse(raw);
        } else {
            dailySummariesCache = {};
        }
    } catch (e) {
        console.warn("[SoC Logger] Error loading daily_summaries.json:", e.message);
        dailySummariesCache = {};
    }
    return dailySummariesCache;
}

function saveSummariesSync() {
    if (!dailySummariesCache) return;
    try {
        fs.writeFileSync(SUMMARIES_FILE, JSON.stringify(dailySummariesCache, null, 2), "utf8");
    } catch (e) {
        console.warn("[SoC Logger] Error saving daily_summaries.json:", e.message);
    }
}

function getDailyLogPath(dateStr) {
    return path.join(SOC_LOGS_DIR, `soc_${dateStr}.json`);
}

function loadDailyLog(dateStr) {
    if (dailyLogsCache.has(dateStr)) {
        return dailyLogsCache.get(dateStr);
    }
    const filePath = getDailyLogPath(dateStr);
    let logData = {};
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf8");
            logData = JSON.parse(raw);
        }
    } catch (e) {
        console.warn(`[SoC Logger] Error loading log for ${dateStr}:`, e.message);
        logData = {};
    }
    dailyLogsCache.set(dateStr, logData);
    return logData;
}

function scheduleFlush() {
    if (writeTimer) return;
    writeTimer = setTimeout(() => {
        writeTimer = null;
        flushPendingWrites();
    }, 1500);
}

function flushPendingWrites() {
    saveSummariesSync();
    for (const dateStr of pendingWrites) {
        const logData = dailyLogsCache.get(dateStr);
        if (logData) {
            try {
                const filePath = getDailyLogPath(dateStr);
                fs.writeFileSync(filePath, JSON.stringify(logData, null, 2), "utf8");
            } catch (e) {
                console.warn(`[SoC Logger] Error writing log for ${dateStr}:`, e.message);
            }
        }
    }
    pendingWrites.clear();
}

/**
 * Normalizes bus identification to its canonical physical vehicle identifier (e.g. BM001).
 */
function normalizeBusId(rawId) {
    if (!rawId) return "UNKNOWN";
    const str = String(rawId).trim();
    return str.toUpperCase();
}

/**
 * Logs an SoC reading into persistent daily logs.
 */
function logSocUpdate(params = {}) {
    const rawBusId = params.busId || params.uniqueId || params.bmNumber || params.bus;
    const busId = normalizeBusId(rawBusId);
    if (!busId || busId === "UNKNOWN") return null;

    const soc = Number.isFinite(Number(params.soc)) ? Math.max(0, Math.min(100, Number(params.soc))) : 0;
    const condition = params.condition === "Not Good" ? "Not Good" : "Good";
    const status = params.status || "On Time";
    const driver = params.driver || "Driver Assigned";
    const routeId = params.routeId || "";
    const routeShortName = params.routeShortName || params.busNumber || "";
    const timestamp = params.timestamp || new Date().toISOString();
    const dateStr = timestamp.split("T")[0];

    // Load or get day's log
    const dayLog = loadDailyLog(dateStr);
    if (!dayLog[busId]) dayLog[busId] = [];

    const existingEntries = dayLog[busId];
    const lastEntry = existingEntries[existingEntries.length - 1];

    // Throttle duplicate records within 20s if SoC hasn't changed
    if (lastEntry) {
        const timeDiff = Math.abs(new Date(timestamp).getTime() - new Date(lastEntry.timestamp).getTime());
        if (lastEntry.soc === soc && timeDiff < 20000) {
            return lastEntry;
        }
    }

    const newEntry = {
        timestamp,
        soc,
        condition,
        status,
        driver,
        routeId,
        routeShortName
    };
    existingEntries.push(newEntry);
    pendingWrites.add(dateStr);

    // Update Daily Summaries
    const summaries = loadSummaries();
    if (!summaries[busId]) summaries[busId] = {};

    const existingSummary = summaries[busId][dateStr];
    if (!existingSummary) {
        summaries[busId][dateStr] = {
            date: dateStr,
            busId,
            startSoc: soc,
            endSoc: soc,
            minSoc: soc,
            maxSoc: soc,
            count: 1,
            firstTimestamp: timestamp,
            lastTimestamp: timestamp,
            condition,
            status,
            routeId,
            routeShortName
        };
    } else {
        existingSummary.endSoc = soc;
        existingSummary.minSoc = Math.min(existingSummary.minSoc, soc);
        existingSummary.maxSoc = Math.max(existingSummary.maxSoc, soc);
        existingSummary.count = (existingSummary.count || 0) + 1;
        existingSummary.lastTimestamp = timestamp;
        existingSummary.condition = condition;
        existingSummary.status = status;
        if (routeId) existingSummary.routeId = routeId;
        if (routeShortName) existingSummary.routeShortName = routeShortName;
    }

    scheduleFlush();
    return newEntry;
}

/**
 * Backfills past history entries from bus_state.json into daily logs.
 */
function backfillFromBusState(customFilePath) {
    const targetFile = customFilePath || BUS_STATE_FILE;
    if (!fs.existsSync(targetFile)) return { ok: false, error: "bus_state.json not found" };

    try {
        const raw = fs.readFileSync(targetFile, "utf8");
        const state = JSON.parse(raw);
        let count = 0;
        let busCount = 0;

        for (const [key, val] of Object.entries(state)) {
            if (!val || typeof val !== "object" || key.startsWith("_")) continue;
            const busId = normalizeBusId(val.uniqueId || val.bmNumber || key);
            const history = Array.isArray(val.history) ? val.history : [];

            if (history.length > 0) {
                busCount++;
                for (const h of history) {
                    if (!h || !h.timestamp) continue;
                    const entryTimestamp = h.timestamp;
                    const dateStr = entryTimestamp.split("T")[0];
                    const soc = Number.isFinite(Number(h.soc)) ? Number(h.soc) : 0;
                    const condition = h.condition || val.condition || "Good";
                    const status = h.status || val.status || "On Time";

                    const dayLog = loadDailyLog(dateStr);
                    if (!dayLog[busId]) dayLog[busId] = [];

                    // Avoid duplicate timestamps
                    const alreadyExists = dayLog[busId].some(e => e.timestamp === entryTimestamp);
                    if (!alreadyExists) {
                        dayLog[busId].push({
                            timestamp: entryTimestamp,
                            soc,
                            condition,
                            status,
                            driver: val.driver || "Driver Assigned",
                            routeId: val.assignedRouteId || val.busNumber || "",
                            routeShortName: val.busNumber || ""
                        });
                        pendingWrites.add(dateStr);
                        count++;

                        // Summaries
                        const summaries = loadSummaries();
                        if (!summaries[busId]) summaries[busId] = {};
                        const s = summaries[busId][dateStr];
                        if (!s) {
                            summaries[busId][dateStr] = {
                                date: dateStr,
                                busId,
                                startSoc: soc,
                                endSoc: soc,
                                minSoc: soc,
                                maxSoc: soc,
                                count: 1,
                                firstTimestamp: entryTimestamp,
                                lastTimestamp: entryTimestamp,
                                condition,
                                status,
                                routeId: val.assignedRouteId || "",
                                routeShortName: val.busNumber || ""
                            };
                        } else {
                            s.minSoc = Math.min(s.minSoc, soc);
                            s.maxSoc = Math.max(s.maxSoc, soc);
                            s.count = (s.count || 0) + 1;
                            if (new Date(entryTimestamp) < new Date(s.firstTimestamp)) {
                                s.firstTimestamp = entryTimestamp;
                                s.startSoc = soc;
                            }
                            if (new Date(entryTimestamp) > new Date(s.lastTimestamp)) {
                                s.lastTimestamp = entryTimestamp;
                                s.endSoc = soc;
                            }
                        }
                    }
                }
            }
        }

        flushPendingWrites();
        console.log(`[SoC Logger] Backfilled ${count} entries across ${busCount} buses into persistent daily logs.`);
        return { ok: true, entriesAdded: count, busesProcessed: busCount };
    } catch (e) {
        console.warn("[SoC Logger] Backfill error:", e.message);
        return { ok: false, error: e.message };
    }
}

/**
 * Returns all daily summaries for a bus, sorted chronologically.
 */
function getBusDailySummaries(rawBusId, limitDays = 30) {
    const busId = normalizeBusId(rawBusId);
    const summaries = loadSummaries();
    const busMap = summaries[busId] || {};

    const list = Object.values(busMap);
    list.sort((a, b) => a.date.localeCompare(b.date));

    if (limitDays && list.length > limitDays) {
        return list.slice(-limitDays);
    }
    return list;
}

/**
 * Returns all detailed telemetry points for a specific bus on a specific date.
 */
function getBusDateDetails(rawBusId, dateStr) {
    const busId = normalizeBusId(rawBusId);
    const dayLog = loadDailyLog(dateStr);
    return dayLog[busId] || [];
}

/**
 * Returns all recorded dates.
 */
function getAvailableDates() {
    loadSummaries();
    const datesSet = new Set();
    const summaries = loadSummaries();
    for (const busId of Object.keys(summaries)) {
        for (const dateStr of Object.keys(summaries[busId])) {
            datesSet.add(dateStr);
        }
    }
    return Array.from(datesSet).sort();
}

/**
 * Returns complete summary for all buses for a given date.
 */
function getAllSummariesForDate(dateStr) {
    const summaries = loadSummaries();
    const result = {};
    for (const [busId, dates] of Object.entries(summaries)) {
        if (dates[dateStr]) {
            result[busId] = dates[dateStr];
        }
    }
    return result;
}

/**
 * Builds Macro 30-day view blending real daily history with smooth simulation where unrecorded.
 */
function getMacroTrendWithRealHistory(rawBusId, currentSoc, routeDistanceKm) {
    const busId = normalizeBusId(rawBusId);
    const summaries = loadSummaries();
    const busSummaries = summaries[busId] || {};

    const now = new Date();
    const logs = [];

    for (let offset = 29; offset >= 0; offset--) {
        const date = new Date(now.getTime() - offset * 24 * 3600 * 1000);
        const dateStr = date.toISOString().split("T")[0];
        const stamp = `${dateStr}T14:30:00.000Z`;
        const slot = (offset % 3 === 0) ? "PEAK" : "NORMAL";
        const km = routeDistanceKm || 28.7;
        const durationHours = Number((km / 22 + (offset % 3) * 0.1).toFixed(2));

        const realDay = busSummaries[dateStr];

        if (realDay) {
            // Real recorded day!
            logs.push({
                timestamp: realDay.lastTimestamp || stamp,
                date: dateStr,
                slot,
                soc_start: realDay.startSoc,
                soc_end: realDay.endSoc,
                min_soc: realDay.minSoc,
                max_soc: realDay.maxSoc,
                update_count: realDay.count,
                km,
                duration_hours: durationHours,
                bus_id: busId,
                is_real: true
            });
        } else if (offset === 0) {
            // Today (current live value)
            const endSoc = currentSoc;
            const startSoc = Math.min(100, Number((currentSoc + Math.min(30, km * 0.55)).toFixed(1)));
            logs.push({
                timestamp: stamp,
                date: dateStr,
                slot,
                soc_start: startSoc,
                soc_end: endSoc,
                min_soc: Math.min(startSoc, endSoc),
                max_soc: Math.max(startSoc, endSoc),
                update_count: 1,
                km,
                duration_hours: durationHours,
                bus_id: busId,
                is_real: false
            });
        } else {
            // Simulated baseline for days before monitoring started
            const seed = (Math.abs(offset * 7 + 13) % 5);
            const startSoc = Math.min(100, Number((98 - seed * 1.5).toFixed(1)));
            const drain = Number((km * 0.55 + seed * 1.2).toFixed(1));
            const endSoc = Math.max(15, Number((startSoc - drain).toFixed(1)));

            logs.push({
                timestamp: stamp,
                date: dateStr,
                slot,
                soc_start: startSoc,
                soc_end: endSoc,
                min_soc: Math.min(startSoc, endSoc),
                max_soc: Math.max(startSoc, endSoc),
                update_count: 0,
                km,
                duration_hours: durationHours,
                bus_id: busId,
                is_real: false
            });
        }
    }

    return logs;
}

// Initial auto-backfill on module load
try {
    loadSummaries();
    backfillFromBusState();
} catch (e) {
    console.warn("[SoC Logger] Auto-init backfill error:", e.message);
}

module.exports = {
    logSocUpdate,
    backfillFromBusState,
    getBusDailySummaries,
    getBusDateDetails,
    getAvailableDates,
    getAllSummariesForDate,
    getMacroTrendWithRealHistory,
    flushPendingWrites,
    normalizeBusId
};
