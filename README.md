# Bhopal Drone Delivery Feasibility Simulator

A physics-grounded, optimization-based simulation comparing drone delivery
vs. ground-rider delivery for quick-commerce in Bhopal, India.

**What this is:** a research/feasibility artifact — a reproducible way to ask
"under what conditions would drones beat ground delivery in a tier-2 Indian
city," calibrated against real published trial data (Zomato's 2019 test
flight), with an honest optimization formulation (a greedy heuristic for a
variant of the Vehicle Routing Problem with Time Windows and Energy
Constraints, E-VRPTW).

**What this is not:** a claim that drone delivery is deployable in Bhopal
today, or a product. Regulatory approval (DGCA BVLOS corridors) and hardware
cost, not simulation, are the real-world bottleneck — see
[`docs/RESEARCH.md`](docs/RESEARCH.md) for the honest framing.

## Repo layout

```
drone-sim/
├── engine/                 Python simulation engine (no dependencies beyond stdlib)
│   ├── physics.py          Multirotor energy/power model
│   ├── calibration.py      Fits physics constants against Zomato's public test flight
│   ├── graph.py            City graph model + energy-aware A* pathfinding
│   ├── optimizer.py        Order generation (Poisson) + greedy/brute-force fleet assignment
│   └── run_simulation.py   Entry point — runs all scenarios, writes data/trace.json
├── data/
│   ├── bhopal_map.json     Stylized 2D map: nodes, edges, no-fly zones
│   ├── drone_specs.json    Calibrated drone/vehicle/fleet/demand config
│   └── trace.json          Generated output (run the simulation to produce this)
├── frontend/
│   └── index.html          GTA-style 2D canvas playback + live metrics dashboard
└── docs/
    ├── PS.md               Problem Statement — full research-backed framing
    ├── PRD.md              Product Requirements Document — functional/non-functional specs
    ├── ARCHITECTURE.md     System design, data flow, module boundaries
    ├── PHYSICS.md          Full derivation of the energy model + calibration numbers
    ├── OPTIMIZATION.md     Formal problem statement (E-VRPTW), objective, constraints
    ├── MAP.md              How the stylized Bhopal map maps to real geography
    └── RESEARCH.md         Real-world context: DGCA regs, industry precedent, honest scope
```

## Quick start

```bash
cd engine
python3 run_simulation.py       # runs all 3 scenarios, prints summaries, writes ../data/trace.json

cd ../                          # serve the repo root so the frontend can fetch data/trace.json
python3 -m http.server 8000
# open http://localhost:8000/frontend/index.html
```

No external dependencies — everything is Python 3 standard library
(`math`, `heapq`, `random`, `json`, `dataclasses`, `itertools`) plus vanilla
HTML/JS/Canvas on the frontend. This was a deliberate choice for a 3-4hr
hackathon build: zero install friction, nothing to break under time pressure.

## The three layers, and why they're separated

1. **Physics** (`engine/physics.py`) — pure functions, no knowledge of orders
   or fleets. Given weight/speed/wind, returns power and energy. Calibrated
   against a real flight, not guessed constants.
2. **Optimization** (`engine/optimizer.py`, `engine/graph.py`) — consumes
   physics as a *constraint function* inside an energy-aware A* search and a
   greedy fleet-assignment heuristic. This is where "is this delivery
   feasible" and "which vehicle should take this order" get decided.
3. **Frontend** (`frontend/index.html`) — reads a single precomputed
   `trace.json` and animates it. It never recomputes simulation state — this
   means the simulation can be fully validated in the terminal before any
   visual work happens, and the visual layer can't introduce simulation bugs.

See `docs/ARCHITECTURE.md` for the full data-flow diagram.

## Key result to lead with in a demo

Run `run_simulation.py` and look at the "OPTIMALITY GAP DEMO" output: on a
small order batch, the greedy heuristic matches the brute-force-optimal
assignment (~0% gap) in a fraction of the compute time. That's the line to
say to judges: *"we didn't just pick a heuristic and hope — we checked it
against the exact optimal on a tractable instance."*

## Honest scope note

This project treats hardware, regulatory certification, and real-world
deployment as **explicitly out of scope**. Drone specs are configurable
software inputs calibrated against public data, not hardware we built or
claim to fly. See `docs/RESEARCH.md` for why this framing is the right one
for judges.
