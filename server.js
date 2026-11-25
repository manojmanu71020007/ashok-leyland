const http = require("http");

const https = require("https");

const fs = require("fs");

const path = require("path");

const zlib = require("zlib");

let XLSX;
try {
    XLSX = require("xlsx");
} catch (e) {
    console.warn("[WARN] 'xlsx' module not found, fallback parser active:", e.message);
}

const socLogger = require("./soc_logger");



const PORT = process.env.PORT || 3000;

const PYTHON_API_BASE = "http://localhost:8000";

const BASE_DIR = __dirname;

const ROUTES_FILE = path.join(BASE_DIR, "routes", "routes.txt");

const STOPS_FILE = path.join(BASE_DIR, "stops", "stops.txt");

const TRIPS_FILE = path.join(BASE_DIR, "trips", "trips.txt");

const STOP_TIMES_FILE = path.join(BASE_DIR, "stop_times", "stop_times.txt");

const SHAPES_FILE = path.join(BASE_DIR, "shapes", "shapes.txt");

const BUS_STATE_FILE = path.join(BASE_DIR, "bus_state.json");

const VEHICLE_ASSIGNMENTS_FILE = path.join(BASE_DIR, "vehicles", "vehicle_assignments.csv");

const VEHICLES_FILE = path.join(BASE_DIR, "vehicles", "vehicles.txt");

const DETAILED_SCHEDULE_FILE = path.join(BASE_DIR, "vehicles", "detailed_schedule_trips.json");

let detailedSchedulesCache = null;



function loadDetailedSchedules() {

    if (!detailedSchedulesCache) {

        try {

            if (fs.existsSync(DETAILED_SCHEDULE_FILE)) {

                detailedSchedulesCache = JSON.parse(fs.readFileSync(DETAILED_SCHEDULE_FILE, "utf8"));

            }

        } catch (e) {

            console.warn("Could not load detailed_schedule_trips.json:", e.message);

        }

    }

    return detailedSchedulesCache || {};

}

const ROUTES_DATASET_FILE = path.join(BASE_DIR, "data", "routes_schedules_dataset.json");

function loadRoutesDataset() {
    try {
        if (fs.existsSync(ROUTES_DATASET_FILE)) {
            const raw = fs.readFileSync(ROUTES_DATASET_FILE, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.routes)) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn("Could not load routes_schedules_dataset.json:", e.message);
    }
    return null;
}

function saveRoutesDataset(dataset) {
    try {
        if (dataset && typeof dataset === 'object') {
            dataset.lastUpdated = new Date().toISOString();
            const dataDir = path.join(BASE_DIR, "data");
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(ROUTES_DATASET_FILE, JSON.stringify(dataset, null, 2), "utf8");
        }
    } catch (e) {
        console.warn("Could not save routes_schedules_dataset.json:", e.message);
    }
}

const ADAFRUIT_USERNAME = process.env.ADAFRUIT_USERNAME || "Manu123456789";

const ADAFRUIT_FEED_NAME = process.env.ADAFRUIT_FEED_NAME || "gpslocation";

const ADAFRUIT_AIO_KEY = process.env.ADAFRUIT_AIO_KEY || "";

const ADAFRUIT_LAST_VALUE_URL = `https://io.adafruit.com/api/v2/${ADAFRUIT_USERNAME}/feeds/${ADAFRUIT_FEED_NAME}/data/last`;



const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

const GITHUB_REPO = "manojmanu71020007/ashok-leyland";

const GITHUB_FILE_PATH = "bus_state.json";



const DEFAULT_BUS_TIMINGS = {

    Delayed: { arrival: "15:10", departure: "15:15" },

    "On Time": { arrival: "15:00", departure: "15:05" },

    Ahead: { arrival: "14:50", departure: "14:55" }

};



function parseCsvLine(line) {

    const fields = [];

    let current = "";

    let inQuotes = false;



    for (let i = 0; i < line.length; i += 1) {

        const char = line[i];



        if (char === '"') {

            if (inQuotes && line[i + 1] === '"') {

                current += '"';

                i += 1;

            } else {

                inQuotes = !inQuotes;

            }

            continue;

        }



        if (char === "," && !inQuotes) {

            fields.push(current);

            current = "";

            continue;

        }



        current += char;

    }



    fields.push(current);

    return fields;

}



let cachedRoutes = null;

let cachedStops = null;

let cachedTrips = null;

let cachedStopTimes = null;

let cachedShapes = null;

let cachedShapesByShapeId = null;

let cachedGtfsScheduleSummary = null;

let cachedGtfsBundleJson = null;

const cachedRouteDistances = new Map();

let cachedRouteTripCounts = null;

let cachedRouteBmMap = null;



function getRouteBmMap() {

    if (cachedRouteBmMap) return cachedRouteBmMap;

    const map = new Map();

    // Default fixed mapping from vehicles/vehicle_assignments.csv and vehicles/vehicles.txt

    const fallbackMap = {

        "1": "BM238", "356Z": "BM238",

        "2": "BM291", "360K": "BM291",

        "3": "BM001", "600F": "BM001",

        "4": "BM086", "KBS3A": "BM086",

        "5": "BM293", "KBS3F": "BM293", "KBES3F": "BM293",

        "6": "BM153", "328H": "BM153",

        "7": "BM299", "361C": "BM299",

        "8": "BM216", "399C": "BM216",

        "9": "BM002", "500DC": "BM002"

    };

    for (const [k, v] of Object.entries(fallbackMap)) {

        map.set(k, v);

    }



    try {

        if (fs.existsSync(VEHICLE_ASSIGNMENTS_FILE)) {

            const raw = fs.readFileSync(VEHICLE_ASSIGNMENTS_FILE, "utf8");

            const lines = raw.split(/\r?\n/).filter(Boolean);

            if (lines.length > 1) {

                for (let i = 1; i < lines.length; i++) {

                    const parts = parseCsvLine(lines[i]);

                    const route = (parts[1] || "").trim();

                    const fixBm = (parts[3] || "").trim();

                    if (route && fixBm && !map.has(route)) {

                        map.set(route, fixBm);

                    }

                }

            }

        }

    } catch (e) {

        console.warn("Could not load vehicle_assignments.csv:", e.message);

    }



    cachedRouteBmMap = map;

    return cachedRouteBmMap;

}



function getRouteTripCounts() {

    if (cachedRouteTripCounts) return cachedRouteTripCounts;

    const trips = loadTrips();

    const counts = new Map();

    for (const t of trips) {

        const rId = String(t.routeId || "").trim();

        counts.set(rId, (counts.get(rId) || 0) + 1);

    }

    cachedRouteTripCounts = counts;

    return cachedRouteTripCounts;

}



function loadRoutes() {

    if (cachedRoutes) return cachedRoutes;



    let corridors = [];

    try {

        const rawCorridors = fs.readFileSync(ROUTES_FILE, "utf8");

        const corridorLines = rawCorridors.split(/\r?\n/).filter(Boolean);

        const tripCounts = getRouteTripCounts();



        corridors = corridorLines.slice(1).map((line) => {

            const [routeLongName, routeShortName, agencyId, routeType, routeId] = parseCsvLine(line);

            const [origin = "", destination = ""] = (routeLongName || "").split("⇔").map((part) => part.trim());

            const cleanRouteId = String(routeId || "").trim();

            const routeName = (routeShortName || "").trim();

            return {

                routeLongName,

                routeShortName: routeName,

                agencyId: agencyId || "1",

                routeType: routeType || "3",

                routeId: cleanRouteId,

                origin: origin || "Chandapura (Depot 32)",

                destination: destination || "Bengaluru Corridor",

                tripCount: tripCounts.get(cleanRouteId) || (cleanRouteId === "6" ? 12 : 8),

                distanceKm: calculateRouteDistanceByRouteId(cleanRouteId) || 28.7

            };

        });

    } catch (e) {

        console.warn("Could not read routes.txt in loadRoutes:", e.message);

    }



    const corridorByShort = new Map(corridors.map((c) => [c.routeShortName, c]));

    const defaultCorridor = corridors[2] || corridors[0] || {

        routeShortName: "600F",

        routeLongName: "Bommasandra Depot 32 ⇔ Basavanagudi (600F)",

        origin: "Bommasandra Depot 32",

        destination: "Basavanagudi",

        routeId: "3",

        distanceKm: 27.8,

        tripCount: 8

    };



    // Load assignments from vehicle_assignments.csv

    const assignByFixBm = new Map();

    const assignBySwapBm = new Map();

    try {

        if (fs.existsSync(VEHICLE_ASSIGNMENTS_FILE)) {

            const rawAssign = fs.readFileSync(VEHICLE_ASSIGNMENTS_FILE, "utf8");

            const assignLines = rawAssign.split(/\r?\n/).filter(Boolean);

            for (let i = 1; i < assignLines.length; i++) {

                const p = parseCsvLine(assignLines[i]);

                const scheduleId = (p[0] || "").trim();

                const route = (p[1] || "").trim();

                const shift = (p[2] || "").trim();

                const fixBm = (p[3] || "").trim();

                const fixReg = (p[4] || "").trim();

                const swapBm = (p[5] || "").trim();

                const swapReg = (p[6] || "").trim();

                if (fixBm && !assignByFixBm.has(fixBm)) {

                    assignByFixBm.set(fixBm, { scheduleId, route, shift, regNo: fixReg });

                }

                if (swapBm && !assignBySwapBm.has(swapBm)) {

                    assignBySwapBm.set(swapBm, { scheduleId: `${scheduleId} (Swap)`, route, shift, regNo: swapReg });

                }

            }

        }

    } catch (e) {

        console.warn("Could not read vehicle_assignments.csv in loadRoutes:", e.message);

    }



    // Load all vehicles from vehicles.txt

    let vehicles = [];

    try {

        if (fs.existsSync(VEHICLES_FILE)) {

            const rawVehicles = fs.readFileSync(VEHICLES_FILE, "utf8");

            const vehLines = rawVehicles.split(/\r?\n/).filter(Boolean);

            vehicles = vehLines.slice(1).map((line) => {

                const [vehicleId, bmNo, regNo, make, model, depot, status] = parseCsvLine(line);

                return {

                    vehicleId: (vehicleId || bmNo || "").trim(),

                    bmNo: (bmNo || vehicleId || "").trim(),

                    regNo: (regNo || "").trim(),

                    make: (make || "Ashok Leyland").trim(),

                    model: (model || "ELECTRIC BUS AC EiV12").trim(),

                    depot: (depot || "Chandapura (BMT-32)").trim(),

                    status: (status || "Active").trim()

                };

            });

        }

    } catch (e) {

        console.warn("Could not read vehicles.txt in loadRoutes:", e.message);

    }



    if (!vehicles.length) {

        cachedRoutes = corridors.map((c, idx) => ({

            uniqueId: `BM${String(idx + 1).padStart(3, "0")}`,

            vehicleId: `BM${String(idx + 1).padStart(3, "0")}`,

            bmNumber: `BM${String(idx + 1).padStart(3, "0")}`,

            busNumber: c.routeShortName,

            routeShortName: c.routeShortName,

            routeName: c.routeLongName,

            origin: c.origin,

            destination: c.destination,

            agencyId: c.agencyId,

            routeType: c.routeType,

            routeId: c.routeId,

            tripCount: c.tripCount

        }));

        return cachedRoutes;

    }



    const currentState = loadBusState();

    const deletedBuses = (currentState && currentState._deletedBuses) ? currentState._deletedBuses : {};

    const addedBuses = (currentState && currentState._addedBuses) ? currentState._addedBuses : {};



    const activeVehicles = vehicles.filter((v) => {

        const bm = String(v.bmNo || "").toUpperCase().trim();

        if (v.status && String(v.status).toLowerCase() === "deleted") return false;

        if (deletedBuses[bm]) return false;

        return true;

    });



    cachedRoutes = activeVehicles.map((v) => {

        const bm = v.bmNo;

        const assign = assignByFixBm.get(bm) || assignBySwapBm.get(bm);

        const routeShort = assign ? assign.route : "600F";

        const scheduleId = assign ? assign.scheduleId : `RES-${bm}`;

        const shift = assign ? assign.shift : "General Shift (Reserve)";

        const corr = corridorByShort.get(routeShort) || defaultCorridor;

        const distKm = corr.distanceKm || calculateRouteDistanceByRouteId(corr.routeId) || 28.7;

        const tripCount = corr.tripCount || 8;

        const addedInfo = addedBuses[bm] || null;

        let isNewlyAdded = false;
        const entry = addedInfo || (currentState[bm] && currentState[bm].isNewlyAdded ? currentState[bm] : null);
        if (entry) {
            const addedTime = entry.addedAt ? new Date(entry.addedAt).getTime() : (entry.timestamp ? Number(entry.timestamp) : null);
            if (addedTime && !isNaN(addedTime)) {
                isNewlyAdded = (Date.now() - addedTime) < (30 * 24 * 60 * 60 * 1000);
            } else {
                isNewlyAdded = Boolean(entry.isNewlyAdded || addedInfo);
            }
        }

        const servicingInfo = (currentState && currentState._servicingStatus) ? currentState._servicingStatus[bm] : null;
        const isNeedsServicing = Boolean(
            servicingInfo && (
                (typeof servicingInfo === 'object' && servicingInfo.routeCompleted && (!servicingInfo.chargingCompleted || !servicingInfo.cleaningCompleted || servicingInfo.needsCharging || servicingInfo.needsCleaning)) ||
                (typeof servicingInfo === 'string' && servicingInfo === 'needs_servicing')
            )
        );
        const effectiveStatus = isNeedsServicing ? 'Needs Servicing' : v.status;



        return {

            uniqueId: bm,

            vehicleId: bm,

            bmNumber: bm,

            regNo: (addedInfo && addedInfo.regNo) || v.regNo || (assign && assign.regNo) || "",

            busNumber: routeShort,

            scheduleId,

            shift,

            routeShortName: routeShort,

            routeName: corr.routeLongName || `${corr.origin} ⇔ ${corr.destination} (${routeShort})`,

            origin: corr.origin || "Chandapura (BMT-32)",

            destination: corr.destination || "Depot 32 Service Corridor",

            agencyId: "1",

            routeType: "3",

            routeId: bm,

            corridorRouteId: corr.routeId,

            tripCount,

            gtfsDistanceKm: distKm,

            distanceKm: distKm,

            make: v.make,

            model: v.model,

            depot: v.depot,

            status: effectiveStatus,

            isNewlyAdded: isNewlyAdded,

            additionReason: (addedInfo && addedInfo.reason) || (currentState[bm] && currentState[bm].additionReason) || "",

            addedAt: (addedInfo && addedInfo.addedAt) || (currentState[bm] && currentState[bm].addedAt) || ""

        };

    });



    return cachedRoutes;

}



let cachedCorridorSchedules = null;

