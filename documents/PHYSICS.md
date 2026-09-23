# Physics Model

## Why a real power model, not "fuel = distance"

Most hackathon drone simulations treat battery drain as linear in distance.
That's wrong in a way that matters: a real multirotor's power draw is
dominated by **weight** (via lift/hover power) and **speed^3** (via drag),
not distance directly. This means payload weight and wind should visibly
change feasible range — that's the actual engineering tradeoff this project
demonstrates.

## The model

### Hover power (induced power via actuator disk / momentum theory)

```
P_hover = W^1.5 / (η · √(2 · ρ · A))
```
- `W` = total weight (drone + payload) in Newtons = `mass_kg × 9.81`
- `ρ` = air density (kg/m³) — see altitude correction below
- `A` = total rotor disk area (m²) = `rotor_count × π × r²`
- `η` = propulsive efficiency, dimensionless (~0.6–0.8 for small multirotors)

This is standard actuator-disk theory: the minimum induced power to
generate thrust `T = W` at hover is `P = T^1.5 / √(2ρA)`, then divided by
`η` to account for real-world losses (motor, ESC, propeller inefficiency).

### Forward flight power

Forward flight power splits into induced power (which *decreases* with
forward speed, because forward motion helps generate lift more efficiently)
and parasitic drag power (which *increases* with speed cubed):

```
v_h = √(W / (2·ρ·A))                          [induced velocity at hover]
P_induced(v) ≈ P_hover / √(1 + (v/v_h)²)      [simplified induced power]
P_parasitic(v) = 0.5 · Cd · ρ · A_frontal · v³
P_forward(v) = P_induced(v) + P_parasitic(v)
```

This is a simplified (non-iterative) version of standard multirotor forward
flight power curves — accurate enough to reproduce the qualitative and
approximate quantitative shape (power dips slightly then rises steeply with
speed) without needing full blade-element momentum theory, which is
overkill for a feasibility simulation.

### Air density at altitude

Bhopal sits at ~500m elevation, which measurably thins the air relative to
sea level — this matters for hover power since `P_hover ∝ 1/√ρ`:

```
ρ(h) = ρ₀ · e^(-h / 8500)      [ρ₀ = 1.225 kg/m³ at sea level]
```

### Wind

Wind is modeled as a static vector field (constant speed + direction for
the whole simulation — a reasonable simplification for a single scenario
run). A headwind component is added to the required airspeed for a given
heading, which slows effective ground speed and increases trip time and
therefore hover-adjacent energy cost:

```
effective_ground_speed = cruise_speed + wind_speed · cos(heading - wind_direction)
```
(A tailwind, cos term negative relative to heading, speeds up effective
ground travel; a headwind slows it — this is a real, demoable effect: change
`wind_direction_deg` in `data/drone_specs.json` and watch feasible range on
upwind legs shrink.)

### Battery safety reserve

Standard drone operations reserve ~20% of battery capacity as a mandatory
safety margin, never to be discharged in normal operation:

```
usable_capacity_wh = battery_capacity_wh × (1 − reserve_frac)     [reserve_frac = 0.20 default]
```

All feasibility checks (in `graph.py`'s A* and `optimizer.py`'s
round-trip check) test against `usable_capacity_wh`, not raw capacity —
this is a real operational constraint, not an arbitrary safety pad.

## Calibration against real data

We don't have access to Zomato's actual drone specifications, so we don't
claim exact replication — we claim **directional and order-of-magnitude
validation**. `engine/calibration.py` performs a grid search over the three
free aerodynamic constants (`eta`, `cd`, `frontal_area_m2`) — holding a
plausible mid-size delivery airframe (12kg empty mass, 4 rotors, 500Wh
battery) fixed — to find values that make our model reproduce:

| Parameter | Zomato 2019 public test flight |
|---|---|
| Payload | 5 kg |
| Distance | 5 km |
| Duration | 10 min (600s) |
| Peak speed | 80 km/h (22.2 m/s) |

Run `python3 engine/calibration.py` to reproduce this search. The resulting
constants are pre-populated in `data/drone_specs.json`.

**What this calibration is, and isn't:** it's a coarse grid search over 3
free parameters against a single public data point — appropriate rigor for
a hackathon-scale feasibility tool, and vastly more defensible than
made-up constants. It is not a peer-reviewed aerodynamic model fit. Say
this plainly if asked — overclaiming precision here is the kind of thing
that damages credibility with a technically sharp judge.

## Ground vehicle baseline (intentionally simple)

The ground vehicle (scooter/rider) model is deliberately **not** given a
physics model — it uses average urban speed (18 km/h, realistic for Bhopal
traffic) and a flat cost-per-km. This is correct, not lazy: the whole point
of the comparison is that ground vehicles are constrained by traffic and
road topology (captured via a 1.3x route detour factor), while drones are
constrained by energy physics and airspace — different constraint classes
for a genuine apples-to-oranges comparison, which is the actual question
this project investigates.
