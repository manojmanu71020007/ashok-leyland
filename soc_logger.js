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

// ── Bus Category and Range Lookup ──
let busCategoriesMap = null;
function getBusCategoryInfo(rawBusId) {
    if (!busCategoriesMap) {
        busCategoriesMap = new Map();
        try {
            const catPath = path.join(BASE_DIR, "vehicles", "bus_categories.json");
            if (fs.existsSync(catPath)) {
                const arr = JSON.parse(fs.readFileSync(catPath, "utf8"));
                arr.forEach(item => {
                    if (item.bm_number) {
                        busCategoriesMap.set(String(item.bm_number).toUpperCase().trim(), {
                            category: String(item.category || "B").toUpperCase(),
                            actualRangeKm: Number(item.actual_range_km || 110.0)
                        });
                    }
                });
            }
        } catch (e) {
            console.warn("[SoC Logger] Error loading bus_categories.json:", e.message);
        }
    }
    const cleanId = normalizeBusId(rawBusId);
    return busCategoriesMap.get(cleanId) || { category: "B", actualRangeKm: 110.0 };
}

/**
 * Extracts non-charging operational driving segments from telemetry logs.
 * Excludes charging events (where SoC rises) and non-operating layovers.
 */
function extractDischargeSegments(rawBusId) {
    const busId = normalizeBusId(rawBusId);
    const summaries = loadSummaries();
    const dates = summaries[busId] ? Object.keys(summaries[busId]).sort() : [];
    const allPoints = [];

    for (const d of dates) {
        const dayLog = loadDailyLog(d);
        const entries = dayLog[busId] || [];
        for (const e of entries) {
            if (e && e.timestamp && Number.isFinite(Number(e.soc))) {
                allPoints.push({
                    timestamp: new Date(e.timestamp),
                    soc: Number(e.soc),
                    routeId: e.routeId || "",
                    routeShortName: e.routeShortName || "",
                    condition: e.condition || "Good",
                    status: e.status || "On Time"
                });
            }
        }
    }

    allPoints.sort((a, b) => a.timestamp - b.timestamp);

    const segments = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        const diffMs = p2.timestamp.getTime() - p1.timestamp.getTime();
        const durationMin = diffMs / (60 * 1000);
        const durationHours = durationMin / 60;
        const socDrop = Number((p1.soc - p2.soc).toFixed(2));

        // Skip multi-hour overnight halts or sub-30s duplicate logs
        if (durationMin > 720 || durationMin < 0.5) continue;

        const isCharging = (socDrop < -0.05) || (p2.soc > p1.soc);
        const isLayover = !isCharging && (durationMin > 45 && Math.abs(socDrop) < 1.0);

        let socPerHour = null;
        if (!isCharging && !isLayover && socDrop > 0 && durationHours > 0.15) {
            const rawSph = socDrop / durationHours;
            // Realistic operational electric transit bus discharge rate is 4% to 36%/hr
            if (rawSph >= 4.0 && rawSph <= 36.0) {
                socPerHour = Number(rawSph.toFixed(2));
            }
        }

        segments.push({
            busId,
            startSoc: p1.soc,
            endSoc: p2.soc,
            socDrop: Math.max(0, socDrop),
            durationMin: Number(durationMin.toFixed(1)),
            durationHours: Number(durationHours.toFixed(2)),
            socPerHour,
            isCharging,
            isLayover,
            routeId: p1.routeId || p2.routeId,
            timestamp: p1.timestamp.toISOString()
        });
    }

    return segments;
}

/**
 * Calculates dual distance-based and historical time-based SoC estimates for a schedule duty.
 * Keeps estimates distinct to prevent double-counting.
 */
