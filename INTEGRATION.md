# INTEGRATION.md v2 — wire the real engine into the real frontend

This replaces the v1 doc (three-way engine merge). **That merge is now done** —
`engine/` and `data/` in this repo already contain the verified-correct files
(see §1 for exactly what and why, kept for the record). The actual remaining
work, and the reason this doc exists, is **§2: connecting this working engine
to the real React/Vite frontend**, which was built independently against
fully invented mock data and has never seen real output.

**Hard constraint, repeated because it's the one thing not to get wrong:**
the frontend's visual design and component tree are final. Every file under
`frontend/src/components/`, `frontend/src/canvas/`, `frontend/src/index.css`
is off-limits — no restyling, no rearranging, no renaming props on those
files. The only frontend files this task should touch are the data layer:
`frontend/src/data/simulationAdapter.js` (currently a stub — this is the
real deliverable), and possibly a small loader addition in
`frontend/src/hooks/useSimulation.js` if trace.json needs to be fetched
asynchronously rather than imported (see §2.5).

## 1. Engine merge — already applied, for reference

Four people split this project: Person A owned `physics.py`/`calibration.py`,
Person B owned `graph.py`/`bhopal_map.json`, Person C owned
`optimizer.py`/`run_simulation.py`, Person D owns the frontend + final
integration. All three engine-side people built real implementations against
stub copies of each other's files — verified compatible at the interface
level (no one imported a signature the others changed). The files currently
in `engine/` and `data/` in this repo are already the correct merge:

- `engine/physics.py`, `engine/calibration.py` — Person A's versions.
  Note: `calibration.py` fixes a real bug in the original stub (it scored
  candidates against trip *time*, which the free parameters `eta`/`cd`/
  `frontal_area` don't affect at all — every candidate tied and it silently
  returned whichever was enumerated first). The fix scores against energy
  anchors instead and has an `assert_identifiable()` guard — **do not
  simplify this away**, it's there because the bug already happened once.
- `engine/graph.py` — Person B's version. Real point-in-polygon no-fly
  checking (catches a path fully inside a zone, which a segment-intersection
  test misses), plus `validate_graph()`.
- `engine/optimizer.py`, `engine/run_simulation.py` — Person C's versions.
  `Weights.validate()` enforces the dominance invariant (`gamma_fail` must
  exceed worst-case completed-delivery cost, or the optimizer prefers
  failing orders over delivering them late) at runtime, before every run.
- `data/bhopal_map.json` — Person B's version, with nodes repositioned off
  no-fly polygons and extra waypoints/delivery zones added for graph
  connectivity.
- `data/drone_specs.json` — Person A's version: actual calibration.py
  output (`eta: 0.6`, `frontal_area_m2: 0.10`), not hand-picked guesses.

**Verified working**: `python3 engine/calibration.py` passes its
identifiability guard and reproduces the documented fit quality (hover
endurance ~12.1 min vs 12.0 target, ~27.7 Wh/km vs 28.0 target).
`python3 engine/run_simulation.py` runs all three fleet-mode scenarios
(`drones_only`, `riders_only`, `mixed`) plus the greedy-vs-brute-force
optimality-gap demo, and writes `data/trace.json`.

One thing worth a look before trusting the numbers as final: on the current
fleet size (4 drones, 4 riders) and demand rate (12 orders/hr/store) against
this map, `riders_only` shows a ~76% failure rate, almost entirely
`fleet_busy` — i.e. 4 riders can't keep up with demand on this map's
geography. That's a fleet-sizing/demand-tuning question, not a bug, but
it's worth deciding deliberately (see §3) since it affects whether the
riders-only baseline looks credible in the demo.

## 2. Frontend adapter — the actual remaining work

### 2.1 The core problem

The frontend (`frontend/src/`) is a real, polished React/Vite app — but it
was built entirely against `frontend/src/data/mockSimulation.js`, a hand-
authored file of fully invented data, **not** against `trace.json`. That
file has been deleted (it was the "dummy data" — see §2.6 for what was kept).
It's been split into:

- `frontend/src/data/mapVisuals.js` — the static, non-simulation parts
  (depot marker, terrain contour art, airport shape, road overlay lines).
  This is decorative geography for the canvas, not simulation output.
  **Leave this file untouched** — it's part of the frontend's design.
- `frontend/src/data/simulationAdapter.js` — a stub that currently exports
  empty-but-valid `DRONE_SPECS`, `GROUND_SPECS`, and `SCENARIOS` (so the app
  builds and renders an empty state instead of crashing). **This is the file
  to fill in.** It must end up exporting the same three names, in exactly
  the same shape the components already expect (documented in full below),
  populated from real data.

`frontend/src/hooks/useSimulation.js` has already been repointed to import
from these two new files instead of the deleted mock — that's the only
frontend-hook change made so far.

