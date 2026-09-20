"""
optimizer.py — The decision layer: order generation + fleet assignment.

Problem formulation (see docs/OPTIMIZATION.md for full writeup)
-----------------------------------------------------------------
This is a variant of the Vehicle Routing Problem with Time Windows and
Energy Constraints (E-VRPTW). We solve it with a greedy, feasibility-
constrained heuristic rather than an exact ILP solver — the standard
practical approach for real-time dispatch, where decisions must be made
in milliseconds as orders stream in, not solved offline in batch.

Decision variables:
    x[o][d] in {0,1} — order o assigned to drone d
    x[o][r] in {0,1} — order o assigned to ground rider r

Objective (multi-term, weights tunable):
    minimize  alpha * sum(delivery_time)
            + beta  * sum(energy_or_fuel_cost)
            + gamma * sum(failed_or_late_deliveries)

Constraints:
    1. Battery feasibility   : E(path) <= 0.8 * battery_capacity   (physics.py)
    2. No-fly zones          : path must not cross restricted polygons (graph.py)
    3. Capacity              : each vehicle serves one order at a time
    4. Fleet size             : assignments bounded by available idle vehicles
    5. SLA deadline (soft)   : violations penalized via gamma term
"""

import random
import heapq
from dataclasses import dataclass, field
from typing import Optional

from physics import DroneSpecs, GroundVehicleSpecs, round_trip_energy_wh, ground_trip_time_s
from graph import CityGraph, astar_energy_path


@dataclass
class Order:
    id: int
    origin: str          # dark store node id
    destination: str      # delivery node id
    created_at_s: float
    payload_kg: float = 1.5
    sla_seconds: float = 900.0  # 15 min SLA, standard quick-commerce target


@dataclass
class Vehicle:
    id: str
    kind: str  # "drone" | "rider"
    home_node: str
    soc_frac: float = 1.0       # state of charge, 1.0 = full (riders ignore this)
    busy_until_s: float = 0.0
    specs: object = None        # DroneSpecs or GroundVehicleSpecs


@dataclass
class Weights:
    """Tunable objective weights — expose these as sliders in the frontend."""
    alpha_time: float = 1.0     # weight on delivery time (seconds)
    beta_cost: float = 1.0      # weight on energy/fuel cost (INR)
    # Failure penalty must dominate any realistic delivery_time_s term, or the
    # optimizer will "game" the objective by leaving orders unassigned. We set
    # this well above the worst plausible single-delivery time cost (~30 min).
    gamma_fail: float = 2000.0


def generate_orders(duration_s: float, lambda_per_hour: float, dark_stores: list[str],
                     delivery_nodes: list[str], seed: int = 42) -> list[Order]:
    """
    Poisson arrival process: inter-arrival times ~ Exponential(lambda).
    This is the standard model for independent random order arrivals in
    queueing theory and is what real quick-commerce demand forecasting
    models assume at the base layer.
    """
    rng = random.Random(seed)
    orders = []
    t = 0.0
    lambda_per_s = lambda_per_hour / 3600.0
    oid = 0
    while t < duration_s:
        inter_arrival = rng.expovariate(lambda_per_s)
        t += inter_arrival
        if t >= duration_s:
            break
        orders.append(Order(
            id=oid,
            origin=rng.choice(dark_stores),
            destination=rng.choice(delivery_nodes),
            created_at_s=t,
            payload_kg=round(rng.uniform(0.5, 3.5), 2),
        ))
        oid += 1
    return orders


def evaluate_drone_assignment(order: Order, vehicle: Vehicle, graph: CityGraph,
                               wind_mps: float, wind_dir_deg: float) -> Optional[dict]:
    """Returns cost breakdown if feasible, else None. Checks round-trip energy."""
    if vehicle.kind != "drone":
        return None
    route = astar_energy_path(graph, vehicle.home_node, order.destination,
                               vehicle.specs, order.payload_kg, wind_mps, wind_dir_deg)
    if route is None:
        return None  # blocked by no-fly zone or infeasible outright

    # Must also make it home — check round trip energy from current SoC
    rt = round_trip_energy_wh(route["total_distance_m"], order.payload_kg, vehicle.specs,
                               wind_mps=wind_mps, wind_dir_deg=wind_dir_deg)
    available_wh = vehicle.soc_frac * vehicle.specs.battery_capacity_wh
    if rt["total_energy_wh"] > available_wh - (vehicle.specs.battery_reserve_frac * vehicle.specs.battery_capacity_wh):
        return None  # wouldn't make it back within safety reserve

    return {
        "vehicle_id": vehicle.id,
        "delivery_time_s": route["total_time_s"],
        "energy_wh": rt["total_energy_wh"],
        "cost_inr": rt["total_energy_wh"] * 8.0 / 1000.0,  # ~INR 8/kWh approx grid rate
        "path": route["path"],
    }


