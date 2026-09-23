"""
server.py — local API for the live simulator.

Runs entirely on localhost. No deployment target, no external services.
Every /api/simulate call re-runs the real engine (physics + A* + optimizer)
against a fresh, randomly-seeded order stream shaped by the presets the
caller chose — this is NOT replaying a checked-in trace.json. Presets
change real inputs: fleet composition, wind (drone energy model), which
real no-fly zones are enforced (drone constraint), and road traffic
(rider constraint, via astar_road_path).

Run directly for API-only dev:
    uvicorn server:app --reload --port 8000

Normally launched via ../run_app.py, which also serves the built frontend
from the same process/port.
"""

import copy
import json
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from physics import DroneSpecs, GroundVehicleSpecs, cruise_energy_per_km_wh
from graph import CityGraph
from optimizer import (
    INR_PER_KWH, Vehicle, Weights, generate_orders,
    greedy_assign, brute_force_assign, clear_path_cache,
)
import presets

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

app = FastAPI(title="Bhopal Drone-Delivery Simulator API")

# Local-only: the frontend is served from the same origin in the standalone
# app, but CORS is left open for `npm run dev` (a different port) too.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- loaded once at startup, reused across requests -------------------------
_GRAPH = CityGraph.from_json(os.path.join(DATA_DIR, "bhopal_map.json"))
with open(os.path.join(DATA_DIR, "drone_specs.json")) as _f:
    _CFG = json.load(_f)
with open(os.path.join(DATA_DIR, "bhopal_map.json")) as _f:
    _MAP_META = json.load(_f).get("meta", {})


def _graph_with_active_zones(zone_names: list[str]) -> CityGraph:
    """
    Shallow-copy the loaded graph with a filtered no_fly_zones list. Nodes
    and edges are shared (read-only during a request); only which zones
    are enforced changes. This is why obstacle presets don't need a graph
    rebuild — no_fly enforcement happens at pathfind time in graph.py, not
    at load time (see build_graph.py's comment on why zones are no longer
    pruned from the graph itself).
    """
    g = copy.copy(_GRAPH)
    g.no_fly_zones = [z for z in _GRAPH.no_fly_zones if z.name in zone_names]
    return g


def _build_vehicles(cfg: dict, graph: CityGraph, num_drones: int, num_riders: int) -> list[Vehicle]:
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    drone_specs = DroneSpecs(**cfg["drone"])
    ground_specs = GroundVehicleSpecs(**cfg["ground_vehicle"])
    swap_s = cfg["fleet"].get("battery_swap_s", 300.0)

    vehicles = []
    for i in range(num_drones):
        home = dark_stores[i % len(dark_stores)]
        vehicles.append(Vehicle(id=f"drone_{i}", kind="drone", home_node=home,
                                 soc_frac=1.0, specs=drone_specs, battery_swap_s=swap_s))
    for i in range(num_riders):
        home = dark_stores[i % len(dark_stores)]
        vehicles.append(Vehicle(id=f"rider_{i}", kind="rider", home_node=home,
                                 soc_frac=1.0, specs=ground_specs))
    return vehicles


def _percentile(sorted_list, p):
    if not sorted_list:
        return 0
    idx = max(0, __import__("math").ceil(p * len(sorted_list)) - 1)
    return sorted_list[idx]


