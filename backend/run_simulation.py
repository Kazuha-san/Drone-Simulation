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
import math
import os
import sys
import time
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))

from physics import DroneSpecs, GroundVehicleSpecs, cruise_energy_per_km_wh
from graph import CityGraph
from optimizer import (
    INR_PER_KWH, Vehicle, Weights, assignment_cost, generate_orders,
    greedy_assign, brute_force_assign, clear_path_cache,
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Seconds to swap a fresh battery into a returned drone at the dark store.
# Real delivery-drone fleets swap packs rather than charge in place, because
# charging a 500Wh pack takes far longer than a delivery cycle. Without this,
# drones drain monotonically and the fleet dies a few orders into the run.
#
# This lives here rather than in data/drone_specs.json because that file is
# shared with the physics owner; if the team wants it configurable, add a
# "battery_swap_s" key under "fleet" and it will be picked up automatically.
# Set to None to model a fleet with no spare batteries (harsher, useful A/B).
DEFAULT_BATTERY_SWAP_S = 300.0

# Demand/weather stress sweep, run on the MIXED fleet.
#
# This exists because the frontend's three scenario cards ("Baseline", "Peak
# Demand", "Stress Test") are a demand-intensity/weather axis, while the
# fleet-mode scenarios above (drones_only/riders_only/mixed) are a
# fleet-composition axis - a different variable entirely. Rather than
# relabel the UI to mean something it doesn't, we produce three runs that
# genuinely differ along the axis the UI already promises.
#
# demand_mult scales orders_per_hour_per_store; wind_mps overrides the
# calibrated spec's wind for that run only (None = use the spec's value).
# traffic_multiplier is carried through for display and is NOT an input to
# the simulation - riders are modelled with a fixed 1.3x road detour factor,
# not a congestion model, so treating it as simulated would overstate things.
DEMAND_SCENARIOS = {
    "baseline": {"demand_mult": 1.0, "wind_mps": None, "traffic_multiplier": 1.0},
    "peak":     {"demand_mult": 2.2, "wind_mps": None, "traffic_multiplier": 2.2},
    "stress":   {"demand_mult": 1.0, "wind_mps": 9.0,  "traffic_multiplier": 1.4},
}


def load_config():
    with open(os.path.join(DATA_DIR, "drone_specs.json")) as f:
        cfg = json.load(f)
    return cfg


def build_vehicles(cfg, graph) -> list[Vehicle]:
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    drone_specs = DroneSpecs(**cfg["drone"])
    ground_specs = GroundVehicleSpecs(**cfg["ground_vehicle"])
    swap_s = cfg["fleet"].get("battery_swap_s", DEFAULT_BATTERY_SWAP_S)

    vehicles = []
    for i in range(cfg["fleet"]["num_drones"]):
        home = dark_stores[i % len(dark_stores)]
        vehicles.append(Vehicle(id=f"drone_{i}", kind="drone", home_node=home,
                                 soc_frac=1.0, specs=drone_specs,
                                 battery_swap_s=swap_s))
    for i in range(cfg["fleet"]["num_riders"]):
        home = dark_stores[i % len(dark_stores)]
        vehicles.append(Vehicle(id=f"rider_{i}", kind="rider", home_node=home,
                                 soc_frac=1.0, specs=ground_specs))
    return vehicles


def percentile(sorted_list, p):
    """Nearest-rank percentile. Returns 0 for an empty sample."""
    if not sorted_list:
        return 0
    idx = max(0, math.ceil(p * len(sorted_list)) - 1)
    return sorted_list[idx]


def run_scenario(graph, cfg, fleet_mode: str,
                  orders_per_hour_per_store: float = None,
                  wind_mps: float = None) -> dict:
    """
    fleet_mode: 'drones_only' | 'riders_only' | 'mixed'
    Runs the greedy optimizer over a generated order stream and returns
    results + summary metrics.

    orders_per_hour_per_store / wind_mps override the values in
    data/drone_specs.json for this run only. They exist so the demand-stress
    sweep (see DEMAND_SCENARIOS) can vary load and headwind without editing
    the calibrated spec file, which CLAUDE.md constraint #3 forbids.
    """
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_nodes = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]

    if orders_per_hour_per_store is None:
        orders_per_hour_per_store = cfg["demand"]["orders_per_hour_per_store"]
    if wind_mps is None:
        wind_mps = cfg["wind"]["speed_mps"]

    lambda_total = orders_per_hour_per_store * len(dark_stores)
    orders = generate_orders(cfg["demand"]["simulation_duration_s"], lambda_total,
                              dark_stores, delivery_nodes, graph=graph)

    vehicles = build_vehicles(cfg, graph)
    if fleet_mode == "drones_only":
        vehicles = [v for v in vehicles if v.kind == "drone"]
    elif fleet_mode == "riders_only":
        vehicles = [v for v in vehicles if v.kind == "rider"]

    weights = Weights()
    results = greedy_assign(orders, vehicles, graph, weights,
                             wind_mps=wind_mps,
                             wind_dir_deg=cfg["wind"]["direction_deg"])

    delivered = [r for r in results if r["status"] == "delivered"]
    failed = [r for r in results if r["status"] == "failed"]
    times = sorted(r["delivery_time_s"] for r in delivered) if delivered else []
    sla_violations = sum(1 for r in delivered if r.get("sla_violated"))
    by_kind = Counter(r["vehicle_kind"] for r in delivered)

    summary = {
        "fleet_mode": fleet_mode,
        # Echoed back so the frontend can display the conditions a run was
        # made under instead of hardcoding them (INTEGRATION.md v2 §2.3).
        "orders_per_hour_per_store": orders_per_hour_per_store,
        "wind_mps": wind_mps,
        "wind_dir_deg": cfg["wind"]["direction_deg"],
        "total_orders": len(orders),
        "delivered": len(delivered),
        "failed": len(failed),
        "failure_rate": len(failed) / len(orders) if orders else 0,
        "sla_violations": sla_violations,
        "sla_compliance": 1 - sla_violations / len(delivered) if delivered else 0,
        "p50_delivery_time_s": percentile(times, 0.5),
        "p95_delivery_time_s": percentile(times, 0.95),
        "avg_delivery_time_s": sum(times) / len(times) if times else 0,
        "avg_cost_inr": sum(r["cost_inr"] for r in delivered) / len(delivered) if delivered else 0,
        "orders_per_hour_actual": len(delivered) / (cfg["demand"]["simulation_duration_s"] / 3600),
        # Why orders failed, not just how many — "every drone was airborne" and
        # "no drone had the charge" lead to opposite operational conclusions.
        "failure_reasons": dict(Counter(r["reason"] for r in failed)),
        "delivered_by_kind": dict(by_kind),
        "repositioned_deliveries": sum(1 for r in delivered if r.get("repositioned")),
        "total_objective_cost": sum(r["objective_cost"] for r in results),
    }

    return {"orders": [vars(o) for o in orders], "results": results, "summary": summary}


