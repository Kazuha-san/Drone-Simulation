# Notes for Claude (or any AI assistant) picking up this repo

This file exists so an AI assistant joining mid-hackathon can get oriented
in under a minute, without re-reading every doc. Read this first, then only
open the specific doc you need for the task at hand.

## What this project is, in one sentence

A physics-calibrated simulation comparing drone vs. ground-rider delivery
for quick-commerce in Bhopal, framed as an E-VRPTW optimization problem,
built for a 3-4hr hackathon — see `README.md` for the honest scope, and
`docs/RESEARCH.md` before saying anything about "real-world impact."

## Where things live (don't re-derive, just read)

| Need to know... | Read this |
|---|---|
| Overall system design / data flow | `docs/ARCHITECTURE.md` |
| The energy/power equations and where the constants came from | `docs/PHYSICS.md` |
| The formal optimization problem, objective, constraints | `docs/OPTIMIZATION.md` |
| How the map coordinates relate to real Bhopal | `docs/MAP.md` |
| Whether this is a "real" project / how to answer "does anyone need this" | `docs/RESEARCH.md` |

## Non-negotiable constraints to preserve if you edit this repo

1. **Layer separation is load-bearing, not stylistic.** `physics.py` must
   never import `graph.py` or `optimizer.py`. The frontend must never
   recompute simulation state — it only reads `data/trace.json`. If you
   need the frontend to reflect new behavior, change the engine and
   regenerate the trace, don't add computation to `index.html`.
2. **`Weights.gamma_fail` must stay well above realistic delivery-time
   costs** (currently 2000, vs. typical delivery times of tens to hundreds
   of seconds). If you lower this without checking, the optimizer will
   "game" the objective by leaving orders unassigned — this already
   happened once during development (see the comment in `optimizer.py`
   right above `gamma_fail`'s definition) and produced a nonsensical
   optimality-gap result. Always re-run `run_simulation.py` and sanity
   check the "OPTIMALITY GAP DEMO" output is near 0%, not huge, after
   touching the `Weights` class.
3. **The physics model is calibrated, not arbitrary — don't silently
   change constants in `data/drone_specs.json`.** If specs need to change,
   re-run `engine/calibration.py` and update the file with a comment
   explaining what changed and why, so the "validated against a real
   flight" claim in the pitch stays true.
4. **No external dependencies.** Everything is Python stdlib + vanilla
   HTML/JS/Canvas, deliberately, for zero-install-friction under time
   pressure. Don't add `numpy`/`scipy`/frontend frameworks unless there's a
   strong reason and time to spare.
5. **Don't overclaim real-world deployability in any copy you write** —
   README, slide text, spoken pitch. The agreed honest framing is in
   `docs/RESEARCH.md`'s "honest framing" blockquote — reuse it rather than
   drafting new claims from scratch.

## How to verify the whole thing still works after any change

```bash
cd engine
python3 run_simulation.py
```
Check: three scenario summaries print without errors, and the optimality
gap demo shows a small percentage (not hundreds/thousands of percent — that
signals the objective weights are miscalibrated, see constraint #2 above).
Then serve the repo root (`python3 -m http.server 8000` from repo root) and
open `frontend/index.html` to confirm playback still renders.

## Common next tasks and where they go

- **"Add a new metric to the dashboard"** → compute it in
  `run_simulation.py::run_scenario()`'s `summary` dict, then add a row in
  `frontend/index.html::renderSummary()`. Don't compute new metrics in JS.
- **"Change fleet size / demand rate"** → edit `data/drone_specs.json`
  only, no code changes needed.
- **"Add a new city zone or no-fly area"** → edit `data/bhopal_map.json`
  only, no code changes needed (see `docs/MAP.md`).
- **"Make the frontend animate live instead of scrubbing"** → this was
  deliberately deferred (see `docs/ARCHITECTURE.md`'s rationale); only do
  this if there's real time budget left after core functionality is solid.