### 2.2 Two real mismatches to resolve, not just reformat

This isn't a reshaping exercise — two actual semantic gaps need a decision:

**(a) Fleet vs. single vehicle.** The mock models exactly one drone and one
ground vehicle per scenario, each with a single continuous `droneTrajectory`
/ `groundTrajectory` array serving every order in sequence. The real engine
simulates an actual fleet — 4 drones and 4 riders by default, each an
independent `Vehicle` with its own busy/idle schedule, running concurrently.
`greedy_assign`'s `results` list has one entry per order with a `vehicle_id`
and `path`, not one trajectory per vehicle. To get a `droneTrajectory`-shaped
array, results need to be grouped by `vehicle_id`, ordered by time, and
their `path` node-sequences (which are node IDs, not `{x,y,t}` keyframes —
see 2.3) turned into timestamped legs. **Decision needed:** either (i)
visualize one representative drone and one representative rider (e.g. the
busiest of each, or a synthetic composite), clearly simplifying the fleet
down to what the UI can show, or (ii) extend the adapter/hook to track
multiple concurrent trajectories if you decide the single-vehicle
visualization is too lossy for the demo. Either is legitimate — pick one and
document the choice in a comment at the top of `simulationAdapter.js`,
because whichever you pick changes how "assigned vehicle" attribution in
`orders` (§2.3) needs to work too.

