"""
run_simulation.py — Entry point. Wires physics + graph + optimizer together,
runs a full simulation, and writes a single trace JSON that the frontend
reads to animate playback. The frontend never recomputes anything —
it is a pure renderer of this file.

Usage:
    python run_simulation.py
    (reads data/bhopal_map.json + data/drone_specs.json, writes data/trace.json)
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from physics import DroneSpecs, GroundVehicleSpecs
from graph import CityGraph
from optimizer import (
    Vehicle, Weights, generate_orders, greedy_assign, brute_force_assign,
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def load_config():
    with open(os.path.join(DATA_DIR, "drone_specs.json")) as f:
        cfg = json.load(f)
    return cfg


def build_vehicles(cfg, graph) -> list[Vehicle]:
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    drone_specs = DroneSpecs(**cfg["drone"])
    ground_specs = GroundVehicleSpecs(**cfg["ground_vehicle"])

    vehicles = []
    for i in range(cfg["fleet"]["num_drones"]):
        home = dark_stores[i % len(dark_stores)]
        vehicles.append(Vehicle(id=f"drone_{i}", kind="drone", home_node=home,
                                 soc_frac=1.0, specs=drone_specs))
    for i in range(cfg["fleet"]["num_riders"]):
        home = dark_stores[i % len(dark_stores)]
        vehicles.append(Vehicle(id=f"rider_{i}", kind="rider", home_node=home,
                                 soc_frac=1.0, specs=ground_specs))
    return vehicles


def run_scenario(graph, cfg, fleet_mode: str) -> dict:
    """
    fleet_mode: 'drones_only' | 'riders_only' | 'mixed'
    Runs the greedy optimizer over a generated order stream and returns
    results + summary metrics.
    """
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_nodes = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]

    lambda_total = cfg["demand"]["orders_per_hour_per_store"] * len(dark_stores)
    orders = generate_orders(cfg["demand"]["simulation_duration_s"], lambda_total,
                              dark_stores, delivery_nodes)

    vehicles = build_vehicles(cfg, graph)
    if fleet_mode == "drones_only":
        vehicles = [v for v in vehicles if v.kind == "drone"]
    elif fleet_mode == "riders_only":
        vehicles = [v for v in vehicles if v.kind == "rider"]

    weights = Weights()
    results = greedy_assign(orders, vehicles, graph, weights,
                             wind_mps=cfg["wind"]["speed_mps"],
                             wind_dir_deg=cfg["wind"]["direction_deg"])

    delivered = [r for r in results if r["status"] == "delivered"]
    failed = [r for r in results if r["status"] == "failed"]
    times = sorted(r["delivery_time_s"] for r in delivered) if delivered else [0]
    sla_violations = sum(1 for r in delivered if r.get("sla_violated"))

    def percentile(sorted_list, p):
        if not sorted_list:
            return 0
        idx = min(len(sorted_list) - 1, int(len(sorted_list) * p))
        return sorted_list[idx]

    summary = {
        "fleet_mode": fleet_mode,
        "total_orders": len(orders),
        "delivered": len(delivered),
        "failed": len(failed),
        "failure_rate": len(failed) / len(orders) if orders else 0,
        "sla_violations": sla_violations,
        "p50_delivery_time_s": percentile(times, 0.5),
        "p95_delivery_time_s": percentile(times, 0.95),
        "avg_cost_inr": sum(r["cost_inr"] for r in delivered) / len(delivered) if delivered else 0,
        "orders_per_hour_actual": len(delivered) / (cfg["demand"]["simulation_duration_s"] / 3600),
    }

    return {"orders": [vars(o) for o in orders], "results": results, "summary": summary}


def run_optimality_gap_demo(graph, cfg) -> dict:
    """Small-batch greedy vs brute-force comparison for the judge-facing demo."""
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_nodes = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]
    small_orders = generate_orders(600, 30, dark_stores, delivery_nodes, seed=7)[:5]

    vehicles = build_vehicles(cfg, graph)[:3]
    weights = Weights()

    import time
    t0 = time.time()
    greedy_results = greedy_assign(small_orders, vehicles, graph, weights)
    greedy_ms = (time.time() - t0) * 1000
    greedy_cost = sum(
        weights.alpha_time * r.get("delivery_time_s", 0) + weights.beta_cost * r.get("cost_inr", 0) + r.get("penalty", 0)
        for r in greedy_results
    )

    vehicles2 = build_vehicles(cfg, graph)[:3]
    t0 = time.time()
    bf = brute_force_assign(small_orders, vehicles2, graph, weights)
    bf_ms = (time.time() - t0) * 1000

    gap_pct = (greedy_cost - bf["best_total_cost"]) / bf["best_total_cost"] * 100 if bf["best_total_cost"] else 0

    return {
        "greedy_cost": greedy_cost, "greedy_time_ms": greedy_ms,
        "optimal_cost": bf["best_total_cost"], "optimal_time_ms": bf_ms,
        "optimality_gap_pct": gap_pct,
    }


def main():
    graph = CityGraph.from_json(os.path.join(DATA_DIR, "bhopal_map.json"))
    cfg = load_config()

    drone_scenario = run_scenario(graph, cfg, "drones_only")
    rider_scenario = run_scenario(graph, cfg, "riders_only")
    mixed_scenario = run_scenario(graph, cfg, "mixed")

    print("=== DRONES ONLY ===")
    print(json.dumps(drone_scenario["summary"], indent=2))
    print("=== RIDERS ONLY (baseline) ===")
    print(json.dumps(rider_scenario["summary"], indent=2))
    print("=== MIXED FLEET ===")
    print(json.dumps(mixed_scenario["summary"], indent=2))

    print("\n=== OPTIMALITY GAP DEMO (greedy vs brute-force, 5 orders) ===")
    gap = run_optimality_gap_demo(graph, cfg)
    print(json.dumps(gap, indent=2))

    trace = {
        "map": {
            "nodes": [vars(n) for n in graph.nodes.values()],
            "no_fly_zones": [
                {"name": z.name, "polygon": z.polygon, "reason": z.reason}
                for z in graph.no_fly_zones
            ],
        },
        "scenarios": {
            "drones_only": drone_scenario,
            "riders_only": rider_scenario,
            "mixed": mixed_scenario,
        },
        "optimality_gap_demo": gap,
    }

    out_path = os.path.join(DATA_DIR, "trace.json")
    with open(out_path, "w") as f:
        json.dump(trace, f, indent=2)
    print(f"\nTrace written to {out_path} — load this in the frontend.")


if __name__ == "__main__":
    main()
