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
    # 1 canvas unit = this many meters. Default kept for any caller that builds
    # a graph by hand; from_json() overrides it per-instance from the map's
    # meta.metres_per_unit, so the scale always matches the map actually
    # loaded rather than a constant that silently goes stale when the map is
    # regenerated in a different projection.
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
        # Must be set before add_edge(), which converts units to metres.
        meta = raw.get("meta", {})
        if "metres_per_unit" in meta:
            g.SCALE_M_PER_UNIT = float(meta["metres_per_unit"])
        for n in raw["nodes"]:
            g.add_node(Node(id=n["id"], x=n["x"], y=n["y"], kind=n.get("kind", "waypoint")))
        for e in raw["edges"]:
            g.add_edge(e["a"], e["b"])
        for z in raw.get("no_fly_zones", []):
            g.no_fly_zones.append(NoFlyZone(name=z["name"], polygon=[tuple(p) for p in z["polygon"]],
                                             reason=z.get("reason", "restricted airspace")))
        # Validate the loaded graph against no-fly zones and connectivity
        errors = validate_graph(g)
        if errors:
            import sys
            print("WARNING: Graph validation found issues:", file=sys.stderr)
            for err in errors:
                print(f"  - {err}", file=sys.stderr)
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
        """Returns the zone name if the segment na->nb intersects any no-fly polygon, else None.

        Checks both edge-crossing (segment vs polygon edges) and containment
        (either endpoint inside the polygon), so an edge fully inside a no-fly
        zone is still caught even if it doesn't cross a polygon boundary.
        """
        for zone in self.no_fly_zones:
            if _segment_intersects_polygon((na.x, na.y), (nb.x, nb.y), zone.polygon):
                return zone.name
            # Also check if either endpoint is inside the polygon —
            # catches edges fully contained within a no-fly zone
            if _point_in_polygon(na.x, na.y, zone.polygon):
                return zone.name
            if _point_in_polygon(nb.x, nb.y, zone.polygon):
                return zone.name
        return None

    def straight_line_distance_m(self, a: str, b: str) -> float:
        na, nb = self.nodes[a], self.nodes[b]
        return math.hypot(na.x - nb.x, na.y - nb.y) * self.SCALE_M_PER_UNIT


def _point_in_polygon(px: float, py: float, polygon: list) -> bool:
    """Ray-casting point-in-polygon test. Returns True if (px, py) is inside the polygon."""
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


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


def _on_segment(p, q, r):
    """Check if point q lies on segment pr (assuming p, q, r are collinear)."""
    if (min(p[0], r[0]) <= q[0] <= max(p[0], r[0]) and
        min(p[1], r[1]) <= q[1] <= max(p[1], r[1])):
        return True
    return False


def _cross_product(o, a, b):
    """Cross product of vectors OA and OB."""
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def _segments_intersect(a, b, c, d):
    """Robust segment intersection test handling collinear/degenerate cases."""
    d1 = _cross_product(c, d, a)
    d2 = _cross_product(c, d, b)
    d3 = _cross_product(a, b, c)
    d4 = _cross_product(a, b, d)

    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
       ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    # Collinear cases
    if d1 == 0 and _on_segment(c, a, d):
        return True
    if d2 == 0 and _on_segment(c, b, d):
        return True
    if d3 == 0 and _on_segment(a, c, b):
        return True
    if d4 == 0 and _on_segment(a, d, b):
        return True

    return False


def _edge_heading_deg(na: Node, nb: Node) -> float:
    """Compute the compass heading (0=North, clockwise) from node na to nb."""
    dx = nb.x - na.x
    dy = nb.y - na.y
    # Canvas y-axis is inverted (down = positive), so north = negative dy
    # atan2 gives angle from positive x-axis counterclockwise
    # Convert to compass: 0=North, 90=East, 180=South, 270=West
    angle_rad = math.atan2(dx, -dy)  # Note: (dx, -dy) gives compass bearing
    angle_deg = math.degrees(angle_rad) % 360
    return angle_deg


