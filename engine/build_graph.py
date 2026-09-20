"""
build_graph.py — derive the engine's routing graph from real OpenStreetMap
geography.

Input:  data/bhopal_basemap.json  (OSM extract: roads, parks, water, no-fly
                                   zones, district labels, in a 2400x1600
                                   canvas at 8 m/unit)
Output: data/bhopal_map.json      (nodes / edges / no_fly_zones, the schema
                                   CityGraph.from_json already reads)

Usage:
    python build_graph.py
    (then re-run run_simulation.py, which consumes the generated map)

Why this exists
---------------
The original map was a hand-placed 27-node sketch in an abstract 2000x2000
space. This script replaces it with a network derived from the actual Bhopal
road geometry in the basemap, so routed distances correspond to real
arterial layout rather than to invented straight lines.

What is real here, and what is an approximation — stated plainly because the
rest of the project is careful about this distinction:

  * Road geometry, no-fly polygons, parks, water and district label
    positions: real, straight from OpenStreetMap (ODbL).
  * The routing network: real road vertices, simplified onto a ~SNAP_UNITS
    grid so A* runs at demo speed. Simplification moves a vertex by at most
    half a grid cell (~32 m at the default setting).
  * Dark store and delivery zone placement: the eight locations that exist
    as OSM district labels use those exact coordinates. The rest are
    approximate locality centroids, projected through the basemap's own
    lat/lon projection. They are real Bhopal localities at roughly the right
    place, not surveyed addresses — see LOCALITIES below.

Drones are routed over the arterial network rather than in free straight
lines. That is a deliberate modelling choice, not a limitation: it keeps
flight paths inside corridors that are already cleared of buildings, which
is how BVLOS delivery corridors are typically proposed. Riders never use
this graph's edges — optimizer.py costs them on straight-line distance with
a road detour factor.
"""

import json
import math
import os
from collections import defaultdict, deque

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
BASEMAP = os.path.join(DATA_DIR, "bhopal_basemap.json")
OUT_MAP = os.path.join(DATA_DIR, "bhopal_map.json")

# Road classes used for the routable network. localStreets is deliberately
# excluded: it is 54k vertices of residential cul-de-sacs that add nothing to
# inter-district routing and would make A* far slower for no benefit.
ROAD_CLASSES = ("primary", "secondary", "tertiary")

# Grid cell, in canvas units, that road vertices are snapped onto. 8 units at
# 8 m/unit = 64 m, so a merged intersection is never more than ~32 m from its
# true position. Lower = more faithful and slower.
SNAP_UNITS = 8.0

# Dark stores, sited on the three district labels the basemap already marks as
# commercial/business/corridor hubs.
# Four stores, chosen for spatial coverage rather than count: north (Old
# Bhopal), centre-west (TT Nagar), east (MP Nagar), south (Kolar Road). A
# dark-store network only works if every catchment has a store within roughly
# a drone's half-range; three stores all sited centre/south-east left northern
# Bhopal 6+ km from its nearest origin, which is a siting artefact rather than
# a real limit on the aircraft.
DARK_STORES = {
    "DS_OLDBHOPAL": "OLD BHOPAL",
    "DS_TTNAGAR": "TT NAGAR",
    "DS_MPNAGAR": "MP NAGAR",
    "DS_KOLAR": "KOLAR ROAD",
}

# Delivery zones taken directly from basemap district labels (exact OSM
# positions).
ZONES_FROM_LABELS = {
    "DEL_NEWMARKET": "NEW MARKET",
    "DEL_ARERA": "ARERA COLONY",
    "DEL_HABIBGANJ": "HABIBGANJ",
    "DEL_BAIRAGARH": "BAIRAGARH",
}

# Additional real Bhopal localities that the basemap has no label for, as
# approximate centroids in WGS84. Projected below through the basemap's own
# projection so they land in the same frame as everything else. These are
# roughly-right locality centres, not surveyed points.
LOCALITIES = {
    "DEL_GOVINDPURA": (23.2540, 77.4720),
    "DEL_SHAHPURA": (23.1990, 77.4270),
    "DEL_BAWADIA": (23.1960, 77.4460),
    "DEL_PIPLANI": (23.2470, 77.4790),
    "DEL_KATARA": (23.1850, 77.4900),
    "DEL_CHUNABHATTI": (23.2050, 77.4180),
}


