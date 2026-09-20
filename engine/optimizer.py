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
            + gamma * sum(failed deliveries)
            + delta * sum(late deliveries)

Constraints:
    1. Battery feasibility   : E(sortie) <= usable SoC                (physics.py)
    2. No-fly zones          : path must not cross restricted polygons (graph.py)
    3. Capacity              : each vehicle serves one order at a time
    4. Fleet size             : assignments bounded by available idle vehicles
    5. SLA deadline (soft)   : violations penalized via delta, not pruned

A sortie, not a one-way hop
---------------------------
A vehicle serves an order as a three-leg *sortie*, because an order is
picked up at the dark store it was placed at (`Order.origin`), not wherever
the vehicle happens to be parked:

    leg 0  reposition : vehicle station -> order.origin   (empty)
    leg 1  delivery   : order.origin    -> destination    (laden)
    leg 2  return     : destination     -> order.origin   (empty)

`delivery_time_s` (the customer's clock) covers legs 0+1. `cycle_time_s`
(vehicle occupancy) covers all three plus any battery swap. Legs 0 and 2
are why a fleet clustered at the wrong store is slow: repositioning is
real latency and real energy, and hiding it would flatter the fleet.
"""

import random
import itertools
import copy
from dataclasses import dataclass
from typing import Optional

from physics import DroneSpecs, round_trip_energy_wh, ground_trip_time_s
from graph import CityGraph, astar_energy_path

INR_PER_KWH = 8.0  # approximate Indian commercial grid rate


@dataclass
class Order:
    id: int
    origin: str          # dark store node id — where the goods physically are
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
    at_node: Optional[str] = None       # current station; None means "still at home"
    battery_swap_s: Optional[float] = None
    # battery_swap_s semantics (drones only):
    #   float -> a fresh battery is swapped in at the dark store, taking this
    #            many seconds, after which SoC is full again. This is what real
    #            delivery-drone operations do; charging in place is far too slow.
    #   None  -> no swap available, the drone drains until it can no longer
    #            make a round trip. Kept as an option because it is the harsher,
    #            more pessimistic model and makes a useful A/B in the demo.

    @property
    def station(self) -> str:
        """Node the vehicle is currently parked at."""
        return self.at_node or self.home_node


@dataclass
class Weights:
    """
    Tunable objective weights.

    IMPORTANT — the dominance invariant (see CLAUDE.md constraint #2):
    `gamma_fail` must strictly exceed the worst plausible cost of a *completed*
    delivery, including `delta_late`. If it does not, the cheapest thing the
    optimizer can do with a slow order is refuse to serve it at all, and the
    simulation reports nonsense (this happened during development). That is no
    longer a footgun you have to remember — `validate()` enforces it, and
    `run_simulation.py` calls `validate()` before every run.

    `delta_late` is deliberately separate from, and much smaller than,
    `gamma_fail`: an SLA miss is a bad outcome, a non-delivery is a worse one.
    Collapsing them into a single constant makes "fail the order" cheaper than
    "deliver it late", which inverts the intended preference.
    """
    alpha_time: float = 1.0     # weight on delivery time (seconds)
    beta_cost: float = 1.0      # weight on energy/fuel cost (INR)
    gamma_fail: float = 5000.0  # penalty for an unserved order
    delta_late: float = 500.0   # penalty for a served-but-late order

    def validate(self, worst_case_delivery_time_s: float = 3600.0,
                 worst_case_cost_inr: float = 200.0) -> None:
        """
        Raise if the dominance invariant above is violated.

        Defaults are deliberately above anything the reference run produces
        (observed worst: ~2455 s, ~INR 124 on the riders-only baseline), so the
        check bounds reality with headroom rather than tracking it exactly.
        """
        worst_delivered = (self.alpha_time * worst_case_delivery_time_s
                           + self.beta_cost * worst_case_cost_inr
                           + self.delta_late)
        if self.gamma_fail <= worst_delivered:
            raise ValueError(
                f"Weights.gamma_fail ({self.gamma_fail}) must exceed the worst "
                f"plausible completed-delivery cost ({worst_delivered:.0f}), or the "
                f"optimizer will prefer failing orders to delivering them late. "
                f"Raise gamma_fail or lower alpha_time/delta_late."
            )


def assignment_cost(weights: Weights, res: Optional[dict], order: Order) -> float:
    """
    THE objective function. Single source of truth.

    Every solver in this module scores candidates through this one function —
    `greedy_assign` for candidate selection *and* for its reported cost, and
    `brute_force_assign` for its exhaustive search. This is not stylistic: the
    optimality gap is only meaningful if both solvers minimise the *same*
    quantity. When they drifted apart during development (greedy charging an
    SLA penalty brute-force never saw) the demo reported a 365% gap that was
    pure accounting mismatch, not a worse heuristic.

    `res is None` means the order went unserved.
    """
    if res is None:
        return weights.gamma_fail
    late = res["delivery_time_s"] > order.sla_seconds
    return (weights.alpha_time * res["delivery_time_s"]
            + weights.beta_cost * res["cost_inr"]
            + (weights.delta_late if late else 0.0))


def generate_orders(duration_s: float, lambda_per_hour: float, dark_stores: list[str],
                     delivery_nodes: list[str], seed: int = 42,
                     graph: CityGraph = None) -> list[Order]:
    """
    Poisson arrival process: inter-arrival times ~ Exponential(lambda).
    This is the standard model for independent random order arrivals in
    queueing theory and is what real quick-commerce demand forecasting
    models assume at the base layer.

    When `graph` is supplied, each order is fulfilled from the dark store
    NEAREST its destination, which is the whole point of a dark-store network:
    stores are sited to serve a local catchment. Without it the origin is a
    uniform random store, which on a real city map means most orders become
    cross-town trips no operator would ever dispatch that way - it inflates
    both distance and battery failures for a reason that is an artefact of
    order generation, not of drone capability.
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
        destination = rng.choice(delivery_nodes)
        if graph is not None:
            origin = min(dark_stores,
                         key=lambda s: graph.straight_line_distance_m(s, destination))
        else:
            origin = rng.choice(dark_stores)
        orders.append(Order(
            id=oid,
            origin=origin,
            destination=destination,
            created_at_s=t,
            payload_kg=round(rng.uniform(0.5, 3.5), 2),
        ))
        oid += 1
    return orders


# ---------------------------------------------------------------------------
# A* memoisation.
#
# brute_force_assign re-solves the same (start, goal, payload) queries
# thousands of times across combinations. A* itself lives in graph.py and is
# Person B's; caching its *results* is a caller-side concern and belongs here.
# ---------------------------------------------------------------------------
_PATH_CACHE: dict = {}


def clear_path_cache() -> None:
    """Call between runs if map/specs change, so stale routes aren't reused."""
    _PATH_CACHE.clear()


def _route(graph: CityGraph, start: str, goal: str, specs: DroneSpecs,
           payload_kg: float, wind_mps: float, wind_dir_deg: float) -> Optional[dict]:
    if start == goal:
        return {"path": [start], "total_energy_wh": 0.0,
                "total_distance_m": 0.0, "total_time_s": 0.0}
    key = (start, goal, round(payload_kg, 2), specs.name, wind_mps, wind_dir_deg)
    if key not in _PATH_CACHE:
        _PATH_CACHE[key] = astar_energy_path(graph, start, goal, specs,
                                             payload_kg, wind_mps, wind_dir_deg)
    return _PATH_CACHE[key]


def _join(path_a: list, path_b: list) -> list:
    """Concatenate two routes, dropping the duplicated joint node."""
    if not path_a:
        return list(path_b)
    if not path_b:
        return list(path_a)
    return list(path_a) + list(path_b[1:] if path_b[0] == path_a[-1] else path_b)


def evaluate_drone_assignment(order: Order, vehicle: Vehicle, graph: CityGraph,
                               wind_mps: float, wind_dir_deg: float
                               ) -> tuple[Optional[dict], str]:
    """
    Cost breakdown for flying this order with this drone, as a full sortie
    (reposition -> deliver -> return). Returns (result, "") if feasible, or
    (None, reason) so the caller can report *why* an order failed rather than
    just that it did.
    """
    if vehicle.kind != "drone":
        return None, "wrong_vehicle_kind"

    # leg 0 — reposition empty to the store holding the goods
    repo = _route(graph, vehicle.station, order.origin, vehicle.specs,
                  0.0, wind_mps, wind_dir_deg)
    if repo is None:
        return None, "no_route_to_pickup"

    # leg 1 — laden flight to the customer
    out = _route(graph, order.origin, order.destination, vehicle.specs,
                 order.payload_kg, wind_mps, wind_dir_deg)
    if out is None:
        return None, "no_route_to_destination"

    # legs 1+2 — laden out, empty back. The drone must be able to get home.
    rt = round_trip_energy_wh(out["total_distance_m"], order.payload_kg, vehicle.specs,
                              wind_mps=wind_mps, wind_dir_deg=wind_dir_deg)
    sortie_energy_wh = repo["total_energy_wh"] + rt["total_energy_wh"]

    specs = vehicle.specs
    available_wh = vehicle.soc_frac * specs.battery_capacity_wh
    reserve_wh = specs.battery_reserve_frac * specs.battery_capacity_wh
    if sortie_energy_wh > available_wh - reserve_wh:
        return None, "battery_insufficient"

    delivery_time_s = repo["total_time_s"] + out["total_time_s"]
    return_time_s = rt["total_time_s"] - out["total_time_s"]
    cycle_time_s = delivery_time_s + max(0.0, return_time_s)
    if vehicle.battery_swap_s:
        cycle_time_s += vehicle.battery_swap_s

    return {
        "vehicle_id": vehicle.id,
        "delivery_time_s": delivery_time_s,
        "cycle_time_s": cycle_time_s,
        "energy_wh": sortie_energy_wh,
        # Customer-facing distance (reposition + laden legs), matching what
        # delivery_time_s covers. The return leg is in the energy figure but
        # not here, for the same reason it isn't in delivery_time_s.
        "distance_m": repo["total_distance_m"] + out["total_distance_m"],
        "cost_inr": sortie_energy_wh * INR_PER_KWH / 1000.0,
        "path": _join(repo["path"], out["path"]),
        "reposition_legs": max(0, len(repo["path"]) - 1),
    }, ""


def evaluate_rider_assignment(order: Order, vehicle: Vehicle, graph: CityGraph
                               ) -> tuple[Optional[dict], str]:
    """
    Ground rider baseline — deliberately no physics model (see docs/PHYSICS.md).
    Straight-line distance inflated by a 1.3x road detour factor. Riders have
    no energy constraint, so they only ever fail by being busy.
    """
    DETOUR = 1.3
    repo_m = graph.straight_line_distance_m(vehicle.station, order.origin) * DETOUR
    out_m = graph.straight_line_distance_m(order.origin, order.destination) * DETOUR

    delivery_time_s = ground_trip_time_s(repo_m + out_m, vehicle.specs)
    cycle_time_s = ground_trip_time_s(repo_m + 2 * out_m, vehicle.specs)
    # Riders are paid per km actually ridden, including repositioning and the
    # ride back to the store — charging only the laden leg understates them.
    cost_inr = ((repo_m + 2 * out_m) / 1000.0) * vehicle.specs.cost_per_km_inr

    return {
        "vehicle_id": vehicle.id,
        "delivery_time_s": delivery_time_s,
        "cycle_time_s": cycle_time_s,
        "energy_wh": None,
        "distance_m": repo_m + out_m,
        "cost_inr": cost_inr,
        "path": [vehicle.station, order.origin, order.destination],
        "reposition_legs": 0 if vehicle.station == order.origin else 1,
    }, ""


def evaluate(order: Order, vehicle: Vehicle, graph: CityGraph,
             wind_mps: float, wind_dir_deg: float) -> tuple[Optional[dict], str]:
    """Kind-agnostic dispatch to the right evaluator."""
    if vehicle.busy_until_s > order.created_at_s:
        return None, "vehicle_busy"
    if vehicle.kind == "drone":
        return evaluate_drone_assignment(order, vehicle, graph, wind_mps, wind_dir_deg)
    return evaluate_rider_assignment(order, vehicle, graph)


def commit(vehicle: Vehicle, order: Order, res: dict) -> None:
    """
    Apply an accepted assignment to vehicle state.

    Occupancy runs to the end of the *whole sortie* (including the return leg
    and any battery swap), not just to the customer's doorstep — a drone
    mid-flight home is not dispatchable, and releasing it early silently
    doubles apparent fleet capacity.
    """
    vehicle.busy_until_s = order.created_at_s + res["cycle_time_s"]
    vehicle.at_node = order.origin
    if vehicle.kind == "drone":
        if vehicle.battery_swap_s is not None:
            vehicle.soc_frac = 1.0  # fresh battery swapped in at the store
        else:
            spent = res["energy_wh"] / vehicle.specs.battery_capacity_wh
            vehicle.soc_frac = max(0.0, vehicle.soc_frac - spent)


def greedy_assign(orders: list[Order], vehicles: list[Vehicle], graph: CityGraph,
                   weights: Weights, wind_mps: float = 3.0, wind_dir_deg: float = 315.0
                   ) -> list[dict]:
    """
    Greedy feasibility-constrained heuristic (see module docstring for the
    formal problem this approximates).

    For each order, in arrival order:
      1. Evaluate all currently-idle, feasible vehicles (drones checked via
         physics-constrained A*, riders via simple distance/speed).
      2. Score each candidate through `assignment_cost` — the same objective
         `brute_force_assign` minimises.
      3. Assign to the lowest-cost feasible candidate.
      4. If none feasible, mark as failed and record why.

    This is O(orders * vehicles) — fine for real-time dispatch at
    hackathon/demo scale (dozens of orders, single-digit fleet size).
    """
    results = []
    for order in orders:
        candidates = []
        reasons = []
        for v in vehicles:
            res, reason = evaluate(order, v, graph, wind_mps, wind_dir_deg)
            if res is None:
                reasons.append(reason)
            else:
                candidates.append((assignment_cost(weights, res, order), v, res))

        if not candidates:
            results.append({
                "order_id": order.id,
                "status": "failed",
                "reason": _dominant_reason(reasons),
                "objective_cost": assignment_cost(weights, None, order),
            })
            continue

        candidates.sort(key=lambda c: c[0])
        score, vehicle, best = candidates[0]
        commit(vehicle, order, best)

        results.append({
            "order_id": order.id,
            "status": "delivered",
            "vehicle_id": vehicle.id,
            "vehicle_kind": vehicle.kind,
            "delivery_time_s": best["delivery_time_s"],
            "cycle_time_s": best["cycle_time_s"],
            "energy_wh": best["energy_wh"],
            "distance_m": best["distance_m"],
            "cost_inr": best["cost_inr"],
            "path": best["path"],
            "repositioned": best["reposition_legs"] > 0,
            "sla_violated": best["delivery_time_s"] > order.sla_seconds,
            "objective_cost": score,
        })
    return results


def _dominant_reason(reasons: list[str]) -> str:
    """
    Summarise why every vehicle was rejected. Reported verbatim in the trace so
    the dashboard can say *why* a fleet fails — "all drones airborne" and "no
    drone had the charge" are very different operational conclusions.
    """
    if not reasons:
        return "no_vehicles_in_fleet"
    if all(r == "vehicle_busy" for r in reasons):
        return "fleet_busy"
    if any(r == "battery_insufficient" for r in reasons):
        return "battery_insufficient"
    if any(r.startswith("no_route") for r in reasons):
        return "no_route_no_fly_zone"
    return reasons[0]


def brute_force_assign(orders: list[Order], vehicles: list[Vehicle], graph: CityGraph,
                        weights: Weights, wind_mps: float = 3.0, wind_dir_deg: float = 315.0
                        ) -> dict:
    """
    Exact optimal assignment via brute-force enumeration over every
    order -> vehicle (or unassigned) mapping.

    ONLY use on small batches (<= 8 orders) — this is exponential and exists
    purely to produce an optimality-gap comparison against greedy_assign.
    It scores through the same `assignment_cost` as greedy, so the resulting
    gap measures heuristic quality and nothing else.
    """
    n = len(orders)
    if n > 8:
        raise ValueError("brute_force_assign is exponential — keep batches <= 8 orders for a demo")

    best_total_cost = float("inf")
    best_assignment = None
    options = [v.id for v in vehicles] + [None]

    for combo in itertools.product(options, repeat=n):
        sim_vehicles = copy.deepcopy(vehicles)
        by_id = {v.id: v for v in sim_vehicles}
        total_cost = 0.0
        feasible_combo = True

        for order, vid in zip(orders, combo):
            if vid is None:
                total_cost += assignment_cost(weights, None, order)
                continue
            v = by_id[vid]
            res, _ = evaluate(order, v, graph, wind_mps, wind_dir_deg)
            if res is None:
                feasible_combo = False
                break
            total_cost += assignment_cost(weights, res, order)
            commit(v, order, res)

        if feasible_combo and total_cost < best_total_cost:
            best_total_cost = total_cost
            best_assignment = combo

    return {"best_total_cost": best_total_cost, "assignment": best_assignment}
