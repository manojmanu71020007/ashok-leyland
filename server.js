const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const PORT = process.env.PORT || 3000;
const PYTHON_API_BASE = "http://localhost:8000";
const BASE_DIR = __dirname;
const ROUTES_FILE = path.join(BASE_DIR, "routes", "routes.txt");
const STOPS_FILE = path.join(BASE_DIR, "stops", "stops.txt");
const TRIPS_FILE = path.join(BASE_DIR, "trips", "trips.txt");
const STOP_TIMES_FILE = path.join(BASE_DIR, "stop_times", "stop_times.txt");
const SHAPES_FILE = path.join(BASE_DIR, "shapes", "shapes.txt");
const BUS_STATE_FILE = path.join(BASE_DIR, "bus_state.json");
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
    const raw = fs.readFileSync(ROUTES_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    const tripCounts = getRouteTripCounts();

    cachedRoutes = lines.slice(1).map((line, idx) => {
        const [routeLongName, routeShortName, agencyId, routeType, routeId] = parseCsvLine(line);
        const [origin = "", destination = ""] = (routeLongName || "").split("⇔").map((part) => part.trim());
        const padIndex = String(idx + 1).padStart(2, "0");
        const uniqueId = `BUS-${padIndex}`;
        const cleanRouteId = String(routeId || "").trim();
        const tripCount = tripCounts.get(cleanRouteId) || 0;

        return {
            uniqueId,
            vehicleId: uniqueId,
            busNumber: (routeShortName || "").trim() || "N/A",
            routeShortName: (routeShortName || "").trim() || "N/A",
            routeName: (routeLongName || "").trim() || "Unknown Route",
            origin,
            destination,
            agencyId,
            routeType,
            routeId: cleanRouteId,
            tripCount
        };
    });
    return cachedRoutes;
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
    const distanceKm = calculateRouteDistanceByRouteId(route.routeId);
    if (distanceKm === null) {
        return { ok: false, statusCode: 404, error: `No shape data was found for bus ${busIdentifier || routeIdParam}.` };
    }

    const routeTrips = loadTrips().filter((trip) => String(trip.routeId) === String(route.routeId));
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

// ── Bus Swap Engine (Unique ID Physical Vehicle Model) ───────────────────────
// uniqueId (BUS-01..BUS-54) is the physical bus asset holding battery SoC, condition, and telemetry.
// GTFS Route (route_id + bus_short_name + Origin ➔ Destination + distance) is the FIXED public line.
// Greedily swaps physical vehicle assignments so higher-SoC operational vehicles are assigned
// to longer routes, honoring 5% SoC hysteresis and maintenance safety rules.
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
 * @param {string} [uniqueId] - BUS-01…BUS-54 key for the Python cache lookup
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
 * @param {string} uniqueId - BUS-01…BUS-54
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
 * Runs the physical vehicle (unique_id: BUS-01..BUS-54) bus-swap algorithm and updates state._assignments in-place.
 */
function swapBusAssignments(state) {
    const allRoutes = loadRoutes();
    const currentSlot = getTimeSlot();

    const routeInfos = allRoutes.map((r) => {
        const dist = calculateRouteDistanceByRouteId(r.routeId);
        return {
            uniqueId: r.uniqueId,
            routeId: String(r.routeId),
            busShortName: (r.busNumber || "N/A").trim(),
            routeName: (r.routeName || "").trim(),
            origin: r.origin || "",
            destination: r.destination || "",
            gtfsDistanceKm: dist,
            routeCategory: getRouteCategory(dist, r.routeCategory || (state[r.routeId] && state[r.routeId].routeCategory))
        };
    }).filter((r) => r.gtfsDistanceKm !== null && r.gtfsDistanceKm > 0);

    if (!routeInfos.length) return state;

    // Read telemetry for each physical vehicle (uniqueId: BUS-01..BUS-54)
    const vehicleTelemetry = {};
    for (const r of routeInfos) {
        const uId = r.uniqueId;
        const s = state[uId] || state[r.busShortName] || state[r.routeId] || {};
        const soc = Number.isFinite(Number(s.soc)) ? Number(s.soc) : 100;
        const range = estimatedRangeKm(soc, uId);
        vehicleTelemetry[uId] = {
            uniqueId: uId,
            defaultRouteId: r.routeId,
            defaultBusShortName: r.busShortName,
            soc,
            condition: s.condition || "Good",
            driver: s.driver || "Driver Assigned",
            estimatedRangeKm: range,
            busCategory: getBusCategory(range)
        };
    }

    // Initialize route assignments: routeId -> uniqueId (physical vehicle)
    const routeToVehicle = {};
    const vehicleToRoute = {};
    const existingAssignments = state._assignments || {};

    for (const r of routeInfos) {
        const uId = r.uniqueId;
        const prevVehicle = existingAssignments[r.routeId];
        if (prevVehicle && routeInfos.some((x) => x.uniqueId === prevVehicle)) {
            routeToVehicle[r.routeId] = prevVehicle;
        } else {
            routeToVehicle[r.routeId] = uId;
        }
    }

    // Ensure 1-to-1 bijection
    const usedVehicles = new Set();
    for (const r of routeInfos) {
        let v = routeToVehicle[r.routeId];
        if (!v || usedVehicles.has(v)) {
            v = routeInfos.map((x) => x.uniqueId).find((id) => !usedVehicles.has(id)) || r.uniqueId;
            routeToVehicle[r.routeId] = v;
        }
        usedVehicles.add(v);
        vehicleToRoute[v] = r.routeId;
    }

    // Page 4 Operational Difficulty Priority:
    // COMPLEX routes first, then MODERATE, then SIMPLE. Within same tier, longest distance first.
    const catRanks = { COMPLEX: 0, MODERATE: 1, SIMPLE: 2 };
    const sortedRoutes = [...routeInfos].sort((a, b) => {
        const rDiff = (catRanks[a.routeCategory] ?? 2) - (catRanks[b.routeCategory] ?? 2);
        if (rDiff !== 0) return rDiff;
        return b.gtfsDistanceKm - a.gtfsDistanceKm;
    });

    // Greedy swap passes with Page 4 Priority Allocation Matrix and 5% hysteresis
    let changed = true;
    let guard = 50;
    const currentSwapLog = [];

    while (changed && guard-- > 0) {
        changed = false;
        for (let i = 0; i < sortedRoutes.length - 1; i++) {
            const rHigh = sortedRoutes[i];      // Higher priority / difficulty route
            const rLow = sortedRoutes[i + 1];   // Lower priority route

            const vHigh = routeToVehicle[rHigh.routeId];
            const vLow = routeToVehicle[rLow.routeId];

            const tHigh = vehicleTelemetry[vHigh] || { soc: 100, condition: "Good", estimatedRangeKm: 128, busCategory: "A" };
            const tLow = vehicleTelemetry[vLow] || { soc: 100, condition: "Good", estimatedRangeKm: 128, busCategory: "A" };

            const allowedHigh = (ALLOWED_CATEGORIES[rHigh.routeCategory] || ALLOWED_CATEGORIES.SIMPLE)[currentSlot] || ["A"];
            const isHighCompliant = allowedHigh.includes(tHigh.busCategory);
            const isLowCompliantForHigh = allowedHigh.includes(tLow.busCategory);

            let shouldSwap = false;
            let reason = "";

            // 1. Safety & Maintenance: vehicle on higher priority route is broken while lower route vehicle is Good
            if (tHigh.condition === "Not Good" && tLow.condition === "Good") {
                shouldSwap = true;
                reason = `Safety & Maintenance Alert: Higher priority Route ${rHigh.routeId} (${rHigh.busShortName}, ${rHigh.routeCategory}) had vehicle '${vHigh}' in '${tHigh.condition}' condition. Reassigned operational vehicle '${vLow}' to Route ${rHigh.routeId} to prevent in-service breakdown.`;
            }
            // 2. Depot dispatch floor: vehicle on high priority route is below 25% floor
            else if (tHigh.soc < DEPOT_MIN_SOC_FLOOR && tLow.soc >= DEPOT_MIN_SOC_FLOOR) {
                shouldSwap = true;
                reason = `Depot Dispatch Floor Alert: Route ${rHigh.routeId} (${rHigh.busShortName}) had vehicle '${vHigh}' with SoC ${tHigh.soc}% below 25% floor. Reassigned vehicle '${vLow}' (${tLow.soc}% SoC).`;
            }
            // 3. Physical distance shortfall: vehicle on rHigh cannot cover the route km, but vLow can
            else if (tHigh.estimatedRangeKm < rHigh.gtfsDistanceKm && tLow.estimatedRangeKm >= rHigh.gtfsDistanceKm && tLow.condition === "Good") {
                shouldSwap = true;
                reason = `Range Shortfall Alert: Route ${rHigh.routeId} (${rHigh.gtfsDistanceKm.toFixed(1)} km) exceeded range of vehicle '${vHigh}' (${tHigh.estimatedRangeKm} km). Reassigned vehicle '${vLow}' (${tLow.estimatedRangeKm} km).`;
            }
            // 4. Page 4 Priority Allocation Matrix Violation & Upgrade:
            // High priority route vehicle violates matrix (e.g. Cat B/C on Complex route in Extreme Peak) while vLow is compliant (Cat A)
            else if (!isHighCompliant && isLowCompliantForHigh && tLow.condition === "Good" && tLow.soc >= DEPOT_MIN_SOC_FLOOR && tLow.estimatedRangeKm >= rHigh.gtfsDistanceKm) {
                shouldSwap = true;
                reason = `Page 4 Priority Allocation Matrix: Route ${rHigh.routeId} (${rHigh.routeCategory}, ${currentSlot}) requires Category ${allowedHigh.join('/')}, but vehicle '${vHigh}' is Category ${tHigh.busCategory} (${tHigh.estimatedRangeKm} km). Reassigned Category ${tLow.busCategory} vehicle '${vLow}' (${tLow.estimatedRangeKm} km).`;
            }
            // 5. Page 4 Simple Route Conservation during Normal hours:
            // If rLow is Simple during Normal, and vLow is Category A while rHigh is Complex/Moderate and has Category B/C,
            // promote vLow (Cat A) to rHigh and let rLow take vHigh (Cat B/C)
            else if (currentSlot === "NORMAL" && rLow.routeCategory === "SIMPLE" && tLow.busCategory === "A" && tHigh.busCategory !== "A" && isLowCompliantForHigh && tLow.condition === "Good" && tLow.soc >= DEPOT_MIN_SOC_FLOOR && tLow.estimatedRangeKm >= rHigh.gtfsDistanceKm) {
                shouldSwap = true;
                reason = `Page 4 Resource Balancing: Route ${rHigh.routeId} (${rHigh.routeCategory}) prioritized with Category A vehicle '${vLow}' (${tLow.soc}% SoC), while Simple Route ${rLow.routeId} (${rLow.busShortName}) allocated Category ${tHigh.busCategory} vehicle '${vHigh}'.`;
            }
            // 6. Range Optimization with 5% SoC Hysteresis (both Good, vLow can cover rHigh):
            else if (tLow.condition === "Good" && tHigh.condition === "Good" && (tLow.soc - tHigh.soc > SWAP_THRESHOLD_PCT) && (tLow.estimatedRangeKm >= rHigh.gtfsDistanceKm)) {
                if (!isHighCompliant || isLowCompliantForHigh) {
                    shouldSwap = true;
                    reason = `Range Optimization: Higher priority Route ${rHigh.routeId} (${rHigh.busShortName}, ${rHigh.routeCategory}, ${rHigh.gtfsDistanceKm.toFixed(1)} km) had vehicle '${vHigh}' with lower battery (${tHigh.soc}%). Reassigned vehicle '${vLow}' (${tLow.soc}% SoC, Category ${tLow.busCategory}) exceeding 5% hysteresis.`;
                }
            }

            if (shouldSwap) {
                currentSwapLog.push({
                    timestamp: new Date().toISOString(),
                    routeA: rHigh.routeId,
                    routeShortNameA: rHigh.busShortName,
                    routeLineA: `${rHigh.busShortName} (${rHigh.origin} ➔ ${rHigh.destination})`,
                    distA: rHigh.gtfsDistanceKm,
                    categoryA: rHigh.routeCategory,
                    vehicleA: vHigh,
                    socA: tHigh.soc,
                    busCategoryA: tHigh.busCategory,
                    routeB: rLow.routeId,
                    routeShortNameB: rLow.busShortName,
                    routeLineB: `${rLow.busShortName} (${rLow.origin} ➔ ${rLow.destination})`,
                    distB: rLow.gtfsDistanceKm,
                    categoryB: rLow.routeCategory,
                    vehicleB: vLow,
                    socB: tLow.soc,
                    busCategoryB: tLow.busCategory,
                    swappedVehicle: vLow,
                    timeSlot: currentSlot,
                    reason
                });

                // Swap route assignments between these two physical vehicles
                routeToVehicle[rHigh.routeId] = vLow;
                routeToVehicle[rLow.routeId] = vHigh;
                vehicleToRoute[vLow] = rHigh.routeId;
                vehicleToRoute[vHigh] = rLow.routeId;

                changed = true;
            }
        }
    }

    // Evaluate departure blockage and format details
    const blockedVehicles = [];
    const blockedRouteIds = [];
    const vehicleAssignmentsDetails = {};
    const busAssignmentsDetails = {};
    const ranges = {};

    for (const r of routeInfos) {
        const uId = r.uniqueId;
        const assignedRouteId = vehicleToRoute[uId] || r.routeId;
        const assignedRouteObj = routeInfos.find((x) => x.routeId === assignedRouteId) || r;
        const t = vehicleTelemetry[uId] || { soc: 100, condition: "Good", driver: "Driver Assigned", estimatedRangeKm: 128, busCategory: "A" };
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
            blocked: isBlocked
        };

        vehicleAssignmentsDetails[uId] = record;
        busAssignmentsDetails[uId] = record;
        busAssignmentsDetails[r.busShortName] = record;

        ranges[assignedRouteId] = {
            assignedVehicle: uId,
            routeCategory: assignedRouteObj.routeCategory,
            timeSlot: currentSlot,
            busCategory: busCat,
            allowedCategories: allowed,
            matrixCompliant,
            soc: t.soc,
            condition: t.condition,
            driver: t.driver || "Driver Assigned",
            estimatedRangeKm: range,
            gtfsDistanceKm: dist,
            blocked: isBlocked
        };
    }

    // Bidirectional assignments:
    // assignments[uniqueId] = routeId
    // assignments[routeId] = uniqueId
    // Also include busShortName keys for legacy backward compatibility
    const mergedAssignments = {};
    for (const [rId, vId] of Object.entries(routeToVehicle)) {
        mergedAssignments[rId] = vId;
        mergedAssignments[vId] = rId;
        const routeObj = routeInfos.find((x) => x.routeId === rId);
        if (routeObj) {
            mergedAssignments[routeObj.busShortName] = vId;
        }
    }

    // Synchronize state entries so uniqueId, busShortName, and routeId hold identical telemetry
    for (const [uId, details] of Object.entries(vehicleAssignmentsDetails)) {
        if (!state[uId]) {
            state[uId] = { uniqueId: uId, soc: details.soc, condition: details.condition, status: details.soc > 30 ? "Active" : "Blocked" };
        }
        state[uId].uniqueId = uId;
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
            state[bShort].blocked = details.blocked;
        }
    }

    state._assignments = mergedAssignments;
    state._vehicleAssignments = vehicleAssignmentsDetails;
    state._busAssignments = busAssignmentsDetails;
    state._blockedBuses = [...new Set(blockedVehicles)];
    state._blockedRouteIds = [...new Set(blockedRouteIds)];
    state.ranges = ranges;

    if (currentSwapLog.length > 0) {
        state._swapLog = currentSwapLog.concat(state._swapLog || []).slice(0, 50);
    }

    console.log(`[SwapEngine] Unique-ID Vehicle Assignments updated. Blocked vehicles: ${state._blockedBuses.join(", ") || "none"}`);
    return state;
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
        : (Number.isFinite(Number(existing?.soc)) ? Number(existing.soc) : 100);
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

    // 1. Match by uniqueId (BUS-01..BUS-54 / legacy EV-01..EV-54)
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

    const currentSoc = Number.isFinite(Number(stateEntry.soc)) ? Number(stateEntry.soc) : 100;
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
    const now = new Date();
    const logs = [];
    const idToUse = uniqueId || busNumber;

    for (let offset = 29; offset >= 0; offset--) {
        const date = new Date(now.getTime() - offset * 24 * 3600 * 1000);
        const stamp = date.toISOString().split("T")[0] + "T14:30:00.000Z";
        const slot = (offset % 3 === 0) ? "PEAK" : "NORMAL";
        const km = routeDistanceKm;
        const durationHours = Number((routeDistanceKm / 22 + (offset % 3) * 0.1).toFixed(2));

        let startSoc, endSoc;
        if (offset === 0) {
            endSoc = currentSoc;
            startSoc = Math.min(100, Number((currentSoc + Math.min(30, routeDistanceKm * 0.55)).toFixed(1)));
        } else {
            const seed = (Math.abs(offset * 7 + 13) % 5);
            startSoc = Math.min(100, Number((98 - seed * 1.5).toFixed(1)));
            const drain = Number((routeDistanceKm * 0.55 + seed * 1.2).toFixed(1));
            endSoc = Math.max(15, Number((startSoc - drain).toFixed(1)));
        }

        logs.push({
            timestamp: stamp,
            slot,
            soc_start: startSoc,
            soc_end: endSoc,
            km,
            duration_hours: durationHours,
            bus_id: idToUse
        });
    }
    return logs;
}