def evaluate_rider_assignment(order: Order, vehicle: Vehicle, graph: CityGraph) -> dict:
    dist_m = graph.straight_line_distance_m(vehicle.home_node, order.destination) * 1.3  # road detour factor
    time_s = ground_trip_time_s(dist_m, vehicle.specs)
    cost_inr = (dist_m / 1000.0) * vehicle.specs.cost_per_km_inr
    return {
        "vehicle_id": vehicle.id,
        "delivery_time_s": time_s,
        "energy_wh": None,
        "cost_inr": cost_inr,
        "path": [vehicle.home_node, order.destination],
    }


def greedy_assign(orders: list[Order], vehicles: list[Vehicle], graph: CityGraph,
                   weights: Weights, wind_mps: float = 3.0, wind_dir_deg: float = 315.0) -> list[dict]:
    """
    Greedy feasibility-constrained heuristic (see module docstring for the
    formal problem this approximates).

    For each order, in arrival order:
      1. Evaluate all currently-idle, feasible vehicles (drones checked via
         physics-constrained A*, riders via simple distance/speed).
      2. Score each candidate by the weighted objective.
      3. Assign to the lowest-cost feasible candidate.
      4. If none feasible, mark as failed (counted in gamma penalty term).

    This is O(orders * vehicles) — fine for real-time dispatch at
    hackathon/demo scale (dozens of orders, single-digit fleet size).
    """
    results = []
    for order in orders:
        candidates = []
        for v in vehicles:
            if v.busy_until_s > order.created_at_s:
                continue  # still busy from a prior order
            if v.kind == "drone":
                res = evaluate_drone_assignment(order, v, graph, wind_mps, wind_dir_deg)
            else:
                res = evaluate_rider_assignment(order, v, graph)
            if res is not None:
                score = (weights.alpha_time * res["delivery_time_s"]
                         + weights.beta_cost * res["cost_inr"])
                candidates.append((score, res))

        if not candidates:
            results.append({
                "order_id": order.id, "status": "failed",
                "reason": "no feasible vehicle (battery/no-fly/fleet exhausted)",
                "penalty": weights.gamma_fail,
            })
            continue

        candidates.sort(key=lambda c: c[0])
        _, best = candidates[0]
        vehicle = next(v for v in vehicles if v.id == best["vehicle_id"])
        vehicle.busy_until_s = order.created_at_s + best["delivery_time_s"]
        if vehicle.kind == "drone":
            vehicle.soc_frac = max(0.0, vehicle.soc_frac - best["energy_wh"] / vehicle.specs.battery_capacity_wh)

        sla_violated = best["delivery_time_s"] > order.sla_seconds
        results.append({
            "order_id": order.id,
            "status": "delivered",
            "vehicle_id": vehicle.id,
            "vehicle_kind": vehicle.kind,
            "delivery_time_s": best["delivery_time_s"],
            "cost_inr": best["cost_inr"],
            "path": best["path"],
            "sla_violated": sla_violated,
            "penalty": weights.gamma_fail if sla_violated else 0.0,
        })
    return results


def brute_force_assign(orders: list[Order], vehicles: list[Vehicle], graph: CityGraph,
                        weights: Weights, wind_mps: float = 3.0, wind_dir_deg: float = 315.0) -> dict:
    """
    Exact optimal assignment via brute-force permutation search.
    ONLY use on small batches (<= ~7 orders with <= ~5 vehicles) — this is
    factorial-ish in the worst case and exists purely to produce an
    optimality-gap comparison against greedy_assign for the demo.
    """
    import itertools
    import copy

    n = len(orders)
    if n > 8:
        raise ValueError("brute_force_assign is exponential — keep batches <= 8 orders for a demo")

    best_total_cost = float("inf")
    best_assignment = None

    vehicle_ids = [v.id for v in vehicles]
    # try every function from orders -> vehicles (including "unassigned")
    options = vehicle_ids + [None]
    for combo in itertools.product(options, repeat=n):
        sim_vehicles = copy.deepcopy(vehicles)
        total_cost = 0.0
        feasible_combo = True
        for order, vid in zip(orders, combo):
            if vid is None:
                total_cost += weights.gamma_fail
                continue
            v = next(sv for sv in sim_vehicles if sv.id == vid)
            if v.busy_until_s > order.created_at_s:
                feasible_combo = False
                break
            if v.kind == "drone":
                res = evaluate_drone_assignment(order, v, graph, wind_mps, wind_dir_deg)
            else:
                res = evaluate_rider_assignment(order, v, graph)
            if res is None:
                feasible_combo = False
                break
            total_cost += weights.alpha_time * res["delivery_time_s"] + weights.beta_cost * res["cost_inr"]
            v.busy_until_s = order.created_at_s + res["delivery_time_s"]
            if v.kind == "drone":
                v.soc_frac -= res["energy_wh"] / v.specs.battery_capacity_wh

        if feasible_combo and total_cost < best_total_cost:
            best_total_cost = total_cost
            best_assignment = combo

    return {"best_total_cost": best_total_cost, "assignment": best_assignment}