function normalizeDepartureTimeParts(tStr) {
    const raw = String(tStr || "").trim();
    if (!raw) return null;
    // Match "06:30 AM", "6:30 pm", "14:30", "14:30:00", "01:45 PM (13:45)"
    const parenMatch = raw.match(/\((\d{1,2}):(\d{2})\)/);
    const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    const h24Match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    let h24 = null;
    let min = null;
    if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        min = parseInt(ampmMatch[2], 10);
        const mod = ampmMatch[3].toUpperCase();
        if (h < 1 || h > 12 || min < 0 || min > 59) return null;
        if (mod === "PM" && h < 12) h += 12;
        if (mod === "AM" && h === 12) h = 0;
        h24 = h;
    } else if (h24Match) {
        h24 = parseInt(h24Match[1], 10);
        min = parseInt(h24Match[2], 10);
        if (h24 < 0 || h24 > 23 || min < 0 || min > 59) return null;
    } else if (parenMatch) {
        h24 = parseInt(parenMatch[1], 10);
        min = parseInt(parenMatch[2], 10);
        if (h24 < 0 || h24 > 23 || min < 0 || min > 59) return null;
    } else {
        return null;
    }
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const h24Str = `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    const ampmStr = `${String(h12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${ampm}`;
    const tier = ((h24 >= 7 && h24 < 10) || (h24 >= 16 && h24 < 20))
        ? "Extreme Peak"
        : ((h24 >= 10 && h24 < 16) || (h24 >= 20 && h24 < 23)) ? "Peak" : "Normal";
    const shift = (h24 >= 5 && h24 < 13) || (h24 === 13 && min < 30)
        ? "General Shift"
        : (h24 >= 13 && h24 < 22) ? "Shift B" : "Night Halt";
    return {
        raw,
        h24,
        min,
        minutes: h24 * 60 + min,
        h24Str,
        outTime24: `${h24Str}:00`,
        ampmStr,
        tier,
        shift
    };
}

function loadCorridorSchedules() {

    if (cachedCorridorSchedules) return cachedCorridorSchedules;



    const corridorMap = [

        { code: "356Z", origin: "Chandapura", destination: "Anekal", distKm: 28.7, routeId: "1", trips: 8 },

        { code: "360K", origin: "Chandapura", destination: "Kempegowda Bus Station", distKm: 36.2, routeId: "2", trips: 8 },

        { code: "600F", origin: "Bommasandra Depot 32", destination: "Basavanagudi", distKm: 27.8, routeId: "3", trips: 12 },

        { code: "KBS3A", origin: "Kempegowda Bus Station", destination: "Anekal Town Bus Stand", distKm: 41.5, routeId: "4", trips: 8 },

        { code: "KBS3F", origin: "Kempegowda Bus Station", destination: "Basavanagudi", distKm: 12.4, routeId: "5", trips: 8 },

        { code: "328H", origin: "Hoskote", destination: "Kempegowda Bus Station", distKm: 32.5, routeId: "6", trips: 12 },

        { code: "361C", origin: "Chandapura", destination: "Kengeri", distKm: 38.0, routeId: "7", trips: 8 },

        { code: "399C", origin: "Chandapura", destination: "Kanakapura", distKm: 44.0, routeId: "8", trips: 8 },

        { code: "500DC", origin: "HBL", destination: "TNF", distKm: 49.1, routeId: "9", trips: 8 }

    ];



    try {

        if (fs.existsSync(ROUTES_FILE)) {

            const raw = fs.readFileSync(ROUTES_FILE, "utf8");

            const lines = raw.split(/\r?\n/).filter(Boolean);

            if (lines.length > 1) {

                const distLookup = new Map(corridorMap.map(c => [c.code, c.distKm]));

                for (let i = 1; i < lines.length; i++) {

                    const [longName, shortName, agency, type, id] = parseCsvLine(lines[i]);

                    const code = (shortName || "").trim();

                    const existing = corridorMap.find(c => c.code === code);

                    const [orig = "", dest = ""] = (longName || "").split("⇔").map(s => s.trim());

                    if (existing) {

                        if (orig) existing.origin = orig;

                        if (dest) existing.destination = dest;

                        if (id) existing.routeId = id.trim();

                    } else if (code) {

                        corridorMap.push({

                            code,

                            origin: orig || "Origin",

                            destination: dest || "Destination",

                            distKm: distLookup.get(code) || 28.7,

                            routeId: (id || "").trim() || String(corridorMap.length + 1),

                            trips: 8

                        });

                    }

                }

            }

        }

    } catch (e) {

        console.warn("Could not read routes.txt in loadCorridorSchedules:", e.message);

    }



    const directionalRoutes = corridorMap.map(c => ({

        id: c.code,

        code: c.code,

        routeCode: c.code,

        routeId: c.routeId,

        origin: c.origin,

        destination: c.destination,

        distKm: c.distKm,

        distanceKm: c.distKm,

        trips: c.trips,

        label: `${c.origin} ⇔ ${c.destination} (Route ${c.code}) — ${c.distKm} km`

    }));



    const schedules = [];

    try {

        if (fs.existsSync(VEHICLE_ASSIGNMENTS_FILE)) {

            const raw = fs.readFileSync(VEHICLE_ASSIGNMENTS_FILE, "utf8");

            const lines = raw.split(/\r?\n/).filter(Boolean);

            for (let i = 1; i < lines.length; i++) {

                const p = parseCsvLine(lines[i]);

                const scheduleId = (p[0] || "").trim();

                const route = (p[1] || "").trim();

                const shift = (p[2] || "").trim();

                const fixBm = (p[3] || "").trim();

                const fixReg = (p[4] || "").trim();

                const swapBm = (p[5] || "").trim();

                const swapReg = (p[6] || "").trim();

                const outTime = (p[7] || "").trim();

                const inTime = (p[8] || "").trim();

                if (scheduleId && route) {

                    schedules.push({

                        scheduleId,

                        route,

                        shift,

                        fixBm,

                        fixReg,

                        swapBm,

                        swapReg,

                        outTime,

                        inTime

                    });

                }

            }

        }

    } catch (e) {

        console.warn("Could not read vehicle_assignments.csv in loadCorridorSchedules:", e.message);

    }



    // Ensure 500DC has timetable schedule slots from GTFS trips (General Shift & Shift B)

    const has500DC = schedules.some(s => s.route === "500DC");
    if (!has500DC) {
        schedules.push(
            { scheduleId: "500DC/12", route: "500DC", shift: "General", fixBm: "BM240", fixReg: "KA51AH7979", swapBm: "BM255", swapReg: "KA51AH5639", outTime: "07:45:00", inTime: "14:45:00", actualKm: 188.54, singleChargeReqKm: 116.5, chargingOcc: 1, noChargingOcc: 1, splitDuty: true },
            { scheduleId: "500DC/13", route: "500DC", shift: "General", fixBm: "BM255", fixReg: "KA51AH5639", swapBm: "BM274", swapReg: "KA51AH6236", outTime: "08:00:00", inTime: "15:00:00", actualKm: 188.54, singleChargeReqKm: 116.5, chargingOcc: 1, noChargingOcc: 1, splitDuty: true },
            { scheduleId: "500DC/14", route: "500DC", shift: "General", fixBm: "BM274", fixReg: "KA51AH6236", swapBm: "BM240", swapReg: "KA51AH7979", outTime: "08:15:00", inTime: "15:15:00", actualKm: 188.54, singleChargeReqKm: 91.9, chargingOcc: 1, noChargingOcc: 1, splitDuty: true },
            { scheduleId: "500DC/15", route: "500DC", shift: "General", fixBm: "BM240", fixReg: "KA51AH7979", swapBm: "BM274", swapReg: "KA51AH6236", outTime: "08:30:00", inTime: "15:30:00", actualKm: 188.54, singleChargeReqKm: 91.9, chargingOcc: 1, noChargingOcc: 1, splitDuty: true },
            { scheduleId: "500DC/1", route: "500DC", shift: "Shift B", fixBm: "BM255", fixReg: "KA51AH5639", swapBm: "BM240", swapReg: "KA51AH7979", outTime: "13:10:00", inTime: "21:10:00", actualKm: 188.54, singleChargeReqKm: 91.9, chargingOcc: 1, noChargingOcc: 1, splitDuty: true }
        );
    }

    // Enrich with schedule_categories.json metadata (130 Form 4 operational schedules)
    try {
        const catPath = path.join(BASE_DIR, "vehicles", "schedule_categories.json");
        if (fs.existsSync(catPath)) {
            const catList = JSON.parse(fs.readFileSync(catPath, "utf8"));
            const catMap = new Map();
            catList.forEach(c => catMap.set(c.schedule_id.toLowerCase(), c));

            // Attach to existing schedules
            schedules.forEach(s => {
                const meta = catMap.get(s.scheduleId.toLowerCase());
                if (meta) {
                    s.category = meta.category;
                    s.singleChargeReqKm = meta.single_charge_req_km;
                    s.actualKm = meta.actual_km;
                    s.deadKm = meta.dead_km;
                    s.remarks = meta.remarks;
                    s.noOfRest = meta.no_of_rest;
                    s.cumTime = meta.cum_time;
                    s.chargingOcc = meta.charging_occ ?? (meta.no_charging_occ_per_sched || 0);
                    s.noChargingOcc = meta.no_charging_occ_per_sched ?? (meta.charging_occ || 0);
                    s.splitDuty = Boolean((s.chargingOcc && s.chargingOcc > 0) || (s.noChargingOcc && s.noChargingOcc > 0));
                }
            });

            // Also add any missing schedules from catList
            const existingSchedIds = new Set(schedules.map(s => s.scheduleId.toLowerCase()));
            catList.forEach(c => {
                if (!existingSchedIds.has(c.schedule_id.toLowerCase())) {
                    schedules.push({
                        scheduleId: c.schedule_id,
                        route: c.route,
                        shift: c.shift,
                        fixBm: "",
                        fixReg: "",
                        swapBm: "",
                        swapReg: "",
                        outTime: c.cum_time || "08:00:00",
                        inTime: "16:00:00",
                        category: c.category,
                        singleChargeReqKm: c.single_charge_req_km,
                        actualKm: c.actual_km,
                        deadKm: c.dead_km,
                        remarks: c.remarks,
                        noOfRest: c.no_of_rest,
                        cumTime: c.cum_time,
                        chargingOcc: c.charging_occ ?? (c.no_charging_occ_per_sched || 0),
                        noChargingOcc: c.no_charging_occ_per_sched ?? (c.charging_occ || 0),
                        splitDuty: Boolean(((c.charging_occ || 0) > 0) || ((c.no_charging_occ_per_sched || 0) > 0))
                    });
                }
            });



            // Check route complexity / category consistency:

            // If schedules for the same route share the same total route length, consider their route category & single charge requirement the same (e.g. 500DC/12, 13, 14, 15)

            const routeGroups = new Map();

            schedules.forEach(s => {

                const rCode = String(s.route || "").toUpperCase().trim();

                if (!routeGroups.has(rCode)) routeGroups.set(rCode, []);

                routeGroups.get(rCode).push(s);

            });

            routeGroups.forEach((schedList) => {

                const lengthBuckets = new Map();

                schedList.forEach(s => {

                    const len = Number(s.actualKm || s.route_length_km || s.routeLengthKm || 0).toFixed(1);

                    if (Number(len) > 0) {

                        if (!lengthBuckets.has(len)) lengthBuckets.set(len, []);

                        lengthBuckets.get(len).push(s);

                    }

                });

                lengthBuckets.forEach((bucket) => {

                    const ref = bucket.find(s => s.category && String(s.category).toLowerCase().includes("stand"))

                             || bucket.find(s => s.category);

                    if (ref) {

                        bucket.forEach(s => {

                            s.category = ref.category;

                            if (ref.singleChargeReqKm) s.singleChargeReqKm = ref.singleChargeReqKm;

                        });

                    }

                });

            });

        }

    } catch (e) {

        console.warn("Could not enrich with schedule_categories.json:", e.message);

    }

    // Enrich with master route dataset (including dynamically ingested routes and departure schedules)
    try {
        const state = loadBusState();
        const ds = state._routesDatabase || loadRoutesDataset();
        if (ds && Array.isArray(ds.routes)) {
            ds.routes.forEach(r => {
                const cleanCode = String(r.code || r.id || "").toUpperCase().trim();
                if (!cleanCode) return;
                const flatTimetables = Array.isArray(r.timetables) ? r.timetables.flat().filter(Boolean) : null;
                let existingDir = directionalRoutes.find(c => c.code === cleanCode);
                if (!existingDir) {
                    const cObj = {
                        id: cleanCode,
                        code: cleanCode,
                        routeCode: cleanCode,
                        routeId: cleanCode,
                        depot: String(r.depotId || "1"),
                        depotId: String(r.depotId || "1"),
                        origin: r.origin || "Origin",
                        destination: r.destination || "Destination",
                        distKm: Number(r.distance) || 28.7,
                        distanceKm: Number(r.distance) || 28.7,
                        actualKm: r.actualKm || r.fullDutyKm || undefined,
                        fullDutyKm: r.fullDutyKm || undefined,
                        timetables: flatTimetables || undefined,
                        trips: (flatTimetables && flatTimetables.length) || 8,
                        label: `${r.origin || 'Origin'} ⇔ ${r.destination || 'Destination'} (Route ${cleanCode}) — ${r.distance || 28.7} km`
                    };
                    directionalRoutes.push(cObj);
                    corridorMap.push(cObj);
                } else {
                    if (flatTimetables) {
                        existingDir.timetables = flatTimetables;
                        existingDir.trips = flatTimetables.length || existingDir.trips;
                    }
                    if (r.fullDutyKm) existingDir.fullDutyKm = r.fullDutyKm;
                    if (r.actualKm || r.fullDutyKm) existingDir.actualKm = r.actualKm || r.fullDutyKm;
                }

                // Filter out any deleted departure times explicitly removed by Admin
                if (Array.isArray(r._deletedTimes) && r._deletedTimes.length > 0) {
                    const delKeys = new Set(
                        r._deletedTimes.map(dt => {
                            const parts = normalizeDepartureTimeParts(dt);
                            return parts ? parts.h24Str : String(dt || "").trim().toLowerCase();
                        })
                    );
                    for (let i = schedules.length - 1; i >= 0; i--) {
                        if (String(schedules[i].route || "").toUpperCase().trim() !== cleanCode) continue;
                        const sTimeRaw = schedules[i].departureTime || schedules[i].outTime || "";
                        const sParts = normalizeDepartureTimeParts(sTimeRaw) || normalizeDepartureTimeParts(schedules[i].outTime);
                        const sKey = sParts ? sParts.h24Str : String(sTimeRaw).trim().toLowerCase();
                        if (delKeys.has(sKey)) {
                            schedules.splice(i, 1);
                        }
                    }
                }

                if (Array.isArray(r.schedules)) {
                    r.schedules.forEach(s => {
                        const sId = String(s.scheduleId || "").trim();
                        const sParts = normalizeDepartureTimeParts(s.departureTime || s.outTime);
                        const outNorm = sParts ? sParts.outTime24 : (s.outTime || s.departureTime || "08:00:00");
                        const depNorm = sParts ? sParts.ampmStr : (s.departureTime || s.outTime || "08:00 AM");
                        const dupByTime = sParts && schedules.some(x => {
                            if (String(x.route || "").toUpperCase().trim() !== cleanCode) return false;
                            const xp = normalizeDepartureTimeParts(x.departureTime || x.outTime);
                            return xp && xp.h24Str === sParts.h24Str;
                        });
                        if (sId && !schedules.some(x => String(x.scheduleId).toLowerCase() === sId.toLowerCase()) && !dupByTime) {
                            schedules.push({
                                scheduleId: sId,
                                route: cleanCode,
                                shift: s.shift || (sParts ? sParts.shift : "General Shift"),
                                fixBm: s.fixBm || "",
                                fixReg: s.fixReg || "",
                                swapBm: s.swapBm || "",
                                swapReg: s.swapReg || "",
                                outTime: outNorm,
                                departureTime: depNorm,
                                inTime: s.inTime || "16:00:00",
                                category: s.category || r.routeComplexity || "Standard",
                                singleChargeReqKm: s.singleChargeReqKm || s.totalGroupDistance || Math.round((Number(r.distance) || 25) * 1.5),
                                totalGroupDistance: s.totalGroupDistance || s.distance || Number(r.fullDutyKm || r.distance || 0),
                                distance: s.distance || s.totalGroupDistance || Number(r.distance || 0),
                                actualKm: s.actualKm || s.totalGroupDistance || Number(r.actualKm || r.fullDutyKm || 0)
                            });
                        }
                    });
                }

                // Ensure any custom departure times stored in r.timetables exist in corridor schedules
                if (flatTimetables && flatTimetables.length > 0) {
                    flatTimetables.forEach(tStr => {
                        const tParts = normalizeDepartureTimeParts(tStr);
                        if (!tParts) return;
                        const alreadyInSched = schedules.some(x => {
                            if (String(x.route || "").toUpperCase().trim() !== cleanCode) return false;
                            const xp = normalizeDepartureTimeParts(x.departureTime || x.outTime);
                            return xp && xp.h24Str === tParts.h24Str;
                        });
                        if (!alreadyInSched) {
                            schedules.push({
                                scheduleId: `${cleanCode}/T-${tParts.h24Str.replace(":", "")}`,
                                route: cleanCode,
                                shift: tParts.shift,
                                fixBm: "",
                                fixReg: "",
                                swapBm: "",
                                swapReg: "",
                                outTime: tParts.outTime24,
                                departureTime: tParts.ampmStr,
                                inTime: "16:00:00",
                                category: r.routeComplexity || r.category || "Standard",
                                singleChargeReqKm: r.singleChargeReqKm || Math.round((Number(r.distance) || 25) * 1.5),
                                totalGroupDistance: Number(r.fullDutyKm || r.distance || 0),
                                distance: Number(r.distance || 0),
                                actualKm: Number(r.actualKm || r.fullDutyKm || 0)
                            });
                        }
                    });
                }
            });
        }
    } catch (e) {
        console.warn("Could not enrich corridor schedules from master route dataset:", e.message);
    }

    cachedCorridorSchedules = { corridors: corridorMap, directionalRoutes, schedules };

    return cachedCorridorSchedules;

}



function loadStops() {

    if (cachedStops) return cachedStops;

    const raw = fs.readFileSync(STOPS_FILE, "utf8");

    const lines = raw.split(/\r?\n/).filter(Boolean);



    if (lines.length <= 1) {

        return [];

    }



    cachedStops = lines.slice(1).map((line) => {

        const [stopName, parentStation, zoneId, stopId, stopDesc, stopLat, stopLon, locationType, platformCode] = parseCsvLine(line);



        return {

            stopName: (stopName || "").trim(),

            parentStation: (parentStation || "").trim(),

            zoneId: (zoneId || "").trim(),

            stopId: (stopId || "").trim(),

            stopDesc: (stopDesc || "").trim(),

            stopLat: Number.parseFloat(stopLat),

            stopLon: Number.parseFloat(stopLon),

            locationType: (locationType || "").trim(),

            platformCode: (platformCode || "").trim()

        };

    });

    return cachedStops;

}



function loadTrips() {

    if (cachedTrips) return cachedTrips;

    const raw = fs.readFileSync(TRIPS_FILE, "utf8");

    const lines = raw.split(/\r?\n/).filter(Boolean);



    if (lines.length <= 1) {

        return [];

    }



    cachedTrips = lines.slice(1).map((line) => {

        const [routeId, serviceId, tripHeadsign, directionId, shapeId, tripId] = parseCsvLine(line);



        return {

            routeId: (routeId || "").trim(),

            serviceId: (serviceId || "").trim(),

            tripHeadsign: (tripHeadsign || "").trim(),

            directionId: (directionId || "").trim(),

            shapeId: (shapeId || "").trim(),

            tripId: (tripId || "").trim()

        };

    });

    return cachedTrips;

}



function loadStopTimes() {

    if (cachedStopTimes) return cachedStopTimes;

    const raw = fs.readFileSync(STOP_TIMES_FILE, "utf8");

    const lines = raw.split(/\r?\n/).filter(Boolean);



    if (lines.length <= 1) {

        return [];

    }



    cachedStopTimes = lines.slice(1).map((line) => {

        const [tripId, arrivalTime, departureTime, stopId, stopSequence, stopHeadsign, pickupType, dropOffType, shapeDistTraveled, timepoint] = parseCsvLine(line);



        return {

            tripId: (tripId || "").trim(),

            arrivalTime: (arrivalTime || "").trim(),

            departureTime: (departureTime || "").trim(),

            stopId: (stopId || "").trim(),

            stopSequence: (stopSequence || "").trim(),

            stopHeadsign: (stopHeadsign || "").trim(),

            pickupType: (pickupType || "").trim(),

            dropOffType: (dropOffType || "").trim(),

            shapeDistTraveled: (shapeDistTraveled || "").trim(),

            timepoint: (timepoint || "").trim()

        };

    });

    return cachedStopTimes;

}



function loadShapes() {

    if (cachedShapes) return cachedShapes;

    const raw = fs.readFileSync(SHAPES_FILE, "utf8");

    const lines = raw.split(/\r?\n/).filter(Boolean);



    if (lines.length <= 1) {

        return [];

    }



    cachedShapes = lines.slice(1).map((line) => {

        const [shapeId, shapePtLat, shapePtLon, shapePtSequence] = parseCsvLine(line);



        return {

            shapeId: (shapeId || "").trim(),

            shapePtLat: Number.parseFloat(shapePtLat),

            shapePtLon: Number.parseFloat(shapePtLon),

            shapePtSequence: Number.parseInt(shapePtSequence, 10)

        };

    });

    return cachedShapes;

}



function loadGtfsScheduleSummary() {

    if (cachedGtfsScheduleSummary) return cachedGtfsScheduleSummary;



    const trips = loadTrips();

    const stopTimes = loadStopTimes();

    const tripCounts = getRouteTripCounts();



    const tripToRoute = new Map();

    for (const t of trips) {

        tripToRoute.set(String(t.tripId), String(t.routeId));

    }



    const scheduleMap = {};

    for (const st of stopTimes) {

        const rId = tripToRoute.get(String(st.tripId));

        if (!rId) continue;

        const dep = st.departureTime || st.arrivalTime;

        const arr = st.arrivalTime || st.departureTime;

        if (!scheduleMap[rId]) {

            scheduleMap[rId] = { firstDep: dep, lastArr: arr, count: 0, tripCount: tripCounts.get(String(rId)) || 0 };

        }

        const item = scheduleMap[rId];

        item.count += 1;

        if (dep && (!item.firstDep || dep < item.firstDep)) item.firstDep = dep;

        if (arr && (!item.lastArr || arr > item.lastArr)) item.lastArr = arr;

    }



    // Ensure all routes with trips are represented

    for (const [rId, c] of tripCounts.entries()) {

        if (!scheduleMap[rId]) {

            scheduleMap[rId] = { firstDep: "06:00:00", lastArr: "21:00:00", count: 0, tripCount: c };

        } else {

            scheduleMap[rId].tripCount = c;

        }

    }



    cachedGtfsScheduleSummary = scheduleMap;

    return cachedGtfsScheduleSummary;

}



function haversineKm(latitudeOne, longitudeOne, latitudeTwo, longitudeTwo) {

    const earthRadiusKm = 6371;

    const toRadians = (degrees) => (degrees * Math.PI) / 180;

    const latitudeOneRadians = toRadians(latitudeOne);

    const latitudeTwoRadians = toRadians(latitudeTwo);

    const deltaLatitude = toRadians(latitudeTwo - latitudeOne);

    const deltaLongitude = toRadians(longitudeTwo - longitudeOne);

    const value = Math.sin(deltaLatitude / 2) ** 2

        + Math.cos(latitudeOneRadians) * Math.cos(latitudeTwoRadians) * Math.sin(deltaLongitude / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));

}



function ensureShapesIndexed() {

    if (cachedShapesByShapeId) return cachedShapesByShapeId;

    cachedShapesByShapeId = new Map();

    for (const p of loadShapes()) {

        if (!cachedShapesByShapeId.has(p.shapeId)) cachedShapesByShapeId.set(p.shapeId, []);

        cachedShapesByShapeId.get(p.shapeId).push(p);

    }

    for (const pts of cachedShapesByShapeId.values()) {

        pts.sort((a, b) => a.shapePtSequence - b.shapePtSequence);

    }

    return cachedShapesByShapeId;

}



function calculateRouteDistanceByRouteId(routeId) {

    const key = String(routeId);

    if (cachedRouteDistances.has(key)) {

        return cachedRouteDistances.get(key);

    }



    const trips = loadTrips().filter((t) => String(t.routeId) === key);

    const trip = trips.find((t) => Number(t.directionId) === 0) || trips[0];

    if (!trip) return null;



    const shapesIndex = ensureShapesIndexed();

    const shapePoints = shapesIndex.get(trip.shapeId);

    if (!shapePoints || shapePoints.length < 2) return null;



    let total = 0;

    for (let i = 1; i < shapePoints.length; i++) {

        const prev = shapePoints[i - 1];

        const cur = shapePoints[i];

        if (![prev.shapePtLat, prev.shapePtLon, cur.shapePtLat, cur.shapePtLon].every(Number.isFinite)) continue;

        total += haversineKm(prev.shapePtLat, prev.shapePtLon, cur.shapePtLat, cur.shapePtLon);

    }



    const dist = Number(total.toFixed(2));

    cachedRouteDistances.set(key, dist);

    return dist;

}



function calculateRouteDistance(busIdentifier, routeIdParam) {

    const raw = String(busIdentifier || "").trim();

    const rawRouteId = String(routeIdParam || "").trim();

    const allRoutes = loadRoutes();



    let route = null;

    if (rawRouteId) {

        route = allRoutes.find((candidate) => String(candidate.routeId) === rawRouteId);

    }

    // Match by busNumber (bus_short_name) FIRST so it matches the specific route line

    if (!route && raw) {

        route = allRoutes.find((candidate) => candidate.busNumber && candidate.busNumber.toLowerCase() === raw.toLowerCase());

    }

    if (!route && raw) {

        route = allRoutes.find((candidate) => candidate.uniqueId && candidate.uniqueId.toLowerCase() === raw.toLowerCase());

    }

    if (!route && raw) {

        route = allRoutes.find((candidate) => String(candidate.routeId) === raw);

    }

    if (!route && raw) {

        const rawLower = raw.toLowerCase();

        const rawCompact = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        route = allRoutes.find((candidate) => {

            const b = String(candidate.busNumber || "").toLowerCase();

            return b === rawLower || b.replace(/[^a-zA-Z0-9]/g, "") === rawCompact;

        });

    }



    if (!route) {

        return { ok: false, statusCode: 404, error: `Bus or Route ${busIdentifier || routeIdParam} was not found in routes.txt.` };

    }



    const busName = route.busNumber; // This is the bus_short_name (e.g. 401-A)

    const uniqueId = route.uniqueId;



    // Calculate the FIXED GTFS route distance of this bus_short_name / route

    const distanceKm = calculateRouteDistanceByRouteId(route.corridorRouteId || route.routeId) || route.gtfsDistanceKm || route.distanceKm || 28.7;



    const routeTrips = loadTrips().filter((trip) => String(trip.routeId) === String(route.corridorRouteId || route.routeId));

    const selectedTrip = routeTrips.find((trip) => Number(trip.directionId) === 0) || routeTrips[0];



    return {

        ok: true,

        uniqueId,

        unique_id: uniqueId,

        busNumber: busName,

        routeShortName: busName,

        routeId: route.routeId,

        originalRouteId: route.routeId,

        tripId: selectedTrip ? selectedTrip.tripId : "",

        shapeId: selectedTrip ? selectedTrip.shapeId : "",

        distanceKm

    };

}



// ── Fixed Vehicle Assignment Engine (BM Number Model) ─────────────────────────

// uniqueId / bmNumber (e.g. BM238, BM291) is the physical vehicle holding battery SoC, condition, and telemetry.

// GTFS Route (route_id + bus_short_name + Origin ➔ Destination + distance) is the FIXED public line.

// Routes are permanently bound 1:1 to their fixed designated BM number. No dynamic swapping.

// Persists mapping in bus_state.json under "_assignments" and "_vehicleAssignments".

// ─────────────────────────────────────────────────────────────────────────────



const SWAP_THRESHOLD_PCT = 5;       // minimum SoC gap (%) needed to trigger a swap

const RANGE_KM_PER_SOC_PCT = 1.42;  // km per 1% SoC — fallback when Python API is unavailable

const SOC_BUFFER_PCT = 10;          // reserve: usable SoC = soc - buffer

const DEPOT_MIN_SOC_FLOOR = 25;     // matches Python DEPOT_MIN_SOC_FLOOR in config.py



// ── Page 4 Priority Allocation Matrix ─────────────────────────────────────────

// Maps Route Category (Difficulty) x Time Slot -> Allowed Bus Range Categories.

// Category A: > 120 km | Category B: 100-120 km | Category C: < 100 km

const ALLOWED_CATEGORIES = {

    SIMPLE: {

        NORMAL: ["A", "B", "C"],

        PEAK: ["A", "B"],

        EXTREME_PEAK: ["A", "B"]

    },

    STANDARD: {

        NORMAL: ["A", "B"],

        PEAK: ["A", "B"],

        EXTREME_PEAK: ["A", "B"]

    },

    MODERATE: {

        NORMAL: ["A", "B"],

        PEAK: ["A"],

        EXTREME_PEAK: ["A"]

    },

    COMPLEX: {

        NORMAL: ["A"],

        PEAK: ["A"],

        EXTREME_PEAK: ["A"]

    }

};



/**

 * Maps a Date or hour to Page 4 Time Slot.

 * 05:00–07:00 -> NORMAL

 * 07:00–10:00 -> EXTREME_PEAK

 * 10:00–16:00 -> PEAK

 * 16:00–20:00 -> EXTREME_PEAK

 * 20:00–23:00 -> PEAK

 * 23:00–05:00 -> NORMAL (Off-peak night)

 */

function getTimeSlot(date = new Date()) {

    const hour = typeof date === "number" ? date : date.getHours();

    if (hour >= 5 && hour < 7) return "NORMAL";

    if (hour >= 7 && hour < 10) return "EXTREME_PEAK";

    if (hour >= 10 && hour < 16) return "PEAK";

    if (hour >= 16 && hour < 20) return "EXTREME_PEAK";

    if (hour >= 20 && hour < 23) return "PEAK";

    return "NORMAL";

}



/**

 * Returns route category ("SIMPLE" | "STANDARD" | "MODERATE" | "COMPLEX") from distance or explicit tag.

 */

function getRouteCategory(distKm, explicit) {

    if (explicit && ["SIMPLE", "STANDARD", "MODERATE", "COMPLEX"].includes(String(explicit).toUpperCase())) {

        return String(explicit).toUpperCase();

    }

    const d = Number(distKm) || 0;

    if (d >= 20.0) return "COMPLEX";

    if (d >= 10.0) return "MODERATE";

    return "SIMPLE";

}



/**

 * Returns bus range category ("A" | "B" | "C") based on Page 4 thresholds.

 * Category A: > 120 km | Category B: 100 - 120 km | Category C: < 100 km

 */

function getBusCategory(rangeKm) {

    const r = Number(rangeKm) || 0;

    if (r > 120.0) return "A";

    if (r >= 100.0) return "B";

    return "C";

}



// Per-vehicle blended range cache: uniqueId → { rangeKm, category, ts }

// Populated asynchronously by fetchAndCachePythonRange() after every telemetry save.

// estimatedRangeKm() uses this if available; falls back to the flat formula otherwise.

const _pythonRangeCache = new Map();

const PYTHON_RANGE_TTL_MS = 60_000; // 60 s — discard stale Python estimates



/**

 * Return the estimated range in km for a bus.

 * Uses the Python blended estimate (planned+live) when available and fresh,

 * otherwise falls back to the flat 1.42 km/% formula.

 *

 * @param {number} soc      - current SoC %

 * @param {string} [uniqueId] - BM number key (e.g. BM238) for the Python cache lookup

 */

function estimatedRangeKm(soc, uniqueId) {

    if (uniqueId) {

        const cached = _pythonRangeCache.get(uniqueId);

        if (cached && (Date.now() - cached.ts) < PYTHON_RANGE_TTL_MS) {

            return cached.rangeKm;

        }

    }

    // Fallback: flat formula

    const usable = Math.max(0, soc - SOC_BUFFER_PCT);

    return Math.round(usable * RANGE_KM_PER_SOC_PCT);

}



/**

 * Fire-and-forget: fetch blended range from Python and update the cache.

 * Never awaited from the hot path — does not block telemetry responses.

 *

 * @param {string} uniqueId - BM number (e.g. BM238)

 * @param {number} soc      - current SoC (used as cache fallback if Python fails)

 */

function fetchAndCachePythonRange(uniqueId, soc) {

    fetch(`${PYTHON_API_BASE}/range/${encodeURIComponent(uniqueId)}`)

        .then((r) => r.ok ? r.json() : null)

        .then((data) => {

            if (data && data.ok && Number.isFinite(data.blended_range_km) && data.blended_range_km > 0) {

                _pythonRangeCache.set(uniqueId, {

                    rangeKm: data.blended_range_km,

                    category: data.range_category || "C",

                    ts: Date.now()

                });

            }

        })

        .catch(() => {}); // silent — Python sidecar may not be running locally

}





/**

 * Assigns each route to its fixed designated BM Number with NO swapping.

 * Evaluates feasibility and updates state._assignments in-place.

 */

function ensureFixedAssignments(state) {

    const allRoutes = loadRoutes();

    const currentSlot = getTimeSlot();



    const routeInfos = allRoutes.map((r) => {

        const dist = calculateRouteDistanceByRouteId(r.corridorRouteId || r.routeId) || r.gtfsDistanceKm || r.distanceKm || 28.7;

        return {

            uniqueId: r.uniqueId,

            bmNumber: r.bmNumber || r.uniqueId,

            routeId: String(r.routeId),

            corridorRouteId: r.corridorRouteId,

            busShortName: (r.busNumber || "N/A").trim(),

            routeName: (r.routeName || "").trim(),

            origin: r.origin || "",

            destination: r.destination || "",

            gtfsDistanceKm: dist,

            routeCategory: getRouteCategory(dist, r.routeCategory || (state[r.routeId] && state[r.routeId].routeCategory))

        };

    }).filter((r) => r.gtfsDistanceKm !== null && r.gtfsDistanceKm > 0);



    if (!routeInfos.length) return state;



    // Read telemetry for each physical vehicle (uniqueId / bmNumber)

    const vehicleTelemetry = {};

    for (const r of routeInfos) {

        const uId = r.uniqueId;

        const s = state[uId] || state[r.busShortName] || state[r.routeId] || {};

        const soc = Number.isFinite(Number(s.soc)) ? Number(s.soc) : 0;

        const range = estimatedRangeKm(soc, uId);

        vehicleTelemetry[uId] = {

            uniqueId: uId,

            bmNumber: uId,

            defaultRouteId: r.routeId,

            defaultBusShortName: r.busShortName,

            soc,

            condition: s.condition || "Good",

            driver: s.driver || "Driver Assigned",

            estimatedRangeKm: range,

            busCategory: getBusCategory(range)

        };

    }



    // FIXED assignments: NO swapping! Each route is permanently bound to its designated BM Number

    const routeToVehicle = {};

    const vehicleToRoute = {};

    for (const r of routeInfos) {

        routeToVehicle[r.routeId] = r.uniqueId;

        vehicleToRoute[r.uniqueId] = r.routeId;

    }



    // Evaluate departure blockage and format details

    const blockedVehicles = [];

    const blockedRouteIds = [];

    const vehicleAssignmentsDetails = {};

    const busAssignmentsDetails = {};

    const ranges = {};



    for (const r of routeInfos) {

        const uId = r.uniqueId;

        const assignedRouteId = r.routeId;

        const assignedRouteObj = r;

        const t = vehicleTelemetry[uId] || { soc: 0, condition: "Good", driver: "Driver Assigned", estimatedRangeKm: 0, busCategory: "C" };

        const range = estimatedRangeKm(t.soc, uId);

        const dist = assignedRouteObj.gtfsDistanceKm;

        const isNoDriver = Boolean(t.driver && t.driver.toLowerCase().includes("no"));

        const isBlocked = (dist > 0 && range < dist) || (t.condition === "Not Good") || (t.soc < 25) || isNoDriver;

        const allowed = (ALLOWED_CATEGORIES[assignedRouteObj.routeCategory] || ALLOWED_CATEGORIES.SIMPLE)[currentSlot] || ["A"];

        const busCat = t.busCategory || getBusCategory(range);

        const matrixCompliant = allowed.includes(busCat);



        if (isBlocked) {

            blockedVehicles.push(uId);

            blockedRouteIds.push(assignedRouteId);

        }



        const routeDisplay = `Route ${assignedRouteId} - ${assignedRouteObj.busShortName} (${dist.toFixed(1)} km)`;



        const record = {

            uniqueId: uId,

            unique_id: uId,

            vehicleId: uId,

            bmNumber: uId,

            busName: uId,

            defaultBusShortName: r.busShortName,

            assignedRouteId,

            assignedRouteShortName: assignedRouteObj.busShortName,

            origin: assignedRouteObj.origin,

            destination: assignedRouteObj.destination,

            assignedRouteDistanceKm: dist,

            assignedRouteDisplay: routeDisplay,

            routeCategory: assignedRouteObj.routeCategory,

            timeSlot: currentSlot,

            busCategory: busCat,

            allowedCategories: allowed,

            matrixCompliant,

            soc: t.soc,

            condition: t.condition,

            driver: t.driver || "Driver Assigned",

            estimatedRangeKm: range,

            fullDutyDistanceKm: range,

            operationMode: "Single Charge Operation",

            blocked: isBlocked

        };



        vehicleAssignmentsDetails[uId] = record;

        busAssignmentsDetails[uId] = record;

        busAssignmentsDetails[r.busShortName] = record;



        ranges[assignedRouteId] = {

            assignedVehicle: uId,

            bmNumber: uId,

            routeCategory: assignedRouteObj.routeCategory,

            timeSlot: currentSlot,

            busCategory: busCat,

            allowedCategories: allowed,

            matrixCompliant,

            soc: t.soc,

            condition: t.condition,

            driver: t.driver || "Driver Assigned",

            estimatedRangeKm: range,

            fullDutyDistanceKm: range,

            operationMode: "Single Charge Operation",

            gtfsDistanceKm: dist,

            blocked: isBlocked

        };

    }



    const mergedAssignments = {};

    for (const [rId, vId] of Object.entries(routeToVehicle)) {

        mergedAssignments[rId] = vId;

        mergedAssignments[vId] = rId;

        const routeObj = routeInfos.find((x) => x.routeId === rId);

        if (routeObj) {

            mergedAssignments[routeObj.busShortName] = vId;

        }

    }



    for (const [uId, details] of Object.entries(vehicleAssignmentsDetails)) {

        if (!state[uId]) {

            state[uId] = { uniqueId: uId, bmNumber: uId, soc: details.soc, condition: details.condition, status: details.soc > 30 ? "Active" : "Blocked" };

        }

        state[uId].uniqueId = uId;

        state[uId].bmNumber = uId;

        state[uId].soc = details.soc;

        state[uId].condition = details.condition;

        state[uId].status = details.soc > 30 ? "Active" : details.soc > 15 ? "Warning" : "Blocked";

        state[uId].assignedRouteId = details.assignedRouteId;

        state[uId].assignedRouteDisplay = details.assignedRouteDisplay;

        state[uId].assignedRouteShortName = details.assignedRouteShortName;

        state[uId].blocked = details.blocked;



        const rId = details.assignedRouteId;

        if (!state[rId]) {

            state[rId] = { soc: details.soc, condition: details.condition, status: state[uId].status };

        }

        state[rId].soc = details.soc;

        state[rId].condition = details.condition;

        state[rId].status = state[uId].status;

        state[rId].uniqueId = uId;

        state[rId].bmNumber = uId;

        state[rId].busNumber = details.assignedRouteShortName;

        state[rId].blocked = details.blocked;



        const bShort = details.assignedRouteShortName;

        if (bShort) {

            if (!state[bShort]) {

                state[bShort] = { soc: details.soc, condition: details.condition, status: state[uId].status };

            }

            state[bShort].soc = details.soc;

            state[bShort].condition = details.condition;

            state[bShort].status = state[uId].status;

            state[bShort].uniqueId = uId;

            state[bShort].bmNumber = uId;

            state[bShort].blocked = details.blocked;

        }

    }



    state._assignments = mergedAssignments;

    state._vehicleAssignments = vehicleAssignmentsDetails;

    state._busAssignments = busAssignmentsDetails;

    state._blockedBuses = [...new Set(blockedVehicles)];

    state._blockedRouteIds = [...new Set(blockedRouteIds)];

    state.ranges = ranges;

    state._swapLog = [];



    return state;

}



function swapBusAssignments(state) {

    return ensureFixedAssignments(state);

}

// ─────────────────────────────────────────────────────────────────────────────



function sendJson(res, payload, statusCode = 200) {

    const jsonStr = typeof payload === "string" ? payload : JSON.stringify(payload);

    const acceptEncoding = (res.req && res.req.headers["accept-encoding"]) || "";

    const headers = {

        "Content-Type": "application/json",

        "Access-Control-Allow-Origin": "*",

        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AIO-Key"

    };



    if (acceptEncoding.includes("gzip") && jsonStr.length > 512) {

        zlib.gzip(Buffer.from(jsonStr, "utf8"), (err, compressed) => {

            if (!err) {

                headers["Content-Encoding"] = "gzip";

                res.writeHead(statusCode, headers);

                res.end(compressed);

            } else {

                res.writeHead(statusCode, headers);

                res.end(jsonStr);

            }

        });

    } else {

        res.writeHead(statusCode, headers);

        res.end(jsonStr);

    }

}



function readBody(req, callback) {

    let body = "";

    req.on("data", chunk => { body += chunk; });

    req.on("end", () => callback(body));

    req.on("error", () => callback(""));

}



// ── Real-Time Cross-Device Synchronization Engine (SSE & State Versioning) ──

let stateVersion = Date.now();

const sseClients = new Set();



function broadcastSyncEvent(eventType, data = {}) {

    stateVersion = Date.now();

    const payload = JSON.stringify({

        type: eventType,

        version: stateVersion,

        data,

        timestamp: Date.now()

    });

    for (const client of sseClients) {

        try {

            client.write(`event: ${eventType}\ndata: ${payload}\n\n`);

        } catch (e) {

            sseClients.delete(client);

        }

    }

}



// Keep SSE connections active with comment pings every 20 seconds

setInterval(() => {

    for (const client of sseClients) {

        try {

            client.write(": ping\n\n");

        } catch (e) {

            sseClients.delete(client);

        }

    }

}, 20000).unref();



function sendFile(res, filePath, contentType) {

    fs.readFile(filePath, (error, data) => {

        if (error) {

            sendJson(res, { error: "File not found" }, 404);

            return;

        }



        const acceptEncoding = (res.req && res.req.headers["accept-encoding"]) || "";

        const headers = {

            "Content-Type": contentType,

            "Access-Control-Allow-Origin": "*",

            "Cache-Control": "no-cache, no-store, must-revalidate",

            "Pragma": "no-cache",

            "Expires": "0"

        };



        if (acceptEncoding.includes("gzip") && data.length > 512) {

            zlib.gzip(data, (err, compressed) => {

                if (!err) {

                    headers["Content-Encoding"] = "gzip";

                    res.writeHead(200, headers);

                    res.end(compressed);

                } else {

                    res.writeHead(200, headers);

                    res.end(data);

                }

            });

        } else {

            res.writeHead(200, headers);

            res.end(data);

        }

    });

}



function sendTextFile(res, filePath) {

    sendFile(res, filePath, "text/plain; charset=utf-8");

}



function readJsonFile(filePath, fallbackValue) {

    try {

        if (!fs.existsSync(filePath)) {

            return fallbackValue;

        }



        const raw = fs.readFileSync(filePath, "utf8");

        if (!raw.trim()) {

            return fallbackValue;

        }



        return JSON.parse(raw);

    } catch (error) {

        console.warn(`Failed to read JSON file ${filePath}:`, error.message);

        return fallbackValue;

    }

}



function writeJsonFile(filePath, value) {

    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");

}



// ── GitHub Persistence ─────────────────────────────────────────────────────

// Keeps bus_state.json in sync with the GitHub repo so SoC values survive

// Render server restarts / redeploys (Render free tier has ephemeral storage).

// Requires GITHUB_TOKEN env var (Personal Access Token with repo scope).



function githubRequest(method, apiPath, body) {

    return new Promise((resolve, reject) => {

        const payload = body ? JSON.stringify(body) : null;

        const req = https.request(

            {

                hostname: "api.github.com",

                path: apiPath,

                method,

                headers: Object.assign(

                    {

                        "User-Agent": "ashok-leyland-server",

                        Accept: "application/vnd.github.v3+json"

                    },

                    GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},

                    payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}

                )

            },

            (res) => {

                let data = "";

                res.on("data", (c) => { data += c; });

                res.on("end", () => {

                    try { resolve(JSON.parse(data)); } catch { resolve({}); }

                });

            }

        );

        req.on("error", reject);

        if (payload) req.write(payload);

        req.end();

    });

}



// ── Master in-memory Bus State Cache ──────────────────────────────────────

let masterBusState = null;

let githubSyncTimer = null;

let isSyncingToGitHub = false;

let pendingGitHubSync = false;



// Push bus_state.json to GitHub with debouncing and conflict safety

function syncBusStateToGitHub(state) {

    if (!GITHUB_TOKEN) return;

    pendingGitHubSync = true;

    if (githubSyncTimer) clearTimeout(githubSyncTimer);

    githubSyncTimer = setTimeout(async () => {

        if (isSyncingToGitHub) return;

        while (pendingGitHubSync) {

            pendingGitHubSync = false;

            isSyncingToGitHub = true;

            try {

                const apiPath = `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

                const current = await githubRequest("GET", apiPath);

                const content = Buffer.from(JSON.stringify(masterBusState || state, null, 2)).toString("base64");

                await githubRequest("PUT", apiPath, {

                    message: "auto: sync bus_state from server [skip render] [skip ci]",

                    content,

                    sha: current.sha

                });

                console.log("[GitHub] bus_state.json synced [skip render] ✓");

            } catch (e) {

                console.warn("[GitHub sync failed]", e.message);

                break;

            } finally {

                isSyncingToGitHub = false;

            }

        }

    }, 30000);

}



// Pull bus_state.json from GitHub and overwrite local copy (called once at startup)

