"""
calibration.py — Fit physics.py's free constants (eta, cd, frontal_area) against
performance anchors, so our numbers aren't just invented.

WHAT CHANGED AND WHY (read this before "simplifying" it back)
-------------------------------------------------------------
The original version scored candidates on trip *time* vs. the Zomato flight's
600s. That fit nothing: in physics.py trip time depends only on cruise speed
and wind, never on eta/cd/frontal_area. Every grid point scored identically
(error exactly == hover_time_s) and the search silently returned whichever
candidate happened to be enumerated first. The "calibrated" constants were,
in effect, the first element of each list.

The fix is to score on quantities the free parameters actually control — i.e.
energy, not time — and to assert that the search is non-degenerate rather than
trusting it (see `assert_identifiable` below). That assertion is the part that
would have caught the original bug, so it stays.

THE ANCHORS
-----------
  1. Hover endurance (unloaded, on usable capacity) -> pins `eta`.
     At hover there is no forward speed, so drag cannot enter; endurance is a
     function of eta alone. Clean single-parameter identification.

  2. Cruise energy intensity (Wh/km at peak speed, 5 kg payload)
     -> pins the product `cd * frontal_area_m2`.
     The parasitic term scales with v^3, so it only becomes visible at the top
     of the speed envelope.

  3. Hard constraint: the Zomato reference trip (5 kg over 5 km) must complete
     within usable (post-reserve) capacity. Candidates that can't fly the
     reference mission are rejected outright.

HONEST SCOPE (say this plainly if a judge asks)
-----------------------------------------------
Zomato published a time and a distance, not an energy figure, so anchors 1 and
2 are *class-typical published figures for mid-size delivery multirotors*, not
measurements of Zomato's aircraft. This is a coarse 3-parameter grid search
against class-level performance targets, with a real published flight used as
a feasibility cross-check. It is defensible calibration, not an aerodynamic
model fit, and it should never be described as the latter.

Known structural degeneracy: parasitic power depends on `cd` and
`frontal_area_m2` only through their product, so the two are not separately
identifiable from anchor 2. We report the product as the fitted quantity and
break the tie by preferring cd nearest 1.0 (a conventional bluff-body
reference value), which makes the result deterministic and explainable rather
than an artifact of grid ordering.
"""

from physics import (
    DroneSpecs,
    trip_energy_wh,
    hover_endurance_min,
    cruise_energy_per_km_wh,
)
import itertools

# Real published data point — used as a feasibility cross-check, NOT as a fit
# target (it constrains time, which the free parameters don't affect).
REFERENCE_FLIGHT = {
    "source": "Zomato 2019 public test flight",
    "payload_kg": 5.0,
    "distance_m": 5000.0,
    "duration_s": 600.0,
    "peak_speed_mps": 22.2,  # 80 km/h
}

# Class-typical performance targets for a mid-size delivery multirotor.
# These are the actual fit targets. See "HONEST SCOPE" above.
ANCHORS = {
    "hover_endurance_min": 12.0,   # unloaded, on usable (post-reserve) capacity
    "cruise_wh_per_km": 28.0,      # at peak speed, carrying the reference 5 kg
}

# Airframe held fixed; only the aerodynamic constants are free.
BASE_SPECS_KWARGS = dict(
    name="reference_drone",
    empty_mass_kg=12.0,          # plausible mid-size delivery airframe
    max_payload_kg=6.0,
    battery_capacity_wh=500.0,   # plausible for this class
    rotor_count=4,
    rotor_radius_m=0.20,
    cruise_speed_mps=12.0,
    max_speed_mps=REFERENCE_FLIGHT["peak_speed_mps"],
)

ETAS = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85]
CDS = [0.6, 0.8, 1.0, 1.2, 1.4]
AREAS = [0.05, 0.08, 0.10, 0.12, 0.15, 0.20]

INFEASIBLE = float("inf")


def build_specs(eta, cd, frontal_area) -> DroneSpecs:
    return DroneSpecs(eta=eta, cd=cd, frontal_area_m2=frontal_area, **BASE_SPECS_KWARGS)


