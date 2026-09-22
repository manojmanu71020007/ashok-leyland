"""Calculate a GTFS route's road distance from ordered shape points."""

from __future__ import annotations

import argparse
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

import pandas as pd


EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance between two GPS coordinates in km."""
    lat1_rad, lat2_rad = radians(lat1), radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    haversine = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * asin(sqrt(haversine))


def calculate_route_distance(bus_number: str, data_dir: str | Path = "data") -> float:
    """Calculate a bus route distance from routes, trips, and shapes GTFS files."""
    base_dir = Path(data_dir)
    routes = pd.read_csv(base_dir / "routes.txt")
    trips = pd.read_csv(base_dir / "trips.txt")
    shapes = pd.read_csv(base_dir / "shapes.txt")

    matching_routes = routes.loc[
        routes["route_short_name"].astype(str).str.strip() == str(bus_number).strip()
    ]
    if matching_routes.empty:
        raise ValueError(f"Bus route {bus_number!r} was not found in routes.txt.")

    route_id = matching_routes.iloc[0]["route_id"]
    route_trips = trips.loc[trips["route_id"].astype(str) == str(route_id)]
    if route_trips.empty:
        raise ValueError(f"No trip was found for route_id {route_id!r}.")

    direction_zero = route_trips.loc[route_trips["direction_id"] == 0]
    selected_trip = (direction_zero if not direction_zero.empty else route_trips).iloc[0]
    shape_id = selected_trip["shape_id"]
    route_shape = shapes.loc[shapes["shape_id"].astype(str) == str(shape_id)].copy()
    if route_shape.empty:
        raise ValueError(f"No shape data was found for shape_id {shape_id!r}.")

    route_shape = route_shape.sort_values("shape_pt_sequence")
    coordinates = route_shape[["shape_pt_lat", "shape_pt_lon"]].apply(pd.to_numeric, errors="coerce").dropna()
    if len(coordinates) < 2:
        raise ValueError(f"Shape {shape_id!r} does not contain at least two valid GPS points.")

    coordinate_values = coordinates.to_numpy()
    total_km = sum(
        haversine_km(previous[0], previous[1], current[0], current[1])
        for previous, current in zip(coordinate_values, coordinate_values[1:])
    )
    return round(total_km, 2)


def main() -> None:
    parser = argparse.ArgumentParser(description="Calculate a GTFS bus route distance in kilometres.")
    parser.add_argument("bus_number", help="Value of route_short_name, for example 401-A")
    parser.add_argument("--data-dir", default="data", help="Folder containing routes.txt, trips.txt, and shapes.txt")
    args = parser.parse_args()

    try:
        distance = calculate_route_distance(args.bus_number, args.data_dir)
    except (FileNotFoundError, KeyError, ValueError, pd.errors.ParserError) as error:
        parser.error(str(error))
    print(f"{args.bus_number} route distance: {distance:.2f} km")


if __name__ == "__main__":
    main()        parser.error(str(error))
    print(f"{args.bus_number} route distance: {distance:.2f} km")


if __name__ == "__main__":
    main()