async function restoreBusStateFromGitHub() {

    if (!GITHUB_TOKEN) {

        console.log("[GitHub] No GITHUB_TOKEN set — skipping restore. Add it in Render env vars to enable persistence.");

        return;

    }

    try {

        const apiPath = `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

        const result = await githubRequest("GET", apiPath);

        if (result && result.content) {

            const decoded = Buffer.from(result.content, "base64").toString("utf8");

            fs.writeFileSync(BUS_STATE_FILE, decoded, "utf8");

            try {

                masterBusState = JSON.parse(decoded);

            } catch (err) {}

            console.log("[GitHub] bus_state.json restored from GitHub ✓");

        }

    } catch (e) {

        console.warn("[GitHub restore failed]", e.message);

    }

}

// ──────────────────────────────────────────────────────────────────────────────



const BASE_DEPOT_MAP = {"BM001":"1","BM002":"1","BM003":"1","BM004":"1","BM005":"1","BM010":"1","BM012":"1","BM019":"1","BM020":"1","BM024":"1","BM032":"1","BM033":"1","BM038":"1","BM052":"2","BM054":"1","BM056":"1","BM057":"1","BM058":"1","BM062":"1","BM068":"1","BM075":"1","BM080":"1","BM081":"1","BM082":"1","BM086":"1","BM088":"1","BM107":"1","BM116":"1","BM119":"1","BM124":"1","BM151":"1","BM152":"1","BM153":"1","BM157":"1","BM174":"1","BM183":"1","BM185":"1","BM187":"1","BM191":"1","BM193":"1","BM197":"1","BM198":"1","BM199":"1","BM200":"1","BM201":"1","BM202":"1","BM203":"1","BM204":"1","BM205":"1","BM206":"1","BM207":"1","BM208":"1","BM209":"1","BM210":"1","BM212":"1","BM213":"1","BM214":"1","BM215":"1","BM216":"1","BM217":"1","BM218":"1","BM219":"2","BM220":"2","BM221":"2","BM222":"2","BM223":"2","BM224":"2","BM225":"2","BM227":"2","BM238":"2","BM239":"2","BM240":"2","BM245":"2","BM248":"2","BM249":"2","BM250":"2","BM253":"2","BM255":"2","BM256":"2","BM257":"2","BM258":"2","BM259":"2","BM260":"2","BM261":"2","BM263":"2","BM264":"2","BM265":"2","BM267":"2","BM268":"2","BM269":"2","BM271":"2","BM272":"2","BM273":"2","BM274":"2","BM275":"2","BM276":"2","BM277":"2","BM278":"2","BM279":"1","BM280":"2","BM281":"2","BM282":"2","BM283":"2","BM284":"2","BM285":"2","BM286":"2","BM287":"2","BM288":"2","BM289":"2","BM290":"2","BM291":"2","BM292":"2","BM293":"2","BM294":"2","BM295":"2","BM296":"2","BM297":"2","BM298":"2","BM299":"2","BM300":"2","BM303":"1","BM304":"2"};



function getDefaultDepotAssignments() {

    const assignments = Object.assign({}, BASE_DEPOT_MAP);

    try {

        if (fs.existsSync(VEHICLES_FILE)) {

            const raw = fs.readFileSync(VEHICLES_FILE, "utf8");

            const lines = raw.split(/\r?\n/).slice(1).filter(Boolean);

            const bms = lines.map(l => (l.split(",")[0] || "").trim()).filter(Boolean);

            bms.forEach((bm) => {

                const upper = bm.toUpperCase();

                if (!assignments[upper]) {

                    assignments[upper] = "1";

                }

            });

            return assignments;

        }

    } catch (e) {

        console.warn("Could not read vehicles file for default depot assignments:", e.message);

    }

    return assignments;

}



function getDepotCounts(assignments, state) {

    let d1Count = 0;

    let d2Count = 0;

    const busState = state || loadBusState();

    const map = assignments || (busState && busState._depotAssignments) || getDefaultDepotAssignments();

    const deletedBuses = (busState && busState._deletedBuses) || {};

    const addedBuses = (busState && busState._addedBuses) || {};



    const allBms = new Set([

        ...Object.keys(map),

        ...Object.keys(getDefaultDepotAssignments()),

        ...Object.keys(addedBuses)

    ]);



    for (const bm of allBms) {

        const cleanBm = String(bm).toUpperCase().trim();

        // Canonical BM filter: only physical buses matching BM followed by digits
        if (!/^BM\d+$/i.test(cleanBm)) {
            continue;
        }

        // Skip deleted buses

        if (deletedBuses[cleanBm] || (busState && busState[cleanBm] && (busState[cleanBm].deleted || busState[cleanBm].status === "Deleted" || busState[cleanBm].isDeleted))) {

            continue;

        }

        const depot = String(map[cleanBm] || (addedBuses[cleanBm] && addedBuses[cleanBm].depot) || getDefaultDepotAssignments()[cleanBm] || "1");

        if (depot === "2") {

            d2Count++;

        } else {

            d1Count++;

        }

    }

    return { depot1Count: d1Count, depot2Count: d2Count, total: d1Count + d2Count };

}



function getDefaultChargingHistory() {
    return [
        {
            id: 'charg_init_1',
            bm: 'BM238',
            reg: 'KA51AH2411',
            processType: 'Depot Fast Plug-in Charging',
            startTime: '10:30 AM, 21 Oct 2026',
            unlockTime: '11:15 AM, 21 Oct 2026',
            duration: '45 mins',
            startSoc: '20%',
            finalSoc: '98%',
            delta: 78,
            socBef: '20',
            socAft: '98',
            bay: 'Bay 03',
            status: 'Completed',
            finalStage: 'Fast Charging Completed: Reached 98% SoC (125 km Usable Range)',
            chargerBay: 'Bay 03 (150 kW CCS2 Fast Charger)',
            chargingStatus: 'Completed',
            clearanceState: '✅ High Range Fleet Category A (Single Charge Ready)',
            remarks: 'Smooth charging cycle. Full SoC attained, ready for dispatch.',
            timeStr: '11:15 AM',
            dateStr: '21 Oct 2026',
            fullDutyKm: 125
        },
        {
            id: 'charg_init_2',
            bm: 'BM291',
            reg: 'KA51AH2440',
            processType: 'Depot Fast Plug-in Charging',
            startTime: '02:30 PM, 21 Oct 2026',
            unlockTime: '03:20 PM, 21 Oct 2026',
            duration: '50 mins',
            startSoc: '35%',
            finalSoc: '95%',
            delta: 60,
            socBef: '35',
            socAft: '95',
            bay: 'Bay 01',
            status: 'Completed',
            finalStage: 'Fast Charging Completed: Reached 95% SoC (121 km Usable Range)',
            chargerBay: 'Bay 01 (150 kW CCS2 Fast Charger)',
            chargingStatus: 'Completed',
            clearanceState: '✅ Ready for Dispatch (Route 360K Duty)',
            remarks: 'Topped up for evening peak schedule.',
            timeStr: '03:20 PM',
            dateStr: '21 Oct 2026',
            fullDutyKm: 121
        }
    ];
}

function getDefaultCleaningHistory() {
    return [
        {
            id: 'clean_init_1',
            bm: 'BM153',
            reg: 'KA51AH4643',
            processType: 'Interior & Exterior Bus Cleaning',
            startTime: '09:00 AM, 21 Oct 2026',
            unlockTime: '09:35 AM, 21 Oct 2026',
            duration: '35 mins',
            totalDone: 2,
            total: 2,
            finalStage: 'Interior & Exterior Cleaning Complete',
            tasksSummary: '2 of 2 tasks verified (Interior Cleaning, Exterior Cleaning)',
            clearanceState: '✅ Inspection Passed: Cleared for Schedule Allocation',
            remarks: 'Depot 32 bay inspection signed off. No exterior scratches.',
            timeStr: '09:35 AM',
            dateStr: '21 Oct 2026'
        }
    ];
}

function getDefaultCompletedRoutesLog() {
    return [
        {
            id: 'rc_init_1',
            bm: 'BM001',
            reg: 'KA51AH4144',
            route: '356Z',
            schedule: 'SCH-01',
            driver: 'Ramesh Gowda',
            dispatchTime: '06:30 AM',
            departureTime: '06:30 AM',
            scheduledTime: '05:35 AM',
            completedAt: '06:30 AM, 21 Oct 2026',
            completedTs: 1792557000000,
            dateStr: '21 Oct 2026',
            depot: '1',
            prevDepot: '1',
            isTransferred: false,
            status: 'Returned / Completed'
        },
        {
            id: 'rc_init_2',
            bm: 'BM062',
            reg: 'KA51AH2434',
            route: 'G-2',
            schedule: 'SCH-04',
            driver: 'Suresh Kumar',
            dispatchTime: '06:00 AM',
            departureTime: '06:00 AM',
            scheduledTime: '04:20 AM',
            completedAt: '05:25 AM, 21 Oct 2026',
            completedTs: 1792553100000,
            dateStr: '21 Oct 2026',
            depot: '2',
            prevDepot: '2',
            isTransferred: false,
            status: 'Returned / Completed'
        },
        {
            id: 'rc_init_3',
            bm: 'BM005',
            reg: 'KA51AH2423',
            route: '600F',
            schedule: 'SCH-08',
            driver: 'Venkatesh M',
            dispatchTime: '05:45 AM',
            departureTime: '05:45 AM',
            scheduledTime: '03:05 AM',
            completedAt: '04:15 AM, 21 Oct 2026',
            completedTs: 1792548900000,
            dateStr: '21 Oct 2026',
            depot: '2',
            prevDepot: '1',
            isTransferred: true,
            status: 'Returned / Completed'
        },
        {
            id: 'rc_init_4',
            bm: 'BM012',
            reg: 'KA51AH3012',
            route: '360K',
            schedule: 'SCH-12',
            driver: 'Anand Rao',
            dispatchTime: '05:30 AM',
            departureTime: '05:30 AM',
            scheduledTime: '01:40 AM',
            completedAt: '02:50 AM, 21 Oct 2026',
            completedTs: 1792543800000,
            dateStr: '21 Oct 2026',
            depot: '1',
            prevDepot: '1',
            isTransferred: false,
            status: 'Returned / Completed'
        },
        {
            id: 'rc_init_5',
            bm: 'BM075',
            reg: 'KA51AH4075',
            route: '356P',
            schedule: 'SCH-15',
            driver: 'Manjunath B',
            dispatchTime: '05:00 AM',
            departureTime: '05:00 AM',
            scheduledTime: '12:20 AM',
            completedAt: '01:15 AM, 21 Oct 2026',
            completedTs: 1792538100000,
            dateStr: '21 Oct 2026',
            depot: '1',
            prevDepot: '2',
            isTransferred: true,
            status: 'Returned / Completed'
        },
        {
            id: 'rc_init_6',
            bm: 'BM088',
            reg: 'KA51AH4088',
            route: '290E',
            schedule: 'SCH-03',
            driver: 'Praveen K',
            dispatchTime: '04:45 AM',
            departureTime: '04:45 AM',
            scheduledTime: '11:40 PM',
            completedAt: '12:35 AM, 21 Oct 2026',
            completedTs: 1792535700000,
            dateStr: '21 Oct 2026',
            depot: '2',
            prevDepot: '2',
            isTransferred: false,
            status: 'Returned / Completed'
        }
    ];
}

// ── Non-Single Charge Routes Helper (Mandatory Mid-route Charging or Physically Exceeding Range) ──
const NON_SINGLE_CHARGE_ROUTES = ['500DC', 'KBS3F', 'KBS3A', '328H', '360K', '361C', '399C'];

function cleanRouteCode(rStr) {
    if (!rStr) return '';
    const s = String(rStr).trim().toUpperCase();
    for (const code of NON_SINGLE_CHARGE_ROUTES) {
        if (s.includes(code)) return code;
    }
    const match = s.match(/\b([A-Z0-9]+[A-Z0-9\/-]*)\b/);
    return match ? match[1] : s;
}

function isNonSingleChargeRoute(rStr) {
    if (!rStr) return false;
    const s = String(rStr).trim().toUpperCase();
    return NON_SINGLE_CHARGE_ROUTES.some(code => s.includes(code));
}

function loadBusState() {

    if (!masterBusState) {

        const state = readJsonFile(BUS_STATE_FILE, {});

        masterBusState = state && typeof state === "object" ? state : {};

        if (!masterBusState._depotAssignments || Object.keys(masterBusState._depotAssignments).length === 0) {

            masterBusState._depotAssignments = getDefaultDepotAssignments();

            saveBusState(masterBusState);

        } else {

            // Fill any missing bus keys from defaults without overwriting existing assignments

            const defaults = getDefaultDepotAssignments();

            let missing = false;

            for (const bm of Object.keys(defaults)) {

                if (!masterBusState._depotAssignments[bm]) {

                    masterBusState._depotAssignments[bm] = defaults[bm];

                    missing = true;

                }

            }

            if (missing) saveBusState(masterBusState);

        }

        let historyMissing = false;
        if (!Array.isArray(masterBusState._chargingHistory) || masterBusState._chargingHistory.length === 0) {
            masterBusState._chargingHistory = getDefaultChargingHistory();
            historyMissing = true;
        }
        if (!Array.isArray(masterBusState._cleaningHistory) || masterBusState._cleaningHistory.length === 0) {
            masterBusState._cleaningHistory = getDefaultCleaningHistory();
            historyMissing = true;
        }
        if (!Array.isArray(masterBusState._completedRoutesLog) || masterBusState._completedRoutesLog.length === 0) {
            masterBusState._completedRoutesLog = getDefaultCompletedRoutesLog();
            historyMissing = true;
        }
        if (!Array.isArray(masterBusState._customDepots)) {
            masterBusState._customDepots = [];
        }
        if (!masterBusState._customAccounts || typeof masterBusState._customAccounts !== "object") {
            masterBusState._customAccounts = {};
        }
        if (!Array.isArray(masterBusState._deletedDepotIds)) {
            masterBusState._deletedDepotIds = [];
        }
        if (!masterBusState._pendingRelayRoutes || typeof masterBusState._pendingRelayRoutes !== 'object') {
            masterBusState._pendingRelayRoutes = {};
        }
        const fileDataset = loadRoutesDataset();
        if (fileDataset && Array.isArray(fileDataset.routes) && fileDataset.routes.length > 0) {
            masterBusState._routesDatabase = fileDataset;
        }
        if (historyMissing) {
            saveBusState(masterBusState);
        }

    }

    return masterBusState;

}



function saveBusState(state) {

    const clean = state && typeof state === "object" ? state : (masterBusState || {});

    masterBusState = clean;

    writeJsonFile(BUS_STATE_FILE, clean);

    syncBusStateToGitHub(clean); // persist to GitHub in background with debounce

}



// ── Fleet Bus Management (Add / Delete Buses with Reason Tracking & Duplicate Checks) ──

function findExistingBus(bm, regNo, state = null) {
    const currentState = state || loadBusState();
    const cleanBm = bm ? String(bm).toUpperCase().trim() : '';
    const cleanReg = regNo ? String(regNo).replace(/[^A-Z0-9]/g, '').toUpperCase() : '';

    for (const [key, val] of Object.entries(currentState)) {
        if (!val || typeof val !== 'object' || val.deleted || val.isDeleted) continue;
        const curBm = String(val.bm || val.bmNumber || key).toUpperCase().trim();
        const curReg = String(val.regNo || val.reg_no || val.registrationNo || '').replace(/[^A-Z0-9]/g, '').toUpperCase();

        const bmMatches = cleanBm && (curBm === cleanBm || `BM${cleanBm.replace(/^BM/i, '')}` === curBm);
        const regMatches = cleanReg && curReg === cleanReg;

        if (bmMatches || regMatches) {
            const depotId = String(currentState._depotAssignments?.[curBm] || val.depot || '1').trim();
            let depotName = `Depot ${depotId}`;
            if (depotId === '1') depotName = 'Depot 1 (Chandapura / BMT-32)';
            else if (depotId === '2') depotName = 'Depot 2 (Attibele / Hoskote)';
            else if (currentState._customDepots && currentState._customDepots[depotId]) {
                depotName = currentState._customDepots[depotId].name || `Depot ${depotId}`;
            }
            return {
                exists: true,
                bm: curBm,
                regNo: val.regNo || val.reg_no || cleanReg,
                depotId: depotId,
                depotName: depotName
            };
        }
    }
    return null;
}

function addFleetBus(params) {

    let bm = String(params.bm || params.busNumber || params.bmNumber || "").toUpperCase().trim();

    if (bm && !bm.startsWith("BM")) bm = "BM" + bm;

    const regNo = String(params.regNo || params.reg_no || params.registrationNo || params.regNumber || params.reg_number || "").toUpperCase().trim();

    const reason = String(params.reason || params.reasonVal || "").trim();

    const depotNum = String(params.depot || "1").trim();

    const depotName = depotNum === "2" ? "Depot 2 (Attibele / Hoskote)" : "Chandapura (BMT-32)";

    const category = String(params.category || params.busCategory || "A").toUpperCase().trim();

    const soc = Number.isFinite(Number(params.soc)) ? Math.max(0, Math.min(100, Number(params.soc))) : 100;

    const model = String(params.model || "ELECTRIC BUS AC EiV12").trim();

    const make = String(params.make || "Ashok Leyland").trim();



    if (!bm || !regNo || !reason) {

        throw new Error("Bus Number, Registration Number, and Reason are all mandatory.");

    }

    // ── DUPLICATE CHECK: Verify if bus already exists in any depot ──
    if (!params.skipDuplicateCheck) {
        const existing = findExistingBus(bm, regNo);
        if (existing) {
            throw new Error(`⚠️ Bus ${existing.bm} (${existing.regNo}) already exists in ${existing.depotName}! Duplicate bus additions are not permitted.`);
        }
    }



    // 1. Update vehicles.txt

    try {

        let lines = [];

        if (fs.existsSync(VEHICLES_FILE)) {

            lines = fs.readFileSync(VEHICLES_FILE, "utf8").split(/\r?\n/).filter(Boolean);

        }

        let found = false;

        const newLines = lines.map((line, idx) => {

            if (idx === 0) return line;

            const parts = parseCsvLine(line);

            if (parts[0] && parts[0].trim().toUpperCase() === bm) {

                found = true;

                return `${bm},${bm},${regNo},${make},${model},${depotName},Active`;

            }

            return line;

        });

        if (!found) {

            newLines.push(`${bm},${bm},${regNo},${make},${model},${depotName},Active`);

        }

        fs.writeFileSync(VEHICLES_FILE, newLines.join("\n") + "\n", "utf8");

    } catch (e) {

        console.warn("Could not write to vehicles.txt in addFleetBus:", e.message);

    }



    // 2. Update bus_categories.json

    try {

        const busCatPath = path.join(BASE_DIR, "vehicles", "bus_categories.json");

        let categories = [];

        if (fs.existsSync(busCatPath)) {

            categories = JSON.parse(fs.readFileSync(busCatPath, "utf8"));

        }

        const existingCat = categories.find(c => String(c.bm_number).toUpperCase().trim() === bm);

        if (existingCat) {

            existingCat.category = category;

        } else {

            categories.push({

                sl_no: categories.length + 1,

                bm_number: bm,

                actual_range_km: category === "A" ? 155.0 : category === "B" ? 120.0 : 85.0,

                category: category

            });

        }

        fs.writeFileSync(busCatPath, JSON.stringify(categories, null, 2), "utf8");

    } catch (e) {

        console.warn("Could not write bus_categories.json in addFleetBus:", e.message);

    }



    // 3. Update bus_state.json

    const currentState = loadBusState();

    if (!currentState._addedBuses) currentState._addedBuses = {};

    if (!currentState._deletedBuses) currentState._deletedBuses = {};



    delete currentState._deletedBuses[bm];



    const addedInfo = {

        bm,

        busNumber: bm,

        regNo,

        regNumber: regNo,

        reason,

        depot: depotNum,

        category,

        busCategory: category,

        soc,

        model,

        make,

        addedAt: new Date().toISOString(),

        timestamp: Date.now(),

        isNewlyAdded: true

    };

    currentState._addedBuses[bm] = addedInfo;



    if (!currentState._depotAssignments) currentState._depotAssignments = {};

    currentState._depotAssignments[bm] = depotNum;



    currentState[bm] = Object.assign({}, currentState[bm] || {}, {

        uniqueId: bm,

        bmNumber: bm,

        busNumber: "600F",

        regNo,

        status: "On Time",

        soc,

        condition: "Good",

        driver: "Driver Assigned",

        busCategory: category,

        isNewlyAdded: true,

        additionReason: reason,

        addedAt: addedInfo.addedAt,

        deleted: false,

        isDeleted: false

    });



    saveBusState(currentState);



    // 4. Invalidate routes cache

    cachedRoutes = null;

    cachedRouteBmMap = null;



    // 5. Broadcast sync event

    broadcastSyncEvent("fleet-bus-added", {

        bm,

        regNo,

        reason,

        addedInfo,

        addedBuses: currentState._addedBuses,

        deletedBuses: currentState._deletedBuses

    });



    const updatedCountsAdd = getDepotCounts(currentState._depotAssignments, currentState);

    broadcastSyncEvent("depot-updated", {

        assignments: currentState._depotAssignments,

        depot1Count: updatedCountsAdd.depot1Count,

        depot2Count: updatedCountsAdd.depot2Count,

        total: updatedCountsAdd.total

    });



    return addedInfo;

}



function deleteFleetBus(params) {

    let bm = String(params.bm || params.busNumber || params.bmNumber || "").toUpperCase().trim();

    if (bm && !bm.startsWith("BM")) bm = "BM" + bm;

    const regNo = String(params.regNo || params.reg_no || params.registrationNo || params.regNumber || params.reg_number || "").toUpperCase().trim();

    const reason = String(params.reason || params.reasonVal || "").trim();



    if (!bm || !reason) {

        throw new Error("Bus Number and Reason are mandatory for deleting a bus.");

    }



    // 1. Update vehicles.txt and retrieve actual make & model

    let busReg = regNo;

    let busMake = String(params.make || "Ashok Leyland").trim();

    let busModel = String(params.model || "ELECTRIC BUS AC EiV12").trim();

    const chosenDepotNum = String(params.depot || "1").trim();

    let busDepot = chosenDepotNum === "2" ? "Depot 2 (Central)" : "Chandapura (BMT-32)";

    try {

        if (fs.existsSync(VEHICLES_FILE)) {

            const raw = fs.readFileSync(VEHICLES_FILE, "utf8");

            const lines = raw.split(/\r?\n/).filter(Boolean);

            const newLines = lines.map((line, idx) => {

                if (idx === 0) return line;

                const parts = parseCsvLine(line);

                if (parts[0] && parts[0].trim().toUpperCase() === bm) {

                    busReg = regNo || parts[2] || busReg;

                    busMake = parts[3] || busMake;

                    busModel = parts[4] || busModel;

                    busDepot = parts[5] || busDepot;

                    return `${bm},${bm},${busReg},${busMake},${busModel},${busDepot},Deleted`;

                }

                return line;

            });

            fs.writeFileSync(VEHICLES_FILE, newLines.join("\n") + "\n", "utf8");

        }

    } catch (e) {

        console.warn("Could not update vehicles.txt in deleteFleetBus:", e.message);

    }



    // 2. Update bus_state.json

    const currentState = loadBusState();

    if (!currentState._deletedBuses) currentState._deletedBuses = {};

    if (!currentState._addedBuses) currentState._addedBuses = {};



    const regToUse = busReg || regNo || (currentState[bm] && (currentState[bm].regNo || currentState[bm].regNumber)) || "";

    delete currentState._addedBuses[bm];



    const deletedInfo = {

        bm,

        busNumber: bm,

        regNo: regToUse,

        regNumber: regToUse,

        model: busModel,

        make: busMake,

        depot: busDepot,

        reason,

        deletedAt: new Date().toISOString(),

        timestamp: Date.now()

    };

    currentState._deletedBuses[bm] = deletedInfo;



    if (currentState[bm]) {

        currentState[bm].status = "Deleted";

        currentState[bm].deleted = true;

        currentState[bm].isDeleted = true;

        currentState[bm].deletionReason = reason;

        currentState[bm].deletedAt = deletedInfo.deletedAt;

        currentState[bm].isNewlyAdded = false;

        currentState[bm].regNo = regToUse;

        currentState[bm].regNumber = regToUse;

        currentState[bm].model = busModel;

        currentState[bm].make = busMake;

    } else {

        currentState[bm] = {

            uniqueId: bm,

            bmNumber: bm,

            busNumber: bm,

            regNo: regToUse,

            regNumber: regToUse,

            model: busModel,

            make: busMake,

            status: "Deleted",

            deleted: true,

            isDeleted: true,

            deletionReason: reason,

            deletedAt: deletedInfo.deletedAt,

            isNewlyAdded: false

        };

    }



    if (Array.isArray(currentState._lockedBuses)) {

        currentState._lockedBuses = currentState._lockedBuses.filter(x => String(x.bm || '').toUpperCase() !== bm);

    }



    if (Array.isArray(currentState._allocatedDuties)) {

        currentState._allocatedDuties = currentState._allocatedDuties.filter(d => String(d.bm || '').toUpperCase() !== bm);
    }
    if (currentState._servicingStatus && currentState._servicingStatus[bm]) {
        delete currentState._servicingStatus[bm];
    }
    if (Array.isArray(currentState._completedRoutesLog)) {
        currentState._completedRoutesLog = currentState._completedRoutesLog.filter(x => String(x.bm || '').toUpperCase() !== bm);
    }
    if (currentState[bm]) {
        currentState[bm].isLocked = false;
        currentState[bm].isTurnaround = false;
        currentState[bm].needsCharging = false;
        currentState[bm].needsCleaning = false;
        currentState[bm].chargingCompleted = false;
        currentState[bm].cleaningCompleted = false;
        currentState[bm].postRouteServicingPending = false;

    }



    saveBusState(currentState);



    // 3. Invalidate routes cache

    cachedRoutes = null;

    cachedRouteBmMap = null;



    // 4. Broadcast sync event

    broadcastSyncEvent("fleet-bus-deleted", {

        bm,

        regNo: regToUse,

        reason,

        deletedInfo,

        addedBuses: currentState._addedBuses,

        deletedBuses: currentState._deletedBuses

    });



    const updatedCountsDel = getDepotCounts(currentState._depotAssignments, currentState);

    broadcastSyncEvent("depot-updated", {

        assignments: currentState._depotAssignments,

        depot1Count: updatedCountsDel.depot1Count,

        depot2Count: updatedCountsDel.depot2Count,

        total: updatedCountsDel.total

    });



    return deletedInfo;

}



function restoreFleetBus(params) {

    let bm = "";

    if (typeof params === "string") {

        bm = params.toUpperCase().trim();

    } else if (params && typeof params === "object") {

        bm = String(params.bm || params.busNumber || params.bmNumber || params.id || "").toUpperCase().trim();

    }

    if (bm && !bm.startsWith("BM")) bm = "BM" + bm;

    if (!bm) throw new Error("Bus Number is required to restore.");



    const currentState = loadBusState();

    const deletedInfo = (currentState._deletedBuses && currentState._deletedBuses[bm]) || {};

    const regNo = String((params && (params.regNo || params.regNumber)) || deletedInfo.regNo || deletedInfo.regNumber || (currentState[bm] && (currentState[bm].regNo || currentState[bm].regNumber)) || "").toUpperCase().trim();

    const reason = String((params && params.reason) || "Restored back to active fleet").trim();

    const depot = String((params && params.depot) || deletedInfo.depot || (currentState._depotAssignments && currentState._depotAssignments[bm]) || "1").trim();

    const category = String((params && (params.category || params.busCategory)) || (currentState[bm] && currentState[bm].busCategory) || "A").trim();

    const soc = Number.isFinite(Number(params && params.soc)) ? Number(params.soc) : ((currentState[bm] && currentState[bm].soc) || 100);

    const model = String((params && params.model) || deletedInfo.model || (currentState[bm] && currentState[bm].model) || "ELECTRIC BUS AC EiV12").trim();

    const make = String((params && params.make) || deletedInfo.make || (currentState[bm] && currentState[bm].make) || "Ashok Leyland").trim();



    return addFleetBus({

        bm,

        busNumber: bm,

        regNo: regNo || "KA51AH4144",

        regNumber: regNo || "KA51AH4144",

        reason,

        depot,

        category,

        busCategory: category,

        soc,

        model,

        make

    });

}



function normalizeBusStatus(status) {

    return status === "Delayed" || status === "On Time" || status === "Ahead"

        ? status

        : "On Time";

}



function normalizeTimingValue(value, fallback) {

    return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;

}



function normalizeBusStateEntry(entry, existing = {}) {

    const rawStatus = entry?.status ? String(entry.status) : (existing?.status || "On Time");

    const status = normalizeBusStatus(rawStatus);

    const inputSoc = entry?.soc ?? entry?.manual_soc ?? entry?.confirmedSoc ?? entry?.socAfter;

    const soc = Number.isFinite(Number(inputSoc))

        ? Math.max(0, Math.min(100, Number(inputSoc)))

        : (Number.isFinite(Number(existing?.soc)) ? Number(existing.soc) : 0);

    const condition = entry?.condition ? String(entry.condition) : (existing?.condition || "Good");

    const driver = entry?.driver ? String(entry.driver) : (existing?.driver || "Driver Assigned");

    const timings = entry?.statusTimings && typeof entry.statusTimings === "object"

        ? entry.statusTimings

        : (existing?.statusTimings || {});



    // Maintain real telemetry history so micro/macro charts always show exact real SoC

    const existingHistory = Array.isArray(existing?.history) ? existing.history : [];

    const updatedHistory = [...existingHistory];

    const nowIso = new Date().toISOString();

    const lastPoint = updatedHistory[updatedHistory.length - 1];



    if (!lastPoint || lastPoint.soc !== soc || (Date.now() - new Date(lastPoint.timestamp).getTime() > 20000)) {

        updatedHistory.push({

            timestamp: nowIso,

            soc,

            condition: condition === "Not Good" ? "Not Good" : "Good",

            status

        });

        if (updatedHistory.length > 50) {

            updatedHistory.shift();

        }

    }



    return {

        status,

        rawStatus,

        soc,

        condition: condition === "Not Good" ? "Not Good" : "Good",

        driver,

        updatedAt: nowIso,

        statusTimings: {

            Delayed: {

                arrival: normalizeTimingValue(timings.Delayed?.arrival, DEFAULT_BUS_TIMINGS.Delayed.arrival),

                departure: normalizeTimingValue(timings.Delayed?.departure, DEFAULT_BUS_TIMINGS.Delayed.departure)

            },

            "On Time": {

                arrival: normalizeTimingValue(timings["On Time"]?.arrival, DEFAULT_BUS_TIMINGS["On Time"].arrival),

                departure: normalizeTimingValue(timings["On Time"]?.departure, DEFAULT_BUS_TIMINGS["On Time"].departure)

            },

            Ahead: {

                arrival: normalizeTimingValue(timings.Ahead?.arrival, DEFAULT_BUS_TIMINGS.Ahead.arrival),

                departure: normalizeTimingValue(timings.Ahead?.departure, DEFAULT_BUS_TIMINGS.Ahead.departure)

            }

        },

        operation: entry?.operation || existing?.operation || "Single Charge Operation",

        chargingStatus: entry?.chargingStatus || existing?.chargingStatus || null,

        chargerBay: entry?.chargerBay || existing?.chargerBay || null,

        socBefore: Number.isFinite(Number(entry?.socBefore)) ? Number(entry.socBefore) : (existing?.socBefore ?? null),

        socAfter: Number.isFinite(Number(entry?.socAfter)) ? Number(entry.socAfter) : (existing?.socAfter ?? soc),

        fullDutyDistanceKm: Math.round(Math.max(0, soc - 10) * 1.42),

        lastChargedTime: entry?.lastChargedTime || existing?.lastChargedTime || null,

        history: updatedHistory

    };

}



function isValidLatitude(value) {

    return Number.isFinite(value) && value >= -90 && value <= 90;

}



function isValidLongitude(value) {

    return Number.isFinite(value) && value >= -180 && value <= 180;

}



function parseLatLngFromObject(candidate) {

    if (!candidate || typeof candidate !== "object") {

        return null;

    }



    const lat = Number.parseFloat(candidate.lat ?? candidate.latitude);

    const lng = Number.parseFloat(candidate.lng ?? candidate.lon ?? candidate.longitude);



    if (!isValidLatitude(lat) || !isValidLongitude(lng)) {

        return null;

    }



    return { lat, lng, sourceFormat: "object" };

}



function parsePreciseGpsPayload(rawPayload) {

    const payloadObject = rawPayload && typeof rawPayload === "object" ? rawPayload : null;



    if (payloadObject) {

        const fromPayloadFields = parseLatLngFromObject(payloadObject);

        if (fromPayloadFields) {

            return { ok: true, ...fromPayloadFields, sourceFormat: "adafruit-payload-fields", rawValue: payloadObject.value };

        }



        const fromLocation = parseLatLngFromObject(payloadObject.location);

        if (fromLocation) {

            return { ok: true, ...fromLocation, sourceFormat: "adafruit-location-object", rawValue: payloadObject.value };

        }

    }



    const rawValue = rawPayload && typeof rawPayload === "object" && "value" in rawPayload

        ? rawPayload.value

        : rawPayload;



    const directObject = parseLatLngFromObject(rawValue);

    if (directObject) {

        return { ok: true, ...directObject, rawValue };

    }



    if (typeof rawValue === "string") {

        const trimmed = rawValue.trim();

        if (!trimmed) {

            return { ok: false, reason: "GPS value is empty.", rawValue };

        }



        const csvParts = trimmed.split(",").map((part) => part.trim());

        if (csvParts.length === 2) {

            const lat = Number.parseFloat(csvParts[0]);

            const lng = Number.parseFloat(csvParts[1]);



            if (isValidLatitude(lat) && isValidLongitude(lng)) {

                return { ok: true, lat, lng, sourceFormat: "csv", rawValue };

            }



            return {

                ok: false,

                reason: `CSV GPS must be valid latitude,longitude. Received: ${trimmed}`,

                rawValue

            };

        }



        if (trimmed.startsWith("{")) {

            try {

                const parsedJson = JSON.parse(trimmed);

                const jsonObject = parseLatLngFromObject(parsedJson);

                if (jsonObject) {

                    return { ok: true, ...jsonObject, sourceFormat: "json-string", rawValue };

                }



                return {

                    ok: false,

                    reason: "JSON GPS value is missing valid lat/lng or latitude/longitude.",

                    rawValue

                };

            } catch (error) {

                return {

                    ok: false,

                    reason: `GPS JSON parse failed: ${error.message}`,

                    rawValue

                };

            }

        }



        if (trimmed.match(/^[-+]?\d*\.?\d+$/)) {

            return {

                ok: false,

                reason: `Single numeric GPS value ${trimmed} is not precise enough. Publish lat,lng or JSON {\"lat\":...,\"lng\":...}.`,

                rawValue

            };

        }



        return {

            ok: false,

            reason: `Unsupported GPS string format: ${trimmed}`,

            rawValue

        };

    }



    return {

        ok: false,

        reason: `Unsupported GPS payload type: ${typeof rawValue}`,

        rawValue

    };

}



async function fetchAndParseAdafruitGps() {

    const response = await fetch(ADAFRUIT_LAST_VALUE_URL, {

        method: "GET",

        headers: {

            "X-AIO-Key": ADAFRUIT_AIO_KEY,

            "Content-Type": "application/json"

        }

    });



    if (!response.ok) {

        throw new Error(`Adafruit request failed with status ${response.status}`);

    }



    const payload = await response.json();

    console.debug("Adafruit raw GPS payload:", payload);



    const parsed = parsePreciseGpsPayload(payload);

    return { payload, parsed };

}



async function proxyPythonJson(req, res, apiPath) {

    try {

        const url = `${PYTHON_API_BASE}${apiPath}`;

        const response = await fetch(url, {

            method: req.method,

            headers: {

                "Content-Type": "application/json"

            }

        });



        const rawText = await response.text();

        let payload = rawText;

        try {

            payload = JSON.parse(rawText);

        } catch (error) {

            payload = rawText;

        }



        res.writeHead(response.status || 200, { "Content-Type": "application/json" });

        res.end(JSON.stringify(payload));

    } catch (error) {

        sendJson(res, {

            ok: false,

            error: "Failed to proxy request to Python backend",

            details: error.message

        }, 502);

    }

}



