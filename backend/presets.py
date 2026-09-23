"""
presets.py — named, user-selectable configurations for the live simulator.

Each preset group maps to a real constraint the engine already enforces:
  - FLEET_PRESETS    -> vehicle counts (drones/riders), read by build_vehicles
  - WEATHER_PRESETS   -> wind speed/direction fed into the drone energy model
                         (physics.py / astar_energy_path)
  - OBSTACLE_PRESETS  -> which real no-fly zones are active (drone constraint)
                         + a traffic multiplier (rider constraint, via
                         astar_road_path)

Nothing here is decorative — every field is consumed by run_live_simulation()
in server.py and changes the actual computed result, not just a label.
"""

# All 3 zones are real, sourced from OpenStreetMap via build_graph.py. There
# is no 4th invented zone — offering a subset only removes real constraints,
# never adds fictional ones.
ALL_NO_FLY_ZONES = [
    "Raja Bhoj Airport buffer",
    "Lower Lake",
    "Van Vihar National Park",
]

FLEET_PRESETS = [
    {
        "id": "light",
        "label": "Light Fleet",
        "description": "2 drones, 2 riders — a lean, easy-to-overwhelm fleet.",
        "num_drones": 2,
        "num_riders": 2,
    },
    {
        "id": "standard",
        "label": "Standard Fleet",
        "description": "4 drones, 4 riders — the calibrated baseline fleet.",
        "num_drones": 4,
        "num_riders": 4,
    },
    {
        "id": "drone_heavy",
        "label": "Drone-Heavy",
        "description": "8 drones, 2 riders — leans on airspace over roads.",
        "num_drones": 8,
        "num_riders": 2,
    },
    {
        "id": "rider_heavy",
        "label": "Rider-Heavy",
        "description": "2 drones, 8 riders — leans on roads over airspace.",
        "num_drones": 2,
        "num_riders": 8,
    },
    {
        "id": "large",
        "label": "Large Fleet",
        "description": "8 drones, 8 riders — high-capacity, high dispatch cost.",
        "num_drones": 8,
        "num_riders": 8,
    },
]

WEATHER_PRESETS = [
    {
        "id": "calm",
        "label": "Calm",
        "description": "Light 1.5 m/s breeze — minimal drone energy penalty.",
        "wind_mps": 1.5,
        "wind_dir_deg": 315,
        "icon": "sunny",
    },
    {
        "id": "breezy",
        "label": "Breezy",
        "description": "3.0 m/s NW wind — the calibrated baseline condition.",
        "wind_mps": 3.0,
        "wind_dir_deg": 315,
        "icon": "breezy",
    },
    {
        "id": "windy",
        "label": "Windy",
        "description": "6.0 m/s wind — noticeably shortens drone range.",
        "wind_mps": 6.0,
        "wind_dir_deg": 270,
        "icon": "windy",
    },
    {
        "id": "storm",
        "label": "Storm",
        "description": "9.0 m/s wind — severe range penalty, some sorties infeasible.",
        "wind_mps": 9.0,
        "wind_dir_deg": 225,
        "icon": "storm",
    },
]

OBSTACLE_PRESETS = [
    {
        "id": "normal_ops",
        "label": "Normal Operations",
        "description": "All 3 real no-fly zones active, free-flowing traffic.",
        "active_no_fly_zones": list(ALL_NO_FLY_ZONES),
        "traffic_multiplier": 1.0,
    },
    {
        "id": "rush_hour",
        "label": "Rush Hour",
        "description": "All 3 no-fly zones active, heavy road congestion (2.2x).",
        "active_no_fly_zones": list(ALL_NO_FLY_ZONES),
        "traffic_multiplier": 2.2,
    },
    {
        "id": "unrestricted_airspace",
        "label": "Unrestricted Airspace (what-if)",
        "description": "Hypothetical: no no-fly zones, free-flowing traffic. "
                        "For comparing against real airspace restrictions.",
        "active_no_fly_zones": [],
        "traffic_multiplier": 1.0,
    },
]


def find(presets: list[dict], preset_id: str) -> dict:
    for p in presets:
        if p["id"] == preset_id:
            return p
    valid = ", ".join(p["id"] for p in presets)
    raise ValueError(f"Unknown preset id {preset_id!r}. Valid: {valid}")
