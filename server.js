const http = require("http");
const fs = require("fs");
const path = require("path");

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

function loadRoutes() {
    const raw = fs.readFileSync(ROUTES_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => {
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
}

function loadStops() {
    const raw = fs.readFileSync(STOPS_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => {
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
}

function loadTrips() {
    const raw = fs.readFileSync(TRIPS_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => {
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
}

function loadStopTimes() {
    const raw = fs.readFileSync(STOP_TIMES_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => {
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
}

function loadShapes() {
    const raw = fs.readFileSync(SHAPES_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    if (lines.length <= 1) {
        return [];
    }

    return lines.slice(1).map((line) => {
        const [shapeId, shapePtLat, shapePtLon, shapePtSequence] = parseCsvLine(line);

        return {
            shapeId: (shapeId || "").trim(),
            shapePtLat: Number.parseFloat(shapePtLat),
            shapePtLon: Number.parseFloat(shapePtLon),
            shapePtSequence: Number.parseInt(shapePtSequence, 10)
        };
    });
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

function calculateRouteDistance(busNumber) {
    const route = loadRoutes().find((candidate) => candidate.busNumber === busNumber);
    if (!route) {
        return { ok: false, statusCode: 404, error: `Bus ${busNumber} was not found in routes.txt.` };
    }

    const routeTrips = loadTrips().filter((trip) => String(trip.routeId) === String(route.routeId));
    const selectedTrip = routeTrips.find((trip) => Number(trip.directionId) === 0) || routeTrips[0];
    if (!selectedTrip) {
        return { ok: false, statusCode: 404, error: `No trip was found for bus ${busNumber}.` };
    }

    const shapePoints = loadShapes()
        .filter((point) => String(point.shapeId) === String(selectedTrip.shapeId))
        .sort((left, right) => Number(left.shapePtSequence) - Number(right.shapePtSequence));
    if (shapePoints.length < 2) {
        return { ok: false, statusCode: 404, error: `No shape data was found for bus ${busNumber}.` };
    }

    let totalDistanceKm = 0;
    for (let index = 1; index < shapePoints.length; index += 1) {
        const previous = shapePoints[index - 1];
        const current = shapePoints[index];
        if (![previous.shapePtLat, previous.shapePtLon, current.shapePtLat, current.shapePtLon].every(Number.isFinite)) continue;
        totalDistanceKm += haversineKm(previous.shapePtLat, previous.shapePtLon, current.shapePtLat, current.shapePtLon);
    }

    return {
        ok: true,
        busNumber,
        routeId: route.routeId,
        tripId: selectedTrip.tripId,
        shapeId: selectedTrip.shapeId,
        distanceKm: Number(totalDistanceKm.toFixed(2))
    };
}

function sendJson(res, payload, statusCode = 200) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AIO-Key"
    });
    res.end(JSON.stringify(payload));
}

function sendFile(res, filePath, contentType) {
    fs.readFile(filePath, (error, data) => {
        if (error) {
            sendJson(res, { error: "File not found" }, 404);
            return;
        }

        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
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

function loadBusState() {
    const state = readJsonFile(BUS_STATE_FILE, {});
    return state && typeof state === "object" ? state : {};
}

function saveBusState(state) {
    writeJsonFile(BUS_STATE_FILE, state && typeof state === "object" ? state : {});
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
        : (Number.isFinite(Number(existing?.soc)) ? Number(existing.soc) : null);
    const condition = entry?.condition ? String(entry.condition) : (existing?.condition || "Good");
    const timings = entry?.statusTimings && typeof entry.statusTimings === "object"
        ? entry.statusTimings
        : (existing?.statusTimings || {});

    return {
        status,
        rawStatus,
        soc,
        condition: condition === "Not Good" ? "Not Good" : "Good",
        updatedAt: new Date().toISOString(),
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
        }
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

    if (pathname.match(/^\/api\/bus\/[^/]+\/macro$/)) {
        await proxyPythonJson(req, res, pathname);
        return;
    }

    if (pathname.match(/^\/api\/bus\/[^/]+\/micro$/)) {
        await proxyPythonJson(req, res, pathname);
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

    if (pathname === "/api/gtfs") {
        try {
            const routes = loadRoutes();
            const stops = loadStops();
            const trips = loadTrips();
            const stopTimes = loadStopTimes();
            const shapes = loadShapes();

            sendJson(res, {
                routes: { count: routes.length, routes },
                stops: { count: stops.length, stops },
                trips: { count: trips.length, trips },
                stopTimes: { count: stopTimes.length, stopTimes },
                shapes: { count: shapes.length, shapes }
            });
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
                        const routeId = String(payload.routeId || payload.bus_id || "").trim();

                        if (!routeId) {
                            sendJson(res, { ok: false, error: "routeId is required" }, 400);
                            return;
                        }

                        const currentState = loadBusState();
                        const existing = currentState[routeId] || {};
                        currentState[routeId] = normalizeBusStateEntry(payload, existing);
                        saveBusState(currentState);

                        sendJson(res, { ok: true, routeId, state: currentState[routeId] });
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

                    const busId = String(payload.bus_id || payload.bus || payload.routeId || "").trim();
                    if (!busId) {
                        sendJson(res, { ok: false, error: "bus_id is required" }, 400);
                        return;
                    }

                    const currentState = loadBusState();
                    const existing = currentState[busId] || {};
                    const updatedEntry = normalizeBusStateEntry(payload, existing);
                    currentState[busId] = updatedEntry;

                    const allRoutes = loadRoutes();
                    const matchingRoute = allRoutes.find(
                        (r) => String(r.routeId) === busId || String(r.busNumber) === busId
                    );
                    if (matchingRoute) {
                        currentState[matchingRoute.routeId] = updatedEntry;
                        if (matchingRoute.busNumber && matchingRoute.busNumber !== "N/A") {
                            currentState[matchingRoute.busNumber] = updatedEntry;
                        }
                    }

                    saveBusState(currentState);

                    // Forward to Python for EVERY alias so micro chart gets real data
                    const pythonIds = new Set([busId]);
                    if (matchingRoute) {
                        if (matchingRoute.routeId) pythonIds.add(String(matchingRoute.routeId));
                        if (matchingRoute.busNumber && matchingRoute.busNumber !== "N/A") {
                            pythonIds.add(matchingRoute.busNumber);
                        }
                    }
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

                    console.log(`[Telemetry] Bus ${busId} updated: SoC=${updatedEntry.soc}%, Condition=${updatedEntry.condition}, Status=${updatedEntry.status}`);
                    sendJson(res, {
                        ok: true,
                        message: "Telemetry updated successfully",
                        bus_id: busId,
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

    if (pathname === "/api/fleet") {
        try {
            const allRoutes = loadRoutes();
            const busState = loadBusState();
            const fleet = allRoutes.map((r) => {
                const state = busState[r.routeId] || busState[r.busNumber] || {};
                const soc = Number.isFinite(Number(state.soc)) ? Number(state.soc) : null;
                const condition = state.condition || "Good";
                const status = state.status || (soc > 30 ? "Active" : soc > 15 ? "Warning" : "Blocked");
                return {
                    bus_id: r.routeId,
                    bus_number: r.busNumber,
                    route: r.busNumber,
                    route_name: r.routeName,
                    origin: r.origin,
                    destination: r.destination,
                    soc,
                    condition,
                    status
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

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