function sendStaticFile(res, relativePath) {

    const target = path.join(BASE_DIR, relativePath);

    const normalized = path.normalize(target);

    if (!normalized.startsWith(path.normalize(BASE_DIR))) {

        sendJson(res, { error: "Invalid path" }, 400);

        return;

    }



    fs.readFile(normalized, (error, data) => {

        if (error) {

            sendJson(res, { error: "File not found" }, 404);

            return;

        }



        const ext = path.extname(normalized).toLowerCase();

        const contentType = {

            ".html": "text/html; charset=utf-8",

            ".css": "text/css; charset=utf-8",

            ".js": "application/javascript; charset=utf-8",

            ".json": "application/json; charset=utf-8",

            ".svg": "image/svg+xml",

            ".png": "image/png",

            ".jpg": "image/jpeg",

            ".jpeg": "image/jpeg",

            ".ico": "image/x-icon",

            ".webp": "image/webp",

            ".webmanifest": "application/manifest+json; charset=utf-8"

        }[ext] || "application/octet-stream";



        res.writeHead(200, { "Content-Type": contentType });

        res.end(data);

    });

}



function resolveBusAndRoute(rawBusId) {

    const cleanId = String(rawBusId || "").trim();

    const allRoutes = loadRoutes();

    const busState = loadBusState();

    const assignments = busState._assignments || {};

    const vehicleAssignments = busState._vehicleAssignments || {};

    const busAssignments = busState._busAssignments || {};



    const cleanLower = cleanId.toLowerCase();

    const cleanCompact = cleanId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();



    // 1. Match by uniqueId (BM number e.g. BM238 / legacy BUS-01..BUS-54)

    let matchingRoute = allRoutes.find((r) => {

        const uId = String(r.uniqueId || "").toLowerCase();

        return uId === cleanLower || uId.replace(/[^a-zA-Z0-9]/g, "") === cleanCompact;

    });



    // 2. Match by busNumber (route short name, e.g. 401-A)

    if (!matchingRoute) {

        matchingRoute = allRoutes.find((r) => {

            const rBus = String(r.busNumber || "").trim().toLowerCase();

            const rBusCompact = rBus.replace(/[^a-zA-Z0-9]/g, "");

            return rBus === cleanLower || rBusCompact === cleanCompact;

        });

    }



    // 3. Match by routeId

    if (!matchingRoute) {

        matchingRoute = allRoutes.find((r) => String(r.routeId) === cleanId);

    }



    // Determine uniqueId of physical vehicle

    let uniqueId = "";

    if (matchingRoute) {

        uniqueId = matchingRoute.uniqueId;

    } else if (cleanId.toUpperCase().startsWith("BUS-") || cleanId.toUpperCase().startsWith("BM")) {

        uniqueId = cleanId.toUpperCase();

    } else if (cleanId.toUpperCase().startsWith("EV-")) {

        uniqueId = cleanId.toUpperCase().replace(/^EV-/, "BUS-");

    } else {

        uniqueId = assignments[cleanId] || cleanId;

    }



    // What route is assigned to this physical vehicle?

    let assignedRouteId = (assignments && (assignments[uniqueId] || assignments[matchingRoute?.busNumber])) 

        || (matchingRoute ? String(matchingRoute.routeId) : cleanId);

    let assignedRouteObj = allRoutes.find(r => String(r.routeId) === String(assignedRouteId)) || matchingRoute;



    // Assigned display

    const assignedRecord = (vehicleAssignments && vehicleAssignments[uniqueId]) || (busAssignments && busAssignments[uniqueId]) || null;

    const assignedRouteDisplay = assignedRecord?.assignedRouteDisplay

        || (assignedRouteObj ? `Route ${assignedRouteObj.routeId} - ${assignedRouteObj.busNumber} (${(calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0).toFixed(1)} km)` : `Route ${assignedRouteId}`);



    // Telemetry state entry

    const stateEntry = busState[uniqueId]

        || (matchingRoute ? busState[matchingRoute.busNumber] : null)

        || busState[cleanId]

        || busState[assignedRouteId]

        || {};



    const currentSoc = Number.isFinite(Number(stateEntry.soc)) ? Number(stateEntry.soc) : 0;

    const condition = stateEntry.condition || "Good";

    const routeDistanceKm = (assignedRouteObj && calculateRouteDistanceByRouteId(assignedRouteObj.routeId))

        || (matchingRoute && calculateRouteDistanceByRouteId(matchingRoute.routeId))

        || 28.7;

    const isBlocked = (busState._blockedBuses || []).includes(uniqueId)

        || (busState._blockedRouteIds || []).includes(assignedRouteId)

        || (condition === "Not Good")

        || (currentSoc < 25)

        || (routeDistanceKm > 0 && Math.round(Math.max(0, currentSoc - 10) * 1.42) < routeDistanceKm);



    const busNumber = assignedRouteObj ? assignedRouteObj.busNumber : (matchingRoute ? matchingRoute.busNumber : cleanId);



    return {

        uniqueId,

        unique_id: uniqueId,

        vehicleId: uniqueId,

        busNumber,

        busShortName: busNumber,

        busName: uniqueId,

        canonicalRouteId: matchingRoute ? String(matchingRoute.routeId) : assignedRouteId,

        assignedRouteId,

        assignedRouteDisplay,

        assignedRouteObj,

        matchingRoute,

        stateEntry,

        currentSoc,

        condition,

        driver: stateEntry.driver || "Driver Assigned",

        routeDistanceKm,

        blocked: isBlocked

    };

}



function getBusMicroData(rawBusId) {

    const { currentSoc, routeDistanceKm, stateEntry, uniqueId, busNumber } = resolveBusAndRoute(rawBusId);

    const history = Array.isArray(stateEntry.history) ? [...stateEntry.history] : [];

    const now = Date.now();

    const targetPoints = 30;

    const idToUse = uniqueId || busNumber;



    // Ensure the latest point matches the live currentSoc

    if (history.length > 0) {

        const last = history[history.length - 1];

        if (Number(last.soc) !== Number(currentSoc)) {

            history.push({

                timestamp: new Date().toISOString(),

                soc: currentSoc,

                odometer_km: routeDistanceKm,

                bus_id: idToUse

            });

        }

    }



    if (history.length < targetPoints) {

        const needed = targetPoints - history.length;

        const baseSoc = history.length > 0 ? Number(history[0].soc) : currentSoc;

        const synthetic = [];

        for (let i = needed; i >= 1; i--) {

            const t = new Date(now - (history.length + i) * 90 * 1000).toISOString();

            const drift = (i * 0.1);

            const socVal = Math.min(100, Math.max(0, Number((baseSoc + drift).toFixed(1))));

            const odo = Number((routeDistanceKm * Math.max(0.1, 1 - (i * 0.02))).toFixed(1));

            synthetic.push({

                timestamp: t,

                soc: socVal,

                odometer_km: odo,

                bus_id: idToUse

            });

        }

        const combined = [...synthetic, ...history.map((h, idx) => ({

            timestamp: h.timestamp,

            soc: Number(h.soc),

            odometer_km: Number((routeDistanceKm * Math.max(0.1, 1 - (history.length - 1 - idx) * 0.02)).toFixed(1)),

            bus_id: idToUse

        }))];

        combined[combined.length - 1].soc = currentSoc;

        return combined;

    }



    const trimmed = history.slice(-50).map((h, idx, arr) => ({

        timestamp: h.timestamp,

        soc: Number(h.soc),

        odometer_km: Number((routeDistanceKm * Math.max(0.1, 1 - (arr.length - 1 - idx) * 0.02)).toFixed(1)),

        bus_id: idToUse

    }));

    trimmed[trimmed.length - 1].soc = currentSoc;

    return trimmed;

}



function getBusMacroData(rawBusId) {

    const { currentSoc, routeDistanceKm, uniqueId, busNumber } = resolveBusAndRoute(rawBusId);

    const idToUse = uniqueId || busNumber;

    return socLogger.getMacroTrendWithRealHistory(idToUse, currentSoc, routeDistanceKm);

}



function getBusTasks(busIdentifier, routeIdParam, scheduleIdParam) {

    const rawBus = String(busIdentifier || "").trim();

    const rawRouteId = String(routeIdParam || "").trim();

    const rawScheduleId = String(scheduleIdParam || "").trim().toUpperCase();

    const allRoutes = loadRoutes();

    const busState = loadBusState();

    const detailedSchedules = loadDetailedSchedules();

    const corridorData = loadCorridorSchedules() || {};

    const corridorScheds = Array.isArray(corridorData.schedules) ? corridorData.schedules : [];

    const corridorList = Array.isArray(corridorData.corridors) ? corridorData.corridors : (Array.isArray(corridorData.directionalRoutes) ? corridorData.directionalRoutes : []);



    // 1. Determine physical bus number (e.g. BM153)

    let finalUniqueId = rawBus ? rawBus.toUpperCase() : "";

    if (!finalUniqueId && rawRouteId) {

        const found = allRoutes.find(r => 

            String(r.routeId) === rawRouteId || 

            String(r.busNumber).toUpperCase() === rawRouteId.toUpperCase()

        );

        if (found) finalUniqueId = found.uniqueId || found.bmNumber;

    }

    if (!finalUniqueId) {

        finalUniqueId = (allRoutes.length > 0 && (allRoutes[0].bmNumber || allRoutes[0].uniqueId)) ? (allRoutes[0].bmNumber || allRoutes[0].uniqueId) : "BM153";

    }



    // 2. Battery percentage and telemetry belongs to the physical bus number (vehicle ID)

    const stateEntry = busState[finalUniqueId] || busState[rawBus] || {};

    const currentSoc = Number.isFinite(Number(stateEntry.soc)) ? Number(stateEntry.soc) : 92;

    const condition = stateEntry.condition || "Good";

    const estRangeKm = Math.round(Math.max(0, currentSoc - SOC_BUFFER_PCT) * RANGE_KM_PER_SOC_PCT);



    // 3. Find matching detailed schedule from detailed_schedule_trips.json

    let matchedSchedule = null;



    // A. Match by exact scheduleIdParam (e.g. 500DC/12)

    if (rawScheduleId && detailedSchedules[rawScheduleId]) {

        matchedSchedule = detailedSchedules[rawScheduleId];

    }



    // B. Match by rawRouteId (e.g. 500DC)

    if (!matchedSchedule && rawRouteId) {

        const cleanRouteUpper = rawRouteId.toUpperCase();

        // Priority 1: check if this bus is scheduled on this route

        const schedForBus = corridorScheds.find(s => 

            String(s.route || "").toUpperCase() === cleanRouteUpper &&

            (String(s.fixBm || "").toUpperCase() === finalUniqueId || String(s.swapBm || "").toUpperCase() === finalUniqueId)

        );

        if (schedForBus && schedForBus.scheduleId && detailedSchedules[schedForBus.scheduleId.toUpperCase()]) {

            matchedSchedule = detailedSchedules[schedForBus.scheduleId.toUpperCase()];

        } else {

            // Priority 2: any schedule matching this route code

            const matchingScheds = Object.values(detailedSchedules).filter(s => 

                String(s.route || "").toUpperCase() === cleanRouteUpper ||

                String(s.scheduleId || "").toUpperCase().startsWith(cleanRouteUpper + "/")

            );

            if (matchingScheds.length > 0) {

                matchedSchedule = matchingScheds[0];

            }

        }

    }



    // C. Fallback: match by bus in corridor schedules (ONLY if routeIdParam was omitted)

    if (!matchedSchedule && !rawRouteId) {

        const schedForBus = corridorScheds.find(s => 

            String(s.fixBm || "").toUpperCase() === finalUniqueId ||

            String(s.swapBm || "").toUpperCase() === finalUniqueId

        );

        if (schedForBus && schedForBus.scheduleId && detailedSchedules[schedForBus.scheduleId.toUpperCase()]) {

            matchedSchedule = detailedSchedules[schedForBus.scheduleId.toUpperCase()];

        }

    }



    // 4. Resolve Route Short Name, Corridor, Origin, and Destination

    // The route short name belongs to the line code (e.g. 500DC, 600F, 328H)

    const effectiveRouteCode = (matchedSchedule && matchedSchedule.route)

        ? matchedSchedule.route

        : (rawRouteId || (rawScheduleId ? rawScheduleId.split('/')[0] : "500DC"));



    // Find corridor info from corridorList or directional route map

    const corridor = corridorList.find(c => 

        String(c.code || c.route || "").toUpperCase() === effectiveRouteCode.toUpperCase() ||

        String(c.routeId || "") === effectiveRouteCode

    ) || ((corridorData.directionalRoutes || []).find(c => String(c.code || "").toUpperCase() === effectiveRouteCode.toUpperCase()));



    const origin = (corridor && corridor.origin)

        ? corridor.origin

        : (matchedSchedule && matchedSchedule.tasks && matchedSchedule.tasks.length > 1 ? matchedSchedule.tasks[1].fromStop : "Anekal");



    const rawDest = (corridor && corridor.destination)

        ? corridor.destination

        : (matchedSchedule && matchedSchedule.tasks && matchedSchedule.tasks.length > 3 ? matchedSchedule.tasks[3].toStop : "TNF");

    const cleanDest = rawDest.replace(new RegExp(`\\s*\\(${effectiveRouteCode}\\)\\s*$`, "i"), "").trim();



    const routeName = `${origin} ⇔ ${cleanDest} (${effectiveRouteCode})`;

    const routeId = (corridor && corridor.routeId) ? corridor.routeId : effectiveRouteCode;

    const shiftName = (matchedSchedule && matchedSchedule.shift) ? matchedSchedule.shift : "General";

    const matchedSchedId = (matchedSchedule && matchedSchedule.scheduleId) ? matchedSchedule.scheduleId : (rawScheduleId || `${effectiveRouteCode}/12`);



    // 5. Tasks and duty sequence

    let tasks = [];

    let totalDutyKm = 0;



    if (matchedSchedule && Array.isArray(matchedSchedule.tasks) && matchedSchedule.tasks.length > 0) {

        tasks = matchedSchedule.tasks.map(t => Object.assign({}, t));

        totalDutyKm = matchedSchedule.totalRouteDistanceKm || 0;

    } else {

        const distKm = (corridor && corridor.distKm) || calculateRouteDistanceByRouteId(routeId) || 49.8;

        const depotTransitKm = 8.5;

        totalDutyKm = Number((distKm * 2 + depotTransitKm * 2).toFixed(1));

        

        tasks = [

            {

                taskNumber: 1,

                taskType: "Depot Pull-Out Trip",

                tripId: `TRIP-${effectiveRouteCode}-1`,

                fromStop: "DPT-32 (Bommasandra)",

                toStop: origin,

                departureTime: "06:30",

                arrivalTime: "07:15",

                distanceKm: depotTransitKm,

                notes: `DPT-32 (Bommasandra) ➔ ${origin}`

            },

            {

                taskNumber: 2,

                taskType: "Passenger Service Trip",

                tripId: `TRIP-${effectiveRouteCode}-2`,

                fromStop: origin,

                toStop: destination,

                departureTime: "07:30",

                arrivalTime: "09:00",

                distanceKm: distKm,

                notes: `${origin} ➔ ${destination}`

            },

            {

                taskNumber: 3,

                taskType: "☕ Layover / Rest Break",

                tripId: `REST-${effectiveRouteCode}-3`,

                fromStop: cleanDest,

                toStop: cleanDest,

                departureTime: "09:00",

                arrivalTime: "09:30",

                distanceKm: 0.0,

                notes: `Scheduled layover at ${cleanDest} (30 mins)`

            },

            {

                taskNumber: 4,

                taskType: "Passenger Service Trip",

                tripId: `TRIP-${effectiveRouteCode}-4`,

                fromStop: cleanDest,

                toStop: origin,

                departureTime: "09:35",

                arrivalTime: "11:05",

                distanceKm: distKm,

                notes: `${cleanDest} ➔ ${origin}`

            },

            {

                taskNumber: 5,

                taskType: "Depot Pull-In Trip",

                tripId: `TRIP-${effectiveRouteCode}-5`,

                fromStop: origin,

                toStop: "DPT-32 (Bommasandra)",

                departureTime: "11:15",

                arrivalTime: "12:00",

                distanceKm: depotTransitKm,

                notes: `${origin} ➔ DPT-32 (Bommasandra)`

            }

        ];

    }



    return {

        ok: true,

        uniqueId: finalUniqueId,

        assignedVehicle: finalUniqueId,

        busNumber: effectiveRouteCode,

        busShortName: effectiveRouteCode,

        routeId: routeId,

        routeName: routeName,

        scheduleId: matchedSchedId,

        shift: shiftName,

        origin: origin,

        destination: cleanDest,

        currentSoc,

        condition,

        distanceKm: totalDutyKm,

        estimatedRangeKm: estRangeKm,

        totalAssignedTrips: tasks.length,

        tasks

    };

}