def run_optimality_gap_demo(graph, cfg) -> dict:
    """
    Small-batch greedy vs brute-force comparison for the judge-facing demo.

    Both solvers score through optimizer.assignment_cost, so the gap reflects
    heuristic quality only. Greedy's reported cost is the sum of the per-order
    objective values it actually chose — not a separately re-derived formula
    that could silently drift from what brute force measures.
    """
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_nodes = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]
    small_orders = generate_orders(600, 30, dark_stores, delivery_nodes, seed=7,
                                    graph=graph)[:5]

    weights = Weights()

    # Warm the A* cache before timing either solver. Whichever runs first
    # otherwise pays for every cache miss and the second gets them free - that
    # measured brute force as *faster* than greedy, which is an artefact of
    # cache order, not of algorithmic work. Brute force explores every
    # assignment, so one untimed pass populates every route both will need.
    brute_force_assign(small_orders, build_vehicles(cfg, graph)[:3], graph, weights)

    t0 = time.time()
    greedy_results = greedy_assign(small_orders, build_vehicles(cfg, graph)[:3],
                                    graph, weights)
    greedy_ms = (time.time() - t0) * 1000
    greedy_cost = sum(r["objective_cost"] for r in greedy_results)

    t0 = time.time()
    bf = brute_force_assign(small_orders, build_vehicles(cfg, graph)[:3], graph, weights)
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


