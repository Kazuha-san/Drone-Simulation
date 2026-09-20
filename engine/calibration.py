"""
calibration.py — Fit physics.py's free constants (eta, cd, frontal_area) against
a real public data point, so our numbers aren't just invented.

Reference flight (Zomato, 2019 public test):
    payload   = 5 kg
    distance  = 5 km
    duration  = 10 min (600 s)
    peak speed = 80 km/h (22.2 m/s)

We don't have Zomato's actual drone specs, so we hold plausible mid-size
delivery-drone airframe numbers fixed (mass, rotor size, battery) and solve
for the aerodynamic constants (eta, cd, frontal_area) that make our model
reproduce their reported 600s trip time at their reported speed profile.

This is a coarse grid search, not a rigorous fit — appropriate for a
hackathon-scale calibration. The point is defensibility: "our constants
reproduce a real published flight," not perfect accuracy.
"""

from physics import DroneSpecs, trip_energy_wh
import itertools

REFERENCE = {
    "payload_kg": 5.0,
    "distance_m": 5000.0,
    "duration_s": 600.0,
    "peak_speed_mps": 22.2,  # 80 km/h
}

BASE_SPECS_KWARGS = dict(
    name="reference_drone",
    empty_mass_kg=12.0,          # plausible mid-size delivery airframe
    max_payload_kg=6.0,
    battery_capacity_wh=500.0,   # plausible for this class
    rotor_count=4,
    rotor_radius_m=0.20,
    cruise_speed_mps=REFERENCE["distance_m"] / REFERENCE["duration_s"],  # back-solved avg speed ~8.3 m/s
)


def score(eta, cd, frontal_area) -> float:
    specs = DroneSpecs(eta=eta, cd=cd, frontal_area_m2=frontal_area, **BASE_SPECS_KWARGS)
    result = trip_energy_wh(REFERENCE["distance_m"], REFERENCE["payload_kg"], specs, hover_time_s=20.0)
    target_time = REFERENCE["duration_s"]
    return abs(result["total_time_s"] - target_time)


def grid_search():
    best = None
    etas = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8]
    cds = [0.6, 0.8, 1.0, 1.2, 1.4]
    areas = [0.05, 0.08, 0.1, 0.12, 0.15, 0.2]

    for eta, cd, area in itertools.product(etas, cds, areas):
        s = score(eta, cd, area)
        if best is None or s < best[0]:
            best = (s, eta, cd, area)

    return best


if __name__ == "__main__":
    best_score, eta, cd, area = grid_search()
    print("Calibration result (closest match to Zomato 2019 test flight):")
    print(f"  eta (propulsive efficiency): {eta}")
    print(f"  cd  (drag coefficient):      {cd}")
    print(f"  frontal_area_m2:             {area}")
    print(f"  time error vs 600s target:   {best_score:.1f}s")
    print()
    print("Copy these into data/drone_specs.json as the calibrated defaults.")