class SimulateRequest(BaseModel):
    fleet_preset_id: str = "standard"
    weather_preset_id: str = "breezy"
    obstacle_preset_id: str = "normal_ops"
    fleet_mode: str = "mixed"          # "drones_only" | "riders_only" | "mixed"
    duration_s: float | None = None    # defaults to drone_specs.json's demand.simulation_duration_s
    seed: int | None = None            # omit for a fresh random run every call


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/presets")
def get_presets():
    return {
        "fleet": presets.FLEET_PRESETS,
        "weather": presets.WEATHER_PRESETS,
        "obstacles": presets.OBSTACLE_PRESETS,
    }


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    if req.fleet_mode not in ("drones_only", "riders_only", "mixed"):
        raise HTTPException(400, f"invalid fleet_mode {req.fleet_mode!r}")

    try:
        fleet = presets.find(presets.FLEET_PRESETS, req.fleet_preset_id)
        weather = presets.find(presets.WEATHER_PRESETS, req.weather_preset_id)
        obstacles = presets.find(presets.OBSTACLE_PRESETS, req.obstacle_preset_id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    Weights().validate()

    graph = _graph_with_active_zones(obstacles["active_no_fly_zones"])
    # A drone path cached under a different active-zone set would be stale —
    # every request may have a different obstacle preset, so the caches must
    # not carry across requests.
    clear_path_cache()

    seed = req.seed if req.seed is not None else random.randint(0, 2**31 - 1)
    duration_s = req.duration_s or _CFG["demand"]["simulation_duration_s"]

    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_nodes = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]
    lambda_total = _CFG["demand"]["orders_per_hour_per_store"] * len(dark_stores)

    orders = generate_orders(duration_s, lambda_total, dark_stores, delivery_nodes,
                              seed=seed, graph=graph)

    vehicles = _build_vehicles(_CFG, graph, fleet["num_drones"], fleet["num_riders"])
    if req.fleet_mode == "drones_only":
        vehicles = [v for v in vehicles if v.kind == "drone"]
    elif req.fleet_mode == "riders_only":
        vehicles = [v for v in vehicles if v.kind == "rider"]

    weights = Weights()
    t0 = time.time()
    results = greedy_assign(orders, vehicles, graph, weights,
                             wind_mps=weather["wind_mps"], wind_dir_deg=weather["wind_dir_deg"],
                             traffic_multiplier=obstacles["traffic_multiplier"])
    compute_ms = (time.time() - t0) * 1000

    delivered = [r for r in results if r["status"] == "delivered"]
    failed = [r for r in results if r["status"] == "failed"]
    times = sorted(r["delivery_time_s"] for r in delivered) if delivered else []
    sla_violations = sum(1 for r in delivered if r.get("sla_violated"))
    from collections import Counter
    by_kind = Counter(r["vehicle_kind"] for r in delivered)

    summary = {
        "fleet_mode": req.fleet_mode,
        "orders_per_hour_per_store": _CFG["demand"]["orders_per_hour_per_store"],
        "wind_mps": weather["wind_mps"],
        "wind_dir_deg": weather["wind_dir_deg"],
        "traffic_multiplier": obstacles["traffic_multiplier"],
        "active_no_fly_zones": obstacles["active_no_fly_zones"],
        "total_orders": len(orders),
        "delivered": len(delivered),
        "failed": len(failed),
        "failure_rate": len(failed) / len(orders) if orders else 0,
        "sla_violations": sla_violations,
        "sla_compliance": 1 - sla_violations / len(delivered) if delivered else 0,
        "p50_delivery_time_s": _percentile(times, 0.5),
        "p95_delivery_time_s": _percentile(times, 0.95),
        "avg_delivery_time_s": sum(times) / len(times) if times else 0,
        "avg_cost_inr": sum(r["cost_inr"] for r in delivered) / len(delivered) if delivered else 0,
        "orders_per_hour_actual": len(delivered) / (duration_s / 3600),
        "failure_reasons": dict(Counter(r["reason"] for r in failed)),
        "delivered_by_kind": dict(by_kind),
        "repositioned_deliveries": sum(1 for r in delivered if r.get("repositioned")),
        "total_objective_cost": sum(r["objective_cost"] for r in results),
        "compute_ms": compute_ms,
    }

    drone_specs = DroneSpecs(**_CFG["drone"])
    ref_payload_kg = drone_specs.max_payload_kg / 2.0
    cruise_wh_per_km = cruise_energy_per_km_wh(drone_specs, ref_payload_kg, drone_specs.cruise_speed_mps)

    return {
        "seed_used": seed,
        "presets_used": {
            "fleet": fleet, "weather": weather, "obstacles": obstacles,
            "fleet_mode": req.fleet_mode,
        },
        "map": {
            "nodes": [vars(n) for n in graph.nodes.values()],
            "no_fly_zones": [
                {"name": z.name, "polygon": z.polygon, "reason": z.reason}
                for z in graph.no_fly_zones
            ],
        },
        "orders": [vars(o) for o in orders],
        "results": results,
        "summary": summary,
        "specs": {
            "drone": _CFG["drone"],
            "ground_vehicle": _CFG["ground_vehicle"],
            "fleet": {"num_drones": fleet["num_drones"], "num_riders": fleet["num_riders"]},
            "wind": {"speed_mps": weather["wind_mps"], "direction_deg": weather["wind_dir_deg"]},
            "demand": {"orders_per_hour_per_store": _CFG["demand"]["orders_per_hour_per_store"],
                       "simulation_duration_s": duration_s},
            "derived": {
                "inr_per_kwh": INR_PER_KWH,
                "drone_cruise_wh_per_km": cruise_wh_per_km,
                "drone_cruise_ref_payload_kg": ref_payload_kg,
                "map_width": _MAP_META.get("width", 2000),
                "map_height": _MAP_META.get("height", 2000),
                "metres_per_unit": graph.SCALE_M_PER_UNIT,
            },
        },
    }


@app.get("/api/optimality-gap-demo")
def optimality_gap_demo():
    """
    Fixed judge-facing demo: greedy vs brute-force on a small batch, at the
    calibrated baseline (not preset-dependent — this is a reference proof
    point, not a scenario to vary).
    """
    graph = _graph_with_active_zones(presets.ALL_NO_FLY_ZONES)
    clear_path_cache()
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_nodes = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]
    small_orders = generate_orders(600, 30, dark_stores, delivery_nodes, seed=7, graph=graph)[:5]
    weights = Weights()

    brute_force_assign(small_orders, _build_vehicles(_CFG, graph, 4, 4)[:3], graph, weights)

    t0 = time.time()
    greedy_results = greedy_assign(small_orders, _build_vehicles(_CFG, graph, 4, 4)[:3], graph, weights)
    greedy_ms = (time.time() - t0) * 1000
    greedy_cost = sum(r["objective_cost"] for r in greedy_results)

    t0 = time.time()
    bf = brute_force_assign(small_orders, _build_vehicles(_CFG, graph, 4, 4)[:3], graph, weights)
    bf_ms = (time.time() - t0) * 1000

    gap_pct = ((greedy_cost - bf["best_total_cost"]) / bf["best_total_cost"] * 100
               if bf["best_total_cost"] else 0)

    return {
        "orders_in_batch": len(small_orders),
        "greedy_cost": greedy_cost, "greedy_time_ms": greedy_ms,
        "optimal_cost": bf["best_total_cost"], "optimal_time_ms": bf_ms,
        "optimality_gap_pct": gap_pct,
        "speedup_x": bf_ms / greedy_ms if greedy_ms else 0,
    }


# --- serve the built frontend from the same process/port, if present -------
_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(_FRONTEND_DIST):
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
