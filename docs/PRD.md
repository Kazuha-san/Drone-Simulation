# Product Requirements Document (PRD)

**Project:** Bhopal Drone Delivery Feasibility Simulator
**Type:** Research/feasibility artifact (not a product for deployment —
see `docs/PS.md` Section 4 and `docs/RESEARCH.md` for scope framing)
**Build window:** 3–4 hour hackathon

---

## 1. Purpose

Deliver a physics-grounded, optimization-based simulation that answers, for
Bhopal as a case study: under what payload/weather/demand conditions would
a drone fleet outperform ground riders in a quick-commerce delivery
context — with results calibrated against real published flight data
(Zomato's 2019 test) rather than invented constants. See `docs/PS.md` for
full problem framing and research citations.

## 2. Users / audience

This is a hackathon deliverable, not a shipped product. Its "users," in
order of relevance:

1. **Hackathon judges** — need to see real engineering (physics + formal
   optimization) and an honest scope claim, not a hand-wavy demo.
2. **A hypothetical ops/strategy analyst** at a quick-commerce company or
   state transport department — the persona this tool is *designed as if
   for*, per the honest framing in `docs/RESEARCH.md`. Not an actual
   current user.
3. **Future contributors / another AI assistant** extending this repo —
   served by `CLAUDE.md` and the `docs/` folder.

## 3. Functional requirements

### 3.1 Physics engine (`engine/physics.py`)
- **FR-1:** Compute hover power from total weight, air density, rotor
  area, and propulsive efficiency, using actuator-disk momentum theory.
- **FR-2:** Compute forward-flight power as induced power (speed-dependent)
  plus parasitic drag power (∝ v³).
- **FR-3:** Adjust air density for altitude (Bhopal ≈ 500m).
- **FR-4:** Apply a wind vector (speed + direction) to effective ground
  speed based on flight heading.
- **FR-5:** Compute total trip energy (hover + cruise phases) and flag
  feasibility against a mandatory 20% battery reserve.
- **FR-6:** Provide a standalone calibration routine (`calibration.py`)
  that fits free aerodynamic constants against the Zomato 2019 reference
  flight (5kg / 5km / 10min / 80km/h peak), runnable independently of the
  rest of the system.

### 3.2 Map & pathfinding (`engine/graph.py`, `data/bhopal_map.json`)
- **FR-7:** Represent the city as a graph of nodes (dark stores, waypoints,
  delivery zones) and edges, in a 2D canvas coordinate space with a defined
  meters-per-unit scale.
- **FR-8:** Represent no-fly zones as polygons; any edge whose segment
  intersects a no-fly polygon must be excluded from pathfinding entirely.
- **FR-9:** Implement A* search where edge cost is **energy** (from the
  physics engine), not raw distance, with an admissible heuristic.
- **FR-10:** Prune any path exceeding usable battery capacity mid-search,
  not just at the end.

### 3.3 Optimization / fleet assignment (`engine/optimizer.py`)
- **FR-11:** Generate delivery orders via a Poisson arrival process
  (exponential inter-arrival times), parameterized by orders/hour.
- **FR-12:** Implement a formal multi-objective assignment: minimize a
  weighted sum of delivery time, energy/fuel cost, and failure/lateness
  penalty (weights exposed as a `Weights` dataclass).
- **FR-13:** Implement greedy, feasibility-constrained assignment as the
  primary heuristic (checks battery feasibility and no-fly compliance per
  candidate vehicle before scoring).
- **FR-14:** Implement an exact brute-force assignment solver for small
  batches (≤8 orders), used only to compute an optimality gap for
  validation — not as the production assignment method.
- **FR-15:** Support three fleet configurations for comparison:
  drones-only, riders-only (baseline), and mixed fleet.
- **FR-16:** Track per-vehicle state of charge / busy status across the
  simulation timeline; a vehicle must not be assignable while busy or below
  the round-trip energy threshold.

### 3.4 Ground vehicle baseline
- **FR-17:** Model ground riders with average urban speed and a per-km
  cost, deliberately without a physics model (see `docs/PHYSICS.md`
  rationale) — this is the control group, not a second physics system.

### 3.5 Simulation orchestration (`engine/run_simulation.py`)
- **FR-18:** Run all three fleet scenarios against the same generated
  order stream (same seed) for a fair comparison.
- **FR-19:** Compute summary metrics per scenario: total/delivered/failed
  orders, failure rate, SLA violation count, P50/P95 delivery time, average
  cost per delivery, achieved throughput.
- **FR-20:** Run the greedy-vs-brute-force optimality-gap demo on a small
  order batch and report both cost and solve-time comparisons.
- **FR-21:** Serialize map data, all scenario results, and the optimality
  gap demo into a single `data/trace.json` consumed by the frontend.

### 3.6 Frontend (`frontend/index.html`)
- **FR-22:** Render the stylized 2D Bhopal map: grid background, no-fly
  zone polygons (visually distinct), dark stores, delivery zones.
- **FR-23:** Provide a scenario selector (drones-only / riders-only /
  mixed) that updates the displayed summary and animated playback.
- **FR-24:** Animate delivered orders' vehicles moving along their
  assigned path over their recorded delivery-time window, scrubbable via a
  timeline slider and playable/pausable.
- **FR-25:** Display live summary metrics and the optimality-gap demo
  results in a sidebar, sourced entirely from `trace.json` — no
  client-side recomputation of simulation logic.

## 4. Non-functional requirements

- **NFR-1 (No dependencies):** Python stdlib only for the engine; vanilla
  HTML/CSS/JS/Canvas for the frontend. No install step required beyond a
  Python 3 interpreter and a static file server.
- **NFR-2 (Layer isolation):** `physics.py` must not import `graph.py` or
  `optimizer.py`. The frontend must never compute simulation state, only
  render precomputed trace data. (Enforced by convention + documented in
  `CLAUDE.md`; not automated-tested given hackathon time constraints.)
- **NFR-3 (Reproducibility):** All random processes (order generation) use
  a fixed seed by default, so re-running produces identical results for
  demo consistency.
- **NFR-4 (Honesty in framing):** No documentation, UI copy, or pitch
  material may claim real-world deployment, adoption, or regulatory
  approval. See `docs/RESEARCH.md` for the agreed framing to reuse.
- **NFR-5 (Runtime):** Full simulation (all 3 scenarios + optimality demo)
  must complete in well under 10 seconds on a standard laptop, so it can be
  re-run live during a judged demo if a parameter is changed on the spot.

## 5. Out of scope (explicit, matches `docs/PS.md` Section 3)

- Hardware, flight testing, drone construction
- DGCA registration/certification/filing
- Real GPS/OSM map data (stylized canvas map only, see `docs/MAP.md`)
- Time-of-day demand seasonality
- Exact ILP/OR-Tools solving at scale beyond ~8 orders
- Any claim of current real-world need beyond the narrow research framing
  in `docs/RESEARCH.md`

## 6. Data model summary

| Entity | Key fields | Defined in |
|---|---|---|
| `DroneSpecs` | empty_mass_kg, max_payload_kg, battery_capacity_wh, rotor geometry, eta, cd, frontal_area_m2, reserve_frac | `physics.py` |
| `GroundVehicleSpecs` | avg_speed_kmh, cost_per_km_inr | `physics.py` |
| `Node` | id, x, y, kind (dark_store/waypoint/delivery_zone) | `graph.py` |
| `NoFlyZone` | name, polygon, reason | `graph.py` |
| `Order` | id, origin, destination, created_at_s, payload_kg, sla_seconds | `optimizer.py` |
| `Vehicle` | id, kind, home_node, soc_frac, busy_until_s, specs | `optimizer.py` |
| `Weights` | alpha_time, beta_cost, gamma_fail | `optimizer.py` |

## 7. Risks / known limitations (state these proactively, don't wait to be asked)

- **Calibration is coarse.** A 3-parameter grid search against one public
  data point is defensible for a hackathon, not a rigorous aerodynamic fit
  — stated plainly in `docs/PHYSICS.md`.
- **Map is stylized, not surveyed.** No-fly zone placement reflects real
  Bhopal geography approximately, not GIS-accurate boundaries — stated
  plainly in `docs/MAP.md`.
- **Greedy heuristic validated only at small scale.** The 0% optimality
  gap demo is on a 5-order/3-vehicle instance; it demonstrates methodology
  (checking against ground truth), not a guarantee of near-optimality at
  full simulation scale — stated plainly in `docs/OPTIMIZATION.md`.
- **`Weights.gamma_fail` is a manually tuned constant**, not derived; if
  changed carelessly the optimizer can produce nonsensical results (this
  happened once during development — see `CLAUDE.md` constraint #2).

## 8. Definition of done (for the hackathon build)

- [x] `run_simulation.py` runs end-to-end with no errors and produces
      plausible, non-degenerate scenario summaries
- [x] Optimality-gap demo produces a small, sane percentage (validated: ~0%
      on reference run)
- [x] `trace.json` is consumed correctly by the frontend with no manual
      transformation needed
- [x] All docs (`PS.md`, `PRD.md`, `ARCHITECTURE.md`, `PHYSICS.md`,
      `OPTIMIZATION.md`, `MAP.md`, `RESEARCH.md`, `CLAUDE.md`) are present
      and internally consistent with each other and with the code
- [ ] Live demo rehearsed with the honest framing from `docs/RESEARCH.md`
      ready to state if a judge asks "does anyone need this"
