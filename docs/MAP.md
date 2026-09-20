# Map Model

## Design choice: stylized 2D, not real GPS/tiles

The map is a **hand-authored, GTA-minimap-style 2D layout** in a fixed
`2000 × 2000` canvas coordinate space — not real latitude/longitude, not
map tiles. This was a deliberate choice, not a shortcut:

- No API keys, no tile-loading dependency, fully offline — nothing to break
  under hackathon time pressure or venue wifi.
- Reads instantly for a judge glancing at a screen: no-fly zones are bold
  red hatched polygons, dark stores are obvious blue markers — visual
  clarity was prioritized over geographic literalism.
- Zero coupling to the physics/optimization layer: `graph.py`'s
  `CityGraph.SCALE_M_PER_UNIT = 6.0` converts canvas units to meters, so
  every energy/time calculation is in real physical units regardless of
  how the map is drawn.

## How canvas coordinates relate to real Bhopal geography

The layout in `data/bhopal_map.json` is a *stylized approximation*, placed
to reflect real relative geography, not surveyed coordinates:

| Canvas region | Represents | Why placed there |
|---|---|---|
| Upper-left quadrant, large no-fly polygon | Upper Lake | Bhopal's largest lake, no drone corridor exists over it |
| Adjacent smaller no-fly polygon | Lower Lake | Smaller lake near Old City |
| No-fly polygon near map center | VVIP Zone (Raj Bhavan / Vidhan Sabha) | Permanently restricted government airspace per DGCA rules |
| No-fly polygon, far corner | Airport Approach (Raja Bhoj Airport) | DGCA mandates a 5km red-zone radius around scheduled-service airports |
| `DS_MPNAGAR` | MP Nagar dark store | Dense commercial zone, real-world quick-commerce dark-store density |
| `DS_ARERA` | Arera Colony dark store | Wide-road residential zone, higher-value delivery cluster |
| `DS_KOLAR` | Kolar Road dark store | Sparser residential zone, longer average delivery distance |
| `WP_OLDCITY` | Old City waypoint | Dense, narrow-street zone — represents ground-vehicle-favorable terrain |

**If asked "is this the real Bhopal map":** no, and say so plainly — it's a
stylized representation authored to reflect real relative geography and
real regulatory constraints (lakes, VVIP zones, airport buffer), not a
GIS-accurate survey. A production version of this tool would ingest real
OSM/GIS data and real DGCA-published no-fly zone boundaries; that's flagged
as a natural next step in `docs/RESEARCH.md`, not something this build
attempted.

## Coordinate/scale reference

- Canvas: `2000 × 2000` units
- Scale: `1 unit = 6 meters` (`CityGraph.SCALE_M_PER_UNIT` in `graph.py`)
- Represented span: roughly a 12km × 12km area of central Bhopal
- All distances used in physics/energy calculations are converted to meters
  via this scale before being passed to `physics.py` — the frontend only
  ever draws in canvas units, it never sees or needs real-world units.

## Extending the map

To add a new zone, dark store, or delivery cluster: add nodes/edges to
`data/bhopal_map.json` following the existing schema (`id`, `x`, `y`,
`kind`). No code changes required — `graph.py`'s `CityGraph.from_json()`
loads the map generically. To add a new no-fly zone, add a polygon (list of
`[x, y]` canvas points) to the `no_fly_zones` array; `graph.py` will
automatically prune any A* edge crossing it.
