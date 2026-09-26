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

function loadRoutes() {
    if (cachedRoutes) return cachedRoutes;
    const raw = fs.readFileSync(ROUTES_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    cachedRoutes = lines.slice(1).map((line) => {
        const [routeLongName, routeShortName, agencyId, routeType, routeId] = parseCsvLine(line);
        const [origin = "", destination = ""] = (routeLongName || "").split("⇔").map((part) => part.trim());

        return {
            busNumber: (routeShortName || "").trim() || "N/A",
            routeName: (routeLongName || "").trim() || "Unknown Route",
            origin,
            destination,
            agencyId,
            routeType,
            routeId
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
            scheduleMap[rId] = { firstDep: dep, lastArr: arr, count: 0 };
        }
        const item = scheduleMap[rId];
        item.count += 1;
        if (dep && (!item.firstDep || dep < item.firstDep)) item.firstDep = dep;
        if (arr && (!item.lastArr || arr > item.lastArr)) item.lastArr = arr;
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

function calculateRouteDistance(busNumber) {
    const route = loadRoutes().find((candidate) => candidate.busNumber === busNumber);
    if (!route) {
        return { ok: false, statusCode: 404, error: `Bus ${busNumber} was not found in routes.txt.` };
    }

    const distanceKm = calculateRouteDistanceByRouteId(route.routeId);
    if (distanceKm === null) {
        return { ok: false, statusCode: 404, error: `No shape data was found for bus ${busNumber}.` };
    }

    const routeTrips = loadTrips().filter((trip) => String(trip.routeId) === String(route.routeId));
    const selectedTrip = routeTrips.find((trip) => Number(trip.directionId) === 0) || routeTrips[0];

    return {
        ok: true,
        busNumber,
        routeId: route.routeId,
        tripId: selectedTrip ? selectedTrip.tripId : "",
        shapeId: selectedTrip ? selectedTrip.shapeId : "",
        distanceKm
    };
}

// ── Bus Swap Engine (Vehicle-Centric Model) ──────────────────────────────────
// Bus Short Name is the fixed physical vehicle entity.
// Route ID is the swappable GTFS schedule entity.
// After every telemetry update, physical buses are ranked by SoC, and the
// highest-SoC bus is assigned to the longest GTFS-distance route.
// A swap only fires when the SoC difference between two candidate buses
// exceeds SWAP_THRESHOLD_PCT (5% hysteresis) or due to a maintenance condition.
// Buses whose estimated range < assigned route distance are blocked from departure.
// The bidirectional mapping is persisted in bus_state.json under "_assignments".
// ─────────────────────────────────────────────────────────────────────────────

const SWAP_THRESHOLD_PCT = 5;       // minimum SoC gap (%) needed to trigger a swap
const RANGE_KM_PER_SOC_PCT = 1.42;  // km per 1% SoC (matches problem.html formula)
const SOC_BUFFER_PCT = 10;          // reserve: usable SoC = soc - buffer

function estimatedRangeKm(soc) {
    const usable = Math.max(0, soc - SOC_BUFFER_PCT);
    return Math.round(usable * RANGE_KM_PER_SOC_PCT);
}

/**
 * Runs the vehicle-centric bus-swap algorithm and updates state._assignments in-place.
 * 1. Build list of all physical buses and GTFS routes with distances.
 * 2. Read telemetry (SoC and condition) for each physical vehicle.
 * 3. Sort GTFS routes descending by distance (longest first).
 * 4. Greedily swap route assignments when a bus on a shorter route has > 5% SoC advantage.
 * 5. Mark vehicles and routes blocked when estimated range < GTFS route distance.
 * 6. Persist bidirectional mapping: _assignments[busName] = routeId AND _assignments[routeId] = busName.
 */
function swapBusAssignments(state) {
    const allRoutes = loadRoutes();

    const routeInfos = allRoutes.map((r) => ({
        routeId: String(r.routeId),
        busShortName: (r.busNumber || "N/A").trim(),
        gtfsDistanceKm: calculateRouteDistanceByRouteId(r.routeId)
    })).filter((r) => r.gtfsDistanceKm !== null && r.gtfsDistanceKm > 0);

    if (!routeInfos.length) return state;

    // Read telemetry for each physical vehicle (keyed by busShortName, fallback routeId)
    const busTelemetry = {};
    for (const r of routeInfos) {
        const busName = r.busShortName;
        const s = state[busName] || state[r.routeId] || {};
        busTelemetry[busName] = {
            soc: Number.isFinite(Number(s.soc)) ? Number(s.soc) : 100,
            condition: s.condition || "Good",
            defaultRouteId: r.routeId
        };
    }

    // Initialize route assignments: routeId -> busShortName
    const routeToBus = {};
    const busToRoute = {};
    const existingAssignments = state._assignments || {};

    for (const r of routeInfos) {
        const busName = r.busShortName;
        // Check if routeId was previously assigned a valid bus
        const prevBus = existingAssignments[r.routeId];
        if (prevBus && routeInfos.some((x) => x.busShortName === prevBus)) {
            routeToBus[r.routeId] = prevBus;
        } else {
            routeToBus[r.routeId] = busName;
        }
    }

    // Ensure 1-to-1 bijection
    const usedBuses = new Set();
    for (const r of routeInfos) {
        let b = routeToBus[r.routeId];
        if (!b || usedBuses.has(b)) {
            // Find an unused bus
            b = routeInfos.map((x) => x.busShortName).find((name) => !usedBuses.has(name)) || r.busShortName;
            routeToBus[r.routeId] = b;
        }
        usedBuses.add(b);
        busToRoute[b] = r.routeId;
    }

    // Sort routes descending by GTFS distance (longest route first)
    const sortedRoutes = [...routeInfos].sort((a, b) => b.gtfsDistanceKm - a.gtfsDistanceKm);

    // Greedy swap passes with 5% hysteresis
    let changed = true;
    let guard = 50;
    const currentSwapLog = [];

    while (changed && guard-- > 0) {
        changed = false;
        for (let i = 0; i < sortedRoutes.length - 1; i++) {
            const rLong = sortedRoutes[i];      // Longer route (e.g. 40.5 km)
            const rShort = sortedRoutes[i + 1];  // Shorter route (e.g. 15.0 km)

            const busOnLong = routeToBus[rLong.routeId];
            const busOnShort = routeToBus[rShort.routeId];

            const tLong = busTelemetry[busOnLong] || { soc: 100, condition: "Good" };
            const tShort = busTelemetry[busOnShort] || { soc: 100, condition: "Good" };

            // The longer route needs the higher SoC / operational vehicle!
            // Swap if bus on long route is broken (Not Good) while bus on short route is Good,
            // OR if both are Good and bus on short route has > 5% SoC advantage over bus on long route.
            const shouldSwap = (tShort.condition === "Good" && tLong.condition === "Not Good") ||
                               (tShort.condition === "Good" && tLong.condition === "Good" && (tShort.soc - tLong.soc > SWAP_THRESHOLD_PCT));

            if (shouldSwap) {
                let reason = "";
                if (tLong.condition === "Not Good" && tShort.condition === "Good") {
                    reason = `Safety & Maintenance Alert: Longer Route ${rLong.routeId} (${rLong.gtfsDistanceKm.toFixed(1)} km) had vehicle '${busOnLong}' in 'Not Good' condition. Reassigned operational vehicle '${busOnShort}' to Route ${rLong.routeId} to prevent in-service breakdown.`;
                } else if (tShort.soc - tLong.soc > SWAP_THRESHOLD_PCT) {
                    reason = `Range Optimization: Longer Route ${rLong.routeId} (${rLong.gtfsDistanceKm.toFixed(1)} km) had vehicle '${busOnLong}' with lower battery (${tLong.soc}%). Reassigned vehicle '${busOnShort}' (${tShort.soc}% SoC) to longer route to prevent mid-route battery depletion.`;
                } else {
                    reason = `Fleet battery balancing: Reassigned vehicle '${busOnShort}' onto Route ${rLong.routeId}.`;
                }

                currentSwapLog.push({
                    timestamp: new Date().toISOString(),
                    routeA: rLong.routeId,
                    busA: busOnLong,
                    distA: rLong.gtfsDistanceKm,
                    routeB: rShort.routeId,
                    busB: busOnShort,
                    distB: rShort.gtfsDistanceKm,
                    reason
                });

                // Swap route assignments between these two physical vehicles
                routeToBus[rLong.routeId] = busOnShort;
                routeToBus[rShort.routeId] = busOnLong;
                busToRoute[busOnShort] = rLong.routeId;
                busToRoute[busOnLong] = rShort.routeId;

                changed = true;
            }
        }
    }

    // Evaluate departure blockage and format details
    const blockedBuses = [];
    const blockedRouteIds = [];
    const busAssignmentsDetails = {};
    const ranges = {};

    for (const r of routeInfos) {
        const busName = r.busShortName;
        const assignedRouteId = busToRoute[busName] || r.routeId;
        const assignedRouteObj = routeInfos.find((x) => x.routeId === assignedRouteId) || r;
        const t = busTelemetry[busName] || { soc: 100, condition: "Good" };
        const range = estimatedRangeKm(t.soc);
        const dist = assignedRouteObj.gtfsDistanceKm;
        const isBlocked = (dist > 0 && range < dist) || (t.condition === "Not Good") || (t.soc < 25);

        if (isBlocked) {
            blockedBuses.push(busName);
            blockedRouteIds.push(assignedRouteId);
        }

        const routeDisplay = `Route ${assignedRouteId} (${dist.toFixed(1)} km)`;

        busAssignmentsDetails[busName] = {
            busName,
            assignedRouteId,
            assignedRouteDistanceKm: dist,
            assignedRouteDisplay: routeDisplay,
            soc: t.soc,
            condition: t.condition,
            estimatedRangeKm: range,
            blocked: isBlocked
        };

        ranges[assignedRouteId] = {
            soc: t.soc,
            condition: t.condition,
            estimatedRangeKm: range,
            gtfsDistanceKm: dist,
            blocked: isBlocked
        };
    }

    // Bidirectional assignments:
    // assignments[busName] = routeId  (vehicle-centric)
    // assignments[routeId] = busName  (route-centric backwards compatibility)
    const mergedAssignments = {};
    for (const [rId, bName] of Object.entries(routeToBus)) {
        mergedAssignments[rId] = bName;
        mergedAssignments[bName] = rId;
    }

    // Synchronize state entries so both busName and routeId hold identical telemetry
    for (const [bName, details] of Object.entries(busAssignmentsDetails)) {
        if (!state[bName]) {
            state[bName] = { soc: details.soc, condition: details.condition, status: details.soc > 30 ? "Active" : "Blocked" };
        }
        state[bName].soc = details.soc;
        state[bName].condition = details.condition;
        state[bName].status = details.soc > 30 ? "Active" : details.soc > 15 ? "Warning" : "Blocked";
        state[bName].assignedRouteId = details.assignedRouteId;
        state[bName].assignedRouteDisplay = details.assignedRouteDisplay;
        state[bName].blocked = details.blocked;

        const rId = details.assignedRouteId;
        if (!state[rId]) {
            state[rId] = { soc: details.soc, condition: details.condition, status: state[bName].status };
        }
        state[rId].soc = details.soc;
        state[rId].condition = details.condition;
        state[rId].status = state[bName].status;
        state[rId].busNumber = bName;
        state[rId].blocked = details.blocked;
    }

    state._assignments = mergedAssignments;
    state._busAssignments = busAssignmentsDetails;
    state._blockedBuses = [...new Set(blockedBuses)];
    state._blockedRouteIds = [...new Set(blockedRouteIds)];
    state.ranges = ranges;

    if (currentSwapLog.length > 0) {
        state._swapLog = currentSwapLog.concat(state._swapLog || []).slice(0, 50);
    }

    console.log(`[SwapEngine] Vehicle-Centric Assignments updated. Blocked: ${state._blockedBuses.join(", ") || "none"}`);
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

    const cleanLower = cleanId.toLowerCase();
    const cleanCompact = cleanId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // 1. Find matching route by routeId, busNumber, or assigned bus name
    const matchingRoute = allRoutes.find((r) => {
        const rId = String(r.routeId);
        const rBus = String(r.busNumber || "").trim().toLowerCase();
        const rBusCompact = rBus.replace(/[^a-zA-Z0-9]/g, "");
        const assigned = String(assignments[rId] || "").trim().toLowerCase();
        const assignedCompact = assigned.replace(/[^a-zA-Z0-9]/g, "");

        return (
            rId === cleanId ||
            rBus === cleanLower ||
            rBusCompact === cleanCompact ||
            assigned === cleanLower ||
            assignedCompact === cleanCompact
        );
    });

    const canonicalRouteId = matchingRoute ? String(matchingRoute.routeId) : cleanId;
    const busNumber = matchingRoute ? matchingRoute.busNumber : cleanId;
    const assignedName = (assignments && assignments[canonicalRouteId]) || busNumber;

    // Look for state entry by routeId, busNumber, assignedName, or rawBusId
    const stateEntry = busState[canonicalRouteId] 
        || busState[busNumber] 
        || busState[assignedName] 
        || busState[cleanId] 
        || Object.entries(busState).find(([k]) => k.toLowerCase() === cleanLower || k.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanCompact)?.[1]
        || {};

    const currentSoc = Number.isFinite(Number(stateEntry.soc)) ? Number(stateEntry.soc) : 100;
    const routeDistanceKm = (matchingRoute && calculateRouteDistanceByRouteId(matchingRoute.routeId)) || 28.7;

    return {
        canonicalRouteId,
        busNumber,
        assignedName,
        matchingRoute,
        stateEntry,
        currentSoc,
        routeDistanceKm
    };
}

function getBusMicroData(rawBusId) {
    const { currentSoc, routeDistanceKm, stateEntry } = resolveBusAndRoute(rawBusId);
    const history = Array.isArray(stateEntry.history) ? [...stateEntry.history] : [];
    const now = Date.now();
    const targetPoints = 30;

    // Ensure the latest point matches the live currentSoc
    if (history.length > 0) {
        const last = history[history.length - 1];
        if (Number(last.soc) !== Number(currentSoc)) {
            history.push({
                timestamp: new Date().toISOString(),
                soc: currentSoc,
                odometer_km: routeDistanceKm
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
                odometer_km: odo
            });
        }
        const combined = [...synthetic, ...history.map((h, idx) => ({
            timestamp: h.timestamp,
            soc: Number(h.soc),
            odometer_km: Number((routeDistanceKm * Math.max(0.1, 1 - (history.length - 1 - idx) * 0.02)).toFixed(1))
        }))];
        combined[combined.length - 1].soc = currentSoc;
        return combined;
    }

    const trimmed = history.slice(-50).map((h, idx, arr) => ({
        timestamp: h.timestamp,
        soc: Number(h.soc),
        odometer_km: Number((routeDistanceKm * Math.max(0.1, 1 - (arr.length - 1 - idx) * 0.02)).toFixed(1))
    }));
    trimmed[trimmed.length - 1].soc = currentSoc;
    return trimmed;
}

function getBusMacroData(rawBusId) {
    const { currentSoc, routeDistanceKm } = resolveBusAndRoute(rawBusId);
    const now = new Date();
    const logs = [];

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
            duration_hours: durationHours
        });
    }
    return logs;
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

    if (pathname === "/api/route-distance") {
        const busNumber = (requestUrl.searchParams.get("bus") || "").trim();
        if (!busNumber) {
            sendJson(res, { ok: false, error: "bus is required" }, 400);
            return;
        }

        try {
            const result = calculateRouteDistance(busNumber);
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
                        const rawId = String(payload.bus || payload.bus_id || payload.bus_name || payload.routeId || "").trim();

                        if (!rawId) {
                            sendJson(res, { ok: false, error: "bus (or routeId) is required" }, 400);
                            return;
                        }

                        const allRoutes = loadRoutes();
                        const matchingRoute = allRoutes.find(
                            (r) => String(r.busNumber).trim().toLowerCase() === rawId.toLowerCase()
                                || String(r.routeId) === rawId
                        );

                        const busName = matchingRoute ? matchingRoute.busNumber : rawId;
                        const routeId = matchingRoute ? String(matchingRoute.routeId) : "";

                        const currentState = loadBusState();
                        const existing = currentState[busName] || (routeId ? currentState[routeId] : {}) || {};
                        const updatedEntry = normalizeBusStateEntry(payload, existing);
                        currentState[busName] = updatedEntry;
                        if (routeId) {
                            currentState[routeId] = Object.assign({}, updatedEntry, { busNumber: busName });
                        }

                        swapBusAssignments(currentState);
                        saveBusState(currentState);

                        // Forward to Python backend for micro/macro tracking
                        fetch(`${PYTHON_API_BASE}/telemetry`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                bus_id: busName,
                                soc: updatedEntry.soc,
                                condition: updatedEntry.condition,
                                status: updatedEntry.status
                            })
                        }).catch(() => {});

                        const assignedRouteId = (currentState._assignments || {})[busName] || routeId;
                        const assignedRouteObj = allRoutes.find(r => String(r.routeId) === String(assignedRouteId));
                        const assignedDist = assignedRouteObj ? (calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0) : 0;
                        const assignedDisplay = `Route ${assignedRouteId} (${assignedDist.toFixed(1)} km)`;
                        const isBlocked = (currentState._blockedBuses || []).includes(busName)
                                       || (currentState._blockedRouteIds || []).includes(assignedRouteId);

                        sendJson(res, {
                            ok: true,
                            bus: busName,
                            routeId: assignedRouteId,
                            assignedRoute: assignedDisplay,
                            assignedRouteDisplay: assignedDisplay,
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

                    // ── Vehicle-Centric: key telemetry by physical busName ──
                    const rawId = String(payload.bus || payload.bus_id || payload.bus_name || payload.routeId || "").trim();
                    if (!rawId) {
                        sendJson(res, { ok: false, error: "bus (or routeId) is required" }, 400);
                        return;
                    }

                    const allRoutes = loadRoutes();
                    const matchingRoute = allRoutes.find(
                        (r) => String(r.busNumber).trim().toLowerCase() === rawId.toLowerCase()
                            || String(r.routeId) === rawId
                    );

                    const busName = matchingRoute ? matchingRoute.busNumber : rawId;
                    const routeId = matchingRoute ? String(matchingRoute.routeId) : "";

                    const currentState = loadBusState();
                    const existing = currentState[busName] || (routeId ? currentState[routeId] : {}) || {};
                    const updatedEntry = normalizeBusStateEntry(payload, existing);

                    // Store by physical busName
                    currentState[busName] = updatedEntry;
                    if (routeId) {
                        currentState[routeId] = Object.assign({}, updatedEntry, { busNumber: busName });
                    }

                    // Run the vehicle-centric swap engine
                    swapBusAssignments(currentState);

                    saveBusState(currentState);

                    // Forward to Python backend (for micro/macro charts)
                    const pythonIds = new Set([busName]);
                    if (routeId) pythonIds.add(routeId);
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

                    const assignedRouteId = (currentState._assignments || {})[busName] || routeId;
                    const assignedRouteObj = allRoutes.find(r => String(r.routeId) === String(assignedRouteId));
                    const assignedDist = assignedRouteObj ? (calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0) : 0;
                    const assignedDisplay = `Route ${assignedRouteId} (${assignedDist.toFixed(1)} km)`;
                    const isBlocked = (currentState._blockedBuses || []).includes(busName)
                                   || (currentState._blockedRouteIds || []).includes(assignedRouteId);

                    console.log(`[Telemetry] Bus=${busName} updated: SoC=${updatedEntry.soc}%, Condition=${updatedEntry.condition}, AssignedRoute=${assignedDisplay}, Blocked=${isBlocked}`);
                    sendJson(res, {
                        ok: true,
                        message: `Telemetry updated successfully for Bus ${busName}`,
                        bus: busName,
                        bus_id: busName,
                        assignedBus: busName,
                        assignedBusShortName: busName,
                        routeId: assignedRouteId,
                        assignedRouteId: assignedRouteId,
                        assignedRouteDistanceKm: assignedDist,
                        assignedRoute: assignedDisplay,
                        assignedRouteDisplay: assignedDisplay,
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
            if (!currentState._assignments || !currentState._busAssignments) {
                swapBusAssignments(currentState);
                saveBusState(currentState);
            }
            sendJson(res, {
                ok: true,
                assignments: currentState._assignments || {},
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

    if (pathname === "/api/fleet") {
        try {
            const allRoutes = loadRoutes();
            const busState = loadBusState();
            const assignments = busState._assignments || {};
            const busAssignments = busState._busAssignments || {};

            const fleet = allRoutes.map((r) => {
                const busName = (r.busNumber || "").trim();
                const assignedRouteId = assignments[busName] || String(r.routeId);
                const assignedRouteObj = allRoutes.find((x) => String(x.routeId) === String(assignedRouteId)) || r;
                const dist = calculateRouteDistanceByRouteId(assignedRouteObj.routeId) || 0;
                const assignedDisplay = `Route ${assignedRouteId} (${dist.toFixed(1)} km)`;

                const state = busState[busName] || busState[r.routeId] || {};
                const soc = Number.isFinite(Number(state.soc)) ? Number(state.soc) : 100;
                const condition = state.condition || "Good";
                const status = state.status || (soc > 30 ? "Active" : soc > 15 ? "Warning" : "Blocked");
                const isBlocked = (busState._blockedBuses || []).includes(busName) || (dist > 0 && Math.round(Math.max(0, soc - 10) * 1.42) < dist);

                return {
                    bus_id: busName,
                    busName: busName,
                    route: assignedDisplay,
                    assignedRoute: assignedDisplay,
                    assignedRouteId: assignedRouteId,
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

