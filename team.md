# Team Division (4 people, 3–4hr window)

Split along the same layer boundaries the repo already has — nobody blocks on anybody else past the first 15 minutes, since each layer only needs the *interface* (function signatures / JSON schema) agreed up front, not the finished implementation.

### Person A — Physics + Calibration
**Owns:** `engine/physics.py`, `engine/calibration.py`, `docs/PHYSICS.md`
- Verify/tune the hover + forward-flight power equations
- Run and sanity-check `calibration.py` against the Zomato reference flight
- Own the wind model and altitude correction
- **Deliverable by hr 1:** `trip_energy_wh()` and `round_trip_energy_wh()` working and calibrated — this is the dependency everyone else's feasibility checks call into

### Person B — Map + Graph + Pathfinding
**Owns:** `engine/graph.py`, `data/bhopal_map.json`, `docs/MAP.md`
- Finalize node/edge layout and no-fly zone polygons
- Own the A* implementation and the no-fly-crossing intersection test
- Can build this **fully in parallel with Person A** — only needs Person A's `DroneSpecs`/`trip_energy_wh` signature, not the tuned constants, to write and test A* against stub/placeholder energy values
- **Deliverable by hr 1.5:** `astar_energy_path()` returning correct paths that respect no-fly zones

### Person C — Optimization / Fleet Assignment
**Owns:** `engine/optimizer.py`, `engine/run_simulation.py`, `docs/OPTIMIZATION.md`
- Order generation (Poisson), greedy assignment, brute-force validator
- Wires together A (physics) + B (graph) once both land — this person should read both interfaces early and write against stubs first
- Owns the `Weights` tuning and making sure the optimality-gap demo produces sane (near-0%) results
- **Deliverable by hr 2.5:** `run_simulation.py` producing `trace.json`

### Person D — Frontend + Docs/Pitch
**Owns:** `frontend/index.html`, `docs/PS.md`, `docs/PRD.md`, `docs/RESEARCH.md`, `README.md`, judge-facing narrative
- Can start the canvas/map rendering immediately using a **hand-written fake `trace.json`** (5 minutes to mock one), so frontend work isn't blocked waiting on Person C
- Swaps in the real `trace.json` the moment it's produced — should need zero code changes if the schema was agreed upfront
- Owns rehearsing the "honest framing" answer from `docs/RESEARCH.md` for the judge Q&A

**Critical path:** A and B in parallel (hr 0–1.5) → C integrates (hr 1.5–2.5) → D swaps in real data and polishes (hr 2.5–4). D's mock-data work and docs work should be done well before hr 2.5 so that slot is just integration, not a scramble.