**(b) Scenario semantics don't line up.** `ScenarioPanel.jsx` hardcodes
three scenario cards with fixed `id`/`label`/`badge` values (**do not
rename these, they're UI copy**):
```
{ id: "baseline", label: "Baseline",     badge: "Nominal" }
{ id: "peak",     label: "Peak Demand",  badge: "2.2x Traffic" }
{ id: "stress",   label: "Stress Test",  badge: "NFZ Reroute" }
```
These are a **demand-intensity / weather-stress axis** (nominal, then higher
order rate & traffic congestion, then higher wind & tighter no-fly
rerouting). The real engine's three scenarios in `trace.json`
(`drones_only`, `riders_only`, `mixed`) are a **fleet-composition axis** — a
completely different variable. These don't map onto each other 1:1. The
right fix is almost certainly on the engine side: add a `run_scenario`-style
sweep in `run_simulation.py` (or a new script) that runs the **mixed fleet**
three times at increasing `demand.orders_per_hour_per_store` and
`wind.speed_mps` (pulling those from `data/drone_specs.json`'s
`demand`/`wind` blocks) to produce three outputs that actually correspond to
"baseline / peak / stress" in the sense the UI already promises, then have
the adapter consume *those* three instead of the existing
`drones_only`/`riders_only`/`mixed` split. If you'd rather keep
`drones_only`/`riders_only`/`mixed` as the three scenarios shown, that
requires changing `ScenarioPanel.jsx`'s hardcoded copy — which is explicitly
out of scope per the person who owns this frontend. Don't do that without
checking with them first.

### 2.3 Exact contract: what `simulationAdapter.js` must export

```js
export const DRONE_SPECS = {
  model: string,              // display name -- invent something reasonable,
                               // e.g. from data/drone_specs.json's "name" field
  maxPayloadKg: number,       // <- drone_specs.json: drone.max_payload_kg
  cruiseSpeedKmh: number,     // <- drone.cruise_speed_mps * 3.6
  batteryCapacityKwh: number, // <- drone.battery_capacity_wh / 1000
  avgEnergyPerKmKwh: number,  // <- derive from cruise_energy_per_km_wh()
                               //    in physics.py (Wh/km / 1000), or from
                               //    observed trace data (avg cost_inr /
                               //    INR_PER_KWH / avg distance) -- pick one
                               //    and note which in a comment
  maxFlightAltitudeM: number, // no engine equivalent exists -- this is a
                               // cosmetic/display-only field in the mock,
                               // fine to keep a fixed plausible value
  sensorPayload: string       // cosmetic, no engine equivalent -- fine to
                               // keep fixed descriptive text
};

export const GROUND_SPECS = {
  model: string,
  maxPayloadKg: number,       // no ground_vehicle field for this -- the
                               // real ground_vehicle spec doesn't cap
                               // payload; keep a fixed plausible value
                               // or add a field to drone_specs.json if
                               // you want it to be real
  avgSpeedKmh: number,        // <- drone_specs.json: ground_vehicle.avg_speed_kmh
  batteryCapacityKwh: number, // no real equivalent -- riders have no energy
                               // model (see docs/PHYSICS.md on this) --
                               // cosmetic only
  avgEnergyPerKmKwh: number,  // cosmetic -- riders are costed in INR/km,
                               // not energy, in the real model
  trafficSensitivity: string  // cosmetic
};

export const SCENARIOS = {
  baseline: { /* one scenario object, shape below */ },
  peak: { /* ... */ },
  stress: { /* ... */ }
  // keys must stay exactly "baseline" | "peak" | "stress" -- see 2.2(b)
};
```

Each scenario object:
```js
{
  id: string,           // must match its key above
  name: string,          // fixed by ScenarioPanel.jsx, don't invent new copy
  tagline: string,        // same
  description: string,    // free to write real ones describing what's
                           // actually different about that run (demand
                           // rate, wind speed) instead of the placeholder
                           // flavor text the mock had
  weather: { windKmh: number, visibilityKm: number, condition: string, tempC: number },
                           // windKmh <- data/drone_specs.json wind.speed_mps * 3.6;
                           // the rest have no engine equivalent -- cosmetic,
                           // pick something consistent with the wind value
  trafficMultiplier: number,   // cosmetic, affects nothing computed -- fine
                                // to set based on the demand rate used for
                                // that scenario run
  droneSpeedFactor: number,    // cosmetic -- leave at 1.0 unless you have a
  groundSpeedFactor: number,   // reason tied to real data to vary it
  orders: [
    {
      id: string,            // <- `order_{order_id}` from trace results/orders
      title: string,          // no engine equivalent -- the real Order has
                               // no cargo description, only payload_kg;
                               // either invent generic category-based titles
                               // (e.g. by payload weight bucket) or add a
                               // "category" field to generate_orders() in
                               // optimizer.py if you want this to be real
      category: string,       // same -- cosmetic unless you extend the engine
      location: string,       // <- the destination node's id from
                               // bhopal_map.json, or a nicer label if you
                               // add human-readable names to the map nodes
      x: number, y: number,   // <- destination node's (x, y) from
                               // bhopal_map.json, RESCALED from the
                               // backend's 2000x2000 canvas space to this
                               // frontend's MAP_CONFIG.width/height
                               // (2400x1600) -- do this once, consistently,
                               // for every x/y in this file (order
                               // positions AND trajectory waypoints)
      priority: string,       // no engine equivalent -- derive a rule, e.g.
                               // from payload_kg or sla_seconds, or drop
                               // the concept of urgency tiers and always
                               // use one value -- your call, just be
                               // consistent
      status: string,         // "completed" | "assigned" | "pending" |
                               // "infeasible" -- derive from trace result:
                               // status=="delivered" -> "completed",
                               // status=="failed" -> "infeasible".
                               // "assigned"/"pending" are UI-only states
                               // for orders whose delivery hasn't happened
                               // yet as of `currentTime` -- see
                               // getDynamicOrders() in useSimulation.js,
                               // which already recomputes this at
                               // playback time from `completedAtSeconds`,
                               // so you likely only need "completed" vs
                               // "infeasible" here and let the existing
                               // hook logic derive the rest
      assignedVehicle: string,   // "drone" | "ground" <- result.vehicle_kind
                                  // ("drone" stays "drone", "rider" -> "ground")
      weightKg: number,          // <- order.payload_kg
      distanceKm: number,        // <- result.path / total_distance_m if you
                                  // thread it through, or approximate from
                                  // origin/destination straight-line dist
      etaMinutes: number,        // <- result.delivery_time_s / 60
      energyKwh: number,         // <- result.energy_wh / 1000 (drones) or
                                  // result.cost_inr / INR_PER_KWH (riders,
                                  // since riders are costed in INR not Wh --
                                  // see optimizer.py evaluate_rider_assignment)
      timeWindow: string,        // cosmetic -- derive from created_at_s and
                                  // sla_seconds if you want it real
      completedAtSeconds: number // <- order.created_at_s + result.delivery_time_s
    }
    // ... one entry per order in this scenario's run
  ],
  droneTrajectory: [ { x: number, y: number, t: number, alt: number } /* ... */ ],
  groundTrajectory: [ { x: number, y: number, t: number, alt: number } /* ... */ ],
      // per 2.2(a): built by walking the chosen representative vehicle's
      // assigned orders in time order, turning each order's `path` (list
      // of node ids) into consecutive {x,y} keyframes (rescaled per above)
      // stamped with elapsed time. `alt` has no engine equivalent for
      // ground vehicles (always 0 is fine) and is cosmetic for drones
      // (~90 for cruise, ~15 for a delivery touch-down, ~0 at the depot --
      // matches the pattern already visible in the now-deleted mock, which
      // is fine to mimic for visual polish since altitude isn't physically
      // simulated in engine/physics.py beyond hover-vs-cruise power draw)
  metrics: {
    totalOrders: number,             // <- summary.total_orders
    droneDeliveries: number,         // <- summary.delivered_by_kind.drone
    groundDeliveries: number,        // <- summary.delivered_by_kind.rider
    infeasibleOrders: number,        // <- summary.failed
    avgDeliveryTimeMinutes: number,  // <- summary.avg_delivery_time_s / 60
    droneAvgDeliveryTimeMinutes: number,  // <- compute from delivered
    groundAvgDeliveryTimeMinutes: number, // results filtered by vehicle_kind
    droneAvgDistanceKm: number,      // <- same, from per-order distance
    groundAvgDistanceKm: number,
    droneEnergyKwh: number,          // <- sum of energy_wh for drone
                                      //    deliveries / 1000
    groundEnergyKwh: number,         // <- sum of cost_inr / INR_PER_KWH
                                      //    for rider deliveries
    optimalityGapPct: number,        // <- optimality_gap_demo.optimality_gap_pct
                                      //    (same value for every scenario,
                                      //    since it's a separate fixed demo
                                      //    batch, not per-scenario)
    totalEnergyUsedKwh: number,      // <- droneEnergyKwh + groundEnergyKwh
    feasibilityRatePct: number       // <- (1 - summary.failure_rate) * 100
  }
}
```

### 2.4 Coordinate rescaling -- do this once, correctly, in one place

Backend map coordinates (`data/bhopal_map.json` node `x`/`y`, and therefore
every path/route computed from them) live in a 2000x2000 canvas space
(`CityGraph.SCALE_M_PER_UNIT = 6.0` meters/unit, see `engine/graph.py`).
The frontend's `MAP_CONFIG.width`/`height` (in `mapVisuals.js`) is
2400x1600 -- a different space, already used to position the static
terrain/airport/depot art. Every real `x`/`y` value placed into
`SCENARIOS` (order positions, trajectory waypoints) needs to be rescaled
from the former into the latter before being written into
`simulationAdapter.js`'s output, or delivery markers and drone paths will
not line up with the terrain/no-fly art underneath them. Write one small
conversion function and use it everywhere a backend coordinate becomes a
frontend one -- don't inline the math at each call site.

### 2.5 How trace.json actually gets into the frontend

There is currently no wiring at all between `data/trace.json` and
`frontend/`. Two reasonable approaches:

1. **Build-time**: copy/symlink `data/trace.json` into
   `frontend/src/data/` (or `frontend/public/`) and have
   `simulationAdapter.js` `import` it directly as JSON (Vite supports this
   natively). Simplest, but the frontend won't pick up a re-run of
   `run_simulation.py` without a rebuild.
2. **Runtime fetch**: copy `trace.json` into `frontend/public/data/` and
   have `simulationAdapter.js` (or a small addition to `useSimulation.js`)
   `fetch('/data/trace.json')` on mount, same pattern the earlier plain-
   HTML prototype used. More moving parts (async loading state needs
   handling -- `SCENARIOS` starting as the empty stub until the fetch
   resolves is actually already the right fallback for this).

Either is fine for a hackathon demo; pick whichever is less invasive given
how `useSimulation.js` is currently structured, and note the choice at the
top of `simulationAdapter.js`.

### 2.6 What was already cleaned up in this pass

- Deleted `frontend/src/data/mockSimulation.js` (the fake `SCENARIOS`,
  `DRONE_SPECS`, `GROUND_SPECS` -- this was the dummy data). Its static,
  non-simulation geography (depot/terrain/airport/roads) was kept, moved to
  `frontend/src/data/mapVisuals.js` unchanged -- that's real design, not
  mock simulation data, and stays exactly as the frontend author built it.
- Removed unused default Vite/React boilerplate (`react.svg`, `vite.svg` in
  `frontend/src/assets/`) -- confirmed unreferenced anywhere in `src/` or
  `index.html` before removing.
- Removed `__pycache__`, `.DS_Store`, and macOS zip-artifact cruft.
- `engine/`/`data/` already reflect the verified merge from §1 -- no stub
  files remain.

Nothing about the component tree, CSS, or canvas renderers was touched.

## 3. Open items for whoever's driving this (flag, don't silently decide)

- **Rider fleet sizing** (§1): `riders_only` currently fails ~76% of orders
  on `fleet_busy`. If the demo leans on the riders-only baseline looking
  credible, either the fleet size (`data/drone_specs.json` -> `fleet.num_riders`)
  or the demand rate (`demand.orders_per_hour_per_store`) needs deliberate
  tuning -- don't just quietly change these without a heads-up, since they
  affect every scenario's numbers, not just riders_only.
- **2.2(a) fleet-to-single-vehicle decision** -- pick an approach and note
  it; this is the single biggest judgment call in this task.
- **2.2(b) scenario-axis decision** -- same.
- Cosmetic-only fields with no engine equivalent (drone `sensorPayload`,
  ground `maxPayloadKg`, `timeWindow` strings, etc.) are called out inline
  above -- fine to leave as sensible fixed values, just don't present them
  as measured/simulated when asked, since that would misrepresent what's
  real vs. decorative.