def main():
    graph = CityGraph.from_json(os.path.join(DATA_DIR, "bhopal_map.json"))
    cfg = load_config()
    clear_path_cache()

    # Enforce the objective's dominance invariant before anything runs, so a
    # miscalibrated gamma_fail fails loudly here instead of quietly producing
    # a nonsense optimality gap downstream (CLAUDE.md constraint #2).
    Weights().validate()

    scenarios = {
        mode: run_scenario(graph, cfg, mode)
        for mode in ("drones_only", "riders_only", "mixed")
    }

    # Demand/weather sweep on the mixed fleet - see DEMAND_SCENARIOS.
    base_rate = cfg["demand"]["orders_per_hour_per_store"]
    demand_scenarios = {}
    for name, spec in DEMAND_SCENARIOS.items():
        run = run_scenario(graph, cfg, "mixed",
                            orders_per_hour_per_store=base_rate * spec["demand_mult"],
                            wind_mps=spec["wind_mps"])
        run["params"] = {
            "traffic_multiplier": spec["traffic_multiplier"],
            "demand_mult": spec["demand_mult"],
        }
        demand_scenarios[name] = run


    for mode, label in (("drones_only", "DRONES ONLY"),
                        ("riders_only", "RIDERS ONLY (baseline)"),
                        ("mixed", "MIXED FLEET")):
        print(f"=== {label} ===")
        print(json.dumps(scenarios[mode]["summary"], indent=2))

    print("")
    print("=== DEMAND / WEATHER SWEEP (mixed fleet) ===")
    for name, run in demand_scenarios.items():
        d = run["summary"]
        print(f"  {name:9} {d['orders_per_hour_per_store']:5.1f} orders/hr/store  "
              f"wind {d['wind_mps']:.1f} m/s  ->  "
              f"{d['delivered']}/{d['total_orders']} delivered, "
              f"{d['failure_rate']:.1%} failed, "
              f"SLA {d['sla_compliance']:.1%}")

    print("\n=== OPTIMALITY GAP DEMO (greedy vs brute-force, 5 orders) ===")
    gap = run_optimality_gap_demo(graph, cfg)
    print(json.dumps(gap, indent=2))
    if abs(gap["optimality_gap_pct"]) > 10:
        print("")
        print("   NOTE: gap above 10%. On the real-road map this is expected and is",
              "a genuine heuristic gap: greedy commits early drones to the first",
              "orders and later ones then fail on battery, while brute force finds",
              "an allocation serving one more. Both still score through",
              "optimizer.assignment_cost and Weights().validate() passed above, so",
              "this is not the objective-gaming failure CLAUDE.md constraint #2",
              "warns about - that would show a gap in the hundreds of percent.")

    with open(os.path.join(DATA_DIR, "bhopal_map.json")) as f:
        map_meta = json.load(f).get("meta", {})

    # Spec-sheet cruise intensity, quoted at half max payload so it reflects a
    # typical laden leg rather than an empty or fully-loaded edge case.
    drone_specs = DroneSpecs(**cfg["drone"])
    ref_payload_kg = drone_specs.max_payload_kg / 2.0
    cruise_wh_per_km = cruise_energy_per_km_wh(
        drone_specs, ref_payload_kg, drone_specs.cruise_speed_mps)

    trace = {
        "map": {
            "nodes": [vars(n) for n in graph.nodes.values()],
            "no_fly_zones": [
                {"name": z.name, "polygon": z.polygon, "reason": z.reason}
                for z in graph.no_fly_zones
            ],
        },
        "scenarios": scenarios,
        "demand_scenarios": demand_scenarios,
        "optimality_gap_demo": gap,
        # Vehicle/fleet configuration, carried into the trace so the frontend
        # has one file to read rather than also parsing drone_specs.json.
        # `derived` holds values the frontend would otherwise have to compute,
        # which it must not do (CLAUDE.md constraint #1).
        "specs": {
            "drone": cfg["drone"],
            "ground_vehicle": cfg["ground_vehicle"],
            "fleet": cfg["fleet"],
            "wind": cfg["wind"],
            "demand": cfg["demand"],
            "derived": {
                "inr_per_kwh": INR_PER_KWH,
                "drone_cruise_wh_per_km": cruise_wh_per_km,
                "drone_cruise_ref_payload_kg": ref_payload_kg,
                "map_width": map_meta.get("width", 2000),
                "map_height": map_meta.get("height", 2000),
                "metres_per_unit": graph.SCALE_M_PER_UNIT,
            },
        },
    }

    out_path = os.path.normpath(os.path.join(DATA_DIR, "trace.json"))
    with open(out_path, "w") as f:
        json.dump(trace, f, indent=2)

    # Second, compact copy inside the Vite source tree. simulationAdapter.js
    # imports this at build time (INTEGRATION.md v2 §2.5, option 1), because
    # Vite cannot import JSON from outside its project root. data/trace.json
    # above stays the canonical artifact; this one is generated output and is
    # rewritten on every run, so never hand-edit it.
    fe_path = os.path.normpath(os.path.join(
        os.path.dirname(__file__), "..", "frontend", "src", "data", "trace.json"))
    if os.path.isdir(os.path.dirname(fe_path)):
        with open(fe_path, "w") as f:
            json.dump(trace, f, separators=(",", ":"))
        print("Frontend copy written to " + fe_path)
    print(f"\nTrace written to {out_path} - load this in the frontend.")


if __name__ == "__main__":
    main()
