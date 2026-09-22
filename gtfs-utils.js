const allowedBusNumbers = ["401A", "252F", "252A", "507"];
const maxTripsPerBus = 10;

function normalizeBusNumber(value) {
    return String(value ?? "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^0+/, "")
        .toLowerCase();
}

function normalizeRouteLongName(value) {
    return String(value ?? "")
        .replace(/â‡”/g, "⇔")
        .replace(/â€”?/g, "⇔")
        .replace(/⇔/g, "⇔");
}

function isAllowedBusNumber(value) {
    const normalized = normalizeBusNumber(value);
    return allowedBusNumbers.map((bus) => normalizeBusNumber(bus)).includes(normalized);
}

function filterGtfsBundle(bundle) {
    const routes = Array.isArray(bundle?.routes) ? bundle.routes : [];
    const trips = Array.isArray(bundle?.trips) ? bundle.trips : [];
    const stops = Array.isArray(bundle?.stops) ? bundle.stops : [];
    const stopTimes = Array.isArray(bundle?.stopTimes) ? bundle.stopTimes : [];
    const shapes = Array.isArray(bundle?.shapes) ? bundle.shapes : [];

    const filteredRoutes = routes.filter((route) => {
        const busNumber = String(route?.busNumber || route?.routeShortName || "");
        const routeLongName = normalizeRouteLongName(route?.routeName || route?.routeLongName || "");
        return isAllowedBusNumber(busNumber) || (
            routeLongName && ["401-A", "252-F", "252-A", "507"].some((target) => routeLongName.includes(target))
        );
    });

    const filteredRouteIds = new Set(filteredRoutes.map((route) => String(route.routeId || route.busNumber || route.routeName || "")));

    const filteredTrips = trips.filter((trip) => {
        const routeId = String(trip?.routeId || "");
        const shapeId = String(trip?.shapeId || "");
        if (!routeId && !shapeId) {
            return false;
        }
        return filteredRouteIds.has(routeId);
    });

    const limitedTrips = filteredTrips.reduce((acc, trip) => {
        const routeId = String(trip.routeId || "");
        if (!acc.has(routeId)) {
            acc.set(routeId, []);
        }

        const routeTrips = acc.get(routeId);
        if (routeTrips.length < maxTripsPerBus) {
            routeTrips.push(trip);
        }

        return acc;
    }, new Map());

    const finalTrips = Array.from(limitedTrips.values()).flat();
    const tripIds = new Set(finalTrips.map((trip) => String(trip.tripId || "")));

    const filteredStopTimes = stopTimes.filter((stopTime) => tripIds.has(String(stopTime.tripId || "")));
    const shapeIds = new Set(finalTrips.map((trip) => String(trip.shapeId || "")));
    const filteredShapes = shapes.filter((shape) => shapeIds.has(String(shape.shapeId || "")));
    const stopIds = new Set(filteredStopTimes.map((stopTime) => String(stopTime.stopId || "")));
    const filteredStops = stops.filter((stop) => stopIds.has(String(stop.stopId || "")));

    if (filteredRoutes.length > 0) {
        return {
            routes: filteredRoutes,
            stops: filteredStops,
            trips: finalTrips,
            stopTimes: filteredStopTimes,
            shapes: filteredShapes
        };
    }

    return { routes: [], stops: [], trips: [], stopTimes: [], shapes: [] };
}

function buildFallbackPeenyaBundle() {
    const routes = [
        {
            routeLongName: "Peenya 2nd Stage ⇔ Rajanukunte",
            routeShortName: "401-A",
            agencyId: "1",
            routeType: "3",
            routeId: "401A"
        },
        {
            routeLongName: "Peenya 2nd Stage ⇔ Yelahanka",
            routeShortName: "252-F",
            agencyId: "1",
            routeType: "3",
            routeId: "252F"
        },
        {
            routeLongName: "Peenya 2nd Stage ⇔ Hebbal",
            routeShortName: "252-A",
            agencyId: "1",
            routeType: "3",
            routeId: "252A"
        },
        {
            routeLongName: "Peenya 2nd Stage ⇔ Hennur",
            routeShortName: "507",
            agencyId: "1",
            routeType: "3",
            routeId: "507"
        }
    ];

    const stops = [
        { stopName: "Peenya 2nd Stage", zoneId: "1", stopId: "P2S-1", stopDesc: "Peenya 2nd Stage", stopLat: 13.0324, stopLon: 77.5098 },
        { stopName: "Peenya 2nd Stage Market", zoneId: "1", stopId: "P2S-2", stopDesc: "Peenya 2nd Stage Market", stopLat: 13.0340, stopLon: 77.5116 },
        { stopName: "Rajanukunte", zoneId: "2", stopId: "RAJ-1", stopDesc: "Rajanukunte", stopLat: 13.1717, stopLon: 77.5645 },
        { stopName: "Yelahanka", zoneId: "2", stopId: "YEL-1", stopDesc: "Yelahanka", stopLat: 13.1000, stopLon: 77.5965 },
        { stopName: "Hebbal", zoneId: "2", stopId: "HEB-1", stopDesc: "Hebbal", stopLat: 13.0350, stopLon: 77.5960 },
        { stopName: "Hennur", zoneId: "2", stopId: "HEN-1", stopDesc: "Hennur", stopLat: 13.0320, stopLon: 77.6273 }
    ];

    const trips = [];
    const stopTimes = [];
    const shapes = [];

    routes.forEach((route, routeIndex) => {
        const routeStops = [
            "Peenya 2nd Stage",
            route.routeShortName === "401-A" ? "Rajanukunte" : route.routeShortName === "252-F" ? "Yelahanka" : route.routeShortName === "252-A" ? "Hebbal" : "Hennur"
        ];

        for (let tripIndex = 0; tripIndex < maxTripsPerBus; tripIndex += 1) {
            const tripId = `${route.routeId}-T${tripIndex + 1}`;
            const shapeId = `${route.routeId}-S${tripIndex + 1}`;
            const direction = tripIndex % 2 === 0 ? "0" : "1";

            trips.push({
                routeId: route.routeId,
                serviceId: "1",
                tripHeadsign: routeStops[1],
                directionId: direction,
                shapeId,
                tripId
            });

            const tripStopIds = ["P2S-1", "P2S-2"];
            const destinationStopId = routeStops[1] === "Rajanukunte" ? "RAJ-1" : routeStops[1] === "Yelahanka" ? "YEL-1" : routeStops[1] === "Hebbal" ? "HEB-1" : "HEN-1";
            const allStopsForTrip = [...tripStopIds, destinationStopId];

            allStopsForTrip.forEach((stopId, sequenceIndex) => {
                const stopRecord = stops.find((stop) => stop.stopId === stopId);
                const baseDateMinutes = (tripIndex + 1) * 10 + sequenceIndex * 5;
                const hour = 6 + routeIndex + Math.floor(baseDateMinutes / 60);
                const minute = baseDateMinutes % 60;
                const arrivalTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

                stopTimes.push({
                    tripId,
                    arrivalTime,
                    departureTime: arrivalTime,
                    stopId,
                    stopSequence: String(sequenceIndex + 1),
                    stopHeadsign: routeStops[1]
                });

                if (stopRecord) {
                    shapes.push({
                        shapeId,
                        shapePtLat: stopRecord.stopLat + (sequenceIndex * 0.003),
                        shapePtLon: stopRecord.stopLon + (sequenceIndex * 0.002),
                        shapePtSequence: String(sequenceIndex + 1)
                    });
                }
            });
        }
    });

    return {
        routes,
        stops,
        trips,
        stopTimes,
        shapes
    };
}

module.exports = {
    allowedBusNumbers,
    maxTripsPerBus,
    normalizeBusNumber,
    isAllowedBusNumber,
    normalizeRouteLongName,
    filterGtfsBundle,
    buildFallbackPeenyaBundle
};