def project(meta, lat, lon):
    """WGS84 -> basemap canvas units, using the basemap's own projection."""
    o = meta["origin"]
    x = o["x"] + (lon - o["lon"]) * meta["metresPerDegLon"] / meta["metresPerUnit"]
    y = o["y"] - (lat - o["lat"]) * meta["metresPerDegLat"] / meta["metresPerUnit"]
    return x, y


def _seg_intersect(p1, p2, p3, p4):
    """True if segment p1-p2 properly crosses segment p3-p4."""
    def ccw(a, b, c):
        return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0])
    return ccw(p1, p3, p4) != ccw(p2, p3, p4) and ccw(p1, p2, p3) != ccw(p1, p2, p4)


def segment_crosses_polygon(a, b, poly):
    """True if segment a-b cuts any edge of the polygon."""
    n = len(poly)
    for i in range(n):
        if _seg_intersect(a, b, poly[i], poly[(i + 1) % n]):
            return True
    return False


def point_in_polygon(px, py, poly):
    inside = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > py) != (y2 > py):
            xi = (x2 - x1) * (py - y1) / (y2 - y1) + x1
            if px < xi:
                inside = not inside
    return inside


def main():
    with open(BASEMAP) as f:
        base = json.load(f)
    meta = base["meta"]
    zones = [(z["name"], z["points"]) for z in base["noFlyZones"]]

    def in_any_zone(x, y):
        return any(point_in_polygon(x, y, pts) for _, pts in zones)

    # --- 1. snap arterial road vertices onto a grid --------------------------
    def cell(x, y):
        return (round(x / SNAP_UNITS), round(y / SNAP_UNITS))

    cell_pos = {}          # cell -> representative (x, y)
    adjacency = defaultdict(set)

    for cls in ROAD_CLASSES:
        for way in base["roads"].get(cls, []):
            prev = None
            for x, y in way:
                c = cell(x, y)
                if c not in cell_pos:
                    cell_pos[c] = (round(c[0] * SNAP_UNITS, 1),
                                   round(c[1] * SNAP_UNITS, 1))
                if prev is not None and prev != c:
                    adjacency[prev].add(c)
                    adjacency[c].add(prev)
                prev = c

    # --- 2. drop anything inside a no-fly polygon ----------------------------
    # Drones cannot use these edges at all, so carrying them would only create
    # graph components that A* can never enter.
    blocked = {c for c, (x, y) in cell_pos.items() if in_any_zone(x, y)}
    for c in blocked:
        for nb in adjacency.pop(c, ()):
            adjacency[nb].discard(c)
        cell_pos.pop(c, None)

    # --- 2b. drop edges that cut through a zone even though both ends are
    # outside it. Real causeways cross Lower Lake; a drone corridor cannot.
    crossing = 0
    for c in list(adjacency):
        for nb in list(adjacency[c]):
            if c not in cell_pos or nb not in cell_pos:
                continue
            if any(segment_crosses_polygon(cell_pos[c], cell_pos[nb], pts)
                   for _, pts in zones):
                # Both directions are discarded here, so the reverse pair is
                # never revisited - this counts each edge exactly once.
                adjacency[c].discard(nb)
                adjacency[nb].discard(c)
                crossing += 1

    # --- 3. keep only the largest connected component ------------------------
    seen, best = set(), []
    for start in cell_pos:
        if start in seen:
            continue
        comp, q = [], deque([start])
        seen.add(start)
        while q:
            c = q.popleft()
            comp.append(c)
            for nb in adjacency[c]:
                if nb not in seen:
                    seen.add(nb)
                    q.append(nb)
        if len(comp) > len(best):
            best = comp
    keep = set(best)

    nodes, edges = [], []
    cell_to_id = {}
    for i, c in enumerate(sorted(keep)):
        nid = f"WP_{i:04d}"
        cell_to_id[c] = nid
        x, y = cell_pos[c]
        nodes.append({"id": nid, "x": x, "y": y, "kind": "waypoint"})

    emitted = set()
    for c in keep:
        for nb in adjacency[c]:
            if nb not in keep:
                continue
            pair = tuple(sorted((c, nb)))
            if pair in emitted:
                continue
            emitted.add(pair)
            edges.append({"a": cell_to_id[pair[0]], "b": cell_to_id[pair[1]]})

    # --- 4. attach stores and delivery zones ---------------------------------
    labels = {d["text"]: (d["x"], d["y"]) for d in base["districtLabels"]}
    sites = {}
    for nid, label in DARK_STORES.items():
        sites[nid] = ("dark_store", labels[label])
    for nid, label in ZONES_FROM_LABELS.items():
        sites[nid] = ("delivery_zone", labels[label])
    for nid, (lat, lon) in LOCALITIES.items():
        sites[nid] = ("delivery_zone", project(meta, lat, lon))

    node_by_id = {n["id"]: n for n in nodes}
    excluded = []
    for nid, (kind, (sx, sy)) in sites.items():
        if not (0 <= sx <= meta["width"] and 0 <= sy <= meta["height"]):
            # Outside the OSM extract entirely (Misrod, for one, sits south of
            # its southern edge). Placing it anyway would put a delivery marker
            # off-canvas and route to geography we have no data for.
            excluded.append(f"{nid} (outside basemap extent)")
            continue
        if in_any_zone(sx, sy):
            # Not an error: some real localities genuinely sit inside
            # restricted airspace (Bairagarh is under the Raja Bhoj approach).
            # They are excluded from the drone-servable network rather than
            # nudged outside it, which would fake coverage the airspace
            # doesn't allow.
            excluded.append(f"{nid} (restricted airspace)")
            continue
        # Connect to the nearest routable waypoint whose connecting edge does
        # not itself cut through restricted airspace.
        best_id, best_d = None, None
        for n in nodes:
            d = math.hypot(n["x"] - sx, n["y"] - sy)
            if best_d is None or d < best_d:
                if any(segment_crosses_polygon((sx, sy), (n["x"], n["y"]), pts)
                       for _, pts in zones):
                    continue
                best_id, best_d = n["id"], d
        if best_id is None:
            raise SystemExit(f"{nid} could not be attached to the road network")
        node_by_id[nid] = {"id": nid, "x": round(sx, 1), "y": round(sy, 1), "kind": kind}
        nodes.append(node_by_id[nid])
        edges.append({"a": nid, "b": best_id})

    out = {
        "_comment": (
            "GENERATED by engine/build_graph.py from data/bhopal_basemap.json "
            "(OpenStreetMap, ODbL). Do not hand-edit - re-run the builder."
        ),
        "meta": {
            "source": meta["source"],
            "metres_per_unit": meta["metresPerUnit"],
            "width": meta["width"],
            "height": meta["height"],
            "snap_units": SNAP_UNITS,
            "road_classes": list(ROAD_CLASSES),
        },
        "nodes": nodes,
        "edges": edges,
        "no_fly_zones": [
            {"name": z["name"], "polygon": z["points"], "reason": z["reason"]}
            for z in base["noFlyZones"]
        ],
    }

    with open(OUT_MAP, "w") as f:
        json.dump(out, f, separators=(",", ":"))

    # Mirror the basemap into the Vite source tree so mapVisuals.js can import
    # it (same reason as trace.json - Vite cannot import from outside its root).
    fe_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data")
    if os.path.isdir(fe_dir):
        fe_base = os.path.normpath(os.path.join(fe_dir, "bhopal_basemap.json"))
        with open(fe_base, "w") as f:
            json.dump(base, f, separators=(",", ":"))
        print(f"  basemap mirrored to {fe_base}")

    stores = sum(1 for n in nodes if n["kind"] == "dark_store")
    dz = sum(1 for n in nodes if n["kind"] == "delivery_zone")
    print(f"Wrote {os.path.normpath(OUT_MAP)}")
    print(f"  {len(nodes)} nodes ({stores} dark stores, {dz} delivery zones, "
          f"{len(nodes) - stores - dz} road waypoints)")
    print(f"  {len(edges)} edges, {len(out['no_fly_zones'])} no-fly zones")
    print(f"  dropped {len(blocked)} vertices inside no-fly airspace, "
          f"{crossing} edges crossing it")
    if excluded:
        print(f"  excluded: {'; '.join(sorted(excluded))}")


if __name__ == "__main__":
    main()
