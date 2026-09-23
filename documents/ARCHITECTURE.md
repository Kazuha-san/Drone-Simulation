# Architecture

## System diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         data/ (config)                          │
│  bhopal_map.json    — nodes, edges, no-fly zone polygons        │
│  drone_specs.json   — drone/vehicle specs, fleet size, demand   │
└───────────────────────────────┬──────────────────────────────────┘
                                 │ loaded by
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                    engine/ (Python, stdlib only)                │
│                                                                  │
│  physics.py         Pure energy/power functions.                │
│  calibration.py         │  No knowledge of orders/fleets/graph. │
│      (offline tool,     ▼                                       │
│       run once to    graph.py                                   │
│       tune constants)    CityGraph + astar_energy_path()        │
│                           Uses physics.py as edge-cost function  │
│                                    │                             │
│                                    ▼                             │
│                       optimizer.py                                │
│                           generate_orders()   — Poisson arrivals │
│                           greedy_assign()     — main heuristic   │
│                           brute_force_assign()— optimality check │
│                           Uses graph.py + physics.py             │
│                                    │                             │
│                                    ▼                             │
│                    run_simulation.py (entry point)               │
│                        Runs 3 scenarios (drones/riders/mixed)    │
│                        Runs optimality-gap demo                 │
│                        Writes data/trace.json                   │
└───────────────────────────────┬──────────────────────────────────┘
                                 │ single JSON artifact
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                  frontend/index.html (browser)                  │
│  Fetches data/trace.json. Renders:                              │
│    - 2D canvas map (zones, no-fly polygons, nodes)               │
│    - Animated playback of delivered orders along their paths     │
│    - Live metrics sidebar per scenario                           │
│    - Optimality gap demo readout                                 │
│  NEVER recomputes simulation state — pure renderer.              │
└────────────────────────────────────────────────────────────────┘
```

## Why this separation

**Simulate first, animate second.** This was the single biggest time-saver
decision for a 3-4hr build: the entire engine can be developed and validated
from the terminal (`python3 run_simulation.py`, read the printed JSON
summaries) with zero risk from frontend/rendering bugs. The frontend is only
ever a consumer of `trace.json` — if the numbers are wrong, the bug is in
`engine/`, never in `frontend/`.

**One-way data flow.** `data/*.json` (config) → `engine/*.py` (computation)
→ `data/trace.json` (output) → `frontend/index.html` (render). Nothing flows
backward. This makes each layer independently testable.

**Physics has zero knowledge of the outer layers.** `physics.py` never
imports `graph.py` or `optimizer.py`. This means the energy model can be
validated and calibrated (`calibration.py`) completely in isolation against
real flight data, before it's ever used as a constraint inside pathfinding
or fleet assignment. If judges ask "how do you know your physics is right,"
the answer is a standalone, runnable calibration script — not "trust us."

## Module responsibilities

| Module | Owns | Does NOT own |
|---|---|---|
| `physics.py` | Power/energy equations, battery reserve logic | Anything about maps, orders, or vehicles as entities |
| `graph.py` | City topology, no-fly zone geometry, A* search | Order generation, fleet assignment decisions |
| `optimizer.py` | Order arrivals, fleet assignment (greedy + brute-force), objective/weights | Pathfinding internals (delegates to `graph.py`), energy internals (delegates to `physics.py`) |
| `run_simulation.py` | Orchestration, scenario comparison, trace serialization | Any actual physics/optimization logic — it only calls the other modules |
| `frontend/index.html` | Rendering, playback, UI state | Any simulation computation |

## Adding a new scenario or metric

- New comparison scenario (e.g. "rain/high-wind day"): add a new `wind_mps`
  value and call `run_scenario()` again in `run_simulation.py` — no changes
  needed to `optimizer.py` or `physics.py`, wind is already a parameter
  threaded through both.
- New metric on the dashboard: compute it in `run_scenario()`'s `summary`
  dict, it will automatically appear in `trace.json` — then add a row to
  `renderSummary()` in `frontend/index.html`.
- New objective term (e.g. carbon cost): add a field to `Weights` in
  `optimizer.py`, incorporate it into the `score` calculation inside
  `greedy_assign()` and `brute_force_assign()`.