const server = http.createServer(async (req, res) => {

    if (req.method === "OPTIONS") {

        res.writeHead(204, {

            "Access-Control-Allow-Origin": "*",

            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",

            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AIO-Key"

        });

        res.end();

        return;

    }



    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    const pathname = requestUrl.pathname;



    // ── Real-Time Server-Sent Events (SSE) Stream ──

    if (pathname === "/api/events") {

        res.writeHead(200, {

            "Content-Type": "text/event-stream",

            "Cache-Control": "no-cache, no-transform",

            "Connection": "keep-alive",

            "Access-Control-Allow-Origin": "*"

        });

        res.write(`event: connected\ndata: ${JSON.stringify({ version: stateVersion, timestamp: Date.now() })}\n\n`);

        sseClients.add(res);

        req.on("close", () => {

            sseClients.delete(res);

        });

        return;

    }



    // ── Universal Cross-Device State Sync Endpoint ──

    if (pathname === "/api/sync-state") {

        try {

            const reqVersion = requestUrl.searchParams.get("v") || requestUrl.searchParams.get("version");

            if (reqVersion && String(reqVersion) === String(stateVersion)) {

                sendJson(res, { ok: true, upToDate: true, version: stateVersion });

                return;

            }

            const currentState = loadBusState();

            const assignments = currentState._depotAssignments || getDefaultDepotAssignments();

            const counts = getDepotCounts(assignments, currentState);

            sendJson(res, {

                ok: true,

                version: stateVersion,

                busState: currentState,

                allocatedDuties: currentState._allocatedDuties || [],

                lockedBuses: currentState._lockedBuses || [],

                addedBuses: currentState._addedBuses || {},

                deletedBuses: currentState._deletedBuses || {},

                depotAssignments: assignments,

                servicingStatus: currentState._servicingStatus || {},

                chargingHistory: currentState._chargingHistory || getDefaultChargingHistory(),

                cleaningHistory: currentState._cleaningHistory || getDefaultCleaningHistory(),

                completedRoutesLog: currentState._completedRoutesLog || getDefaultCompletedRoutesLog(),

                depot1Count: counts.depot1Count,

                depot2Count: counts.depot2Count,

                customDepots: currentState._customDepots || [],

                customAccounts: currentState._customAccounts || {},

                deletedDepotIds: currentState._deletedDepotIds || [],

                routesDatabase: currentState._routesDatabase || loadRoutesDataset() || {},

                timestamp: Date.now()

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load sync state", details: error.message }, 500);

        }

        return;

    }

    // ── GET & POST /api/custom-depots (Cross-Device Dynamic Depot Synchronization) ──
    if (pathname === "/api/custom-depots") {
        if (req.method === "GET") {
            try {
                const currentState = loadBusState();
                sendJson(res, {
                    ok: true,
                    customDepots: currentState._customDepots || [],
                    customAccounts: currentState._customAccounts || {},
                    deletedDepotIds: currentState._deletedDepotIds || [],
                    version: stateVersion
                });
            } catch (err) {
                sendJson(res, { ok: false, error: "Failed to load custom depots", details: err.message }, 500);
            }
            return;
        }

        if (req.method === "POST") {
            readBody(req, body => {
                try {
                    const payload = JSON.parse(body || "{}");
                    const currentState = loadBusState();
                    if (!Array.isArray(currentState._customDepots)) {
                        currentState._customDepots = [];
                    }
                    if (!currentState._customAccounts || typeof currentState._customAccounts !== "object") {
                        currentState._customAccounts = {};
                    }
                    if (!Array.isArray(currentState._deletedDepotIds)) {
                        currentState._deletedDepotIds = [];
                    }

                    const { action, depot, depotId, accounts, customDepots, customAccounts, deletedDepotIds } = payload;

                    // Ingest any incoming deleted depot IDs
                    if (Array.isArray(deletedDepotIds)) {
                        deletedDepotIds.forEach(id => {
                            const cId = String(id || "").trim();
                            if (cId && !currentState._deletedDepotIds.includes(cId)) {
                                currentState._deletedDepotIds.push(cId);
                            }
                        });
                    }

                    if (action === "add" && depot) {
                        const cleanId = String(depot.id || "").trim();
                        // Un-tombstone if re-created
                        currentState._deletedDepotIds = currentState._deletedDepotIds.filter(id => id !== cleanId);
                        const existingIdx = currentState._customDepots.findIndex(d => String(d.id) === cleanId);
                        if (existingIdx >= 0) {
                            currentState._customDepots[existingIdx] = depot;
                        } else {
                            currentState._customDepots.push(depot);
                        }
                        if (accounts && typeof accounts === "object") {
                            Object.assign(currentState._customAccounts, accounts);
                        }
                    } else if (action === "delete" || action === "delete_batch" || action === "delete-batch") {
                        const idsToDelete = Array.isArray(payload.depotIds)
                            ? payload.depotIds.map(x => String(x || "").trim()).filter(Boolean)
                            : [String(depotId || depot?.id || "").trim()].filter(Boolean);

                        idsToDelete.forEach(cleanId => {
                            if (!cleanId) return;
                            if (!currentState._deletedDepotIds.includes(cleanId)) {
                                currentState._deletedDepotIds.push(cleanId);
                            }
                            currentState._customDepots = currentState._customDepots.filter(d => String(d.id) !== cleanId);
                            for (const k of Object.keys(currentState._customAccounts)) {
                                if (currentState._customAccounts[k] && String(currentState._customAccounts[k].depot) === cleanId) {
                                    delete currentState._customAccounts[k];
                                }
                            }
                            // Unassign any bus duties allocated to this deleted depot
                            if (Array.isArray(currentState._allocatedDuties)) {
                                currentState._allocatedDuties = currentState._allocatedDuties.filter(d => String(d.depot) !== cleanId);
                            }
                            // Also cascade delete depot and its routes from Master Route Dataset
                            let db = currentState._routesDatabase || loadRoutesDataset();
                            if (db) {
                                if (Array.isArray(db.depots)) {
                                    db.depots = db.depots.filter(d => String(d.id) !== cleanId);
                                }
                                if (Array.isArray(db.routes)) {
                                    db.routes = db.routes.filter(r => String(r.depotId) !== cleanId);
                                }
                                currentState._routesDatabase = db;
                                saveRoutesDataset(db);
                            }
                        });
                    } else if (action === "sync" || Array.isArray(customDepots)) {
                        // Purge any depots or accounts that are in _deletedDepotIds
                        currentState._customDepots = (currentState._customDepots || []).filter(d => !currentState._deletedDepotIds.includes(String(d.id)));
                        for (const k of Object.keys(currentState._customAccounts || {})) {
                            if (currentState._customAccounts[k] && currentState._deletedDepotIds.includes(String(currentState._customAccounts[k].depot))) {
                                delete currentState._customAccounts[k];
                            }
                        }
                        if (Array.isArray(customDepots)) {
                            customDepots.forEach(d => {
                                if (!d || !d.id) return;
                                const id = String(d.id).trim();
                                if (currentState._deletedDepotIds.includes(id)) return;
                                const idx = currentState._customDepots.findIndex(ex => String(ex.id) === id);
                                if (idx >= 0) {
                                    currentState._customDepots[idx] = d;
                                } else {
                                    currentState._customDepots.push(d);
                                }
                            });
                        }
                        if (customAccounts && typeof customAccounts === "object") {
                            for (const [k, acc] of Object.entries(customAccounts)) {
                                if (acc && acc.depot && !currentState._deletedDepotIds.includes(String(acc.depot))) {
                                    currentState._customAccounts[k] = acc;
                                }
                            }
                        }
                    }

                    saveBusState(currentState);
                    broadcastSyncEvent("custom-depots-updated", {
                        customDepots: currentState._customDepots,
                        customAccounts: currentState._customAccounts,
                        deletedDepotIds: currentState._deletedDepotIds
                    });

                    sendJson(res, {
                        ok: true,
                        message: "Custom depots synchronized successfully",
                        customDepots: currentState._customDepots,
                        customAccounts: currentState._customAccounts,
                        deletedDepotIds: currentState._deletedDepotIds,
                        version: stateVersion
                    });
                } catch (err) {
                    sendJson(res, { ok: false, error: "Failed to update custom depots", details: err.message }, 500);
                }
            });
            return;
        }
    }

    // ── GET & POST /api/dataset/routes (Master Route, Schedule, and Complexity Dataset) ──
    if (pathname === "/api/dataset/routes") {
        if (req.method === "GET") {
            try {
                const currentState = loadBusState();
                const fileDataset = loadRoutesDataset();
                const dataset = fileDataset || currentState._routesDatabase || {};
                sendJson(res, { ok: true, dataset, version: stateVersion });
            } catch (err) {
                sendJson(res, { ok: false, error: "Failed to load routes dataset", details: err.message }, 500);
            }
            return;
        }

        if (req.method === "POST") {
            readBody(req, body => {
                try {
                    const payload = JSON.parse(body || "{}");
                    const currentState = loadBusState();
                    let dataset = currentState._routesDatabase || loadRoutesDataset();
                    if (!dataset || !Array.isArray(dataset.routes)) {
                        dataset = {
                            version: "1.0",
                            name: "Ashok Leyland EV Fleet - Master Route & Schedule Database",
                            lastUpdated: new Date().toISOString(),
                            depots: [],
                            routes: [],
                            timeComplexityConfig: {}
                        };
                    }

                    const { action, route, depot, routeCode, depotId, routeComplexity, timeComplexity, timeSlot, timetables, dataset: incomingDataset } = payload;

                    if (incomingDataset && Array.isArray(incomingDataset.routes)) {
                        dataset = incomingDataset;
                    } else if (action === "add_route" && route) {
                        const cleanCode = String(route.code || route.id || "").toUpperCase().trim();
                        const dId = String(route.depotId || depotId || "1").trim();
                        if (!dataset.routes) dataset.routes = [];
                        const existingIdx = dataset.routes.findIndex(r => String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId);
                        if (existingIdx >= 0) {
                            dataset.routes[existingIdx] = route;
                        } else {
                            dataset.routes.push(route);
                        }
                        if (dataset.depots) {
                            const depotObj = dataset.depots.find(d => String(d.id).trim() === dId);
                            if (depotObj && Array.isArray(depotObj.routes) && !depotObj.routes.includes(cleanCode)) {
                                depotObj.routes.push(cleanCode);
                            }
                        }
                    } else if ((action === "delete_route" || action === "delete_routes_batch" || action === "delete-routes-batch") && (routeCode || Array.isArray(payload.routeCodes) || Array.isArray(payload.routes))) {
                        const codes = Array.isArray(payload.routeCodes) ? payload.routeCodes : (Array.isArray(payload.routes) ? payload.routes : [routeCode]);
                        codes.forEach(codeItem => {
                            const cleanCode = String(codeItem?.code || codeItem?.id || codeItem || "").toUpperCase().trim();
                            const dId = codeItem?.depotId ? String(codeItem.depotId).trim() : (depotId ? String(depotId).trim() : null);
                            if (dataset.routes) {
                                dataset.routes = dataset.routes.filter(r => !(String(r.code).toUpperCase().trim() === cleanCode && (!dId || String(r.depotId).trim() === dId)));
                            }
                            if (dId && dataset.depots) {
                                const depotObj = dataset.depots.find(d => String(d.id).trim() === dId);
                                if (depotObj && Array.isArray(depotObj.routes)) {
                                    depotObj.routes = depotObj.routes.filter(c => String(c).toUpperCase().trim() !== cleanCode);
                                }
                            }
                        });
                    } else if (action === "add_depot" && depot) {
                        const cleanId = String(depot.id || "").trim();
                        if (!dataset.depots) dataset.depots = [];
                        const existingIdx = dataset.depots.findIndex(d => String(d.id).trim() === cleanId);
                        if (existingIdx >= 0) {
                            dataset.depots[existingIdx] = { ...dataset.depots[existingIdx], ...depot };
                        } else {
                            dataset.depots.push(depot);
                        }
                    } else if (action === "delete_depot" && depotId) {
                        const cleanId = String(depotId).trim();
                        if (dataset.depots) {
                            dataset.depots = dataset.depots.filter(d => String(d.id).trim() !== cleanId);
                        }
                        if (dataset.routes) {
                            dataset.routes = dataset.routes.filter(r => String(r.depotId).trim() !== cleanId);
                        }
                    } else if (action === "update_route_complexity" && routeCode && routeComplexity) {
                        const cleanCode = String(routeCode).toUpperCase().trim();
                        const dId = depotId ? String(depotId).trim() : null;
                        if (dataset.routes) {
                            dataset.routes.forEach(r => {
                                if (String(r.code).toUpperCase().trim() === cleanCode && (!dId || String(r.depotId).trim() === dId)) {
                                    r.routeComplexity = routeComplexity;
                                    r.category = routeComplexity;
                                    if (routeComplexity === 'Complex') r.requiredCat = 'A';
                                    else if (routeComplexity === 'Moderate') r.requiredCat = 'B';
                                }
                            });
                        }
                    } else if (action === "update_time_complexity" && routeCode && timeComplexity) {
                        const cleanCode = String(routeCode).toUpperCase().trim();
                        const dId = depotId ? String(depotId).trim() : null;
                        if (dataset.routes) {
                            dataset.routes.forEach(r => {
                                if (String(r.code).toUpperCase().trim() === cleanCode && (!dId || String(r.depotId).trim() === dId)) {
                                    if (timeSlot) {
                                        if (!r.timeComplexitySlots) r.timeComplexitySlots = {};
                                        r.timeComplexitySlots[timeSlot] = timeComplexity;
                                    } else {
                                        r.timeComplexity = timeComplexity;
                                    }
                                }
                            });
                        }
                    } else if (action === "update_timetables" && routeCode && Array.isArray(timetables)) {
                        const cleanCode = String(routeCode).toUpperCase().trim();
                        const dId = depotId ? String(depotId).trim() : null;
                        if (dataset.routes) {
                            dataset.routes.forEach(r => {
                                if (String(r.code || r.id).toUpperCase().trim() === cleanCode && (!dId || String(r.depotId).trim() === dId)) {
                                    r.timetables = timetables;
                                    r._timetablesManaged = true;
                                }
                            });
                        }
                    } else if (action === "add_departure_time" && routeCode && payload.departureTime) {
                        const cleanCode = String(routeCode).toUpperCase().trim();
                        const dId = depotId ? String(depotId).trim() : null;
                        const tParts = normalizeDepartureTimeParts(payload.departureTime);
                        if (!tParts) {
                            sendJson(res, { ok: false, error: "Invalid departure time format. Please use e.g. 07:30 AM or 14:30." }, 400);
                            return;
                        }
                        if (!Array.isArray(dataset.routes)) dataset.routes = [];
                        let targets = dataset.routes.filter(r => String(r.code || r.id).toUpperCase().trim() === cleanCode && (!dId || String(r.depotId).trim() === dId));
                        if (targets.length === 0) {
                            targets = dataset.routes.filter(r => String(r.code || r.id).toUpperCase().trim() === cleanCode);
                        }
                        if (targets.length === 0) {
                            const newEntry = {
                                code: cleanCode,
                                id: cleanCode,
                                depotId: dId || "1",
                                name: `Route ${cleanCode}`,
                                fullName: `Route ${cleanCode}`,
                                shortName: cleanCode,
                                distance: 25,
                                fullDutyKm: 50,
                                routeComplexity: "Standard",
                                category: "Standard",
                                timetables: [],
                                timeComplexitySlots: {},
                                schedules: [],
                                _deletedTimes: [],
                                _timetablesManaged: true
                            };
                            dataset.routes.push(newEntry);
                            targets = [newEntry];
                        }
                        let duplicateFound = false;
                        targets.forEach(r => {
                            const flat = Array.isArray(r.timetables) ? r.timetables.flat().filter(Boolean) : [];
                            const hasDup = flat.some(existingT => {
                                const ep = normalizeDepartureTimeParts(existingT);
                                return ep ? ep.h24Str === tParts.h24Str : String(existingT).trim().toLowerCase() === tParts.ampmStr.toLowerCase();
                            });
                            if (hasDup) {
                                duplicateFound = true;
                                return;
                            }
                            flat.push(tParts.ampmStr);
                            flat.sort((a, b) => {
                                const pa = normalizeDepartureTimeParts(a);
                                const pb = normalizeDepartureTimeParts(b);
                                return (pa ? pa.minutes : 0) - (pb ? pb.minutes : 0);
                            });
                            r.timetables = flat;
                            r._timetablesManaged = true;
                            if (Array.isArray(r._deletedTimes)) {
                                r._deletedTimes = r._deletedTimes.filter(dt => {
                                    const dp = normalizeDepartureTimeParts(dt);
                                    return dp ? dp.h24Str !== tParts.h24Str : true;
                                });
                            }
                            if (!r.timeComplexitySlots || typeof r.timeComplexitySlots !== "object") r.timeComplexitySlots = {};
                            r.timeComplexitySlots[tParts.ampmStr] = tParts.tier;
                            if (!Array.isArray(r.schedules)) r.schedules = [];
                            const schedExists = r.schedules.some(s => {
                                const sp = normalizeDepartureTimeParts(s.departureTime || s.outTime);
                                return sp && sp.h24Str === tParts.h24Str;
                            });
                            if (!schedExists) {
                                r.schedules.push({
                                    scheduleId: `${cleanCode}/T-${tParts.h24Str.replace(":", "")}`,
                                    route: cleanCode,
                                    shift: tParts.shift,
                                    outTime: tParts.outTime24,
                                    departureTime: tParts.ampmStr,
                                    inTime: "16:00:00",
                                    category: r.routeComplexity || r.category || "Standard",
                                    totalGroupDistance: Number(r.fullDutyKm || r.distance || 0),
                                    distance: Number(r.distance || 0),
                                    singleChargeReqKm: r.singleChargeReqKm || Math.round((Number(r.distance) || 25) * 1.5)
                                });
                            }
                        });
                        if (duplicateFound) {
                            sendJson(res, { ok: false, error: `Departure time ${tParts.ampmStr} already exists for Route ${cleanCode}.` }, 400);
                            return;
                        }
                    } else if (action === "delete_departure_time" && routeCode && (payload.departureTime || Array.isArray(payload.departureTimes))) {
                        const cleanCode = String(routeCode).toUpperCase().trim();
                        const dId = depotId ? String(depotId).trim() : null;
                        const toDeleteRaw = Array.isArray(payload.departureTimes) ? payload.departureTimes : [payload.departureTime];
                        const deleteH24Keys = new Set();
                        const deleteRawKeys = new Set();
                        toDeleteRaw.forEach(dt => {
                            const rawLower = String(dt || "").trim().toLowerCase();
                            if (rawLower) deleteRawKeys.add(rawLower);
                            const dp = normalizeDepartureTimeParts(dt);
                            if (dp) deleteH24Keys.add(dp.h24Str);
                        });
                        if (!Array.isArray(dataset.routes)) dataset.routes = [];
                        let targets = dataset.routes.filter(r => String(r.code || r.id).toUpperCase().trim() === cleanCode && (!dId || String(r.depotId).trim() === dId));
                        if (targets.length === 0) {
                            targets = dataset.routes.filter(r => String(r.code || r.id).toUpperCase().trim() === cleanCode);
                        }
                        targets.forEach(r => {
                            const flat = Array.isArray(r.timetables) ? r.timetables.flat().filter(Boolean) : [];
                            r.timetables = flat.filter(existingT => {
                                const ep = normalizeDepartureTimeParts(existingT);
                                if (ep && deleteH24Keys.has(ep.h24Str)) return false;
                                if (deleteRawKeys.has(String(existingT).trim().toLowerCase())) return false;
                                return true;
                            });
                            r._timetablesManaged = true;
                            if (!Array.isArray(r._deletedTimes)) r._deletedTimes = [];
                            deleteH24Keys.forEach(hKey => {
                                if (!r._deletedTimes.includes(hKey)) r._deletedTimes.push(hKey);
                            });
                            if (r.timeComplexitySlots && typeof r.timeComplexitySlots === "object") {
                                Object.keys(r.timeComplexitySlots).forEach(k => {
                                    const kp = normalizeDepartureTimeParts(k);
                                    if ((kp && deleteH24Keys.has(kp.h24Str)) || deleteRawKeys.has(k.trim().toLowerCase())) {
                                        delete r.timeComplexitySlots[k];
                                    }
                                });
                            }
                            if (Array.isArray(r.schedules)) {
                                r.schedules = r.schedules.filter(s => {
                                    const sp = normalizeDepartureTimeParts(s.departureTime || s.outTime);
                                    if (sp && deleteH24Keys.has(sp.h24Str)) return false;
                                    const rawOut = String(s.outTime || "").trim().toLowerCase();
                                    const rawDep = String(s.departureTime || "").trim().toLowerCase();
                                    if (deleteRawKeys.has(rawOut) || deleteRawKeys.has(rawDep)) return false;
                                    return true;
                                });
                            }
                        });
                    }

                    currentState._routesDatabase = dataset;
                    saveRoutesDataset(dataset);
                    saveBusState(currentState);
                    cachedCorridorSchedules = null;
                    stateVersion = Date.now();
                    broadcastSyncEvent("routes-dataset-updated", { dataset });
                    sendJson(res, { ok: true, dataset, version: stateVersion });
                } catch (err) {
                    sendJson(res, { ok: false, error: "Failed to update routes dataset", details: err.message }, 500);
                }
            });
            return;
        }
    }

// ── Helper: Parse and ingest uploaded CSV or Excel dataset into Fleet ──
function ingestUploadedFleetDataset(filePath, safeName, targetDepot, targetDepotName) {
    const defaultDepot = targetDepot && targetDepot !== "all" ? String(targetDepot) : "1";
    const rows = [];
    const seenRegOrBm = new Set();

    // 1. Try pure JavaScript SheetJS (XLSX) parser for .csv, .tsv, .xlsx, .xls, .xlx
    if (XLSX) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;

            const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            if (!rawRows || rawRows.length < 2) continue;

            let headerRowIdx = -1;
            let regIdx = -1;
            let bmIdx = -1;
            let catIdx = -1;
            let depotIdx = -1;
            let socIdx = -1;
            let modelIdx = -1;
            let rangeIdx = -1;

            for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
                const row = rawRows[r];
                if (!Array.isArray(row)) continue;

                let foundReg = -1, foundBm = -1, foundCat = -1, foundDepot = -1, foundSoc = -1, foundModel = -1, foundRange = -1;

                row.forEach((cell, cIdx) => {
                    const clean = String(cell || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (!clean) return;

                    if (/reg(no|number|num)?|registration(number|no)?|busreg/i.test(clean)) foundReg = cIdx;
                    else if (/^bm(no|number)?$|^busno$|^vehicleid$|^rowlabels$/i.test(clean)) foundBm = cIdx;
                    else if (/cat(egory)?/i.test(clean)) foundCat = cIdx;
                    else if (/depot/i.test(clean)) foundDepot = cIdx;
                    else if (/soc|battery/i.test(clean)) foundSoc = cIdx;
                    else if (/model/i.test(clean)) foundModel = cIdx;
                    else if (/range|actualrange/i.test(clean)) foundRange = cIdx;
                });

                if (foundReg !== -1 || foundBm !== -1) {
                    headerRowIdx = r;
                    regIdx = foundReg;
                    bmIdx = foundBm;
                    catIdx = foundCat;
                    depotIdx = foundDepot;
                    socIdx = foundSoc;
                    modelIdx = foundModel;
                    rangeIdx = foundRange;
                    break;
                }
            }

            if (headerRowIdx === -1) continue;

            for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
                const row = rawRows[r];
                if (!Array.isArray(row) || row.length === 0) continue;

                const regNo = regIdx >= 0 && row[regIdx] ? String(row[regIdx]).replace(/\s+/g, "").toUpperCase() : "";
                const bm = bmIdx >= 0 && row[bmIdx] ? String(row[bmIdx]).replace(/\s+/g, "").toUpperCase() : "";
                const rawCat = catIdx >= 0 && row[catIdx] ? String(row[catIdx]).trim().toUpperCase() : "";
                const depotVal = depotIdx >= 0 && row[depotIdx] ? String(row[depotIdx]).trim() : "";
                const socVal = socIdx >= 0 && row[socIdx] ? parseFloat(row[socIdx]) : 100;
                const modelVal = modelIdx >= 0 && row[modelIdx] ? String(row[modelIdx]).trim() : "ELECTRIC BUS AC EiV12";
                const rangeVal = rangeIdx >= 0 && row[rangeIdx] ? parseFloat(row[rangeIdx]) : null;

                if (!regNo && !bm) continue;
                if (regNo === "REGNO" || regNo === "REGISTRATIONNO" || bm === "BMNO" || bm === "BM" || bm === "ROWLABELS") continue;

                const dedupeKey = (bm || regNo);
                if (seenRegOrBm.has(dedupeKey)) continue;
                seenRegOrBm.add(dedupeKey);

                rows.push({
                    bm,
                    regNo,
                    rawCat,
                    depotVal: depotVal || defaultDepot,
                    socVal: isNaN(socVal) ? 100 : socVal,
                    modelVal,
                    rangeVal,
                    sourceSheet: sheetName
                });
            }
        }
    } catch (sheetErr) {
        console.warn("SheetJS parse warning, falling back to line parser:", sheetErr.message);
    }
}

    // 2. Line parser fallback for plain CSV/text
    if (rows.length === 0) {
        try {
            const content = fs.readFileSync(filePath, "utf8");
            const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length >= 2) {
                const headers = parseCsvLine(lines[0]);
                let regIdx = -1, catIdx = -1, bmIdx = -1, depotIdx = -1, socIdx = -1, modelIdx = -1;

                headers.forEach((h, idx) => {
                    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (/reg(no|number|num)?|registration(number|no)?|busreg/i.test(clean)) regIdx = idx;
                    else if (/cat(egory)?/i.test(clean)) catIdx = idx;
                    else if (/^bm(no|number)?$|^busno$|^vehicleid$/i.test(clean)) bmIdx = idx;
                    else if (/depot/i.test(clean)) depotIdx = idx;
                    else if (/soc|battery/i.test(clean)) socIdx = idx;
                    else if (/model/i.test(clean)) modelIdx = idx;
                });

                for (let i = 1; i < lines.length; i++) {
                    const parts = parseCsvLine(lines[i]);
                    if (!parts || parts.length === 0) continue;
                    const regNo = regIdx >= 0 && parts[regIdx] ? parts[regIdx].replace(/\s+/g, "").toUpperCase() : "";
                    const bm = bmIdx >= 0 && parts[bmIdx] ? parts[bmIdx].replace(/\s+/g, "").toUpperCase() : "";
                    const rawCat = catIdx >= 0 && parts[catIdx] ? parts[catIdx].trim().toUpperCase() : "";
                    const depotVal = depotIdx >= 0 && parts[depotIdx] ? parts[depotIdx].trim() : "";
                    const socVal = socIdx >= 0 && parts[socIdx] ? parseFloat(parts[socIdx]) : 100;
                    const modelVal = modelIdx >= 0 && parts[modelIdx] ? parts[modelIdx].trim() : "ELECTRIC BUS AC EiV12";

                    if (!regNo && !bm) continue;
                    const cleanReg = regNo.replace(/[^A-Z0-9]/g, "");
                    if (cleanReg === "REGNO" || cleanReg === "REGISTRATIONNO" || cleanReg === "BUSREG") continue;
                    const dedupeKey = (bm || regNo);
                    if (seenRegOrBm.has(dedupeKey)) continue;
                    seenRegOrBm.add(dedupeKey);
                    rows.push({ bm, regNo, rawCat, depotVal, socVal, modelVal });
                }
            }
        } catch (err) {
            console.error("Error parsing fallback CSV fleet dataset:", err.message);
        }
    }

    if (rows.length === 0) {
        return { busesProcessed: 0, added: [] };
    }

    const state = loadBusState();

    // ── DUPLICATE CHECK: Verify if any bus in dataset already exists in fleet ──
    const duplicates = [];
    for (const row of rows) {
        const rReg = String(row.regNo || "").replace(/[^A-Z0-9]/g, "").toUpperCase();
        let rBm = String(row.bm || "").toUpperCase().trim();
        if (rBm && !rBm.startsWith("BM")) rBm = "BM" + rBm;
        const existing = findExistingBus(rBm, rReg, state);
        if (existing) {
            duplicates.push(existing);
        }
    }

    if (duplicates.length > 0) {
        return {
            busesProcessed: 0,
            added: [],
            duplicateError: `Bus ${duplicates[0].bm} (${duplicates[0].regNo}) already exists in ${duplicates[0].depotName}!`
        };
    }

    const addedList = [];
    const usedBms = new Set();
    Object.keys(state).forEach(k => {
        if (/^BM\d+$/i.test(k)) usedBms.add(k.toUpperCase());
    });
    if (state._addedBuses) {
        Object.keys(state._addedBuses).forEach(k => usedBms.add(k.toUpperCase()));
    }

    // Ingest each bus
    rows.forEach((row, idx) => {
        const regNo = String(row.regNo || "").replace(/\s+/g, "").toUpperCase();
        let rawCat = String(row.rawCat || "B").toUpperCase().replace(/^CAT(EGORY)?\s*[:\-_]?\s*/i, "").trim();
        let category = "B";
        if (/^A\b/i.test(rawCat) || /CAT\s*A\b/i.test(row.rawCat)) category = "A";
        else if (/^B\b/i.test(rawCat) || /CAT\s*B\b/i.test(row.rawCat)) category = "B";
        else if (/^C\b/i.test(rawCat) || /CAT\s*C\b/i.test(row.rawCat)) category = "C";

        let depot = defaultDepot;
        if (row.depotVal) {
            const cleanDepot = String(row.depotVal).replace(/\D/g, "");
            if (cleanDepot) depot = cleanDepot;
        }

        let bm = String(row.bm || "").toUpperCase().trim();
        if (bm && !bm.startsWith("BM")) bm = "BM" + bm;

        // Check if this regNo already has a BM assigned in state
        let existingBm = null;
        Object.keys(state).forEach(k => {
            if (state[k] && state[k].regNo && state[k].regNo.toUpperCase() === regNo) {
                existingBm = k.toUpperCase();
            }
        });
        if (!existingBm && state._addedBuses) {
            Object.keys(state._addedBuses).forEach(k => {
                if (state._addedBuses[k] && state._addedBuses[k].regNo && state._addedBuses[k].regNo.toUpperCase() === regNo) {
                    existingBm = k.toUpperCase();
                }
            });
        }

        if (existingBm) {
            bm = existingBm;
        } else if (!bm && regNo) {
            const digits = regNo.replace(/\D/g, "");
            let candidate = digits.length >= 3 ? "BM" + digits.slice(-4) : "";
            if (candidate && !usedBms.has(candidate)) {
                bm = candidate;
            } else {
                let nextNum = 305 + idx;
                while (usedBms.has("BM" + String(nextNum).padStart(3, "0")) || usedBms.has("BM" + nextNum)) {
                    nextNum++;
                }
                bm = "BM" + String(nextNum).padStart(3, "0");
            }
        } else if (!bm) {
            let nextNum = 305 + idx;
            while (usedBms.has("BM" + String(nextNum).padStart(3, "0")) || usedBms.has("BM" + nextNum)) {
                nextNum++;
            }
            bm = "BM" + String(nextNum).padStart(3, "0");
        }

        usedBms.add(bm);

        try {
            const result = addFleetBus({
                bm,
                regNo: regNo || `KA51AH${bm.replace(/\D/g, "").padStart(4, "0")}`,
                category,
                depot,
                soc: Number(row.socVal) || 100,
                model: row.modelVal || "ELECTRIC BUS AC EiV12",
                reason: `Dataset import: ${safeName}`
            });
            addedList.push({
                bm: result.bm,
                regNo: result.regNo,
                category: result.category,
                depot: result.depot,
                soc: Number(row.socVal) || 100,
                model: row.modelVal || "ELECTRIC BUS AC EiV12",
                reason: `Dataset import: ${safeName}`
            });
        } catch (addErr) {
            console.warn("Could not add bus from dataset:", bm, addErr.message);
        }
    });

    return {
        busesProcessed: rows.length,
        added: addedList
    };
}