def score(eta, cd, frontal_area) -> float:
    """
    Sum of relative residuals against the anchors. Lower is better.
    Returns INFEASIBLE for candidates that can't fly the reference mission.
    """
    specs = build_specs(eta, cd, frontal_area)

    # Hard constraint: must complete the real reference flight within reserve.
    ref = trip_energy_wh(REFERENCE_FLIGHT["distance_m"], REFERENCE_FLIGHT["payload_kg"],
                         specs, hover_time_s=20.0)
    if not ref["feasible"]:
        return INFEASIBLE

    endurance = hover_endurance_min(specs, payload_kg=0.0)
    wh_per_km = cruise_energy_per_km_wh(specs, REFERENCE_FLIGHT["payload_kg"],
                                        REFERENCE_FLIGHT["peak_speed_mps"])

    return (abs(endurance - ANCHORS["hover_endurance_min"]) / ANCHORS["hover_endurance_min"]
            + abs(wh_per_km - ANCHORS["cruise_wh_per_km"]) / ANCHORS["cruise_wh_per_km"])


def assert_identifiable() -> None:
    """
    Guard against the exact failure this file used to have: a scoring function
    that is flat in the parameters it claims to fit.

    Perturbs each parameter away from a mid-grid baseline and requires the
    score to actually move. If it doesn't, the "fit" is meaningless and we fail
    loudly instead of printing confident-looking numbers.
    """
    base = (0.65, 1.0, 0.12)
    base_score = score(*base)
    if base_score == INFEASIBLE:
        raise AssertionError("Identifiability baseline is itself infeasible — check the anchors.")

    for i, (label, nudged) in enumerate([
        ("eta", 0.80),
        ("cd", 1.4),
        ("frontal_area_m2", 0.20),
    ]):
        candidate = list(base)
        candidate[i] = nudged
        if abs(score(*candidate) - base_score) < 1e-9:
            raise AssertionError(
                f"Score is insensitive to '{label}' — the grid search would be "
                f"fitting nothing and returning whatever was enumerated first. "
                f"Fix the anchors before trusting any output from this file."
            )


def grid_search():
    """
    Exhaustive search over the grid. Ties (which the cd/frontal_area degeneracy
    guarantees) are broken toward cd nearest 1.0 so the result is deterministic
    and physically explainable rather than dependent on enumeration order.
    """
    scored = []
    for eta, cd, area in itertools.product(ETAS, CDS, AREAS):
        s = score(eta, cd, area)
        if s < INFEASIBLE:
            scored.append((s, abs(cd - 1.0), eta, cd, area))

    if not scored:
        raise AssertionError("No candidate could fly the reference mission — anchors or airframe are wrong.")

    scored.sort(key=lambda r: (round(r[0], 9), r[1]))
    best = scored[0]
    feasible_count = len(scored)
    total = len(ETAS) * len(CDS) * len(AREAS)
    return best, feasible_count, total


def report():
    assert_identifiable()
    (best_score, _tiebreak, eta, cd, area), feasible_count, total = grid_search()
    specs = build_specs(eta, cd, area)

    endurance = hover_endurance_min(specs, payload_kg=0.0)
    wh_per_km = cruise_energy_per_km_wh(specs, REFERENCE_FLIGHT["payload_kg"],
                                        REFERENCE_FLIGHT["peak_speed_mps"])
    ref = trip_energy_wh(REFERENCE_FLIGHT["distance_m"], REFERENCE_FLIGHT["payload_kg"],
                         specs, hover_time_s=20.0)

    print("Calibration — fitted against class-typical energy anchors")
    print(f"  identifiability guard: PASSED (score responds to all three parameters)")
    print(f"  search space: {feasible_count}/{total} candidates can fly the reference mission")
    print()
    print("Fitted constants:")
    print(f"  eta (propulsive efficiency): {eta}")
    print(f"  cd  (drag coefficient):      {cd}")
    print(f"  frontal_area_m2:             {area}")
    print(f"  -> cd * frontal_area:        {cd * area:.4f}  (the actually-identified quantity)")
    print(f"  residual score:              {best_score:.4f}")
    print()
    print("Anchor match:")
    print(f"  hover endurance:  {endurance:5.1f} min   (target {ANCHORS['hover_endurance_min']:.1f})")
    print(f"  cruise @ {REFERENCE_FLIGHT['peak_speed_mps']} m/s: {wh_per_km:5.1f} Wh/km (target {ANCHORS['cruise_wh_per_km']:.1f})")
    print()
    print(f"Cross-check vs. {REFERENCE_FLIGHT['source']} (5 kg / 5 km):")
    print(f"  energy required:   {ref['total_energy_wh']:.1f} Wh")
    print(f"  usable capacity:   {specs.usable_capacity_wh:.1f} Wh")
    print(f"  usable consumed:   {ref['usable_consumed_frac'] * 100:.0f}%")
    print(f"  feasible:          {ref['feasible']}")
    print()
    print("Copy these into data/drone_specs.json as the calibrated defaults.")

    return {"eta": eta, "cd": cd, "frontal_area_m2": area}


if __name__ == "__main__":
    report()