def astar_energy_path(graph: CityGraph, start: str, goal: str, drone_specs: DroneSpecs,
                       payload_kg: float, wind_mps: float = 0.0, wind_dir_deg: float = 315.0,
                       altitude_m: float = 500.0) -> Optional[dict]:
    """
    A* search where edge cost = energy (Wh) to traverse it, not distance.
    Heuristic = straight-line-distance-based energy lower bound (admissible,
    since any real path's energy >= the energy of covering the same distance
    at best-case zero-hover, zero-wind cruise).

    Returns dict with path (list of node ids), path_coords (list of [x, y]),
    total_energy_wh, total_distance_m, total_time_s, or None if no feasible
    path exists (blocked by no-fly zones or exceeds battery even before reserve).
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
            return _reconstruct(came_from, current, g_energy, g_distance, g_time, graph)
        if current in visited:
            continue
        visited.add(current)

        for edge in graph.adjacency[current]:
            neighbor = edge.b
            na, nb = graph.nodes[current], graph.nodes[neighbor]
            blocked = graph.edge_crosses_no_fly(na, nb)
            if blocked:
                continue  # illegal airspace, A* never considers it

            # Compute per-edge heading for physically correct wind model
            heading = _edge_heading_deg(na, nb)
            leg = trip_energy_wh(edge.distance_m, payload_kg, drone_specs,
                                  altitude_m=altitude_m, wind_mps=wind_mps,
                                  heading_deg=heading, wind_dir_deg=wind_dir_deg,
                                  hover_time_s=0.0)
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


def _reconstruct(came_from, current, g_energy, g_distance, g_time, graph):
    path = [current]
    while current in came_from:
        current = came_from[current]
        path.append(current)
    path.reverse()
    # Include waypoint coordinates for smooth frontend rendering
    path_coords = [[graph.nodes[nid].x, graph.nodes[nid].y] for nid in path]
    return {
        "path": path,
        "path_coords": path_coords,
        "total_energy_wh": g_energy[path[-1]],
        "total_distance_m": g_distance[path[-1]],
        "total_time_s": g_time[path[-1]],
    }


def validate_graph(graph: CityGraph) -> list[str]:
    """
    Validate the graph for common map-editing mistakes.
    Returns a list of error strings (empty = all good).

    Checks:
      1. No node sits inside a no-fly zone
      2. No defined edge crosses a no-fly zone
      3. All delivery zones are reachable from at least one dark store
      4. No orphan nodes (every node has at least one edge)
    """
    errors = []

    # 1. Node-in-no-fly-zone check
    for node in graph.nodes.values():
        for zone in graph.no_fly_zones:
            if _point_in_polygon(node.x, node.y, zone.polygon):
                errors.append(f"Node '{node.id}' ({node.x}, {node.y}) is inside no-fly zone '{zone.name}'")

    # 2. Edge-crosses-no-fly-zone check
    for edge in graph.edges:
        na, nb = graph.nodes[edge.a], graph.nodes[edge.b]
        blocked = graph.edge_crosses_no_fly(na, nb)
        if blocked:
            errors.append(f"Edge '{edge.a}' -> '{edge.b}' crosses no-fly zone '{blocked}'")

    # 3. Reachability: every delivery zone reachable from at least one dark store
    dark_stores = [n.id for n in graph.nodes.values() if n.kind == "dark_store"]
    delivery_zones = [n.id for n in graph.nodes.values() if n.kind == "delivery_zone"]

    # BFS reachability from all dark stores combined
    reachable = set()
    from collections import deque
    queue = deque(dark_stores)
    reachable.update(dark_stores)
    while queue:
        cur = queue.popleft()
        for edge in graph.adjacency.get(cur, []):
            if edge.b not in reachable:
                reachable.add(edge.b)
                queue.append(edge.b)

    for dz in delivery_zones:
        if dz not in reachable:
            errors.append(f"Delivery zone '{dz}' is unreachable from any dark store")

    # 4. Orphan nodes
    for nid in graph.nodes:
        if not graph.adjacency.get(nid):
            errors.append(f"Node '{nid}' has no edges (orphan)")

    return errors