// ── Helper: Format Excel numeric time fraction or time string to HH:MM AM/PM ──
function formatSpreadsheetTime(val) {
    if (val === null || val === undefined || val === "") return null;
    if (typeof val === "number") {
        const totalMinutes = Math.round(val * 24 * 60);
        const hours24 = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;
        const isPm = hours24 >= 12;
        const hours12 = hours24 % 12 || 12;
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(hours12)}:${pad(minutes)} ${isPm ? "PM" : "AM"}`;
    }
    const str = String(val).trim();
    if (/^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(str)) {
        const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const m = match[2];
            const ampm = match[3] ? match[3].toUpperCase() : null;
            if (ampm) {
                return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
            } else {
                const isPm = h >= 12;
                const h12 = h % 12 || 12;
                return `${String(h12).padStart(2, "0")}:${m} ${isPm ? "PM" : "AM"}`;
            }
        }
    }
    return str;
}

// ── Helper: Parse and ingest uploaded Route details and Departure Times into Master Dataset ──
function ingestUploadedRouteAndScheduleDataset(filePath, safeName, targetDepot, targetDepotName) {
    const defaultDepot = targetDepot && targetDepot !== "all" ? String(targetDepot) : "1";
    const routesMap = new Map();

    // 1. SheetJS parser for Excel & CSV
    if (XLSX) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) continue;

                const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                if (!rawRows || rawRows.length < 2) continue;

                let headerIdx = -1;
                let routeIdx = -1, schedIdx = -1, outTimeIdx = -1, inTimeIdx = -1, shiftIdx = -1;
                let fixBmIdx = -1, swapBmIdx = -1, distIdx = -1, origIdx = -1, destIdx = -1;
                let tripDistIdx = -1, dutyDistIdx = -1, nameIdx = -1, catIdx = -1, singleChargeIdx = -1, chargingOccIdx = -1;

                for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
                    const row = rawRows[r];
                    if (!Array.isArray(row)) continue;
                    let fRoute = -1, fSched = -1, fOut = -1, fIn = -1, fShift = -1, fFix = -1, fSwap = -1;
                    let fTripDist = -1, fDist = -1, fDutyDist = -1, fName = -1, fCat = -1, fSingleCharge = -1, fChargingOcc = -1, fOrig = -1, fDest = -1;

                    row.forEach((cell, cIdx) => {
                        const clean = String(cell || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                        if (/^route(no|code)?$/i.test(clean) || clean === "route") fRoute = cIdx;
                        else if (/^(routefullname|fullname|routename)$/i.test(clean)) fName = cIdx;
                        else if (/^sched(ule)?(id|no|code)?$/i.test(clean) || clean === "schedule") fSched = cIdx;
                        else if (/^(outtime|departuretime|deptime|departure|cumtime|starttime|timetable|timetables)$/i.test(clean)) fOut = cIdx;
                        else if (/^(intime|arrivaltime|arrtime|arrival|endtime)$/i.test(clean)) fIn = cIdx;
                        else if (/^shift$/i.test(clean)) fShift = cIdx;
                        else if (/^(fixbm|fixedbm|bmno)$/i.test(clean)) fFix = cIdx;
                        else if (/^(swapbm|swap)$/i.test(clean)) fSwap = cIdx;
                        // One-way physical trip distance (Origin to Destination) - priority 1 for route distance
                        else if (/^(totalkmorigintodestination|origintodestination|tripdistance|tripkm|onewaykm|routekm|totalkm)$/i.test(clean)) fTripDist = cIdx;
                        else if (/^(distance|km|length)$/i.test(clean)) fDist = cIdx;
                        // Cumulative shift duty distance / running km
                        else if (/^(actualkm|routelengthschedule|routelength)$/i.test(clean)) fDutyDist = cIdx;
                        else if (/^(singlechargeoperationrequiredasperform4|singlechargereqkm|singlecharge)$/i.test(clean)) fSingleCharge = cIdx;
                        else if (/^(chargingocc|chargingoccurrence|chargingoccurrences|nochargeingoccschedule|nochargingoccschedule|nochargingocc|chargingtimes|noofchargingtimes|midchargerequired|splitduty)$/i.test(clean)) fChargingOcc = cIdx;
                        else if (/^(category|routecomplexity|complexity)$/i.test(clean)) fCat = cIdx;
                        else if (/^(origin|from|startpoint|startingpoint)$/i.test(clean)) fOrig = cIdx;
                        else if (/^(destination|dest|to|endpoint)$/i.test(clean)) fDest = cIdx;
                    });

                    if (fRoute !== -1 || fSched !== -1 || fOut !== -1) {
                        headerIdx = r;
                        routeIdx = fRoute;
                        nameIdx = fName;
                        schedIdx = fSched;
                        outTimeIdx = fOut;
                        inTimeIdx = fIn;
                        shiftIdx = fShift;
                        fixBmIdx = fFix;
                        swapBmIdx = fSwap;
                        tripDistIdx = fTripDist;
                        distIdx = fDist;
                        dutyDistIdx = fDutyDist;
                        singleChargeIdx = fSingleCharge;
                        chargingOccIdx = fChargingOcc;
                        catIdx = fCat;
                        origIdx = fOrig;
                        destIdx = fDest;
                        break;
                    }
                }

                if (headerIdx === -1) continue;

                for (let r = headerIdx + 1; r < rawRows.length; r++) {
                    const row = rawRows[r];
                    if (!Array.isArray(row) || row.length === 0) continue;

                    const rawRouteOrSched = (routeIdx >= 0 ? row[routeIdx] : "") || (schedIdx >= 0 ? row[schedIdx] : "");
                    if (!rawRouteOrSched) continue;

                    const fullStr = String(rawRouteOrSched).trim().toUpperCase();
                    if (fullStr === "ROUTE" || fullStr === "SCHEDULE" || fullStr === "SL" || fullStr === "TOTAL" || fullStr === "SL NO" || fullStr === "SL NO.") continue;

                    let routeCode = fullStr;
                    let scheduleId = fullStr;
                    if (fullStr.includes("/")) {
                        routeCode = fullStr.split("/")[0].trim();
                    }

                    let parsedDist = null;
                    if (tripDistIdx >= 0 && row[tripDistIdx] && !isNaN(parseFloat(row[tripDistIdx]))) {
                        parsedDist = parseFloat(row[tripDistIdx]);
                    } else if (distIdx >= 0 && row[distIdx] && !isNaN(parseFloat(row[distIdx]))) {
                        parsedDist = parseFloat(row[distIdx]);
                    } else if (dutyDistIdx >= 0 && row[dutyDistIdx] && !isNaN(parseFloat(row[dutyDistIdx]))) {
                        parsedDist = parseFloat(row[dutyDistIdx]);
                    }

                    let parsedDutyKm = null;
                    if (dutyDistIdx >= 0 && row[dutyDistIdx] && !isNaN(parseFloat(row[dutyDistIdx]))) {
                        parsedDutyKm = parseFloat(row[dutyDistIdx]);
                    }

                    let parsedSingleCharge = null;
                    if (singleChargeIdx >= 0 && row[singleChargeIdx] && !isNaN(parseFloat(row[singleChargeIdx]))) {
                        parsedSingleCharge = parseFloat(row[singleChargeIdx]);
                    }

                    let parsedChargingOcc = null;
                    if (chargingOccIdx >= 0 && row[chargingOccIdx] !== undefined && row[chargingOccIdx] !== null && !isNaN(parseInt(row[chargingOccIdx], 10))) {
                        parsedChargingOcc = parseInt(row[chargingOccIdx], 10);
                    }

                    const parsedFullName = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : null;
                    const parsedCategory = catIdx >= 0 && row[catIdx] ? String(row[catIdx]).trim() : null;

                    if (!routesMap.has(routeCode)) {
                        routesMap.set(routeCode, {
                            code: routeCode,
                            depotId: defaultDepot,
                            distance: parsedDist,
                            fullDutyKm: parsedDutyKm,
                            actualKm: parsedDutyKm,
                            chargingOcc: parsedChargingOcc ?? 0,
                            noChargingOcc: parsedChargingOcc ?? 0,
                            splitDuty: Boolean(parsedChargingOcc && parsedChargingOcc > 0),
                            singleChargeReqKm: parsedSingleCharge,
                            fullName: parsedFullName,
                            category: parsedCategory,
                            origin: origIdx >= 0 && row[origIdx] ? String(row[origIdx]).trim() : null,
                            destination: destIdx >= 0 && row[destIdx] ? String(row[destIdx]).trim() : null,
                            timetables: new Set(),
                            schedules: []
                        });
                    }

                    const rObj = routesMap.get(routeCode);
                    if (parsedDutyKm && !rObj.fullDutyKm) rObj.fullDutyKm = parsedDutyKm;
                    if (parsedDutyKm && !rObj.actualKm) rObj.actualKm = parsedDutyKm;
                    if (parsedChargingOcc !== null && !rObj.chargingOcc) {
                        rObj.chargingOcc = parsedChargingOcc;
                        rObj.noChargingOcc = parsedChargingOcc;
                        rObj.splitDuty = parsedChargingOcc > 0;
                    }
                    if (parsedSingleCharge && !rObj.singleChargeReqKm) rObj.singleChargeReqKm = parsedSingleCharge;

                    const outTime = outTimeIdx >= 0 ? formatSpreadsheetTime(row[outTimeIdx]) : null;
                    const inTime = inTimeIdx >= 0 ? formatSpreadsheetTime(row[inTimeIdx]) : null;
                    const shift = shiftIdx >= 0 && row[shiftIdx] ? String(row[shiftIdx]).trim() : "General Shift";
                    const fixBm = fixBmIdx >= 0 && row[fixBmIdx] ? String(row[fixBmIdx]).trim().toUpperCase() : "";
                    const swapBm = swapBmIdx >= 0 && row[swapBmIdx] ? String(row[swapBmIdx]).trim().toUpperCase() : "";

                    if (outTime) {
                        rObj.timetables.add(outTime);
                    }

                    rObj.schedules.push({
                        scheduleId,
                        shift,
                        outTime: outTime || "08:00 AM",
                        inTime: inTime || "04:00 PM",
                        fixBm,
                        swapBm,
                        category: parsedCategory || "Standard",
                        singleChargeReqKm: parsedSingleCharge || (parsedDist ? Math.round(parsedDist * 1.5) : 45),
                        actualKm: parsedDutyKm || undefined,
                        chargingOcc: parsedChargingOcc ?? (rObj.chargingOcc || 0),
                        noChargingOcc: parsedChargingOcc ?? (rObj.noChargingOcc || 0),
                        splitDuty: Boolean((parsedChargingOcc && parsedChargingOcc > 0) || rObj.splitDuty)
                    });
                }
            }
        } catch (err) {
            console.warn("SheetJS error in ingestUploadedRouteAndScheduleDataset:", err.message);
        }
    }

    // 2. Line parser fallback for plain CSV/text
    if (routesMap.size === 0) {
        try {
            const content = fs.readFileSync(filePath, "utf8");
            const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length >= 2) {
                const headers = parseCsvLine(lines[0]);
                let routeIdx = -1, nameIdx = -1, schedIdx = -1, outTimeIdx = -1, inTimeIdx = -1, shiftIdx = -1;
                let tripDistIdx = -1, distIdx = -1, dutyDistIdx = -1, singleChargeIdx = -1, chargingOccIdx = -1, catIdx = -1, origIdx = -1, destIdx = -1;

                headers.forEach((h, idx) => {
                    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
                    if (/^route(no|code)?$/i.test(clean) || clean === "route") routeIdx = idx;
                    else if (/^(routefullname|fullname|routename)$/i.test(clean)) nameIdx = idx;
                    else if (/^sched(ule)?(id|no|code)?$/i.test(clean) || clean === "schedule") schedIdx = idx;
                    else if (/^(outtime|departuretime|deptime|departure|cumtime|timetable|timetables)$/i.test(clean)) outTimeIdx = idx;
                    else if (/^(intime|arrivaltime|arrtime|arrival)$/i.test(clean)) inTimeIdx = idx;
                    else if (/^shift$/i.test(clean)) shiftIdx = idx;
                    else if (/^(totalkmorigintodestination|origintodestination|tripdistance|tripkm|onewaykm|routekm|totalkm)$/i.test(clean)) tripDistIdx = idx;
                    else if (/^(distance|km|length)$/i.test(clean)) distIdx = idx;
                    else if (/^(actualkm|routelengthschedule|routelength)$/i.test(clean)) dutyDistIdx = idx;
                    else if (/^(singlechargeoperationrequiredasperform4|singlechargereqkm|singlecharge)$/i.test(clean)) singleChargeIdx = idx;
                    else if (/^(chargingocc|chargingoccurrence|chargingoccurrences|nochargeingoccschedule|nochargingoccschedule|nochargingocc|chargingtimes|noofchargingtimes|midchargerequired|splitduty)$/i.test(clean)) chargingOccIdx = idx;
                    else if (/^(category|routecomplexity|complexity)$/i.test(clean)) catIdx = idx;
                    else if (/^(origin|from)$/i.test(clean)) origIdx = idx;
                    else if (/^(destination|dest|to)$/i.test(clean)) destIdx = idx;
                });

                if (routeIdx !== -1 || schedIdx !== -1 || outTimeIdx !== -1) {
                    for (let i = 1; i < lines.length; i++) {
                        const parts = parseCsvLine(lines[i]);
                        if (!parts || parts.length === 0) continue;

                        const rawRouteOrSched = (routeIdx >= 0 ? parts[routeIdx] : "") || (schedIdx >= 0 ? parts[schedIdx] : "");
                        if (!rawRouteOrSched) continue;

                        const fullStr = String(rawRouteOrSched).trim().toUpperCase();
                        let routeCode = fullStr.includes("/") ? fullStr.split("/")[0].trim() : fullStr;

                        let parsedDist = null;
                        if (tripDistIdx >= 0 && parts[tripDistIdx] && !isNaN(parseFloat(parts[tripDistIdx]))) {
                            parsedDist = parseFloat(parts[tripDistIdx]);
                        } else if (distIdx >= 0 && parts[distIdx] && !isNaN(parseFloat(parts[distIdx]))) {
                            parsedDist = parseFloat(parts[distIdx]);
                        } else if (dutyDistIdx >= 0 && parts[dutyDistIdx] && !isNaN(parseFloat(parts[dutyDistIdx]))) {
                            parsedDist = parseFloat(parts[dutyDistIdx]);
                        }

                        let parsedDutyKm = null;
                        if (dutyDistIdx >= 0 && parts[dutyDistIdx] && !isNaN(parseFloat(parts[dutyDistIdx]))) {
                            parsedDutyKm = parseFloat(parts[dutyDistIdx]);
                        }

                        let parsedSingleCharge = null;
                        if (singleChargeIdx >= 0 && parts[singleChargeIdx] && !isNaN(parseFloat(parts[singleChargeIdx]))) {
                            parsedSingleCharge = parseFloat(parts[singleChargeIdx]);
                        }

                        let parsedChargingOcc = null;
                        if (chargingOccIdx >= 0 && parts[chargingOccIdx] !== undefined && parts[chargingOccIdx] !== null && !isNaN(parseInt(parts[chargingOccIdx], 10))) {
                            parsedChargingOcc = parseInt(parts[chargingOccIdx], 10);
                        }

                        const parsedFullName = nameIdx >= 0 && parts[nameIdx] ? String(parts[nameIdx]).trim() : null;
                        const parsedCategory = catIdx >= 0 && parts[catIdx] ? String(parts[catIdx]).trim() : null;

                        if (!routesMap.has(routeCode)) {
                            routesMap.set(routeCode, {
                                code: routeCode,
                                depotId: defaultDepot,
                                distance: parsedDist,
                                fullDutyKm: parsedDutyKm,
                                actualKm: parsedDutyKm,
                                chargingOcc: parsedChargingOcc ?? 0,
                                noChargingOcc: parsedChargingOcc ?? 0,
                                splitDuty: Boolean(parsedChargingOcc && parsedChargingOcc > 0),
                                singleChargeReqKm: parsedSingleCharge,
                                fullName: parsedFullName,
                                category: parsedCategory,
                                origin: origIdx >= 0 && parts[origIdx] ? String(parts[origIdx]).trim() : null,
                                destination: destIdx >= 0 && parts[destIdx] ? String(parts[destIdx]).trim() : null,
                                timetables: new Set(),
                                schedules: []
                            });
                        }

                        const rObj = routesMap.get(routeCode);
                        if (parsedDutyKm && !rObj.fullDutyKm) rObj.fullDutyKm = parsedDutyKm;
                        if (parsedDutyKm && !rObj.actualKm) rObj.actualKm = parsedDutyKm;
                        if (parsedChargingOcc !== null && !rObj.chargingOcc) {
                            rObj.chargingOcc = parsedChargingOcc;
                            rObj.noChargingOcc = parsedChargingOcc;
                            rObj.splitDuty = parsedChargingOcc > 0;
                        }
                        if (parsedSingleCharge && !rObj.singleChargeReqKm) rObj.singleChargeReqKm = parsedSingleCharge;

                        const outTime = outTimeIdx >= 0 ? formatSpreadsheetTime(parts[outTimeIdx]) : null;
                        const inTime = inTimeIdx >= 0 ? formatSpreadsheetTime(parts[inTimeIdx]) : null;
                        const shift = shiftIdx >= 0 && parts[shiftIdx] ? String(parts[shiftIdx]).trim() : "General Shift";

                        if (outTime) rObj.timetables.add(outTime);
                        rObj.schedules.push({
                            scheduleId: fullStr,
                            shift,
                            outTime: outTime || "08:00 AM",
                            inTime: inTime || "04:00 PM",
                            category: parsedCategory || "Standard",
                            singleChargeReqKm: parsedSingleCharge || (parsedDist ? Math.round(parsedDist * 1.5) : 45),
                            actualKm: parsedDutyKm || undefined,
                            chargingOcc: parsedChargingOcc ?? (rObj.chargingOcc || 0),
                            noChargingOcc: parsedChargingOcc ?? (rObj.noChargingOcc || 0),
                            splitDuty: Boolean((parsedChargingOcc && parsedChargingOcc > 0) || rObj.splitDuty)
                        });
                    }
                }
            }
        } catch (csvErr) {
            console.warn("CSV error in ingestUploadedRouteAndScheduleDataset:", csvErr.message);
        }
    }

    if (routesMap.size === 0) {
        return { routesProcessed: 0, routesAdded: 0, timetablesAdded: 0, schedulesAdded: 0, updatedRoutes: [] };
    }

    const currentState = loadBusState();
    let dataset = currentState._routesDatabase || loadRoutesDataset();
    if (!dataset || !Array.isArray(dataset.routes)) {
        dataset = {
            version: "1.0",
            name: "Ashok Leyland EV Fleet - Master Route & Schedule Database",
            lastUpdated: new Date().toISOString(),
            depots: [
                { id: "1", number: "1", name: "Depot 1 (Chandapura)", routes: ["356Z", "360K", "600F", "KBS3A"] },
                { id: "2", number: "2", name: "Depot 2 (Attibele / Hoskote)", routes: ["361C", "399C", "328H", "500DC", "KBS3F"] }
            ],
            routes: [],
            timeComplexityConfig: {}
        };
    }

    let routesAddedCount = 0;
    let timetablesAddedCount = 0;
    let schedulesAddedCount = 0;
    const updatedRoutesList = [];

    function sortTimetables(times) {
        return Array.from(new Set(times)).sort((a, b) => {
            const parseMin = (t) => {
                const m = String(t).match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
                if (!m) return 0;
                let h = parseInt(m[1], 10);
                const min = parseInt(m[2], 10);
                const isPm = /pm/i.test(m[3] || "");
                if (isPm && h < 12) h += 12;
                if (!isPm && h === 12) h = 0;
                return h * 60 + min;
            };
            return parseMin(a) - parseMin(b);
        });
    }

    routesMap.forEach((entry, rCode) => {
        const cleanCode = rCode.toUpperCase().trim();
        const dId = String(entry.depotId || defaultDepot);
        const extractedTimes = Array.from(entry.timetables);

        let existingRoute = dataset.routes.find(r => String(r.code).toUpperCase().trim() === cleanCode && String(r.depotId).trim() === dId);
        if (!existingRoute) {
            existingRoute = dataset.routes.find(r => String(r.code).toUpperCase().trim() === cleanCode);
        }

        if (existingRoute) {
            const prevTimes = Array.isArray(existingRoute.timetables) ? existingRoute.timetables : [];
            const prevSet = new Set(prevTimes);
            let addedTimesCount = 0;
            extractedTimes.forEach(t => {
                if (!prevSet.has(t)) {
                    addedTimesCount++;
                }
            });
            existingRoute.timetables = sortTimetables([...prevTimes, ...extractedTimes]);
            timetablesAddedCount += addedTimesCount;

            if (!Array.isArray(existingRoute.schedules)) existingRoute.schedules = [];
            const existingSchedIds = new Set(existingRoute.schedules.map(s => String(s.scheduleId).toLowerCase()));
            entry.schedules.forEach(s => {
                if (!existingSchedIds.has(String(s.scheduleId).toLowerCase())) {
                    existingRoute.schedules.push(s);
                    schedulesAddedCount++;
                }
            });

            if (entry.fullDutyKm) {
                existingRoute.fullDutyKm = entry.fullDutyKm;
                existingRoute.actualKm = entry.fullDutyKm;
            }
            if (entry.chargingOcc !== undefined && entry.chargingOcc !== null) {
                existingRoute.chargingOcc = entry.chargingOcc;
                existingRoute.noChargingOcc = entry.chargingOcc;
                existingRoute.splitDuty = entry.chargingOcc > 0;
            }
            if (entry.singleChargeReqKm) {
                existingRoute.singleChargeReqKm = entry.singleChargeReqKm;
            }
            if (entry.distance) {
                existingRoute.distance = entry.distance;
                if (!existingRoute.fullDutyKm) existingRoute.fullDutyKm = parseFloat((entry.distance * 2).toFixed(1));
                existingRoute.drainSoc = Math.min(95, Math.max(12, Math.round(existingRoute.distance * 0.85)));
            }
            if (entry.fullName) {
                existingRoute.fullName = entry.fullName;
                existingRoute.name = entry.fullName;
            }
            if (entry.category) {
                existingRoute.category = entry.category;
                existingRoute.routeComplexity = entry.category;
                existingRoute.requiredCat = entry.category === "Complex" ? "A" : "B";
            }
            if (entry.origin && !existingRoute.origin) existingRoute.origin = entry.origin;
            if (entry.destination && !existingRoute.destination) existingRoute.destination = entry.destination;

            if (!existingRoute.timeComplexitySlots) existingRoute.timeComplexitySlots = {};
            existingRoute.timetables.forEach(t => {
                if (!existingRoute.timeComplexitySlots[t]) {
                    const m = String(t).match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
                    if (m) {
                        let h = parseInt(m[1], 10);
                        const isPm = /pm/i.test(m[3] || "");
                        if (isPm && h < 12) h += 12;
                        if (!isPm && h === 12) h = 0;
                        if ((h >= 7 && h < 10) || (h >= 16 && h < 20)) existingRoute.timeComplexitySlots[t] = "Extreme Peak";
                        else if ((h >= 10 && h < 16) || (h >= 20 && h < 23)) existingRoute.timeComplexitySlots[t] = "Peak";
                        else existingRoute.timeComplexitySlots[t] = "Normal";
                    }
                }
            });

            updatedRoutesList.push(cleanCode);
        } else {
            const dist = entry.distance || 28.7;
            const dutyKm = entry.fullDutyKm || parseFloat((dist * 2).toFixed(1));
            const orig = entry.origin || `Depot ${dId} Terminal`;
            const dest = entry.destination || "Central Terminal";
            const routeFullName = entry.fullName || `${orig} ➔ ${dest} (${cleanCode})`;
            let routeComp = entry.category || (dist > 35 ? "Complex" : (dist >= 30 ? "Moderate" : (dist < 25 ? "Simple" : "Standard")));
            const reqCat = routeComp === "Complex" ? "A" : (routeComp === "Moderate" ? "B" : "B");
            const finalTimetables = extractedTimes.length > 0 ? sortTimetables(extractedTimes) : ["06:30 AM", "08:00 AM", "01:10 PM", "03:00 PM", "06:45 PM"];

            const timeComplexitySlots = {};
            finalTimetables.forEach(t => {
                const m = String(t).match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
                if (m) {
                    let h = parseInt(m[1], 10);
                    const isPm = /pm/i.test(m[3] || "");
                    if (isPm && h < 12) h += 12;
                    if (!isPm && h === 12) h = 0;
                    if ((h >= 7 && h < 10) || (h >= 16 && h < 20)) timeComplexitySlots[t] = "Extreme Peak";
                    else if ((h >= 10 && h < 16) || (h >= 20 && h < 23)) timeComplexitySlots[t] = "Peak";
                    else timeComplexitySlots[t] = "Normal";
                }
            });

            const newRouteObj = {
                code: cleanCode,
                id: cleanCode,
                depotId: dId,
                name: `${orig} ➔ ${dest} (${cleanCode})`,
                fullName: routeFullName,
                shortName: cleanCode,
                origin: orig,
                destination: dest,
                distance: dist,
                fullDutyKm: dutyKm,
                actualKm: entry.actualKm || dutyKm,
                chargingOcc: entry.chargingOcc || 0,
                noChargingOcc: entry.chargingOcc || 0,
                splitDuty: Boolean(entry.chargingOcc && entry.chargingOcc > 0),
                singleChargeReqKm: entry.singleChargeReqKm || undefined,
                routeComplexity: routeComp,
                category: routeComp,
                requiredCat: reqCat,
                drainSoc: Math.min(95, Math.max(12, Math.round(dist * 0.85))),
                timeComplexity: "Normal",
                timetables: finalTimetables,
                timeComplexitySlots: timeComplexitySlots,
                schedules: entry.schedules.length > 0 ? entry.schedules : finalTimetables.map((t, idx) => ({
                    scheduleId: `${cleanCode}/${idx + 1}`,
                    shift: idx < 2 ? "General Shift" : (idx < 4 ? "Shift B" : "Night Halt"),
                    outTime: t,
                    inTime: "15:15:00",
                    category: routeComp,
                    singleChargeReqKm: Math.round(dist * 1.5)
                }))
            };

            dataset.routes.push(newRouteObj);
            routesAddedCount++;
            timetablesAddedCount += finalTimetables.length;
            schedulesAddedCount += newRouteObj.schedules.length;

            if (dataset.depots) {
                let dObj = dataset.depots.find(d => String(d.id).trim() === dId);
                if (!dObj) {
                    dObj = { id: dId, name: targetDepotName || `Depot ${dId}`, routes: [] };
                    dataset.depots.push(dObj);
                }
                if (!dObj.routes) dObj.routes = [];
                if (!dObj.routes.includes(cleanCode)) dObj.routes.push(cleanCode);
            }

            updatedRoutesList.push(cleanCode);
        }
    });

    currentState._routesDatabase = dataset;
    saveRoutesDataset(dataset);
    saveBusState(currentState);

    cachedCorridorSchedules = null;
    broadcastSyncEvent("routes-dataset-updated", { dataset });

    return {
        routesProcessed: routesMap.size,
        routesAdded: routesAddedCount,
        timetablesAdded: timetablesAddedCount,
        schedulesAdded: schedulesAddedCount,
        updatedRoutes: updatedRoutesList,
        dataset
    };
}

function validateBusDetailsDataset(fileBuffer, safeName) {
    let hasRegKA = false;
    let hasBmNo = false;
    let hasBusCat = false;
    let sampleMatches = [];

    // 1. SheetJS parser for Excel & CSV
    if (XLSX) {
        try {
            const workbook = XLSX.read(fileBuffer, { type: "buffer" });
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) continue;
                const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                if (!rawRows || rawRows.length === 0) continue;

                for (let r = 0; r < Math.min(rawRows.length, 250); r++) {
                    const row = rawRows[r];
                    if (!Array.isArray(row)) continue;
                    for (const cell of row) {
                        const cellStr = String(cell || "").trim().toUpperCase();
                        if (!cellStr) continue;

                        // Check for registration numbers like KA....... (e.g. KA51AH1234, KA01F1234, KA-51...)
                        if (/\bKA\s*[\d-]{1,3}[A-Z]{1,3}\d{1,4}\b/i.test(cellStr) || /^KA\d{2}[A-Z0-9]/i.test(cellStr.replace(/[^A-Z0-9]/g, '')) || /^KA\d{2}/i.test(cellStr)) {
                            hasRegKA = true;
                            if (sampleMatches.length < 3) sampleMatches.push(`Registration: ${cellStr}`);
                        }
                        // Check for bus numbers like BM.... (e.g. BM001, BM-102, BM214)
                        if (/^BM[-\s]?\d{1,5}\b/i.test(cellStr) || /\bBM\d{2,5}\b/i.test(cellStr)) {
                            hasBmNo = true;
                            if (sampleMatches.length < 3) sampleMatches.push(`Bus Number: ${cellStr}`);
                        }
                        // Check for bus category like CAT... (e.g. CAT A, CAT B, CAT C, Category A, Category B, Category C)
                        if (/\bCAT[-\s]?[ABC]\b/i.test(cellStr) || /^CAT\s*[:\-_]?\s*[ABC]/i.test(cellStr) || /^CATEGORY\s*[:\-_]?\s*[ABC]/i.test(cellStr) || /^CAT\b/i.test(cellStr)) {
                            hasBusCat = true;
                            if (sampleMatches.length < 3) sampleMatches.push(`Category: ${cellStr}`);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[WARN] SheetJS inspection warning in validateBusDetailsDataset:", e.message);
        }
    }

    // 2. Fallback text/CSV check
    if (!hasRegKA && !hasBmNo && !hasBusCat) {
        try {
            const text = fileBuffer.toString("utf8");
            const lines = text.split(/\r?\n/).slice(0, 250);
            for (const line of lines) {
                const uLine = line.toUpperCase();
                if (/\bKA\s*[\d-]{1,3}[A-Z]{1,3}\d{1,4}\b/i.test(uLine) || /\bKA\d{2}/i.test(uLine)) hasRegKA = true;
                if (/^BM[-\s]?\d{1,5}\b/i.test(uLine) || /\bBM\d{2,5}\b/i.test(uLine)) hasBmNo = true;
                if (/\bCAT[-\s]?[ABC]\b/i.test(uLine) || /\bCATEGORY\s*[:\-_]?\s*[ABC]\b/i.test(uLine)) hasBusCat = true;
            }
        } catch (e) {}
    }

    return {
        isValidBusDataset: hasRegKA || hasBmNo || hasBusCat,
        hasRegKA,
        hasBmNo,
        hasBusCat,
        sampleMatches
    };
}

    // ── POST /api/upload-dataset (Upload CSV or Excel spreadsheets to data/ & root) ──
    if (pathname === "/api/upload-dataset" && req.method === "POST") {
        readBody(req, body => {
            try {
                const payload = JSON.parse(body || "{}");
                const fileName = String(payload.fileName || "").trim();
                const base64Data = payload.base64Data || "";
                const datasetType = payload.datasetType || "spreadsheet";
                const targetDepot = String(payload.targetDepot || "").trim();
                const targetDepotName = String(payload.targetDepotName || "").trim() || (targetDepot ? `Depot ${targetDepot}` : "General Fleet");

                if (!fileName || !base64Data) {
                    sendJson(res, { ok: false, error: "Missing fileName or base64Data in upload request" }, 400);
                    return;
                }

                const fileBuffer = Buffer.from(base64Data, "base64");

                // ── STRICT VALIDATION: Bus Details Only (Registration Numbers KA..., Bus Numbers BM..., Category CAT A/B/C) ──
                const validation = validateBusDetailsDataset(fileBuffer, fileName);
                if (!validation.isValidBusDataset) {
                    sendJson(res, {
                        ok: false,
                        error: `⚠️ Irrelevant Dataset Rejected: Only Bus Details spreadsheets are accepted!\n\nThe uploaded file "${fileName}" does not contain required bus details:\n• Registration numbers like KA....... (e.g. KA51AH...)\n• Bus numbers like BM.... (e.g. BM001, BM012)\n• Bus categories like CAT... (e.g. CAT A, CAT B, CAT C)\n\nFiles with route details, schedule timetables, or other non-bus data are strictly rejected.`
                    }, 400);
                    return;
                }

                // Sanitize file name
                const safeName = path.basename(fileName);
                const dataDir = path.join(BASE_DIR, "data");
                if (!fs.existsSync(dataDir)) {
                    fs.mkdirSync(dataDir, { recursive: true });
                }

                const targetPath = path.join(dataDir, safeName);
                fs.writeFileSync(targetPath, fileBuffer);

                // If this file also resides in the root directory, update it as well
                const rootCandidate = path.join(BASE_DIR, safeName);
                if (fs.existsSync(rootCandidate)) {
                    fs.writeFileSync(rootCandidate, fileBuffer);
                }

                // Ingest buses from dataset into fleet
                const ingestResult = ingestUploadedFleetDataset(targetPath, safeName, targetDepot, targetDepotName);

                // ── DUPLICATE BUS IN DATASET CHECK ──
                if (ingestResult.duplicateError) {
                    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
                    sendJson(res, {
                        ok: false,
                        error: `⚠️ Bus Already Exists!\n\n${ingestResult.duplicateError}\n\nDuplicate buses cannot be added.`
                    }, 400);
                    return;
                }

                const busesAdded = ingestResult.added.length;

                if (busesAdded === 0 && ingestResult.busesProcessed === 0) {
                    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
                    sendJson(res, {
                        ok: false,
                        error: `⚠️ Irrelevant Dataset Rejected: No valid bus records found in "${safeName}".\n\nPlease ensure the spreadsheet contains valid bus rows with Registration Numbers (KA...), Bus Numbers (BM...), and Bus Categories (CAT A, CAT B, CAT C).`
                    }, 400);
                    return;
                }

                // Update datasets manifest with depot association
                try {
                    const manifestPath = path.join(dataDir, "datasets_manifest.json");
                    let manifest = [];
                    if (fs.existsSync(manifestPath)) {
                        try { manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8") || "[]"); } catch (e) {}
                    }
                    manifest = manifest.filter(m => m.fileName !== safeName);
                    manifest.unshift({
                        fileName: safeName,
                        targetDepot: targetDepot || "all",
                        targetDepotName: targetDepotName,
                        size: fileBuffer.length,
                        busesAdded: busesAdded,
                        routesAdded: 0,
                        timetablesAdded: 0,
                        schedulesAdded: 0,
                        uploadedAt: new Date().toISOString()
                    });
                    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
                } catch (e) {
                    console.warn("Could not write datasets manifest:", e.message);
                }

                stateVersion = Date.now();
                broadcastSyncEvent("dataset-updated", {
                    fileName: safeName,
                    size: fileBuffer.length,
                    targetDepot: targetDepot,
                    targetDepotName: targetDepotName,
                    busesAdded: busesAdded,
                    routesAdded: 0,
                    timetablesAdded: 0,
                    schedulesAdded: 0,
                    timestamp: new Date().toISOString(),
                    datasetType
                });

                if (busesAdded > 0) {
                    broadcastSyncEvent("fleet-bus-added", {
                        count: busesAdded,
                        buses: ingestResult.added,
                        timestamp: new Date().toISOString()
                    });
                }

                // Calculate updated total fleet count
                const finalState = loadBusState();
                const totalFleetCount = Object.keys(finalState).filter(k => /^BM\d+$/i.test(k) && !finalState[k].deleted && !finalState[k].isDeleted).length;

                const responseMsg = `Bus details dataset "${safeName}" successfully uploaded: ${busesAdded} buses added/updated for ${targetDepotName}. Total fleet: ${totalFleetCount} buses.`;

                sendJson(res, {
                    ok: true,
                    message: responseMsg,
                    fileName: safeName,
                    targetDepot: targetDepot,
                    targetDepotName: targetDepotName,
                    busesAdded: busesAdded,
                    addedBuses: ingestResult.added,
                    routesAdded: 0,
                    timetablesAdded: 0,
                    schedulesAdded: 0,
                    totalFleetCount: totalFleetCount,
                    size: fileBuffer.length,
                    path: targetPath,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.error("Error saving uploaded dataset:", err);
                sendJson(res, { ok: false, error: "Failed to save uploaded dataset", details: err.message }, 500);
            }
        });
        return;
    }

    // ── GET /api/uploaded-datasets (List available datasets in data/) ──
    if (pathname === "/api/uploaded-datasets" && req.method === "GET") {
        try {
            const dataDir = path.join(BASE_DIR, "data");
            const files = [];
            if (fs.existsSync(dataDir)) {
                fs.readdirSync(dataDir).forEach(file => {
                    if (file.endsWith(".xlsx") || file.endsWith(".xls") || file.endsWith(".csv") || file.endsWith(".json")) {
                        const stat = fs.statSync(path.join(dataDir, file));
                        files.push({
                            name: file,
                            size: stat.size,
                            sizeFormatted: (stat.size / 1024).toFixed(1) + " KB",
                            updatedAt: stat.mtime
                        });
                    }
                });
            }
            sendJson(res, { ok: true, datasets: files });
        } catch (err) {
            sendJson(res, { ok: false, error: err.message }, 500);
        }
        return;
    }



    // ── GET /api/fleet-distribution (Calculated by Python fleet_distribution.py) ──
    if (pathname === "/api/fleet-distribution") {
        const { exec } = require("child_process");
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const scriptPath = path.join(__dirname, "fleet_distribution.py");

        exec(`${pythonCmd} "${scriptPath}" --json`, { timeout: 5000, encoding: "utf8" }, (err, stdout, stderr) => {
            if (!err && stdout) {
                try {
                    const parsed = JSON.parse(stdout);
                    sendJson(res, parsed);
                    return;
                } catch (e) {}
            }
            // Fallback calculation directly from currentState if Python process times out or errors
            try {
                const currentState = loadBusState();
                const assignments = currentState._depotAssignments || getDefaultDepotAssignments();
                const lockedList = currentState._lockedBuses || [];
                const allocatedDuties = currentState._allocatedDuties || [];
                const deletedBuses = currentState._deletedBuses || {};

                const allocatedBms = new Set(allocatedDuties.map(d => String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim()).filter(Boolean));
                const activeBms = Object.keys(currentState).filter(k => k.startsWith('BM') && !deletedBuses[k] && !currentState[k].isDeleted && !currentState[k].deleted);

                let d1Avail = 0, d1Route = 0, d1Locked = 0;
                let d2Avail = 0, d2Route = 0, d2Locked = 0;

                activeBms.forEach(bm => {
                    const d = String(assignments[bm] || '1');
                    const isAlloc = allocatedBms.has(bm);
                    const isLock = lockedList.some(lb => String(lb.bm || lb.bmNumber || '').toUpperCase().trim() === bm);
                    if (d === '2') {
                        if (isAlloc) d2Route++;
                        else if (isLock) d2Locked++;
                        else d2Avail++;
                    } else {
                        if (isAlloc) d1Route++;
                        else if (isLock) d1Locked++;
                        else d1Avail++;
                    }
                });

                sendJson(res, {
                    ok: true,
                    generated_at: new Date().toISOString(),
                    as_of_time: new Date().toLocaleString(),
                    settings: { READY_SOC_MIN: 98 },
                    N: activeBms.length,
                    check_result: {
                        status: "PASS",
                        fleet_sum: activeBms.length,
                        depot_sum: (d1Avail + d1Route + d1Locked) + (d2Avail + d2Route + d2Locked),
                        equation: `Available (${d1Avail + d2Avail}) + On Route (${d1Route + d2Route}) + Locked (${d1Locked + d2Locked}) = ${activeBms.length}`
                    },
                    overall: {
                        total: activeBms.length,
                        on_route: d1Route + d2Route,
                        available_for_scheduling: d1Avail + d2Avail,
                        locked_total: d1Locked + d2Locked,
                        ongoing_charging: 0,
                        ongoing_cleaning: 0,
                        recently_completed: 0
                    },
                    depot_1: {
                        name: "Depot 1 (Chandapura)",
                        total: d1Avail + d1Route + d1Locked,
                        on_route: d1Route,
                        available_for_scheduling: d1Avail,
                        locked_total: d1Locked,
                        ongoing_charging: 0,
                        ongoing_cleaning: 0,
                        recently_completed: 0
                    },
                    depot_2: {
                        name: "Depot 2 (Attibele / NH)",
                        total: d2Avail + d2Route + d2Locked,
                        on_route: d2Route,
                        available_for_scheduling: d2Avail,
                        locked_total: d2Locked,
                        ongoing_charging: 0,
                        ongoing_cleaning: 0,
                        recently_completed: 0
                    }
                });
            } catch (fallbackErr) {
                sendJson(res, { ok: false, error: "Failed to calculate fleet distribution", details: fallbackErr.message }, 500);
            }
        });
        return;
    }

    // ── GET & POST /api/depot-state & /api/depot-assign ───────────────────────

    if (pathname === "/api/depot-state") {

        try {

            const currentState = loadBusState();

            const assignments = currentState._depotAssignments || getDefaultDepotAssignments();

            const counts = getDepotCounts(assignments, currentState);

            sendJson(res, {

                ok: true,

                depot1Count: counts.depot1Count,

                depot2Count: counts.depot2Count,

                total: counts.total,

                assignments,

                addedBuses: currentState._addedBuses || {},

                deletedBuses: currentState._deletedBuses || {}

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load depot state", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/depot-assign") {

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (!currentState._depotAssignments) {

                        currentState._depotAssignments = getDefaultDepotAssignments();

                    }

                    if (payload.bm && payload.depot) {

                        const cleanBm = String(payload.bm).toUpperCase().trim();

                        const targetDepot = String(payload.depot).trim();

                        currentState._depotAssignments[cleanBm] = targetDepot;

                    } else if (payload.assignments && typeof payload.assignments === "object") {

                        Object.assign(currentState._depotAssignments, payload.assignments);

                    }



                    const counts = getDepotCounts(currentState._depotAssignments, currentState);

                    saveBusState(currentState);

                    broadcastSyncEvent("depot-updated", {

                        assignments: currentState._depotAssignments,

                        depot1Count: counts.depot1Count,

                        depot2Count: counts.depot2Count

                    });



                    sendJson(res, {

                        ok: true,

                        depot1Count: counts.depot1Count,

                        depot2Count: counts.depot2Count,

                        total: counts.total,

                        assignments: currentState._depotAssignments

                    });

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save depot assignment", details: error.message }, 500);

                }

            });

            return;

        }

    }



    // ── GET & POST /api/locked-buses (Cleaning & Charging Bay Locks) ──

    if (pathname === "/api/locked-buses") {

        if (req.method === "GET") {

            try {

                const currentState = loadBusState();
                const lockedMap = new Map();
                (currentState._lockedBuses || []).forEach(lb => {
                    const k = String(lb.bm || lb.bmNumber || '').toUpperCase().trim();
                    if (k) lockedMap.set(k, lb);
                });

                // Synthesize turnaround locked buses (awaiting charging/cleaning)
                const servStatus = currentState._servicingStatus || {};
                Object.keys(servStatus).forEach(bmKey => {
                    const k = String(bmKey).toUpperCase().trim();
                    const s = servStatus[bmKey];
                    if (!s || typeof s !== 'object') return;
                    const needsChg = Boolean(s.needsCharging || (s.routeCompleted && !s.chargingCompleted));
                    const needsCln = Boolean(s.needsCleaning || (s.routeCompleted && !s.cleaningCompleted));
                    if ((s.routeCompleted || needsChg || needsCln) && !lockedMap.has(k)) {
                        lockedMap.set(k, {
                            bm: k,
                            bmNumber: k,
                            reg: (currentState[k] && (currentState[k].regNo || currentState[k].reg_no)) || `KA51AH${k.replace(/\D/g, '').padStart(4, '0')}`,
                            depot: String(currentState._depotAssignments?.[k] || '1'),
                            page: 'turnaround',
                            reason: needsChg ? 'Turnaround (Fast Charging Required Before Cleaning & Scheduling)' : 'Turnaround (Cleaning & Wash Required Before Scheduling)',
                            isTurnaround: true,
                            needsCharging: needsChg,
                            chargingCompleted: !needsChg,
                            needsCleaning: needsCln,
                            cleaningCompleted: !needsCln,
                            startTime: s.routeCompletedAt || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                            startTimestamp: s.routeCompletedTs || Date.now()
                        });
                    }
                });

                const lockedBuses = Array.from(lockedMap.values());
                sendJson(res, { ok: true, count: lockedBuses.length, lockedBuses });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load locked buses", details: error.message }, 500);

            }

            return;

        }

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (Array.isArray(payload.lockedBuses)) {
                        // Strict turnaround validation: Reject locking for cleaning if charging is pending
                        const curServicing = currentState._servicingStatus || {};
                        for (const lb of payload.lockedBuses) {
                            const bKey = String(lb.bm || lb.bmNumber || '').toUpperCase().trim();
                            const isCleaningLock = String(lb.page || '').toLowerCase().includes('clean');
                            const serv = curServicing[bKey] || {};
                            const needsChargingFirst = Boolean(serv.needsCharging || (serv.routeCompleted && !serv.chargingCompleted));
                            if (isCleaningLock && needsChargingFirst) {
                                sendJson(res, {
                                    ok: false,
                                    error: `Fast Charging Required First: Bus ${bKey} must complete Fast Charging before cleaning can begin.`
                                }, 400);
                                return;
                            }
                        }
                        currentState._lockedBuses = payload.lockedBuses;

                        saveBusState(currentState);

                        broadcastSyncEvent("locked-buses-updated", { lockedBuses: currentState._lockedBuses });

                        sendJson(res, { ok: true, count: currentState._lockedBuses.length, lockedBuses: currentState._lockedBuses });

                    } else {

                        sendJson(res, { ok: false, error: "Invalid payload format. Expected { lockedBuses: [...] }" }, 400);

                    }

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save locked buses", details: error.message }, 500);

                }

            });

            return;

        }

    }



    // ── POST /api/unlock-bus (Unlock a specific bus immediately) ──
    // ?? POST /api/complete-route (Atomic Route Duty Completion & Turnaround Locking) ??
    if (pathname === "/api/complete-route" && req.method === "POST") {
        readBody(req, body => {
            try {
                const payload = JSON.parse(body || "{}");
                const bmKey = String(payload.bm || payload.bmNumber || payload.bus || "").toUpperCase().trim();
                if (!bmKey) {
                    sendJson(res, { ok: false, error: "Missing bm identifier" }, 400);
                    return;
                }

                const currentState = loadBusState();
                const targetDepot = String(payload.depot || currentState._depotAssignments?.[bmKey] || "1").trim();
                const now = new Date();
                const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                const fullTs = `${timeStr}, ${dateStr}`;

                // 1. Remove from allocated duties
                if (Array.isArray(currentState._allocatedDuties)) {
                    currentState._allocatedDuties = currentState._allocatedDuties.filter(d => String(d.bm || d.bmNumber || d.busId || '').toUpperCase().trim() !== bmKey);
                }

                // 2. Assign target depot
                if (!currentState._depotAssignments) currentState._depotAssignments = {};
                currentState._depotAssignments[bmKey] = targetDepot;

                // 3. Post-route turnaround: bus is held in Locked status in the yard.
                // NOTE: Locking for charging or cleaning should NOT take place automatically!
                const regNo = (currentState[bmKey] && (currentState[bmKey].regNo || currentState[bmKey].reg_no)) || `KA51AH${bmKey.replace(/\D/g, '').padStart(4, '0')}`;
                if (Array.isArray(currentState._lockedBuses)) {
                    currentState._lockedBuses = currentState._lockedBuses.filter(x => String(x.bm || x.bmNumber || '').toUpperCase().trim() !== bmKey);
                }

                // 4. Update servicing status
                if (!currentState._servicingStatus) currentState._servicingStatus = {};
                currentState._servicingStatus[bmKey] = {
                    bm: bmKey,
                    routeCompleted: true,
                    routeCompletedAt: fullTs,
                    routeCompletedTs: Date.now(),
                    depot: targetDepot,
                    needsCharging: true,
                    chargingCompleted: false,
                    needsCleaning: true,
                    cleaningCompleted: false,
                    status: 'turnaround_charging'
                };

                // 5. Update bus state object if present
                if (currentState[bmKey] && typeof currentState[bmKey] === 'object') {
                    currentState[bmKey].isLocked = true;
                    currentState[bmKey].isTurnaround = true;
                    currentState[bmKey].isAllocated = false;
                    currentState[bmKey].needsCharging = true;
                    currentState[bmKey].chargingCompleted = false;
                    currentState[bmKey].needsCleaning = true;
                    currentState[bmKey].cleaningCompleted = false;
                    currentState[bmKey].depot = targetDepot;
                    currentState[bmKey].status = 'Turnaround (Locked)';
                    currentState[bmKey].assignedRoute = null;
                    currentState[bmKey].allocatedDuty = null;
                }

                // 6. Record in completed routes log
                if (!Array.isArray(currentState._completedRoutesLog)) currentState._completedRoutesLog = [];
                currentState._completedRoutesLog.unshift({
                    id: 'rc_' + Date.now(),
                    bm: bmKey,
                    reg: regNo,
                    route: payload.route || 'Scheduled Duty',
                    scheduledTime: payload.scheduledTime || '08:30 AM',
                    completedAt: fullTs,
                    dateStr: now.toISOString().split('T')[0],
                    depot: targetDepot,
                    driver: payload.driver || 'Assigned Driver',
                    remarks: payload.remarks || 'Route completed and bus locked in turnaround for charging & cleaning.',
                    status: 'Returned / Completed'
                });

                // 7. Track Non-Single Charge Relay requirement (2nd bus allocation from same depot)
                if (isNonSingleChargeRoute(payload.route)) {
                    const cCode = cleanRouteCode(payload.route);
                    if (!currentState._pendingRelayRoutes) currentState._pendingRelayRoutes = {};
                    currentState._pendingRelayRoutes[cCode] = {
                        route: cCode,
                        fullRouteName: payload.route || cCode,
                        depot: targetDepot,
                        firstBus: bmKey,
                        reg: regNo,
                        driver: payload.driver || 'Assigned Driver',
                        completedAt: fullTs,
                        completedTs: Date.now(),
                        isNonSingleCharge: true,
                        reason: 'NOT Single Charge Operation (Mandatory Mid-route Charging or Physically Exceeding Range). Second bus required from this depot to complete schedule.'
                    };
                }

                saveBusState(currentState);
                broadcastSyncEvent("route-completed", { bm: bmKey, depot: targetDepot, locked: true });
                broadcastSyncEvent("locked-buses-updated", { lockedBuses: currentState._lockedBuses || [] });
                broadcastSyncEvent("servicing-status-updated", { servicingStatus: currentState._servicingStatus || {} });
                broadcastSyncEvent("allocated-duties-updated", { allocatedDuties: currentState._allocatedDuties || [] });
                broadcastSyncEvent("pending-relay-updated", { pendingRelayRoutes: currentState._pendingRelayRoutes || {} });

                sendJson(res, {
                    ok: true,
                    bm: bmKey,
                    locked: true,
                    status: 'turnaround_charging',
                    depot: targetDepot,
                    lockedBuses: currentState._lockedBuses,
                    servicingStatus: currentState._servicingStatus,
                    pendingRelayRoutes: currentState._pendingRelayRoutes || {}
                });
            } catch (err) {
                sendJson(res, { ok: false, error: "Failed to complete route", details: err.message }, 500);
            }
        });
        return;
    }

    if (pathname === "/api/unlock-bus" && req.method === "POST") {
        readBody(req, body => {
            try {
                const payload = JSON.parse(body || "{}");
                const bmKey = String(payload.bm || payload.bus || "").toUpperCase().trim();
                const currentState = loadBusState();
                if (Array.isArray(currentState._lockedBuses)) {
                    currentState._lockedBuses = currentState._lockedBuses.filter(x => String(x.bm || x.bmNumber || "").toUpperCase().trim() !== bmKey);
                }
                if (!currentState._servicingStatus) currentState._servicingStatus = {};
                currentState._servicingStatus[bmKey] = {
                    bm: bmKey,
                    routeCompleted: false,
                    needsCharging: false,
                    chargingCompleted: true,
                    needsCleaning: false,
                    cleaningCompleted: true,
                    status: "available"
                };
                if (currentState[bmKey] && typeof currentState[bmKey] === "object") {
                    currentState[bmKey].isLocked = false;
                    currentState[bmKey].blocked = false;
                    currentState[bmKey].needsCharging = false;
                    currentState[bmKey].chargingCompleted = true;
                    currentState[bmKey].needsCleaning = false;
                    currentState[bmKey].cleaningCompleted = true;
                    currentState[bmKey].postRouteServicingPending = false;
                    if (["Locked", "Turnaround", "Blocked", "Cooldown", "Needs Servicing"].includes(currentState[bmKey].status)) {
                        currentState[bmKey].status = "Available";
                    }
                }
                saveBusState(currentState);
                broadcastSyncEvent("locked-buses-updated", { lockedBuses: currentState._lockedBuses || [] });
                broadcastSyncEvent("servicing-status-updated", { servicingStatus: currentState._servicingStatus || {} });
                broadcastSyncEvent("bus-state-updated", { bm: bmKey, busState: currentState[bmKey] });
                sendJson(res, { ok: true, bm: bmKey, count: (currentState._lockedBuses || []).length, lockedBuses: currentState._lockedBuses || [] });
            } catch (err) {
                sendJson(res, { ok: false, error: "Failed to unlock bus", details: err.message }, 500);
            }
        });
        return;
    }

    // ── POST /api/unlock-all-buses (Unlock all buses in the fleet) ──
    if (pathname === "/api/unlock-all-buses" && req.method === "POST") {
        try {
            const currentState = loadBusState();
            currentState._lockedBuses = [];
            if (!currentState._servicingStatus) currentState._servicingStatus = {};
            Object.keys(currentState._servicingStatus).forEach(bm => {
                currentState._servicingStatus[bm] = {
                    bm,
                    routeCompleted: false,
                    needsCharging: false,
                    chargingCompleted: true,
                    needsCleaning: false,
                    cleaningCompleted: true,
                    status: "available"
                };
            });
            Object.keys(currentState).forEach(k => {
                if (k.startsWith("BM") && typeof currentState[k] === "object") {
                    currentState[k].isLocked = false;
                    currentState[k].blocked = false;
                    currentState[k].needsCharging = false;
                    currentState[k].chargingCompleted = true;
                    currentState[k].needsCleaning = false;
                    currentState[k].cleaningCompleted = true;
                    currentState[k].postRouteServicingPending = false;
                    if (["Locked", "Turnaround", "Blocked", "Cooldown", "Needs Servicing"].includes(currentState[k].status)) {
                        currentState[k].status = "Available";
                    }
                }
            });
            saveBusState(currentState);
            broadcastSyncEvent("locked-buses-updated", { lockedBuses: [] });
            broadcastSyncEvent("servicing-status-updated", { servicingStatus: currentState._servicingStatus });
            broadcastSyncEvent("sync-state-updated", { lockedBuses: [] });
            sendJson(res, { ok: true, message: "All buses unlocked successfully", lockedBuses: [] });
        } catch (err) {
            sendJson(res, { ok: false, error: "Failed to unlock all buses", details: err.message }, 500);
        }
        return;
    }

    // ── GET & POST /api/servicing-status (Post-Route Servicing: Charging & Cleaning) ──

    if (pathname === "/api/servicing-status") {

        if (req.method === "GET") {

            try {

                const currentState = loadBusState();

                const servicingStatus = currentState._servicingStatus || {};

                sendJson(res, { ok: true, servicingStatus });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load servicing status", details: error.message }, 500);

            }

            return;

        }

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (!currentState._servicingStatus) currentState._servicingStatus = {};



                    if (payload.servicingStatus && typeof payload.servicingStatus === "object") {

                        currentState._servicingStatus = payload.servicingStatus;

                    } else if (payload.bm) {

                        const bmKey = String(payload.bm).toUpperCase().trim();

                        if (payload.clear) {

                            delete currentState._servicingStatus[bmKey];

                        } else if (payload.status && typeof payload.status === "object") {

                            currentState._servicingStatus[bmKey] = payload.status;

                        } else if (payload.status && typeof payload.status === "string") {

                            const patchObj = (payload.patch && typeof payload.patch === "object") ? payload.patch : {};

                            currentState._servicingStatus[bmKey] = Object.assign(

                                {},

                                currentState._servicingStatus[bmKey] || {},

                                patchObj,

                                { status: payload.status }

                            );

                        } else if (payload.patch && typeof payload.patch === "object") {

                            currentState._servicingStatus[bmKey] = Object.assign(

                                {},

                                currentState._servicingStatus[bmKey] || {},

                                payload.patch

                            );

                        }

                    }

                    saveBusState(currentState);

                    broadcastSyncEvent("servicing-status-updated", { servicingStatus: currentState._servicingStatus });

                    sendJson(res, { ok: true, servicingStatus: currentState._servicingStatus });

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save servicing status", details: error.message }, 500);

                }

            });

            return;

        }

    }



    // ── GET & POST /api/charging-history ──

    if (pathname === "/api/charging-history") {

        if (req.method === "GET") {

            try {

                const currentState = loadBusState();

                const chargingHistory = Array.isArray(currentState._chargingHistory) ? currentState._chargingHistory : getDefaultChargingHistory();

                sendJson(res, { ok: true, count: chargingHistory.length, chargingHistory });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load charging history", details: error.message }, 500);

            }

            return;

        }

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (!Array.isArray(currentState._chargingHistory)) {

                        currentState._chargingHistory = getDefaultChargingHistory();

                    }

                    if (Array.isArray(payload.chargingHistory)) {

                        currentState._chargingHistory = payload.chargingHistory;

                    } else if (payload.item && typeof payload.item === "object") {

                        const exists = currentState._chargingHistory.some(x => x.id === payload.item.id);

                        if (!exists) currentState._chargingHistory.unshift(payload.item);

                    }

                    saveBusState(currentState);

                    broadcastSyncEvent("charging-history-updated", { chargingHistory: currentState._chargingHistory });

                    sendJson(res, { ok: true, count: currentState._chargingHistory.length, chargingHistory: currentState._chargingHistory });

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save charging history", details: error.message }, 500);

                }

            });

            return;

        }

    }



    // ── GET & POST /api/cleaning-history ──

    if (pathname === "/api/cleaning-history") {

        if (req.method === "GET") {

            try {

                const currentState = loadBusState();

                const cleaningHistory = Array.isArray(currentState._cleaningHistory) ? currentState._cleaningHistory : getDefaultCleaningHistory();

                sendJson(res, { ok: true, count: cleaningHistory.length, cleaningHistory });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load cleaning history", details: error.message }, 500);

            }

            return;

        }

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (!Array.isArray(currentState._cleaningHistory)) {

                        currentState._cleaningHistory = getDefaultCleaningHistory();

                    }

                    if (Array.isArray(payload.cleaningHistory)) {

                        currentState._cleaningHistory = payload.cleaningHistory;

                    } else if (payload.item && typeof payload.item === "object") {

                        const exists = currentState._cleaningHistory.some(x => x.id === payload.item.id);

                        if (!exists) currentState._cleaningHistory.unshift(payload.item);

                    }

                    saveBusState(currentState);

                    broadcastSyncEvent("cleaning-history-updated", { cleaningHistory: currentState._cleaningHistory });

                    sendJson(res, { ok: true, count: currentState._cleaningHistory.length, cleaningHistory: currentState._cleaningHistory });

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save cleaning history", details: error.message }, 500);

                }

            });

            return;

        }

    }



    // ── GET & POST /api/completed-routes ──

    if (pathname === "/api/completed-routes") {

        if (req.method === "GET") {

            try {

                const currentState = loadBusState();

                const completedRoutesLog = Array.isArray(currentState._completedRoutesLog) ? currentState._completedRoutesLog : getDefaultCompletedRoutesLog();

                sendJson(res, { ok: true, count: completedRoutesLog.length, completedRoutesLog });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load completed routes log", details: error.message }, 500);

            }

            return;

        }

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (!Array.isArray(currentState._completedRoutesLog)) {

                        currentState._completedRoutesLog = getDefaultCompletedRoutesLog();

                    }

                    if (Array.isArray(payload.completedRoutesLog)) {

                        currentState._completedRoutesLog = payload.completedRoutesLog;

                    } else if (payload.item && typeof payload.item === "object") {

                        const exists = currentState._completedRoutesLog.some(x => x.id === payload.item.id);

                        if (!exists) currentState._completedRoutesLog.unshift(payload.item);

                    }

                    saveBusState(currentState);

                    broadcastSyncEvent("completed-routes-updated", { completedRoutesLog: currentState._completedRoutesLog });

                    sendJson(res, { ok: true, count: currentState._completedRoutesLog.length, completedRoutesLog: currentState._completedRoutesLog });

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save completed routes log", details: error.message }, 500);

                }

            });

            return;

        }

    }

    // ── GET /api/pending-relay-routes & POST /api/resolve-relay-route ──
    if (pathname === "/api/pending-relay-routes") {
        const currentState = loadBusState();
        sendJson(res, {
            ok: true,
            count: Object.keys(currentState._pendingRelayRoutes || {}).length,
            pendingRelayRoutes: currentState._pendingRelayRoutes || {}
        });
        return;
    }

    if (pathname === "/api/resolve-relay-route" && req.method === "POST") {
        readBody(req, body => {
            try {
                const payload = JSON.parse(body || "{}");
                const routeCode = cleanRouteCode(payload.route || payload.routeCode || "");
                const currentState = loadBusState();
                if (currentState._pendingRelayRoutes && routeCode && currentState._pendingRelayRoutes[routeCode]) {
                    delete currentState._pendingRelayRoutes[routeCode];
                    saveBusState(currentState);
                    broadcastSyncEvent("pending-relay-updated", { pendingRelayRoutes: currentState._pendingRelayRoutes });
                }
                sendJson(res, {
                    ok: true,
                    message: `Relay resolved for route ${routeCode}`,
                    pendingRelayRoutes: currentState._pendingRelayRoutes || {}
                });
            } catch (err) {
                sendJson(res, { ok: false, error: err.message }, 500);
            }
        });
        return;
    }

    // ── Fleet Bus Management Endpoints (Add / Delete / Restore / Changes) ──

    if (pathname === "/api/fleet/add-bus" && req.method === "POST") {

        readBody(req, body => {

            try {

                const payload = JSON.parse(body || "{}");

                const result = addFleetBus(payload);

                sendJson(res, { ok: true, message: `Bus ${result.bm} added successfully`, bus: result });

            } catch (err) {

                sendJson(res, { ok: false, error: err.message }, 400);

            }

        });

        return;

    }



    if ((pathname === "/api/fleet/delete-bus" || pathname === "/api/fleet/delete-buses-batch") && req.method === "POST") {

        readBody(req, body => {

            try {

                const payload = JSON.parse(body || "{}");

                if (Array.isArray(payload.bms)) {
                    const results = [];
                    const reason = String(payload.reason || "Batch Fleet Decommissioning").trim();
                    payload.bms.forEach(item => {
                        const bm = typeof item === "string" ? item : (item.bm || item.bmNumber);
                        const regNo = typeof item === "object" ? (item.regNo || item.regNumber || "") : "";
                        const depot = typeof item === "object" ? (item.depot || "") : "";
                        try {
                            const resObj = deleteFleetBus({ bm, regNo, reason, depot });
                            results.push(resObj);
                        } catch (e) {
                            console.warn("Could not delete bus in batch:", bm, e.message);
                        }
                    });
                    stateVersion = Date.now();
                    broadcastSyncEvent("fleet-buses-deleted", {
                        count: results.length,
                        bms: results.map(b => b.bm),
                        timestamp: new Date().toISOString()
                    });
                    sendJson(res, {
                        ok: true,
                        count: results.length,
                        deleted: results,
                        message: `${results.length} buses deleted successfully from available fleet`
                    });
                } else {
                    const result = deleteFleetBus(payload);
                    sendJson(res, { ok: true, message: `Bus ${result.bm} deleted successfully from available fleet`, bus: result });
                }

            } catch (err) {

                sendJson(res, { ok: false, error: err.message }, 400);

            }

        });

        return;

    }



    if (pathname === "/api/fleet/restore-bus" && req.method === "POST") {

        readBody(req, body => {

            try {

                const payload = JSON.parse(body || "{}");

                const result = restoreFleetBus(payload);

                sendJson(res, { ok: true, message: `Bus ${result.bm} restored successfully to available fleet`, bus: result });

            } catch (err) {

                sendJson(res, { ok: false, error: err.message }, 400);

            }

        });

        return;

    }



    if (pathname === "/api/fleet/changes" && req.method === "GET") {

        try {

            const currentState = loadBusState();

            sendJson(res, {

                ok: true,

                addedBuses: currentState._addedBuses || {},

                deletedBuses: currentState._deletedBuses || {}

            });

        } catch (err) {

            sendJson(res, { ok: false, error: err.message }, 500);

        }

        return;

    }

    // ── Driver Management Endpoints: GET & POST /api/drivers, /api/drivers/add, /api/drivers/delete ──
    const DEFAULT_SERVER_DRIVERS = [
        { id: 'DRV-101', name: 'Ramesh Kumar (BMTC-4101)', depot: '1', phone: '+91 98450 11001', shift: 'General Shift', status: 'Active', category: 'A' },
        { id: 'DRV-102', name: 'Suresh Gowda (BMTC-4102)', depot: '1', phone: '+91 98450 11002', shift: 'General Shift', status: 'Active', category: 'B' },
        { id: 'DRV-103', name: 'Anand Murthy (BMTC-4103)', depot: '1', phone: '+91 98450 11003', shift: 'Shift B', status: 'Active', category: 'B' },
        { id: 'DRV-104', name: 'Manjunath H. (BMTC-4104)', depot: '1', phone: '+91 98450 11004', shift: 'Shift B', status: 'Active', category: 'A' },
        { id: 'DRV-105', name: 'Venkatesh P. (BMTC-4105)', depot: '1', phone: '+91 98450 11005', shift: 'Night Halt', status: 'Active', category: 'C' },
        { id: 'DRV-106', name: 'Ravi Shankar (BMTC-4106)', depot: '1', phone: '+91 98450 11006', shift: 'General Shift', status: 'Active', category: 'B' },
        { id: 'DRV-107', name: 'Kiran Kumar (BMTC-4107)', depot: '1', phone: '+91 98450 11007', shift: 'Shift B', status: 'Active', category: 'B' },
        { id: 'DRV-108', name: 'Nagaraj V. (BMTC-4108)', depot: '1', phone: '+91 98450 11008', shift: 'Night Halt', status: 'Active', category: 'A' },
        { id: 'DRV-201', name: 'Basavaraju K. (BMTC-4201)', depot: '2', phone: '+91 98450 22001', shift: 'General Shift', status: 'Active', category: 'A' },
        { id: 'DRV-202', name: 'Prakash Nayak (BMTC-4202)', depot: '2', phone: '+91 98450 22002', shift: 'General Shift', status: 'Active', category: 'B' },
        { id: 'DRV-203', name: 'Girish Reddy (BMTC-4203)', depot: '2', phone: '+91 98450 22003', shift: 'Shift B', status: 'Active', category: 'B' },
        { id: 'DRV-204', name: 'Shanthakumar (BMTC-4204)', depot: '2', phone: '+91 98450 22004', shift: 'Shift B', status: 'Active', category: 'A' },
        { id: 'DRV-205', name: 'Chandrashekar (BMTC-4205)', depot: '2', phone: '+91 98450 22005', shift: 'Night Halt', status: 'Active', category: 'C' },
        { id: 'DRV-206', name: 'Harish Babu (BMTC-4206)', depot: '2', phone: '+91 98450 22006', shift: 'General Shift', status: 'Active', category: 'B' },
        { id: 'DRV-301', name: 'Mahesh Gowda (BMTC-4301)', depot: '3', phone: '+91 98450 33001', shift: 'General Shift', status: 'Active', category: 'A' },
        { id: 'DRV-302', name: 'Raghavendra Rao (BMTC-4302)', depot: '3', phone: '+91 98450 33002', shift: 'Shift B', status: 'Active', category: 'B' },
        { id: 'DRV-303', name: 'Chethan Kumar (BMTC-4303)', depot: '3', phone: '+91 98450 33003', shift: 'Night Halt', status: 'Active', category: 'A' }
    ];

    if (pathname === "/api/drivers" && req.method === "GET") {
        try {
            const currentState = loadBusState();
            const drivers = currentState._driversList || DEFAULT_SERVER_DRIVERS;
            const auditLog = currentState._driverAuditLog || [];
            sendJson(res, { ok: true, drivers, auditLog });
        } catch (err) {
            sendJson(res, { ok: false, error: err.message }, 500);
        }
        return;
    }

    if (pathname === "/api/drivers/add" && req.method === "POST") {
        readBody(req, body => {
            try {
                const payload = JSON.parse(body || "{}");
                const { name, id, depot = "1", phone = "", shift = "General Shift", category = "B" } = payload;
                if (!name || !name.trim()) throw new Error("Driver name is required");
                const drvId = id && id.trim() ? id.trim() : `DRV-${Date.now().toString().slice(-4)}`;
                const currentState = loadBusState();
                if (!Array.isArray(currentState._driversList)) {
                    currentState._driversList = [...DEFAULT_SERVER_DRIVERS];
                }
                const newDriver = {
                    id: drvId,
                    name: name.trim(),
                    depot: String(depot),
                    phone: phone.trim(),
                    shift,
                    category,
                    status: "Active",
                    createdAt: new Date().toISOString()
                };
                currentState._driversList.push(newDriver);
                if (!Array.isArray(currentState._driverAuditLog)) currentState._driverAuditLog = [];
                currentState._driverAuditLog.unshift({
                    action: "DRIVER_ADDED",
                    id: drvId,
                    name: name.trim(),
                    depot: String(depot),
                    time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
                    reason: "New Driver Induction"
                });
                saveBusState(currentState);
                sendJson(res, { ok: true, message: `Driver ${name} added successfully`, driver: newDriver });
            } catch (err) {
                sendJson(res, { ok: false, error: err.message }, 400);
            }
        });
        return;
    }

    if ((pathname === "/api/drivers/delete" || pathname === "/api/drivers/delete-batch") && req.method === "POST") {
        readBody(req, body => {
            try {
                const payload = JSON.parse(body || "{}");
                const ids = Array.isArray(payload.ids) ? payload.ids : (payload.id ? [payload.id] : []);
                const reason = payload.reason || "Operational Restructuring";
                if (ids.length === 0) throw new Error("At least one driver ID is required to delete");
                const currentState = loadBusState();
                if (!Array.isArray(currentState._driversList)) {
                    currentState._driversList = [...DEFAULT_SERVER_DRIVERS];
                }
                const deletedNames = [];
                currentState._driversList = currentState._driversList.filter(d => {
                    if (ids.includes(d.id)) {
                        deletedNames.push(d.name || d.id);
                        return false;
                    }
                    return true;
                });
                if (!Array.isArray(currentState._driverAuditLog)) currentState._driverAuditLog = [];
                ids.forEach(id => {
                    currentState._driverAuditLog.unshift({
                        action: "DRIVER_DECOMMISSIONED",
                        id,
                        reason,
                        time: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                    });
                });
                saveBusState(currentState);
                sendJson(res, { ok: true, message: `Deleted ${ids.length} driver(s) successfully`, deletedIds: ids, deletedNames });
            } catch (err) {
                sendJson(res, { ok: false, error: err.message }, 400);
            }
        });
        return;
    }

    // ── File Download Endpoints (Excel & PDF Reports) ──
  if ((pathname === "/api/export-excel" || pathname === "/api/download/excel") && req.method === "GET") {
    const excelPath = path.join(__dirname, "Chandapura_Depot_Battery_Allocation.xlsx");
    if (!fs.existsSync(excelPath)) {
      try {
        require("child_process").execSync("python scratch/gen_excel.py", { cwd: __dirname, timeout: 15000 });
      } catch (e) {
        console.warn("Could not regenerate excel:", e.message);
      }
    }
    if (fs.existsSync(excelPath)) {
      const stat = fs.statSync(excelPath);
      res.writeHead(200, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Length": stat.size,
        "Content-Disposition": 'attachment; filename="Chandapura_Depot_Battery_Allocation.xlsx"',
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      });
      fs.createReadStream(excelPath).pipe(res);
      return;
    } else {
      sendJson(res, { ok: false, error: "Excel export file not found" }, 404);
      return;
    }
  }

  if ((pathname === "/api/download-pdf" || pathname === "/api/download/pdf") && req.method === "GET") {
    const pdfCandidates = [
      path.join(__dirname, "Ashok_Leyland_Bus_Allocation_Explanation.pdf"),
      path.join(__dirname, "Ashok_Leyland_Smart_Bus_Scheduling_Pitch_Deck.pdf"),
      path.join(__dirname, "Ashok_Leyland_Today_Discussion_Summary.pdf")
    ];
    const pdfPath = pdfCandidates.find(p => fs.existsSync(p));
    if (pdfPath) {
      const stat = fs.statSync(pdfPath);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Length": stat.size,
        "Content-Disposition": 'attachment; filename="Ashok_Leyland_Operational_Report.pdf"',
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache"
      });
      fs.createReadStream(pdfPath).pipe(res);
      return;
    } else {
      sendJson(res, { ok: false, error: "PDF report file not found" }, 404);
      return;
    }
  }

  if (pathname === "/api/routes") {

        try {

            const routes = loadRoutes();

            sendJson(res, { count: routes.length, routes });

        } catch (error) {

            sendJson(res, { error: "Failed to load routes", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/corridor-schedules") {

        try {

            const data = loadCorridorSchedules();

            sendJson(res, Object.assign({ ok: true }, data));

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load corridor schedules", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/bus-tasks" || pathname === "/api/route-tasks") {

        try {

            const bus = (requestUrl.searchParams.get("bus") || "").trim();

            const routeId = (requestUrl.searchParams.get("routeId") || requestUrl.searchParams.get("route_id") || "").trim();

            const scheduleId = (requestUrl.searchParams.get("scheduleId") || requestUrl.searchParams.get("schedule_id") || "").trim();

            const data = getBusTasks(bus, routeId, scheduleId);

            sendJson(res, data);

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load bus tasks", details: error.message }, 500);

        }

        return;

    }



    const tasksMatch = pathname.match(/^\/api\/bus\/([^/]+)\/tasks$/);

    if (tasksMatch) {

        try {

            const busIdParam = decodeURIComponent(tasksMatch[1]);

            const routeId = (requestUrl.searchParams.get("routeId") || requestUrl.searchParams.get("route_id") || "").trim();

            const scheduleId = (requestUrl.searchParams.get("scheduleId") || requestUrl.searchParams.get("schedule_id") || "").trim();

            const data = getBusTasks(busIdParam, routeId, scheduleId);

            sendJson(res, data);

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load bus tasks", details: error.message }, 500);

        }

        return;

    }



    const macroMatch = pathname.match(/^\/api\/bus\/([^/]+)\/macro$/);

    if (macroMatch) {

        try {

            const busIdParam = decodeURIComponent(macroMatch[1]);

            const data = getBusMacroData(busIdParam);

            sendJson(res, data);

        } catch (error) {

            sendJson(res, { error: "Failed to load macro data", details: error.message }, 500);

        }

        return;

    }



    const microMatch = pathname.match(/^\/api\/bus\/([^/]+)\/micro$/);

    if (microMatch) {

        try {

            const busIdParam = decodeURIComponent(microMatch[1]);

            const data = getBusMicroData(busIdParam);

            sendJson(res, data);

        } catch (error) {

            sendJson(res, { error: "Failed to load micro data", details: error.message }, 500);

        }

        return;

    }



    const socHistoryMatch = pathname.match(/^\/api\/bus\/([^/]+)\/soc-history$/);

    if (socHistoryMatch) {

        try {

            const busIdParam = decodeURIComponent(socHistoryMatch[1]);

            const dateParam = (requestUrl.searchParams.get("date") || "").trim();

            const daysParam = parseInt(requestUrl.searchParams.get("days") || "30", 10);

            const summaries = socLogger.getBusDailySummaries(busIdParam, daysParam);

            const dayDetails = dateParam ? socLogger.getBusDateDetails(busIdParam, dateParam) : null;

            sendJson(res, {

                ok: true,

                busId: busIdParam,

                summaries,

                selectedDate: dateParam || null,

                dayDetails

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load SoC history", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/soc-dates") {

        try {

            const dates = socLogger.getAvailableDates();

            sendJson(res, { ok: true, dates });

        } catch (error) {

            sendJson(res, { ok: false, error: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/soc-daily-log") {

        try {

            const dateParam = (requestUrl.searchParams.get("date") || new Date().toISOString().split("T")[0]).trim();

            const summaries = socLogger.getAllSummariesForDate(dateParam);

            sendJson(res, { ok: true, date: dateParam, summaries });

        } catch (error) {

            sendJson(res, { ok: false, error: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/soc/discharge-estimate" || pathname === "/api/soc-discharge-estimate") {

        try {

            const busId = (requestUrl.searchParams.get("busId") || requestUrl.searchParams.get("bus") || "BM238").trim();

            const distanceKm = parseFloat(requestUrl.searchParams.get("distanceKm") || requestUrl.searchParams.get("km") || "28.7");

            const durationHours = parseFloat(requestUrl.searchParams.get("durationHours") || requestUrl.searchParams.get("hours") || "1.3");

            const routeCode = (requestUrl.searchParams.get("routeCode") || requestUrl.searchParams.get("route") || "600F").trim();

            const shift = (requestUrl.searchParams.get("shift") || "").trim();

            const slot = (requestUrl.searchParams.get("slot") || "NORMAL").trim();

            const reservePct = parseFloat(requestUrl.searchParams.get("reservePct") || "15.0");

            const busCategory = (requestUrl.searchParams.get("busCategory") || "").trim();



            const estimate = socLogger.estimateScheduleDischargeDual(busId, {

                distanceKm,

                durationHours,

                routeCode,

                shift,

                slot,

                reservePct,

                busCategory

            });

            sendJson(res, { ok: true, estimate });

        } catch (error) {

            sendJson(res, { ok: false, error: error.message }, 500);

        }

        return;

    }



    const segmentsMatch = pathname.match(/^\/api\/bus\/([^/]+)\/discharge-segments$/);

    if (segmentsMatch) {

        try {

            const busIdParam = decodeURIComponent(segmentsMatch[1]);

            const segments = socLogger.extractDischargeSegments(busIdParam);

            const validCount = segments.filter(s => !s.isCharging && !s.isLayover && s.socPerHour !== null).length;

            sendJson(res, {

                ok: true,

                busId: busIdParam,

                segments,

                validDrivingCount: validCount

            });

        } catch (error) {

            sendJson(res, { ok: false, error: error.message }, 500);

        }

        return;

    }



    const summaryMatch = pathname.match(/^\/api\/bus\/([^/]+)\/summary$/);

    if (summaryMatch) {

        try {

            const busIdParam = decodeURIComponent(summaryMatch[1]);

            const info = resolveBusAndRoute(busIdParam);

            sendJson(res, {

                ok: true,

                uniqueId: info.uniqueId,

                unique_id: info.uniqueId,

                vehicleId: info.uniqueId,

                busName: info.uniqueId,

                physicalVehicle: info.uniqueId,

                busNumber: info.busNumber,

                busShortName: info.busShortName,

                bus_id: info.uniqueId,

                routeId: info.canonicalRouteId,

                assignedRouteId: info.assignedRouteId,

                assignedRouteShortName: info.assignedRouteObj?.busNumber || info.busNumber,

                assignedRouteDisplay: info.assignedRouteDisplay,

                origin: info.assignedRouteObj?.origin || info.matchingRoute?.origin || "",

                destination: info.assignedRouteObj?.destination || info.matchingRoute?.destination || "",

                routeName: info.assignedRouteObj?.routeName || info.matchingRoute?.routeName || "",

                soc: info.currentSoc,

                condition: info.condition,

                driver: info.driver || info.stateEntry?.driver || "Driver Assigned",

                distanceKm: info.routeDistanceKm,

                blocked: info.blocked

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load bus summary", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/route-distance") {

        const busNumber = (requestUrl.searchParams.get("bus") || "").trim();

        const routeId = (requestUrl.searchParams.get("route_id") || requestUrl.searchParams.get("routeId") || "").trim();

        if (!busNumber && !routeId) {

            sendJson(res, { ok: false, error: "bus or route_id is required" }, 400);

            return;

        }



        try {

            const result = calculateRouteDistance(busNumber, routeId);

            sendJson(res, result, result.statusCode || 200);

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to calculate route distance", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/gtfs-schedules" || pathname === "/api/gtfs-schedule-summary") {

        try {

            const schedules = loadGtfsScheduleSummary();

            sendJson(res, { ok: true, schedules });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load GTFS schedules", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/gtfs") {

        try {

            if (!cachedGtfsBundleJson) {

                const routes = loadRoutes();

                const stops = loadStops();

                const trips = loadTrips();

                const stopTimes = loadStopTimes();

                const shapes = loadShapes();



                cachedGtfsBundleJson = JSON.stringify({

                    routes: { count: routes.length, routes },

                    stops: { count: stops.length, stops },

                    trips: { count: trips.length, trips },

                    stopTimes: { count: stopTimes.length, stopTimes },

                    shapes: { count: shapes.length, shapes }

                });

            }

            sendJson(res, cachedGtfsBundleJson);

        } catch (error) {

            sendJson(res, { error: "Failed to load GTFS bundle", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/bus-state") {

        if (req.method === "GET") {

            try {

                sendJson(res, { ok: true, state: loadBusState() });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load bus state", details: error.message }, 500);

            }

            return;

        }



        if (req.method === "POST") {

            try {

                let body = "";

                req.on("data", (chunk) => {

                    body += chunk;

                });



                req.on("end", () => {

                    try {

                        const payload = body ? JSON.parse(body) : {};

                        const rawId = String(payload.unique_id || payload.uniqueId || payload.bus || payload.bus_id || payload.bus_name || payload.busNumber || payload.bm_no || payload.bmNumber || payload.routeId || "").trim();



                        if (!rawId) {

                            sendJson(res, { ok: false, error: "unique_id or bus (or routeId or busNumber) is required" }, 400);

                            return;

                        }



                        const allRoutes = loadRoutes();

                        const cleanLower = rawId.toLowerCase();

                        const cleanCompact = rawId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();



                        let matchingRoute = allRoutes.find((r) => {

                            const u = String(r.uniqueId || "").toLowerCase();

                            return u === cleanLower || u.replace(/[^a-zA-Z0-9]/g, "") === cleanCompact;

                        });

                        if (!matchingRoute) {

                            matchingRoute = allRoutes.find((r) => {

                                const b = String(r.busNumber || "").trim().toLowerCase();

                                return b === cleanLower || b.replace(/[^a-zA-Z0-9]/g, "") === cleanCompact;

                            });

                        }

                        if (!matchingRoute) {

                            matchingRoute = allRoutes.find((r) => String(r.routeId) === rawId);

                        }



                        const upperRaw = rawId.toUpperCase();

                        const uniqueId = matchingRoute

                            ? matchingRoute.uniqueId

                            : (upperRaw.startsWith("BM") || upperRaw.startsWith("BUS-")

                                ? upperRaw

                                : "BM238");

                        const busShortName = matchingRoute ? matchingRoute.busNumber : uniqueId;

                        const defaultRouteId = matchingRoute ? String(matchingRoute.routeId) : "";



                        const currentState = loadBusState();

                        const existing = currentState[uniqueId] || (busShortName ? currentState[busShortName] : {}) || (defaultRouteId ? currentState[defaultRouteId] : {}) || {};

                        const updatedEntry = normalizeBusStateEntry(payload, existing);



                        // If charging record or confirmed SoC submitted, update servicing status
                        if (payload.operation === 'Single Charge Operation' || payload.chargingStatus === 'Completed' || payload.socAfter) {
                            if (!currentState._servicingStatus) currentState._servicingStatus = {};
                            const cur = currentState._servicingStatus[uniqueId] || {};
                            currentState._servicingStatus[uniqueId] = {
                                ...cur,
                                bm: uniqueId,
                                needsCharging: false,
                                chargingCompleted: true,
                                chargingCompletedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
                            };
                            updatedEntry.needsCharging = false;
                            updatedEntry.chargingCompleted = true;
                            if (Array.isArray(currentState._lockedBuses)) {
                                currentState._lockedBuses = currentState._lockedBuses.filter(x => String(x.bm || x.bmNumber || '').toUpperCase().trim() !== uniqueId || String(x.page || '').toLowerCase() !== 'charging');
                            }
                        }

                        // Store primarily under uniqueId (physical vehicle)

                        currentState[uniqueId] = updatedEntry;

                        if (busShortName && busShortName !== uniqueId) {

                            currentState[busShortName] = Object.assign({}, updatedEntry, { uniqueId });

                        }

                        if (defaultRouteId) {

                            currentState[defaultRouteId] = Object.assign({}, updatedEntry, { uniqueId, busNumber: busShortName });

                        }



                        swapBusAssignments(currentState);

                        saveBusState(currentState);

                        broadcastSyncEvent("bus-state-updated", {

                            uniqueId,

                            bus: uniqueId,

                            busShortName,

                            state: updatedEntry,

                            allAllocatedDuties: currentState._allocatedDuties || [],

                            lockedBuses: currentState._lockedBuses || []

                        });



                        // Persistent Daily SoC Logging

                        socLogger.logSocUpdate({

                            busId: uniqueId,

                            soc: updatedEntry.soc,

                            condition: updatedEntry.condition,

                            status: updatedEntry.status,

                            driver: updatedEntry.driver,

                            routeId: (currentState._assignments || {})[uniqueId] || defaultRouteId,

                            routeShortName: busShortName,

                            timestamp: updatedEntry.updatedAt

                        });



                        // Forward to Python backend for micro/macro tracking

                        const pythonIds = new Set([uniqueId, busShortName]);

                        if (defaultRouteId) pythonIds.add(defaultRouteId);

                        for (const pyId of pythonIds) {

                            fetch(`${PYTHON_API_BASE}/telemetry`, {

                                method: "POST",

                                headers: { "Content-Type": "application/json" },

                                body: JSON.stringify({

                                    bus_id: pyId,

                                    soc: updatedEntry.soc,

                                    condition: updatedEntry.condition,

                                    status: updatedEntry.status

                                })

                            }).catch(() => {});

                        }

                        // Refresh Python blended range cache for this vehicle (fire-and-forget)

                        fetchAndCachePythonRange(uniqueId, updatedEntry.soc);



                        const assignedRouteId = (currentState._assignments || {})[uniqueId] || defaultRouteId;

                        const assignedRouteObj = allRoutes.find(r => String(r.routeId) === String(assignedRouteId)) || matchingRoute;

                        const assignedDist = assignedRouteObj ? (calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0) : 0;

                        const assignedDisplay = assignedRouteObj

                            ? `Route ${assignedRouteId} - ${assignedRouteObj.busNumber} (${assignedDist.toFixed(1)} km)`

                            : `Route ${assignedRouteId} (${assignedDist.toFixed(1)} km)`;

                        const isBlocked = (currentState._blockedBuses || []).includes(uniqueId)

                                       || (currentState._blockedRouteIds || []).includes(assignedRouteId);



                        sendJson(res, {

                            ok: true,

                            unique_id: uniqueId,

                            uniqueId: uniqueId,

                            bus: uniqueId,

                            bus_id: uniqueId,

                            busName: uniqueId,

                            physicalVehicle: uniqueId,

                            busShortName,

                            routeId: assignedRouteId,

                            assignedRouteId,

                            assignedRouteShortName: assignedRouteObj?.busNumber || busShortName,

                            assignedRouteDistanceKm: assignedDist,

                            assignedRoute: assignedDisplay,

                            assignedRouteDisplay: assignedDisplay,

                            origin: assignedRouteObj?.origin || "",

                            destination: assignedRouteObj?.destination || "",

                            blocked: isBlocked,

                            state: updatedEntry

                        });

                    } catch (error) {

                        sendJson(res, { ok: false, error: "Failed to save bus state", details: error.message }, 400);

                    }

                });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to save bus state", details: error.message }, 500);

            }

            return;

        }



        sendJson(res, { ok: false, error: "Method not allowed" }, 405);

        return;

    }



    if (pathname === "/api/telemetry" || pathname === "/telemetry" || (pathname === "/" && req.method === "POST")) {

        if (req.method !== "POST") {

            sendJson(res, { ok: false, error: "Method not allowed" }, 405);

            return;

        }



        try {

            let body = "";

            req.on("data", (chunk) => {

                body += chunk;

            });



            req.on("end", () => {

                try {

                    let payload = {};

                    if (body) {

                        try {

                            payload = JSON.parse(body);

                        } catch {

                            const params = new URLSearchParams(body);

                            for (const [k, v] of params.entries()) {

                                payload[k] = v;

                            }

                        }

                    }



                    const rawId = String(payload.unique_id || payload.uniqueId || payload.bus || payload.bus_id || payload.bus_name || payload.busNumber || payload.routeId || "").trim();

                    if (!rawId) {

                        sendJson(res, { ok: false, error: "unique_id or bus (or routeId) is required" }, 400);

                        return;

                    }



                    const allRoutes = loadRoutes();

                    const cleanLower = rawId.toLowerCase();

                    const cleanCompact = rawId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();



                    let matchingRoute = allRoutes.find((r) => {

                        const u = String(r.uniqueId || "").toLowerCase();

                        return u === cleanLower || u.replace(/[^a-zA-Z0-9]/g, "") === cleanCompact;

                    });

                    if (!matchingRoute) {

                        matchingRoute = allRoutes.find((r) => {

                            const b = String(r.busNumber || "").trim().toLowerCase();

                            return b === cleanLower || b.replace(/[^a-zA-Z0-9]/g, "") === cleanCompact;

                        });

                    }

                    if (!matchingRoute) {

                        matchingRoute = allRoutes.find((r) => String(r.routeId) === rawId);

                    }



                    const upperRaw = rawId.toUpperCase();

                    const uniqueId = matchingRoute

                        ? matchingRoute.uniqueId

                        : (upperRaw.startsWith("BM") || upperRaw.startsWith("BUS-")

                            ? upperRaw

                            : "BM238");

                    const busShortName = matchingRoute ? matchingRoute.busNumber : uniqueId;

                    const defaultRouteId = matchingRoute ? String(matchingRoute.routeId) : "";



                    const currentState = loadBusState();

                    const existing = currentState[uniqueId] || (busShortName ? currentState[busShortName] : {}) || (defaultRouteId ? currentState[defaultRouteId] : {}) || {};

                    const updatedEntry = normalizeBusStateEntry(payload, existing);



                    // Store primarily under uniqueId (physical vehicle)

                    currentState[uniqueId] = updatedEntry;

                    if (busShortName && busShortName !== uniqueId) {

                        currentState[busShortName] = Object.assign({}, updatedEntry, { uniqueId });

                    }

                    if (defaultRouteId) {

                        currentState[defaultRouteId] = Object.assign({}, updatedEntry, { uniqueId, busNumber: busShortName });

                    }



                    // Run the unique-id bus swap engine

                    swapBusAssignments(currentState);

                    saveBusState(currentState);

                    broadcastSyncEvent("bus-state-updated", {

                        uniqueId,

                        bus: uniqueId,

                        busShortName,

                        state: updatedEntry,

                        allAllocatedDuties: currentState._allocatedDuties || [],

                        lockedBuses: currentState._lockedBuses || []

                    });



                    // Persistent Daily SoC Logging

                    socLogger.logSocUpdate({

                        busId: uniqueId,

                        soc: updatedEntry.soc,

                        condition: updatedEntry.condition,

                        status: updatedEntry.status,

                        driver: updatedEntry.driver,

                        routeId: (currentState._assignments || {})[uniqueId] || defaultRouteId,

                        routeShortName: busShortName,

                        timestamp: updatedEntry.updatedAt

                    });



                    // Forward to Python backend (for micro/macro charts)

                    const pythonIds = new Set([uniqueId, busShortName]);

                    if (defaultRouteId) pythonIds.add(defaultRouteId);

                    for (const pyId of pythonIds) {

                        fetch(`${PYTHON_API_BASE}/telemetry`, {

                            method: "POST",

                            headers: { "Content-Type": "application/json" },

                            body: JSON.stringify({

                                bus_id: pyId,

                                soc: updatedEntry.soc,

                                condition: updatedEntry.condition,

                                status: updatedEntry.status

                            })

                        }).catch(() => {});

                    }

                    // Refresh Python blended range cache for this vehicle (fire-and-forget)

                    fetchAndCachePythonRange(uniqueId, updatedEntry.soc);



                    const assignedRouteId = (currentState._assignments || {})[uniqueId] || defaultRouteId;

                    const assignedRouteObj = allRoutes.find(r => String(r.routeId) === String(assignedRouteId)) || matchingRoute;

                    const assignedDist = assignedRouteObj ? (calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0) : 0;

                    const assignedDisplay = assignedRouteObj

                        ? `Route ${assignedRouteId} - ${assignedRouteObj.busNumber} (${assignedDist.toFixed(1)} km)`

                        : `Route ${assignedRouteId} (${assignedDist.toFixed(1)} km)`;

                    const isBlocked = (currentState._blockedBuses || []).includes(uniqueId)

                                   || (currentState._blockedRouteIds || []).includes(assignedRouteId);



                    console.log(`[Telemetry] Vehicle=${uniqueId} updated: SoC=${updatedEntry.soc}%, Condition=${updatedEntry.condition}, AssignedRoute=${assignedDisplay}, Blocked=${isBlocked}`);

                    sendJson(res, {

                        ok: true,

                        message: `Telemetry updated successfully for Bus ${uniqueId}`,

                        unique_id: uniqueId,

                        uniqueId: uniqueId,

                        bus: uniqueId,

                        bus_id: uniqueId,

                        busName: uniqueId,

                        physicalVehicle: uniqueId,

                        busShortName,

                        assignedBus: uniqueId,

                        assignedBusShortName: busShortName,

                        driver: updatedEntry.driver,

                        routeId: assignedRouteId,

                        assignedRouteId: assignedRouteId,

                        assignedRouteShortName: assignedRouteObj?.busNumber || busShortName,

                        assignedRouteDistanceKm: assignedDist,

                        assignedRoute: assignedDisplay,

                        assignedRouteDisplay: assignedDisplay,

                        origin: assignedRouteObj?.origin || "",

                        destination: assignedRouteObj?.destination || "",

                        blocked: isBlocked,

                        state: updatedEntry

                    });

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to process telemetry", details: error.message }, 400);

                }

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to process telemetry", details: error.message }, 500);

        }

        return;

    }



    // ── GET /api/bus-assignments ──────────────────────────────────────────────

    if (pathname === "/api/bus-assignments") {

        try {

            const currentState = loadBusState();

            ensureFixedAssignments(currentState);

            sendJson(res, {

                ok: true,

                timeSlot: getTimeSlot(),

                allowedCategoriesMatrix: ALLOWED_CATEGORIES,

                assignments: currentState._assignments || {},

                vehicleAssignments: currentState._vehicleAssignments || {},

                busAssignments: currentState._busAssignments || {},

                blockedBuses: currentState._blockedBuses || [],

                blockedRouteIds: currentState._blockedRouteIds || [],

                ranges: currentState.ranges || {},

                swapLog: currentState._swapLog || []

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load bus assignments", details: error.message }, 500);

        }

        return;

    }



    // ── GET & POST /api/allocated-duties ───────────────────────────────────────

    if (pathname === "/api/allocated-duties") {

        if (req.method === "GET") {

            try {

                const currentState = loadBusState();

                const duties = currentState._allocatedDuties || [];

                sendJson(res, { ok: true, count: duties.length, duties });

            } catch (error) {

                sendJson(res, { ok: false, error: "Failed to load allocated duties", details: error.message }, 500);

            }

            return;

        }

        if (req.method === "POST") {

            readBody(req, body => {

                try {

                    const payload = JSON.parse(body || "{}");

                    const currentState = loadBusState();

                    if (Array.isArray(payload.duties)) {

                        currentState._allocatedDuties = payload.duties;

                        // Check if newly allocated duty resolves any pending relay route
                        if (currentState._pendingRelayRoutes && typeof currentState._pendingRelayRoutes === 'object') {
                            let relayChanged = false;
                            payload.duties.forEach(duty => {
                                const dRoute = cleanRouteCode(duty.routeCode || duty.route || '');
                                const dDepot = String(duty.depot || duty.depotId || '').trim();
                                const dBm = String(duty.bm || duty.bmNumber || '').toUpperCase().trim();
                                if (dRoute && currentState._pendingRelayRoutes[dRoute]) {
                                    const pending = currentState._pendingRelayRoutes[dRoute];
                                    if (String(pending.depot) === dDepot && dBm !== String(pending.firstBus).toUpperCase()) {
                                        delete currentState._pendingRelayRoutes[dRoute];
                                        relayChanged = true;
                                    }
                                }
                            });
                            if (relayChanged) {
                                broadcastSyncEvent("pending-relay-updated", { pendingRelayRoutes: currentState._pendingRelayRoutes });
                            }
                        }

                        saveBusState(currentState);

                        broadcastSyncEvent("allocated-duties-updated", { duties: currentState._allocatedDuties });

                        sendJson(res, { ok: true, count: currentState._allocatedDuties.length, duties: currentState._allocatedDuties });

                    } else {

                        sendJson(res, { ok: false, error: "Invalid payload format. Expected { duties: [...] }" }, 400);

                    }

                } catch (error) {

                    sendJson(res, { ok: false, error: "Failed to save allocated duties", details: error.message }, 500);

                }

            });

            return;

        }

    }



    // ── GET /api/schedule-categories ──────────────────────────────────────────

    if (pathname === "/api/schedule-categories") {

        try {

            const schedPath = path.join(BASE_DIR, "vehicles", "schedule_categories.json");

            if (fs.existsSync(schedPath)) {

                const data = JSON.parse(fs.readFileSync(schedPath, "utf8"));

                sendJson(res, { ok: true, count: data.length, schedules: data });

            } else {

                sendJson(res, { ok: false, error: "Schedule categories not found" }, 404);

            }

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load schedule categories", details: error.message }, 500);

        }

        return;

    }



    // ── GET /api/bus-categories ───────────────────────────────────────────────

    if (pathname === "/api/bus-categories") {

        try {

            const busPath = path.join(BASE_DIR, "vehicles", "bus_categories.json");

            if (fs.existsSync(busPath)) {

                const data = JSON.parse(fs.readFileSync(busPath, "utf8"));

                sendJson(res, { ok: true, count: data.length, buses: data });

            } else {

                sendJson(res, { ok: false, error: "Bus categories not found" }, 404);

            }

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load bus categories", details: error.message }, 500);

        }

        return;

    }



    // ── GET /api/matrix ──────────────────────────────────────────────────────

    if (pathname === "/api/matrix") {

        sendJson(res, {

            ok: true,

            page: 4,

            title: "Priority Allocation Matrix",

            currentSlot: getTimeSlot(),

            busRangeCategories: {

                A: { name: "High", rangeKm: ">120 km (121.25–136.34 km)", count: 41 },

                B: { name: "Medium", rangeKm: "106–120.5 km (106.05–120.53 km)", count: 59 },

                C: { name: "Low", rangeKm: "<106 km (62.05–105.50 km)", count: 22 }

            },

            routeCategories: {

                SIMPLE: { meaning: "Easy to operate", distanceKm: "< 10 km" },

                MODERATE: { meaning: "Normal effort", distanceKm: "10 - 20 km" },

                COMPLEX: { meaning: "Requires additional planning", distanceKm: ">= 20 km" }

            },

            scheduleCategories: {

                STANDARD: { name: "Standard", reqRangeKm: "91.9–101.6 km", count: 17 },

                MODERATE: { name: "Moderate", reqRangeKm: "108.6–116.5 km", count: 34 },

                COMPLEX:  { name: "Complex", reqRangeKm: "117.7–146.9 km", count: 79 }

            },

            timeSlots: {

                NORMAL: "05:00–07:00 (and 23:00–05:00)",

                EXTREME_PEAK: "07:00–10:00 and 16:00–20:00",

                PEAK: "10:00–16:00 and 20:00–23:00"

            },

            timeCategoryDrainRates: {

                EXTREME_PEAK: { timeSlot: "07:00–10:00 and 16:00–20:00", drainRate: "High", multiplier: 1.30, penalty: "+30%" },

                PEAK: { timeSlot: "10:00–16:00 and 20:00–23:00", drainRate: "Moderate", multiplier: 1.15, penalty: "+15%" },

                NORMAL: { timeSlot: "05:00–07:00 (and 23:00–05:00)", drainRate: "Normal", multiplier: 1.00, penalty: "Baseline" }

            },

            allowedCategories: ALLOWED_CATEGORIES

        });

        return;

    }



    if (pathname === "/api/fleet") {

        try {

            const allRoutes = loadRoutes();

            const busState = loadBusState();

            const assignments = busState._assignments || {};



            const fleet = allRoutes.map((r) => {

                const uniqueId = r.uniqueId;

                const assignedRouteId = assignments[uniqueId] || String(r.routeId);

                const assignedRouteObj = allRoutes.find((x) => String(x.routeId) === String(assignedRouteId)) || r;

                const dist = calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0;

                const assignedDisplay = `Route ${assignedRouteId} - ${assignedRouteObj.busNumber} (${dist.toFixed(1)} km)`;



                const state = busState[uniqueId] || busState[r.busNumber] || busState[r.routeId] || {};

                const soc = Number.isFinite(Number(state.soc)) ? Number(state.soc) : 0;

                const condition = state.condition || "Good";

                const status = state.status || (soc > 30 ? "Active" : soc > 15 ? "Warning" : "Blocked");

                const range = Math.round(Math.max(0, soc - 10) * 1.42);

                const isBlocked = (busState._blockedBuses || []).includes(uniqueId)

                               || (busState._blockedRouteIds || []).includes(assignedRouteId)

                               || (condition === "Not Good")

                               || (soc < 25)

                               || (dist > 0 && range < dist)

                               || (state.driver && state.driver.toLowerCase().includes("no"));



                return {

                    unique_id: uniqueId,

                    uniqueId: uniqueId,

                    vehicleId: uniqueId,

                    bus_id: uniqueId,

                    busName: uniqueId,

                    physicalVehicle: uniqueId,

                    defaultBusNumber: r.busNumber,

                    defaultRouteId: String(r.routeId),

                    assignedRouteId,

                    assignedRouteShortName: assignedRouteObj.busNumber,

                    origin: assignedRouteObj.origin,

                    destination: assignedRouteObj.destination,

                    route: assignedDisplay,

                    assignedRoute: assignedDisplay,

                    routeDistanceKm: dist,

                    soc,

                    condition,

                    status,

                    blocked: isBlocked

                };

            });

            sendJson(res, { ok: true, count: fleet.length, fleet });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to load fleet", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/stops") {

        try {

            const allStops = loadStops();

            const q = (requestUrl.searchParams.get("q") || "").trim().toLowerCase();

            const limitParam = Number.parseInt(requestUrl.searchParams.get("limit") || "200", 10);

            const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 5000) : 200;



            const filteredStops = q

                ? allStops.filter((stop) => {

                      const name = (stop.stopName || "").toLowerCase();

                      const desc = (stop.stopDesc || "").toLowerCase();

                      const id = (stop.stopId || "").toLowerCase();

                      return name.includes(q) || desc.includes(q) || id.includes(q);

                  })

                : allStops;



            const stops = filteredStops.slice(0, limit);

            sendJson(res, { count: filteredStops.length, returned: stops.length, stops });

        } catch (error) {

            sendJson(res, { error: "Failed to load stops", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/trips") {

        try {

            const trips = loadTrips();

            sendJson(res, { count: trips.length, trips });

        } catch (error) {

            sendJson(res, { error: "Failed to load trips", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/stop_times") {

        try {

            const stopTimes = loadStopTimes();

            sendJson(res, { count: stopTimes.length, stopTimes });

        } catch (error) {

            sendJson(res, { error: "Failed to load stop_times", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/shapes") {

        try {

            const shapes = loadShapes();

            sendJson(res, { count: shapes.length, shapes });

        } catch (error) {

            sendJson(res, { error: "Failed to load shapes", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/api/live-gps") {

        try {

            const { payload, parsed } = await fetchAndParseAdafruitGps();



            if (!parsed.ok) {

                sendJson(

                    res,

                    {

                        ok: false,

                        error: "Invalid or incomplete GPS payload from Adafruit.",

                        reason: parsed.reason,

                        expectedFormats: [

                            "12.9716,77.5946",

                            { lat: 12.9716, lng: 77.5946 }

                        ],

                        rawPayload: payload

                    },

                    422

                );

                return;

            }



            sendJson(res, {

                ok: true,

                lat: parsed.lat,

                lng: parsed.lng,

                sourceFormat: parsed.sourceFormat,

                rawPayload: payload

            });

        } catch (error) {

            sendJson(res, { ok: false, error: "Failed to fetch live GPS from Adafruit", details: error.message }, 500);

        }

        return;

    }



    if (pathname === "/gtfs/routes.txt") {

        sendTextFile(res, ROUTES_FILE);

        return;

    }



    if (pathname === "/gtfs/stops.txt") {

        sendTextFile(res, STOPS_FILE);

        return;

    }



    if (pathname === "/gtfs/trips.txt") {

        sendTextFile(res, TRIPS_FILE);

        return;

    }



    if (pathname === "/gtfs/stop_times.txt") {

        sendTextFile(res, STOP_TIMES_FILE);

        return;

    }



    if (pathname === "/gtfs/shapes.txt") {

        sendTextFile(res, SHAPES_FILE);

        return;

    }



    // ── Dedicated Route for Direct Android APK Download ──
    if (pathname === "/download-apk" || pathname === "/download/apk" || pathname === "/apk" || pathname === "/app.apk" || pathname === "/Ashok_Leyland_Fleet.apk") {
        const localApkPath = path.join(BASE_DIR, "Ashok_Leyland_Fleet.apk");
        if (fs.existsSync(localApkPath)) {
            res.writeHead(200, {
                "Content-Type": "application/vnd.android.package-archive",
                "Content-Disposition": 'attachment; filename="Ashok_Leyland_Fleet.apk"',
                "Content-Length": fs.statSync(localApkPath).size
            });
            fs.createReadStream(localApkPath).pipe(res);
            return;
        } else {
            // Direct Cloud EAS Artifact Link
            res.writeHead(302, {
                "Location": "https://expo.dev/artifacts/eas/HqanFIYA8pb4LtHsZfHeJeiznldqyEFWee_hzYCU340.apk"
            });
            res.end();
            return;
        }
    }

    // ── Primary Website Entry: App Login & Mobile App Screens ──
    if (pathname === "/" || pathname === "/index.html" || pathname === "/login" || pathname === "/login.html" || pathname === "/app" || pathname === "/app/" || pathname === "/app/index.html" || pathname === "/app.html") {
        sendFile(res, path.join(BASE_DIR, "public", "app", "index.html"), "text/html; charset=utf-8");
        return;
    }

    // ── Legacy Desktop Web Login (Classic Fallback) ──
    if (pathname === "/legacy-login" || pathname === "/legacy-login.html" || pathname === "/classic-login" || pathname === "/classic" || pathname === "/desktop-login") {
        sendFile(res, path.join(BASE_DIR, "login.html"), "text/html");
        return;
    }

    if (pathname === "/favicon.ico") {
        const favPath = path.join(BASE_DIR, "public", "app", "favicon.ico");
        if (fs.existsSync(favPath)) {
            sendFile(res, favPath, "image/x-icon");
            return;
        }
    }



    if (pathname === "/schedulling" || pathname === "/schedulling.html" || pathname === "/scheduling" || pathname === "/scheduling.html" || pathname === "/ad" || pathname === "/ad.html") {

        sendFile(res, path.join(BASE_DIR, "scheduling.html"), "text/html");

        return;

    }



    if (pathname === "/admin" || pathname === "/admin.html" || pathname === "/problem" || pathname === "/problem.html" || pathname === "/recommending" || pathname === "/recommending.html" || pathname === "/smart-bus-scheduling" || pathname === "/smart-bus-scheduling.html") {

        sendFile(res, path.join(BASE_DIR, "admin.html"), "text/html");

        return;

    }



    if (pathname === "/app" || pathname === "/app/" || pathname === "/app/index.html" || pathname === "/app.html") {
        sendFile(res, path.join(BASE_DIR, "public", "app", "index.html"), "text/html; charset=utf-8");
        return;
    }

    if (pathname.startsWith("/_expo/")) {
        const filePath = path.join(BASE_DIR, "public", "app", pathname);
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
            ".js": "application/javascript; charset=utf-8",
            ".map": "application/json",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json",
            ".ico": "image/x-icon"
        }[ext] || "application/octet-stream";
        sendFile(res, filePath, mime);
        return;
    }

    if (pathname === "/install" || pathname === "/install.html" || pathname === "/ios" || pathname === "/install-ios") {
        sendFile(res, path.join(BASE_DIR, "install.html"), "text/html");
        return;
    }

// (Handled by Primary Entry above)



    if (pathname === "/login.css") {

        sendFile(res, path.join(BASE_DIR, "login.css"), "text/css");

        return;

    }



    if (pathname === "/login.js") {

        sendFile(res, path.join(BASE_DIR, "login.js"), "application/javascript");

        return;

    }



    // ── Progressive Web App (PWA) Core Routes ──

    if (pathname === "/splash-screen.png") {
        sendFile(res, path.join(BASE_DIR, "splash-screen.png"), "image/png");
        return;
    }

    if (pathname === "/manifest.json" || pathname === "/manifest.webmanifest") {

        sendFile(res, path.join(BASE_DIR, "manifest.json"), "application/manifest+json; charset=utf-8");

        return;

    }



    if (pathname === "/sw.js" || pathname === "/service-worker.js") {

        const swPath = path.join(BASE_DIR, "sw.js");

        fs.readFile(swPath, (err, data) => {

            if (err) {

                sendJson(res, { error: "Service Worker file not found" }, 404);

                return;

            }

            res.writeHead(200, {

                "Content-Type": "application/javascript; charset=utf-8",

                "Service-Worker-Allowed": "/",

                "Cache-Control": "no-cache, no-store, must-revalidate",

                "Access-Control-Allow-Origin": "*"

            });

            res.end(data);

        });

        return;

    }



    if (pathname.startsWith("/icons/")) {

        const iconFile = pathname.substring("/icons/".length);

        const iconPath = path.join(BASE_DIR, "public", "icons", iconFile);

        const ext = path.extname(iconPath).toLowerCase();

        const mime = { ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" }[ext] || "application/octet-stream";

        sendFile(res, iconPath, mime);

        return;

    }



    if (pathname === "/i18n.js") {

        sendFile(res, path.join(BASE_DIR, "i18n.js"), "application/javascript; charset=utf-8");

        return;

    }



    if (pathname === "/pwa-app.js" || pathname === "/public/pwa-app.js") {
        sendFile(res, path.join(BASE_DIR, "pwa-app.js"), "application/javascript; charset=utf-8");
        return;
    }

    if (pathname === "/sync-engine.js" || pathname === "/public/sync-engine.js") {

        sendStaticFile(res, "public/sync-engine.js");

        return;

    }



    if (pathname === "/charging" || pathname === "/charging.html") {

        sendStaticFile(res, "public/charging.html");

        return;

    }



    if (pathname === "/cleaning" || pathname === "/cleaning.html") {

        sendStaticFile(res, "public/cleaning.html");

        return;

    }



    if (pathname === "/depot-operations" || pathname === "/depot-operations.html") {

        sendStaticFile(res, "public/depot-operations.html");

        return;

    }



    if (pathname === "/bus-details.html" || pathname === "/public/bus-details.html") {

        sendStaticFile(res, "public/bus-details.html");

        return;

    }



    if (pathname === "/public/index.html" || pathname === "/public/") {

        sendFile(res, path.join(BASE_DIR, "public", "app", "index.html"), "text/html; charset=utf-8");

        return;

    }



    if (pathname.startsWith("/public/")) {

        const relativePath = pathname.substring("/public".length);

        sendStaticFile(res, `public${relativePath}`);

        return;

    }



    // ── Vehicles fleet data ──

    if (pathname === "/vehicles/vehicles.txt") {

        sendFile(res, path.join(BASE_DIR, "vehicles", "vehicles.txt"), "text/plain; charset=utf-8");

        return;

    }

    if (pathname === "/vehicles/vehicle_assignments.csv") {

        sendFile(res, path.join(BASE_DIR, "vehicles", "vehicle_assignments.csv"), "text/plain; charset=utf-8");

        return;

    }



    sendJson(res, { error: "Not found" }, 404);

});



server.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

    // Pre-warm local route and schedule caches immediately so initial API calls are instant

    try {

        loadRoutes();

        loadCorridorSchedules();

        loadGtfsScheduleSummary();

        console.log(`[Cache] Pre-warmed routes and corridor schedules immediately.`);

    } catch (e) {

        console.warn("[Cache] Immediate warm-up failed:", e.message);

    }



    setImmediate(async () => {

        try {

            await restoreBusStateFromGitHub();

        } catch (e) {

            console.warn("[GitHub restore failed]", e.message);

        }

        try {

            const routes = loadRoutes();

            for (const r of routes) {

                calculateRouteDistanceByRouteId(r.routeId);

            }

            console.log(`[Cache] Pre-warmed GTFS shape distances for ${cachedRouteDistances.size} routes.`);

        } catch (e) {

            console.warn("[Cache] Shape distance warm-up failed:", e.message);

        }

    });

});

module.exports = { server, app: server };
