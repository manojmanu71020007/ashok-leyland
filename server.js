const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
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
        "5": "BM293", "KBS3F": "BM293",
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

    cachedRoutes = vehicles.map((v) => {
        const bm = v.bmNo;
        const assign = assignByFixBm.get(bm) || assignBySwapBm.get(bm);
        const routeShort = assign ? assign.route : "600F";
        const scheduleId = assign ? assign.scheduleId : `RES-${bm}`;
        const shift = assign ? assign.shift : "General Shift (Reserve)";
        const corr = corridorByShort.get(routeShort) || defaultCorridor;
        const distKm = corr.distanceKm || calculateRouteDistanceByRouteId(corr.routeId) || 28.7;
        const tripCount = corr.tripCount || 8;

        return {
            uniqueId: bm,
            vehicleId: bm,
            bmNumber: bm,
            regNo: v.regNo || (assign && assign.regNo) || "",
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
            status: v.status
        };
    });

    return cachedRoutes;
}

let cachedCorridorSchedules = null;
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
        { code: "500DC", origin: "Anekal", destination: "Tin Factory via Dommasandra", distKm: 49.8, routeId: "9", trips: 8 }
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
            { scheduleId: "500DC/12", route: "500DC", shift: "General", fixBm: "BM240", fixReg: "KA51AH7979", swapBm: "BM255", swapReg: "KA51AH5639", outTime: "07:45:00", inTime: "14:45:00" },
            { scheduleId: "500DC/13", route: "500DC", shift: "General", fixBm: "BM255", fixReg: "KA51AH5639", swapBm: "BM274", swapReg: "KA51AH6236", outTime: "08:00:00", inTime: "15:00:00" },
            { scheduleId: "500DC/14", route: "500DC", shift: "General", fixBm: "BM274", fixReg: "KA51AH6236", swapBm: "BM240", swapReg: "KA51AH7979", outTime: "08:15:00", inTime: "15:15:00" },
            { scheduleId: "500DC/15", route: "500DC", shift: "General", fixBm: "BM240", fixReg: "KA51AH7979", swapBm: "BM274", swapReg: "KA51AH6236", outTime: "08:30:00", inTime: "15:30:00" },
            { scheduleId: "500DC/1", route: "500DC", shift: "Shift B", fixBm: "BM255", fixReg: "KA51AH5639", swapBm: "BM240", swapReg: "KA51AH7979", outTime: "13:10:00", inTime: "21:10:00" }
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
                        cumTime: c.cum_time
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
 * Returns route category ("SIMPLE" | "MODERATE" | "COMPLEX") from distance or explicit tag.
 */
function getRouteCategory(distKm, explicit) {
    if (explicit && ["SIMPLE", "MODERATE", "COMPLEX"].includes(String(explicit).toUpperCase())) {
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

function sendFile(res, filePath, contentType) {
    fs.readFile(filePath, (error, data) => {
        if (error) {
            sendJson(res, { error: "File not found" }, 404);
            return;
        }

        const acceptEncoding = (res.req && res.req.headers["accept-encoding"]) || "";
        const headers = {
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
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

// Push bus_state.json to GitHub (fire-and-forget, called after every local save)
function syncBusStateToGitHub(state) {
    if (!GITHUB_TOKEN) return;
    const apiPath = `/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
    githubRequest("GET", apiPath)
        .then((current) => {
            const content = Buffer.from(JSON.stringify(state, null, 2)).toString("base64");
            return githubRequest("PUT", apiPath, {
                message: "auto: sync bus_state from server",
                content,
                sha: current.sha
            });
        })
        .then(() => { console.log("[GitHub] bus_state.json synced ✓"); })
        .catch((e) => { console.warn("[GitHub sync failed]", e.message); });
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
            console.log("[GitHub] bus_state.json restored from GitHub ✓");
        }
    } catch (e) {
        console.warn("[GitHub restore failed]", e.message);
    }
}
// ──────────────────────────────────────────────────────────────────────────────

function loadBusState() {
    const state = readJsonFile(BUS_STATE_FILE, {});
    return state && typeof state === "object" ? state : {};
}

function saveBusState(state) {
    const clean = state && typeof state === "object" ? state : {};
    writeJsonFile(BUS_STATE_FILE, clean);
    syncBusStateToGitHub(clean); // persist to GitHub in background
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
    const soc = Number.isFinite(Number(entry?.soc))
        ? Math.max(0, Math.min(100, Number(entry.soc)))
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
            ".svg": "image/svg+xml"
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
        : (matchedSchedule && matchedSchedule.tasks && matchedSchedule.tasks.length > 3 ? matchedSchedule.tasks[3].toStop : "Tin Factory via Dommasandra");
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

    if (pathname === "/") {
        sendFile(res, path.join(BASE_DIR, "login.html"), "text/html");
        return;
    }

    if (pathname === "/index.html") {
        sendFile(res, path.join(BASE_DIR, "index.html"), "text/html");
        return;
    }

    if (pathname === "/problem.html") {
        sendFile(res, path.join(BASE_DIR, "problem.html"), "text/html");
        return;
    }

    if (pathname === "/schedulling" || pathname === "/schedulling.html" || pathname === "/scheduling" || pathname === "/scheduling.html" || pathname === "/ad" || pathname === "/ad.html") {
        sendFile(res, path.join(BASE_DIR, "schedulling.html"), "text/html");
        return;
    }

    if (pathname === "/admin" || pathname === "/admin.html" || pathname === "/recommending" || pathname === "/recommending.html" || pathname === "/smart-bus-scheduling" || pathname === "/smart-bus-scheduling.html") {
        sendFile(res, path.join(BASE_DIR, "admin.html"), "text/html");
        return;
    }

    if (pathname === "/login" || pathname === "/login.html") {
        sendFile(res, path.join(BASE_DIR, "login.html"), "text/html");
        return;
    }

    if (pathname === "/style.css") {
        sendFile(res, path.join(BASE_DIR, "style.css"), "text/css");
        return;
    }

    if (pathname === "/login.css") {
        sendFile(res, path.join(BASE_DIR, "login.css"), "text/css");
        return;
    }

    if (pathname === "/script.js") {
        sendFile(res, path.join(BASE_DIR, "script.js"), "application/javascript");
        return;
    }

    if (pathname === "/login.js") {
        sendFile(res, path.join(BASE_DIR, "login.js"), "application/javascript");
        return;
    }

    if (pathname === "/i18n.js") {
        sendFile(res, path.join(BASE_DIR, "i18n.js"), "application/javascript; charset=utf-8");
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

    if (pathname === "/bus-details.html" || pathname === "/public/bus-details.html") {
        sendStaticFile(res, "public/bus-details.html");
        return;
    }

    if (pathname === "/public/index.html" || pathname === "/public/") {
        sendStaticFile(res, "public/index.html");
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