function estimateScheduleDischargeDual(rawBusId, params = {}) {
    const busId = normalizeBusId(rawBusId);
    const catInfo = getBusCategoryInfo(busId);
    const busCategory = params.busCategory || catInfo.category || "B";
    const busActualRangeKm = Number(params.busActualRangeKm || catInfo.actualRangeKm || 110.0);

    const targetDistKm = Number(params.distanceKm || params.targetDistanceKm || 28.7);
    const expectedDurationHours = Number(params.durationHours || params.expectedDurationHours || 1.3);
    const reservePct = Number(params.reservePct || 15.0);
    const slot = String(params.slot || "NORMAL").toUpperCase();

    // 1. Physical / validated distance-based requirement
    // Cat A bus has larger range -> requires less SoC %
    // Cat B bus has medium range -> requires moderate SoC %
    // Cat C bus has smaller range -> requires very high SoC %
    const distanceBaseSocPct = Number(((targetDistKm / busActualRangeKm) * 100).toFixed(2));
    const distanceRequiredSocPct = Number(Math.min(100, distanceBaseSocPct + reservePct).toFixed(2));
    const socPerKm = Number((100 / busActualRangeKm).toFixed(4));

    // 2. Historical telemetry segments extraction
    const segments = extractDischargeSegments(busId);
    const validDriving = segments.filter(s => !s.isCharging && !s.isLayover && s.socPerHour !== null && s.socPerHour > 0);

    let timeBaseSocPct = null;
    let timeExpectedSocPct = null;
    let socPerHour = null;
    let evidenceStatus = "VALIDATED_DISTANCE";
    let limitationNote = null;
    let trafficImpactNote = "";

    const isPeak = (slot === "PEAK" || slot === "EXTREME_PEAK");

    if (expectedDurationHours <= 0) {
        evidenceStatus = "MISSING_DURATION_FALLBACK";
        limitationNote = "Schedule duration is missing or zero; time-based estimation unavailable.";
    } else if (validDriving.length === 0) {
        // Category baseline hourly rate:
        // Cat A: ~12.5%/hr Normal, ~16.5%/hr Peak
        // Cat B: ~15.0%/hr Normal, ~19.5%/hr Peak
        // Cat C: ~22.0%/hr Normal, ~28.0%/hr Peak
        const baseRates = { "A": 12.5, "B": 15.0, "C": 22.0 };
        const peakMult = isPeak ? 1.30 : 1.0;
        socPerHour = Number(((baseRates[busCategory] || 15.0) * peakMult).toFixed(2));
        timeBaseSocPct = Number((expectedDurationHours * socPerHour).toFixed(2));
        timeExpectedSocPct = Number(Math.min(100, timeBaseSocPct + reservePct).toFixed(2));

        const chargingOnly = segments.some(s => s.isCharging);
        if (chargingOnly) {
            evidenceStatus = "CHARGING_CONTAMINATED_FALLBACK";
            limitationNote = "Historical records contain charging intervals; calibrated against category profile.";
        } else {
            evidenceStatus = "CATEGORY_PROFILE_BASELINE";
            limitationNote = "Estimated via validated vehicle category profile (insufficient long driving duration records).";
        }
        if (isPeak) {
            trafficImpactNote = "Peak hour traffic & HVAC auxiliary load elevates hourly discharge by +30% over cruising baseline.";
        }
    } else {
        const sphValues = validDriving.map(s => s.socPerHour).sort((a, b) => a - b);
        const mid = Math.floor(sphValues.length / 2);
        socPerHour = sphValues.length % 2 !== 0 ? sphValues[mid] : Number(((sphValues[mid - 1] + sphValues[mid]) / 2).toFixed(2));

        timeBaseSocPct = Number((expectedDurationHours * socPerHour).toFixed(2));
        timeExpectedSocPct = Number(Math.min(100, timeBaseSocPct + reservePct).toFixed(2));
        evidenceStatus = "RELIABLE_ACTIVE_HISTORY";

        if (isPeak) {
            trafficImpactNote = "Peak congestion & continuous AC draw tends to elevate hourly discharge compared to off-peak cruising.";
        }
    }

    return {
        busId,
        busCategory,
        busActualRangeKm,
        targetDistanceKm: targetDistKm,
        expectedDurationHours,
        reservePct,
        slot,
        distanceBaseSocPct,
        distanceRequiredSocPct,
        socPerKm,
        timeBaseSocPct,
        timeExpectedSocPct,
        socPerHour,
        comparableSegmentsCount: validDriving.length,
        evidenceStatus,
        trafficImpactNote,
        limitationNote,
        doubleCountingWarning: "Estimates are independent and must not be added together to avoid double-counting energy consumption."
    };
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
    extractDischargeSegments,
    estimateScheduleDischargeDual,
    getBusCategoryInfo,
    flushPendingWrites,
    normalizeBusId
};

