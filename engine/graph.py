"""
graph.py — City graph representation + A* pathfinding.

The city (Bhopal, stylized) is represented as a graph:
  - Nodes: waypoints with (x, y) coordinates in a 2000x2000 canvas space
           (see docs/MAP.md for how this maps conceptually to real Bhopal geography)
  - Edges: flight corridors between nodes, weighted by ENERGY COST (Wh),
           not raw distance — this is what makes the pathfinding
           energy-aware rather than merely geometric.

No-fly zones are polygons; any edge crossing one is pruned before search,
so A* never even considers an illegal path.
"""

import json
import math
import heapq
from dataclasses import dataclass, field
from typing import Optional

from physics import DroneSpecs, trip_energy_wh, air_density


@dataclass
class Node:
    id: str
    x: float
    y: float
    kind: str = "waypoint"  # "waypoint" | "dark_store" | "delivery_zone"


@dataclass
class Edge:
    a: str
    b: str
    distance_m: float  # pre-scaled from canvas units to meters (see CityGraph.SCALE)


@dataclass
class NoFlyZone:
    name: str
    polygon: list  # list of (x, y) tuples, canvas space
    reason: str = "restricted airspace"


class CityGraph:
    # 1 canvas unit = this many meters. Canvas is 2000x2000 units representing
    # roughly a 12km x 12km span of central Bhopal.
    SCALE_M_PER_UNIT = 6.0

    def __init__(self):
        self.nodes: dict[str, Node] = {}
        self.edges: list[Edge] = []
        self.adjacency: dict[str, list[Edge]] = {}
        self.no_fly_zones: list[NoFlyZone] = []

    @classmethod
    def from_json(cls, path: str) -> "CityGraph":
        with open(path) as f:
            raw = json.load(f)
        g = cls()
        for n in raw["nodes"]:
            g.add_node(Node(id=n["id"], x=n["x"], y=n["y"], kind=n.get("kind", "waypoint")))
        for e in raw["edges"]:
            g.add_edge(e["a"], e["b"])
        for z in raw.get("no_fly_zones", []):
            g.no_fly_zones.append(NoFlyZone(name=z["name"], polygon=[tuple(p) for p in z["polygon"]],
                                             reason=z.get("reason", "restricted airspace")))
        return g

    def add_node(self, node: Node):
        self.nodes[node.id] = node
        self.adjacency.setdefault(node.id, [])

    def add_edge(self, a: str, b: str):
        na, nb = self.nodes[a], self.nodes[b]
        dist_units = math.hypot(na.x - nb.x, na.y - nb.y)
        dist_m = dist_units * self.SCALE_M_PER_UNIT
        edge = Edge(a=a, b=b, distance_m=dist_m)
        self.edges.append(edge)
        self.adjacency[a].append(edge)
        self.adjacency[b].append(Edge(a=b, b=a, distance_m=dist_m))

    def edge_crosses_no_fly(self, na: Node, nb: Node) -> Optional[str]:
        """Returns the zone name if the segment na->nb intersects any no-fly polygon, else None."""
        for zone in self.no_fly_zones:
            if _segment_intersects_polygon((na.x, na.y), (nb.x, nb.y), zone.polygon):
                return zone.name
        return None

    def straight_line_distance_m(self, a: str, b: str) -> float:
        na, nb = self.nodes[a], self.nodes[b]
        return math.hypot(na.x - nb.x, na.y - nb.y) * self.SCALE_M_PER_UNIT


def _segment_intersects_polygon(p1, p2, polygon) -> bool:
    """Simple segment-vs-polygon-edges intersection test."""
    n = len(polygon)
    for i in range(n):
        q1 = polygon[i]
        q2 = polygon[(i + 1) % n]
        if _segments_intersect(p1, p2, q1, q2):
            return True
    return False


def _ccw(a, b, c):
    return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])


def _segments_intersect(a, b, c, d):
    return _ccw(a, c, d) != _ccw(b, c, d) and _ccw(a, b, c) != _ccw(a, b, d)


def astar_energy_path(graph: CityGraph, start: str, goal: str, drone_specs: DroneSpecs,
                       payload_kg: float, wind_mps: float = 0.0, wind_dir_deg: float = 315.0,
                       altitude_m: float = 500.0) -> Optional[dict]:
    """
    A* search where edge cost = energy (Wh) to traverse it, not distance.
    Heuristic = straight-line-distance-based energy lower bound (admissible,
    since any real path's energy >= the energy of covering the same distance
    at best-case zero-hover, zero-wind cruise).

    Returns dict with path (list of node ids), total_energy_wh, total_distance_m,
    total_time_s, or None if no feasible path exists (blocked by no-fly zones
    or exceeds battery even before reserve).
    """
    def heuristic(node_id):
        dist = graph.straight_line_distance_m(node_id, goal)
        # cheap lower-bound: cruise-only energy at design speed, no hover, no wind
        est = trip_energy_wh(dist, payload_kg, drone_specs, altitude_m=altitude_m, hover_time_s=0.0)
        return est["total_energy_wh"]

    open_set = [(heuristic(start), start)]
    came_from = {}
    g_energy = {start: 0.0}
    g_distance = {start: 0.0}
    g_time = {start: 0.0}
    visited = set()

    while open_set:
        _, current = heapq.heappop(open_set)
        if current == goal:
            return _reconstruct(came_from, current, g_energy, g_distance, g_time)
        if current in visited:
            continue
        visited.add(current)

        for edge in graph.adjacency[current]:
            neighbor = edge.b
            na, nb = graph.nodes[current], graph.nodes[neighbor]
            blocked = graph.edge_crosses_no_fly(na, nb)
            if blocked:
                continue  # illegal airspace, A* never considers it

            leg = trip_energy_wh(edge.distance_m, payload_kg, drone_specs,
                                  altitude_m=altitude_m, wind_mps=wind_mps,
                                  wind_dir_deg=wind_dir_deg, hover_time_s=0.0)
            tentative_energy = g_energy[current] + leg["total_energy_wh"]

            if tentative_energy > drone_specs.usable_capacity_wh:
                continue  # would drain past safety reserve, prune

            if neighbor not in g_energy or tentative_energy < g_energy[neighbor]:
                came_from[neighbor] = current
                g_energy[neighbor] = tentative_energy
                g_distance[neighbor] = g_distance[current] + edge.distance_m
                g_time[neighbor] = g_time[current] + leg["total_time_s"]
                priority = tentative_energy + heuristic(neighbor)
                heapq.heappush(open_set, (priority, neighbor))

    return None  # no feasible path


def _reconstruct(came_from, current, g_energy, g_distance, g_time):
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return {
        "path": path,
        "total_energy_wh": g_energy[path[-1]],
        "total_distance_m": g_distance[path[-1]],
        "total_time_s": g_time[path[-1]],
    }
