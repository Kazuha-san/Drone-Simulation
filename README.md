# Bhopal Drone Delivery Feasibility Simulator

A physics-grounded, optimization-based simulation comparing drone delivery
vs. ground-rider delivery for quick-commerce in Bhopal, India. Runs entirely
on your machine as a standalone local app — no deployment, no external
services, nothing leaves your computer.

**What this is:** a real, live simulator — every run re-executes the actual
engine (physics + A* pathfinding + fleet optimizer) against a freshly
generated, randomly seeded stream of orders, using presets you choose (fleet
composition, weather, airspace/traffic conditions). It is not a fixed replay
of a checked-in result file. Calibrated against real published trial data
(Zomato's 2019 test flight), with an honest optimization formulation (a
greedy heuristic for a variant of the Vehicle Routing Problem with Time
Windows and Energy Constraints, E-VRPTW).

**What this is not:** a claim that drone delivery is deployable in Bhopal
today, or a product. Regulatory approval (DGCA BVLOS corridors) and hardware
cost, not simulation, are the real-world bottleneck — see
[`documents/RESEARCH.md`](documents/RESEARCH.md) for the honest framing.

## Repo layout

```
drone-sim/
├── run_app.py               Standalone launcher — one command, one port
├── backend/                 Python simulation engine + live API server
│   ├── physics.py           Multirotor energy/power model
│   ├── calibration.py       Fits physics constants against Zomato's public test flight
│   ├── graph.py             City graph model, energy-aware A* (drones), road-time A* (riders)
│   ├── optimizer.py         Order generation (Poisson) + greedy/brute-force fleet assignment
│   ├── build_graph.py       Derives the routing graph from the OSM basemap
│   ├── presets.py           Fleet / weather / obstacle presets exposed to the frontend
│   ├── server.py            FastAPI app: /api/presets, /api/simulate, /api/optimality-gap-demo
│   ├── requirements.txt     fastapi, uvicorn, pydantic
│   └── data/
│       ├── bhopal_basemap.json  Real Bhopal geography from OpenStreetMap (ODbL)
│       ├── bhopal_map.json      GENERATED routing graph: nodes, edges, no-fly zones
│       └── drone_specs.json     Calibrated drone/vehicle/fleet/demand config
├── frontend/                 React 19 + Vite dashboard
│   ├── src/data/apiClient.js     Talks to the live local API
│   ├── src/data/simulationAdapter.js  Shapes a live API response into UI data
│   ├── src/components/       Panels, timeline, metrics
│   └── src/canvas/           Map / route / vehicle renderers
└── documents/
    ├── PS.md                Problem Statement — full research-backed framing
    ├── PRD.md               Product Requirements Document — functional/non-functional specs
    ├── ARCHITECTURE.md      System design, data flow, module boundaries (describes the
    │                        earlier static-trace architecture — superseded by the live
    │                        API described in this README)
    ├── PHYSICS.md           Full derivation of the energy model + calibration numbers
    ├── OPTIMIZATION.md      Formal problem statement (E-VRPTW), objective, constraints
    ├── MAP.md               (stale) how the old hand-placed map related to Bhopal
    └── RESEARCH.md          Real-world context: DGCA regs, industry precedent, honest scope
```

## Quick start (standalone local app)

**Easiest way — one file, no manual steps:**

- **Windows:** double-click `run_app.bat`

Either one sets up a Python virtual environment, installs backend and
frontend dependencies, builds the frontend, builds the routing graph, and
starts the app — all on first run. Every run after that just starts the app
(a few seconds). Requires Python 3.10+ and Node.js already installed and on
your PATH; the script tells you plainly if either is missing.

**Manual steps** (same thing, if you'd rather run each piece yourself):

```bash
# 1. Backend deps (once)
cd backend
pip install -r requirements.txt --break-system-packages   # or use a venv

# 2. Build the routing graph (once, or whenever the basemap changes)
python build_graph.py

# 3. Frontend build (once, or after frontend changes)
cd ../frontend
npm install
npm run build

# 4. Run the whole app — one process, one port
cd ..
python run_app.py
```

Once the server is up, open `http://localhost:8000` in your browser. The engine
has no external Python dependencies beyond `fastapi`/`uvicorn`/`pydantic`
(the simulation core itself is standard library — `math`, `heapq`, `random`,
`json`, `dataclasses`, `itertools`).

### Frontend-only dev loop

If you're iterating on the UI, run the API and the Vite dev server
separately for hot-reload:

```bash
# terminal 1
cd backend && uvicorn server:app --reload --port 8000

# terminal 2
cd frontend && npm run dev      # http://localhost:5173, proxies /api to :8000
```

## How a run actually works

1. You pick a **fleet preset** (drone/rider counts), a **weather preset**
   (wind speed/direction — a real input to the drone energy model), an
   **obstacle preset** (which real no-fly zones are enforced + a road
   traffic multiplier), and a fleet mode (drones only / riders only / mixed).
2. The frontend POSTs those choices to `/api/simulate`.
3. The server generates a **fresh, randomly seeded** batch of orders, builds
   the fleet, and runs the real greedy assignment over the real road/airspace
   graph — drones via energy-aware A* respecting the active no-fly zones,
   riders via time-cost A* over the real road network (never a straight line,
   never airspace) with the traffic multiplier slowing them down.
4. The full result (orders, per-order assignment/route, aggregate metrics) is
   returned and rendered. Run it again with the same presets and you'll get a
   different (but statistically similar) outcome, because the order stream is
   regenerated each time.

## The layers, and why they're separated

1. **Physics** (`backend/physics.py`) — pure functions, no knowledge of orders
   or fleets. Given weight/speed/wind, returns power and energy. Calibrated
   against a real flight, not guessed constants.
2. **Optimization** (`backend/optimizer.py`, `backend/graph.py`) — consumes
   physics as a *constraint function* inside an energy-aware A* search (drones)
   and a real road-network time-cost A* (riders), plus a greedy fleet
   assignment heuristic. This is where "is this delivery feasible" and "which
   vehicle should take this order" get decided.
3. **API** (`backend/server.py`) — exposes presets and a live `/api/simulate`
   endpoint that re-runs the real engine on demand.
4. **Frontend** (`frontend/`) — calls the live API and animates the result.
   It never recomputes simulation state itself.

## Key result to lead with in a demo

Hit `/api/optimality-gap-demo` (or look at the equivalent section if you run
`run_simulation.py` directly): on a small order batch, the greedy heuristic
matches the brute-force-optimal assignment (~0% gap) in a fraction of the
compute time. That's the line to say to judges: *"we didn't just pick a
heuristic and hope — we checked it against the exact optimal on a tractable
instance."* This one is a fixed reference calculation, not preset-dependent
— it's a proof point about the algorithm, not a scenario to vary.

## Honest scope note

This project treats hardware, regulatory certification, and real-world
deployment as **explicitly out of scope**. Drone specs are configurable
software inputs calibrated against public data, not hardware we built or
claim to fly. See `documents/RESEARCH.md` for why this framing is the right one
for judges.