function getBusTasks(busIdentifier, routeIdParam) {
    const rawBus = String(busIdentifier || "").trim();
    const allRoutes = loadRoutes();
    const busState = loadBusState();
    const assignments = busState._assignments || {};

    let targetRoute = null;
    let uniqueId = "BUS-01";

    if (routeIdParam) {
        targetRoute = allRoutes.find(r => String(r.routeId) === String(routeIdParam));
    }

    if (!targetRoute && rawBus) {
        const info = resolveBusAndRoute(rawBus);
        uniqueId = info.uniqueId || rawBus;
        targetRoute = info.assignedRouteObj || info.matchingRoute;
    }

    if (!targetRoute && allRoutes.length > 0) {
        targetRoute = allRoutes[0];
    }

    if (!targetRoute) {
        return { ok: false, error: "Route not found" };
    }

    const assignedVehicle = (assignments && (assignments[String(targetRoute.routeId)] || assignments[targetRoute.uniqueId] || assignments[targetRoute.busNumber])) || targetRoute.uniqueId || uniqueId;
    const finalUniqueId = assignedVehicle || uniqueId;

    const stateEntry = busState[finalUniqueId] || busState[targetRoute.routeId] || busState[targetRoute.busNumber] || {};
    const currentSoc = Number.isFinite(Number(stateEntry.soc)) ? Number(stateEntry.soc) : 100;
    const condition = stateEntry.condition || "Good";

    const distKm = calculateRouteDistanceByRouteId(targetRoute.routeId) || 28.7;
    const estRangeKm = Math.round(Math.max(0, currentSoc - SOC_BUFFER_PCT) * RANGE_KM_PER_SOC_PCT);
    const estChargePctPerTrip = Number((distKm / RANGE_KM_PER_SOC_PCT).toFixed(1));
    const estChargeKwhPerTrip = Number((distKm * 0.85).toFixed(1));

    const allTrips = loadTrips();
    const routeTrips = allTrips.filter(t => String(t.routeId) === String(targetRoute.routeId));
    const totalTrips = routeTrips.length || targetRoute.tripCount || 1;

    const usableBatteryAboveDepotFloor = Math.max(0, currentSoc - DEPOT_MIN_SOC_FLOOR);
    const maxFeasibleTrips = estChargePctPerTrip > 0
        ? Math.floor(usableBatteryAboveDepotFloor / estChargePctPerTrip)
        : 0;

    const tasks = [];
    let runningSoc = currentSoc;
    const baseHour = 7;
    const baseMin = 30;

    const sampleTrips = routeTrips.slice(0, 6);
    if (sampleTrips.length === 0) {
        sampleTrips.push(
            { tripId: "1", tripHeadsign: targetRoute.destination, directionId: "0" },
            { tripId: "2", tripHeadsign: targetRoute.origin, directionId: "1" }
        );
    }

    sampleTrips.forEach((trip, idx) => {
        const tripNum = idx + 1;
        const startOffsetMinutes = idx * 60;
        const totalStartMins = (baseHour * 60 + baseMin + startOffsetMinutes) % 1440;
        const tripDurationMins = Math.max(25, Math.round((distKm / 28) * 60));
        const totalEndMins = (totalStartMins + tripDurationMins) % 1440;

        const depTime = `${String(Math.floor(totalStartMins / 60)).padStart(2, "0")}:${String(totalStartMins % 60).padStart(2, "0")}`;
        const arrTime = `${String(Math.floor(totalEndMins / 60)).padStart(2, "0")}:${String(totalEndMins % 60).padStart(2, "0")}`;

        const isOutbound = String(trip.directionId) === "0";
        const fromStop = isOutbound ? targetRoute.origin : targetRoute.destination;
        const toStop = isOutbound ? targetRoute.destination : targetRoute.origin;
        const headsign = trip.tripHeadsign || toStop;

        const socStart = Number(runningSoc.toFixed(1));
        const socEnd = Number(Math.max(0, runningSoc - estChargePctPerTrip).toFixed(1));
        runningSoc = socEnd;

        const isFeasible = socEnd >= DEPOT_MIN_SOC_FLOOR && condition === "Good";
        let statusText = isFeasible ? "✅ Feasible (Ready)" : (socEnd < DEPOT_MIN_SOC_FLOOR ? "⚡ Low SoC (<25% floor)" : "🔧 Maintenance Required");

        tasks.push({
            taskNumber: tripNum,
            taskType: "Passenger Service Trip",
            tripId: trip.tripId,
            headsign,
            direction: isOutbound ? "Outbound" : "Inbound",
            fromStop,
            toStop,
            departureTime: depTime,
            arrivalTime: arrTime,
            distanceKm: distKm,
            estimatedChargePct: estChargePctPerTrip,
            estimatedChargeKwh: estChargeKwhPerTrip,
            projectedSocStart: socStart,
            projectedSocEnd: socEnd,
            isFeasible,
            status: statusText
        });

        if (socEnd <= DEPOT_MIN_SOC_FLOOR && idx < sampleTrips.length - 1) {
            const chargeStartMins = (totalEndMins + 15) % 1440;
            const chargeEndMins = (chargeStartMins + 45) % 1440;
            const chargeDep = `${String(Math.floor(chargeStartMins / 60)).padStart(2, "0")}:${String(chargeStartMins % 60).padStart(2, "0")}`;
            const chargeArr = `${String(Math.floor(chargeEndMins / 60)).padStart(2, "0")}:${String(chargeEndMins % 60).padStart(2, "0")}`;
            const recoveredSoc = 95.0;

            tasks.push({
                taskNumber: `Charge-${tripNum}`,
                taskType: "Depot Fast Charging",
                tripId: `CHG-${finalUniqueId}`,
                headsign: "Depot Fast DC Charger Bay",
                direction: "Depot Service",
                fromStop: toStop,
                toStop: "Depot Charging Station",
                departureTime: chargeDep,
                arrivalTime: chargeArr,
                distanceKm: 0,
                estimatedChargePct: -Number((recoveredSoc - socEnd).toFixed(1)),
                estimatedChargeKwh: Number(((recoveredSoc - socEnd) * 1.2).toFixed(1)),
                projectedSocStart: socEnd,
                projectedSocEnd: recoveredSoc,
                isFeasible: true,
                status: "🔌 Fast DC Recharge to 95%"
            });
            runningSoc = recoveredSoc;
        }
    });

    return {
        ok: true,
        uniqueId: finalUniqueId,
        assignedVehicle: finalUniqueId,
        busNumber: targetRoute.busNumber,
        routeId: targetRoute.routeId,
        routeName: targetRoute.routeName,
        origin: targetRoute.origin,
        destination: targetRoute.destination,
        currentSoc,
        condition,
        distanceKm: distKm,
        estimatedChargePctPerTrip,
        estimatedChargeKwhPerTrip,
        estimatedRangeKm: estRangeKm,
        totalAssignedTrips: totalTrips,
        maxFeasibleTrips,
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

    if (pathname === "/api/bus-tasks" || pathname === "/api/route-tasks") {
        try {
            const bus = (requestUrl.searchParams.get("bus") || "").trim();
            const routeId = (requestUrl.searchParams.get("routeId") || requestUrl.searchParams.get("route_id") || "").trim();
            const data = getBusTasks(bus, routeId);
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
            const data = getBusTasks(busIdParam);
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
                        const rawId = String(payload.unique_id || payload.uniqueId || payload.bus || payload.bus_id || payload.bus_name || payload.routeId || "").trim();

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
                            : (upperRaw.startsWith("BUS-") || upperRaw.startsWith("BM")
                                ? upperRaw
                                : (upperRaw.startsWith("EV-") ? upperRaw.replace(/^EV-/, "BUS-") : "BUS-01"));
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

                    const rawId = String(payload.unique_id || payload.uniqueId || payload.bus || payload.bus_id || payload.bus_name || payload.routeId || "").trim();
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
                        : (upperRaw.startsWith("BUS-") || upperRaw.startsWith("BM")
                            ? upperRaw
                            : (upperRaw.startsWith("EV-") ? upperRaw.replace(/^EV-/, "BUS-") : "BUS-01"));
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
            if (!currentState._assignments || !currentState._vehicleAssignments) {
                swapBusAssignments(currentState);
                saveBusState(currentState);
            }
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

    // ── GET /api/matrix ──────────────────────────────────────────────────────
    if (pathname === "/api/matrix") {
        sendJson(res, {
            ok: true,
            page: 4,
            title: "Priority Allocation Matrix",
            currentSlot: getTimeSlot(),
            busRangeCategories: {
                A: { name: "High", rangeKm: ">120 km" },
                B: { name: "Medium", rangeKm: "100-120 km" },
                C: { name: "Low", rangeKm: "<100 km" }
            },
            routeCategories: {
                SIMPLE: { meaning: "Easy to operate", distanceKm: "< 10 km" },
                MODERATE: { meaning: "Normal effort", distanceKm: "10 - 20 km" },
                COMPLEX: { meaning: "Requires additional planning", distanceKm: ">= 20 km" }
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
                const soc = Number.isFinite(Number(state.soc)) ? Number(state.soc) : 100;
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

    if (pathname === "/problem.html" || pathname === "/smart-bus-scheduling" || pathname === "/smart-bus-scheduling.html") {
        sendFile(res, path.join(BASE_DIR, "problem.html"), "text/html");
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

restoreBusStateFromGitHub().then(() => {
    // Pre-warm GTFS shapes index and distance cache so requests respond in < 1ms
    try {
        const routes = loadRoutes();
        for (const r of routes) {
            calculateRouteDistanceByRouteId(r.routeId);
        }
        loadGtfsScheduleSummary();
        console.log(`[Cache] Pre-warmed GTFS cache for ${cachedRouteDistances.size} routes and schedule timetable.`);
    } catch (e) {
        console.warn("[Cache] Pre-warm failed:", e.message);
    }

    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});

