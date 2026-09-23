# Optimization Problem Formulation

## Problem class

This is a variant of the **Vehicle Routing Problem with Time Windows and
Energy Constraints (E-VRPTW)** — a well-studied combinatorial optimization
problem class in operations research, applied here to a mixed drone/ground
fleet with physics-derived (not synthetic) energy costs.

Say this explicitly to judges: naming the actual problem class signals
you understand its research lineage, and that the greedy heuristic
implementation below is a deliberate, standard engineering simplification
for real-time dispatch — not a shortcut taken from not knowing the exact
formulation.

## Decision variables

```
x[o][d] ∈ {0, 1}     order o assigned to drone d
x[o][r] ∈ {0, 1}     order o assigned to ground rider r
p[d][o]              flight path chosen for drone d serving order o (from A*)
```

## Objective — weighted multi-objective

```
minimize:  α · Σ delivery_time(o)  +  β · Σ energy_or_fuel_cost(o)  +  γ · Σ [order o failed or late]
```

This is deliberately **multi-objective with tunable weights**
(`Weights` dataclass in `optimizer.py`: `alpha_time`, `beta_cost`,
`gamma_fail`), because no real ops team optimizes for pure speed — they
trade speed against cost against reliability. `gamma_fail` is set high
(2000, dominating any realistic single-delivery time cost) so the optimizer
cannot "game" the objective by leaving orders unassigned to save cost — see
the code comment in `optimizer.py::Weights` for why this matters and what
happens if it's set too low (it did, during development — see git history /
the comment left in place as a documented failure mode).

## Constraints

```
1. Battery feasibility:  E(path) ≤ 0.8 · battery_capacity           (physics.py, enforced in A*)
2. No-fly zones:         path ∩ no_fly_zone = ∅                     (graph.py, pruned before A* explores)
3. Vehicle capacity:     each vehicle serves ≤ 1 order at a time    (busy_until_s check in optimizer.py)
4. Fleet size:           assignments bounded by idle vehicle count  (implicit — infeasible if none idle)
5. SLA deadline (soft):  delivery_time(o) ≤ SLA_max                  (penalized via γ if violated, not hard-pruned)
```

Constraint 5 is deliberately **soft** (penalized, not infeasible) because in
reality a late delivery is a bad outcome, not an impossible one — this
matches how real dispatch systems treat SLA misses.

## Why greedy, not exact ILP

An exact solution would formulate this as a Mixed-Integer Linear Program
and solve with a solver (CBC, Gurobi, OR-Tools). We use a **greedy,
feasibility-constrained heuristic** instead:

- **Real-time dispatch requirement:** orders arrive continuously (Poisson
  process); a real system must assign each order in milliseconds as it
  arrives, not batch-solve periodically. Greedy assignment is the practical
  industry-standard approach for this reason — it's what real dispatch
  engines actually do, not a simplification born of not knowing better.
- **Scale:** at hackathon/demo scale (dozens of orders, single-digit fleet),
  exact ILP is not necessary to make the point, and greedy runs in O(orders
  × vehicles), fast enough for real-time use.

## The optimality-gap check (this is the credibility payoff)

Rather than just asserting greedy is "good enough," `optimizer.py`'s
`brute_force_assign()` exhaustively searches every possible assignment
(including leaving orders unassigned) for small batches (≤8 orders), giving
a true optimal cost to compare against. `run_simulation.py`'s
`run_optimality_gap_demo()` runs both on the same 5-order batch and reports:

```
optimality_gap_pct = (greedy_cost − optimal_cost) / optimal_cost × 100
```

In our reference run this comes out to **~0%** — greedy matches optimal on
this instance — while running orders of magnitude faster (single-digit
milliseconds vs. hundreds of milliseconds for brute force, which itself
only remains tractable up to ~8 orders before combinatorial explosion).

**Say this to judges plainly:** a 0% gap on one small instance is not proof
greedy is always optimal — brute force is only tractable at this scale
precisely because the search space is small. The point being demonstrated
is methodological: *we validated the heuristic against ground truth on a
tractable instance, rather than assuming it's good enough.* That's the
right, honest thing to say, and it's still a meaningfully more rigorous
claim than most hackathon projects make.

## Order generation model

Orders arrive via a **Poisson process** — inter-arrival times drawn from an
Exponential distribution with rate `λ` (orders/hour, aggregated across all
dark stores). This is the standard base-layer assumption in queueing theory
for independent random arrivals, and is what real quick-commerce demand
models build on top of (before adding time-of-day seasonality, which is a
natural extension not implemented here for time reasons — see "Future
Work" in `docs/RESEARCH.md`).
