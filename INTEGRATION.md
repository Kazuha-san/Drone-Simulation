# INTEGRATION.md — Merge the three dev builds into one live system

**Read this whole file before touching anything.** It tells you exactly which
file from which repo wins, why, and what's left to actually build. This was
produced by diffing all three submitted repos byte-for-byte, not by guessing.

## 0. Context

Four people split this project (see each repo's `team.md`):

- **Person A** — `engine/physics.py`, `engine/calibration.py`
- **Person B** — `engine/graph.py`, `data/bhopal_map.json`
- **Person C** — `engine/optimizer.py`, `engine/run_simulation.py`
- **Person D (you)** — `frontend/index.html` + final integration

All three submitted repos are near-identical **skeletons** that started from
the same shared stub. Each person only built out their own owned files and
left the other two files as the untouched original stub. This means:

- There is **no merge conflict at the code level** — nobody edited a file
  that wasn't theirs.
- The three "real" implementations were each built and tested against
  **stub versions** of the other two layers, not against each other. They
  have not actually run together yet. That's the integration risk, even
  though the interfaces line up on paper (verified below).

## 1. Source of truth for every file

Copy from these exact paths. Do not hand-merge anything — for every file
below, one repo's version wins outright and replaces the other two.

| Destination | Winning source | Why |
|---|---|---|
| `engine/physics.py` | **DevA** repo | 356 lines vs. 181-line stub in DevB/DevC. Verified superset: adds `bearing_deg`, `headwind_component_mps`, `hover_endurance_min`, `cruise_energy_per_km_wh` on top of the same base functions/signatures the other two imported. Nothing downstream breaks. |
| `engine/calibration.py` | **DevA** repo | DevB/DevC's version has a real bug: it scores calibration candidates against trip *time*, but time in `physics.py` never depends on `eta`/`cd`/`frontal_area` — only cruise speed and wind do. So every grid point ties and it silently returns whichever candidate was enumerated first. DevA's version fixes this by scoring against energy anchors (hover endurance → eta; cruise Wh/km → cd×frontal_area) and adds `assert_identifiable()`, which raises loudly if this class of bug ever reappears. Keep this guard — don't simplify it away. |
| `engine/graph.py` | **DevB** repo | 323 lines vs. 186-line stub in DevA/DevC. Only imports `DroneSpecs, trip_energy_wh, air_density` from physics — same as the stub — so it's fully compatible with DevA's physics.py. Adds a real point-in-polygon no-fly check (the stub's segment-intersection-only check misses a path that starts and ends inside a zone), `_edge_heading_deg`, and `validate_graph()`. |
| `engine/optimizer.py` | **DevC** repo | 448 lines vs. 247-line stub. Only imports `CityGraph, astar_energy_path` from graph — same as the stub — so it's fully compatible with DevB's graph.py. Also has a stronger `Weights.validate()` than the spec described: it computes the dominance invariant (`gamma_fail` must exceed worst-case completed-delivery cost) from actual formula terms instead of a hardcoded threshold, and `run_simulation.py` should call it before every run (it already does — see next row). |
| `engine/run_simulation.py` | **DevC** repo | The only one of the three orchestrators actually built against a real optimizer contract (`generate_orders`, `greedy_assign`, `brute_force_assign`, `clear_path_cache`, `Vehicle`, `Weights` — all from DevC's own optimizer.py). Its imports from `graph` and `physics` (`CityGraph`, `DroneSpecs`, `GroundVehicleSpecs`) are satisfied by DevB's and DevA's real files with no changes needed. This file should work as-is once the other three are swapped in — see §3 for the verification run that proves it. |
| `data/bhopal_map.json` | **DevB** repo | DevB repositioned several nodes that the stub map placed *inside* no-fly zone polygons (Upper/Lower Lake), and added 7 new waypoints/delivery zones + connecting edges so the graph stays connected after routing around no-fly airspace. This is the map DevB's graph.py logic was actually built and validated against. |
| `data/drone_specs.json` | **DevA** repo | Contains the *actual output* of the fixed `calibration.py` (`eta: 0.6`, `frontal_area_m2: 0.10`, changelog explaining the before/after). DevB/DevC's file has the old hand-guessed values from the buggy calibration run. Verify schema compatibility per §2 before trusting this blindly — it was authored against DevA's own map/fleet config, not DevB's expanded map. |
| `frontend/index.html` | **Any one copy — byte-identical across all three** | Nobody built this out. It is a real, non-trivial skeleton, though — not empty. It already has: full CSS/dark theme, header with scenario `<select>` (mixed/drones_only/riders_only) and play/reload buttons, a canvas + sidebar layout, a scrubber bar, a `toScreen()` coordinate mapper hardcoded to `CANVAS_UNITS = 2000` (matches `CityGraph`'s canvas space), and a `loadTrace()` function that already fetches `../data/trace.json` and has a "serve over HTTP, not file://" error message wired in. **Build on this, don't rewrite it from scratch.** What's missing is the actual `draw()` function, the summary/gap sidebar rendering, and the scrubber → animation wiring. Full spec in §4. |

## 2. Pre-flight schema check (do this before running anything)

I already verified the following by reading the actual source, but re-check
after you copy files in, since a hand-edit could break it silently:

1. `data/drone_specs.json` (DevA's version) has top-level keys `drone`,
   `ground_vehicle`, `fleet`, `wind`, `demand`. `run_simulation.py`
   (DevC's version) does `DroneSpecs(**cfg["drone"])` and
   `GroundVehicleSpecs(**cfg["ground_vehicle"])` — the keys under `drone`
   in DevA's JSON match `DroneSpecs`'s dataclass fields **exactly**
   (`name, empty_mass_kg, max_payload_kg, battery_capacity_wh, rotor_count,
   rotor_radius_m, eta, cd, frontal_area_m2, cruise_speed_mps,
   max_speed_mps, battery_reserve_frac`). Same for `ground_vehicle` →
   `GroundVehicleSpecs` (`name, avg_speed_kmh, cost_per_km_inr`). This
   should just work.
2. `fleet` in DevA's JSON only has `num_drones`/`num_riders` — no
   `battery_swap_s` key. `run_simulation.py` defaults that to `300.0`
   seconds via `DEFAULT_BATTERY_SWAP_S` if absent, so this is fine, not
   a bug.
3. `CityGraph.from_json()` (DevB's version) reads `nodes`, `edges`,
   `no_fly_zones` from the map JSON and calls `validate_graph()` on load,
   printing warnings to stderr (not raising) if it finds issues. **Actually
   read that stderr output** the first time you run this against DevB's
   map — don't just ignore warnings because the process didn't crash.
4. `run_simulation.py` calls `Weights().validate()` before running any
   scenario — if this raises, it means someone changed `Weights`' default
   constants without checking the dominance invariant. Don't silence
   this; fix the constants instead (see the docstring on `Weights` in
   `optimizer.py` for the exact rule).

## 3. Integration steps

```bash
# 1. Start from a clean copy of any one of the three repos as the base
#    (structure only — you're about to overwrite most of engine/ and data/)
cp -r Drone-Simulation-DevA drone-sim-integrated
cd drone-sim-integrated

# 2. Swap in the winning files per the table in §1
cp ../Drone-Simulation-DevA/engine/physics.py       engine/physics.py
cp ../Drone-Simulation-DevA/engine/calibration.py   engine/calibration.py
cp ../Drone-Simulation-DevB/engine/graph.py         engine/graph.py
cp ../Drone-Simulation-DevC/engine/optimizer.py     engine/optimizer.py
cp ../Drone-Simulation-DevC/engine/run_simulation.py engine/run_simulation.py
cp ../Drone-Simulation-DevB/data/bhopal_map.json    data/bhopal_map.json
cp ../Drone-Simulation-DevA/data/drone_specs.json   data/drone_specs.json
rm -rf engine/__pycache__

# 3. Run the calibration script FIRST, standalone, and read its output.
#    It should print the identifiability guard passing and fit-quality
#    numbers close to what's already in drone_specs.json's changelog
#    (hover endurance ~12.1 min vs 12.0 target; ~27.7 Wh/km vs 28.0 target).
#    If it errors or produces wildly different numbers, STOP — something
#    about the merged physics.py or the anchors doesn't match what's
#    documented, and that needs to be understood before going further.
cd engine
python3 calibration.py

# 4. Run the full simulation. This is the real integration test — it's the
#    first time all three real modules have ever executed together.
python3 run_simulation.py
```

## 4. Verification checklist (from the original spec — don't skip any)

1. `run_simulation.py` exits 0, no unhandled exceptions.
2. All three scenario summaries (`drones_only`, `riders_only`, `mixed`)
   are non-degenerate: `delivered` is not 0, `failure_rate` is not 1.0.
   If `drones_only` shows near-100% failure, check `failure_reasons` in
   its summary first — `battery_insufficient` vs `no_route_no_fly_zone`
   point to very different bugs (physics/fleet config vs. map/graph
   connectivity).
3. The optimality-gap demo output (`optimality_gap_pct`) is small — near
   0%. `run_simulation.py` already prints a warning if it's over 10% and
   points at `Weights`/`gamma_fail` as the likely cause — trust that
   warning, don't just eyeball the number.
4. Open the printed stderr from `CityGraph.from_json()` (step 3 above) —
   zero validation warnings ideally. If there are warnings about
   disconnected nodes or edges crossing no-fly zones, that's a real bug
   in the merged map/graph combo, not noise.
5. `data/trace.json` gets regenerated (check its timestamp) and its
   top-level shape is `{"map": {...}, "scenarios": {...},
   "optimality_gap_demo": {...}}` with `scenarios` having exactly the
   three fleet-mode keys.
6. Serve the repo root (`python3 -m http.server 8000` from the repo
   root, **not** from inside `frontend/`) and open
   `http://localhost:8000/frontend/index.html`. Confirm `loadTrace()`
   succeeds (no red error box) before doing any frontend work.

## 5. Frontend build spec (this is the actual remaining work)

The skeleton in `frontend/index.html` already has the shell built (see §1
table). What needs to be written:

**`draw()` function** — called on load, on resize, and on every scrubber
tick:
- Draw no-fly zone polygons first (from `trace.map.no_fly_zones`), using
  `toScreen()` for every point, filled semi-transparent in `--accent2`.
- Draw edges as thin lines between node positions (optional — nice to have
  for showing the routable graph, not load-bearing).
- Draw nodes: dark stores as blue dots, delivery zones as yellow dots (both
  colors already defined in the legend CSS — reuse them, don't invent new
  ones).
- For the currently selected scenario and current `simTime`, draw each
  in-flight vehicle along its `path` (array of node ids from that order's
  result) interpolated by delivery progress — drones in `--accent` (teal),
  riders in `#c084fc` (purple), matching the legend already in the HTML.
  You'll need to compute, per order, what fraction of `delivery_time_s` has
  elapsed at `simTime` and place the vehicle along its `path` accordingly
  (straight-line interpolation between consecutive path nodes is fine —
  this is a stylized 2D playback, not a physically exact animation).

**Sidebar rendering** (`#summaryBox`, `#gapBox`) — populate from
`trace.scenarios[currentScenario].summary` and
`trace.optimality_gap_demo` respectively when `renderSummary()` runs
(already called from `loadTrace()`, but currently does nothing — the
function body needs writing). Show at minimum: delivered/failed counts,
failure rate, SLA compliance, p50/p95 delivery time, avg cost. Use the
`.good`/`.bad` CSS classes already defined for color-coding (e.g. failure
rate under some threshold = good/teal, over = bad/red — pick a sensible
threshold, note it in a comment).

**Scrubber + play/pause wiring**:
- `#scrubber` (range input) already has its `max` set in `loadTrace()`
  from the last order's `created_at_s`. Wire its `input` event to set
  `simTime` and call `draw()`.
- `#playBtn` should start a `requestAnimationFrame` loop that advances
  `simTime`, updates the scrubber's displayed value and `#timeLabel`
  (format as `MM:SS`), and calls `draw()`, stopping at `scrubber.max`.
- `#scenarioSelect` change should update `currentScenario` and re-run
  `renderSummary()` + `draw()` (note: `maxTime`/scrubber max should also
  be recomputed per scenario, since order counts differ between
  drones_only/riders_only/mixed).
- `#stepBack`/`#stepFwd` should nudge `simTime` by some fixed increment
  (e.g. 30s) and redraw.
- `#loadBtn` just re-calls `loadTrace()`.

**Hard constraint (from the original spec, still applies):** the frontend
must never compute simulation logic — no re-deriving delivery times, no
re-running pathfinding, no recomputing energy. Everything it needs is
already in `trace.json`. If something feels missing, the fix is adding a
field to `run_simulation.py`'s trace output and regenerating, not computing
it in JS.

## 6. Non-negotiable invariants (from the original spec — preserve all of these)

1. `physics.py` must never import `graph.py` or `optimizer.py`.
2. `frontend/index.html` must never compute simulation logic — only render
   `trace.json`.
3. `Weights.gamma_fail` must stay well above realistic delivery-time costs
   (`Weights.validate()` now enforces this at runtime — don't remove the
   call in `run_simulation.py`).
4. Physics constants in `data/drone_specs.json` are calibrated — don't
   hand-edit without re-running `calibration.py` and updating the
   changelog comment explaining why.
5. No external dependencies — Python stdlib + vanilla HTML/JS/Canvas only,
   in either layer.
6. No pitch/doc/UI copy claims real-world deployment or adoption. If you
   write any user-facing text in the frontend (empty states, tooltips,
   etc.), it should stay in the same register as the rest of the project:
   a research/feasibility artifact, not a product pitch.

## 7. Known open items / things to sanity-check, not blockers

- `data/drone_specs.json` (DevA's, now canonical) was authored/tested
  against DevA's own smaller map, not DevB's expanded one. The fleet size
  (4 drones, 4 riders) and demand rate (12 orders/hr/store) should still
  work against the bigger map, but if `drones_only` shows an unusually
  high `fleet_busy` failure reason after integration, consider whether
  fleet size needs bumping now that there are more delivery zones to
  cover.
- DevC's `run_simulation.py` hardcodes `DEFAULT_BATTERY_SWAP_S = 300.0`
  in the file itself rather than reading it from `drone_specs.json`
  (there's a comment noting it *would* pick up a `battery_swap_s` key
  under `fleet` if one were added, but none of the three `fleet` configs
  have that key). Leave as-is unless you have a specific reason to change
  it — it's an intentional, documented default, not an oversight.
- None of the three `docs/*.md` files (`PHYSICS.md`, `OPTIMIZATION.md`,
  `MAP.md`, etc.) have been reconciled — each repo's copy may describe
  that dev's own local (stub-paired) experience rather than the final
  integrated system. Worth a pass to update these once the merge is
  verified working, since they'll likely be read by judges alongside the
  code.
