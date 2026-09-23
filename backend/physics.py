"""
physics.py — Multirotor drone energy/power model.

This module is the "ground truth" layer: pure functions that take physical
parameters and return power/energy figures. Nothing here knows about orders,
fleets, or maps. Everything else in the system consumes this module.

Model summary
-------------
Total power draw of a multirotor in forward flight is split into:
  1. Induced power   — power needed to generate lift (dominates at hover/low speed)
  2. Parasitic power — power lost to aerodynamic drag (dominates at high speed)

P_hover(W)     = W^1.5 / (eta * sqrt(2 * rho * A))
P_induced(v)   ~= P_hover / sqrt(1 + (v / v_h)^2)      [simplified momentum theory]
P_parasitic(v) = 0.5 * Cd * rho * A_frontal * v^3
P_forward(v)   = P_induced(v) + P_parasitic(v)

Energy for a trip = hover phase (takeoff/landing/hover-to-drop) + cruise phase.

Calibration
-----------
Constants (eta, Cd, A_frontal) are tuned in calibration.py against Zomato's
2019 public test flight: 5 kg payload, 5 km, 10 min, 80 km/h peak speed.
See docs/PHYSICS.md for the full derivation and calibration numbers.
"""

from dataclasses import dataclass
import math

G = 9.81  # m/s^2


@dataclass
class DroneSpecs:
    """Physical specification of a drone model. All SI units."""
    name: str
    empty_mass_kg: float          # airframe + battery, no payload
    max_payload_kg: float
    battery_capacity_wh: float
    rotor_count: int
    rotor_radius_m: float
    eta: float = 0.7              # propulsive efficiency (calibrated)
    cd: float = 1.0               # effective drag coefficient (calibrated)
    frontal_area_m2: float = 0.12 # effective frontal area (calibrated)
    cruise_speed_mps: float = 12.0  # design cruise speed (~43 km/h)
    max_speed_mps: float = 22.0     # ~80 km/h, matches Zomato peak
    battery_reserve_frac: float = 0.20  # mandatory reserve, never dip below this

    @property
    def rotor_area_m2(self) -> float:
        return self.rotor_count * math.pi * (self.rotor_radius_m ** 2)

    @property
    def usable_capacity_wh(self) -> float:
        return self.battery_capacity_wh * (1 - self.battery_reserve_frac)


def air_density(altitude_m: float = 500.0) -> float:
    """
    ISA-approximate air density (kg/m^3) at given altitude.
    Bhopal sits at ~500m elevation, so this matters more than sea-level defaults.
    """
    rho0 = 1.225
    # simple barometric approximation, good enough for <2000m
    return rho0 * math.exp(-altitude_m / 8500.0)


def hover_power_w(total_weight_n: float, rho: float, rotor_area_m2: float, eta: float) -> float:
    """Induced hover power via momentum (actuator disk) theory."""
    if rotor_area_m2 <= 0:
        raise ValueError("rotor_area_m2 must be positive")
    return (total_weight_n ** 1.5) / (eta * math.sqrt(2 * rho * rotor_area_m2))


def induced_velocity_hover(total_weight_n: float, rho: float, rotor_area_m2: float) -> float:
    """v_h — induced velocity at hover, used to scale induced power with forward speed."""
    return math.sqrt(total_weight_n / (2 * rho * rotor_area_m2))


def forward_power_w(v_mps: float, total_weight_n: float, rho: float,
                     rotor_area_m2: float, eta: float, cd: float, frontal_area_m2: float) -> float:
    """
    Total power at forward cruise speed v (m/s).
    Combines simplified induced power (drops off with forward speed) with
    parasitic drag power (grows with v^3).
    """
    p_hover = hover_power_w(total_weight_n, rho, rotor_area_m2, eta)
    v_h = induced_velocity_hover(total_weight_n, rho, rotor_area_m2)
    p_induced = p_hover / math.sqrt(1 + (v_mps / v_h) ** 2) if v_h > 0 else p_hover
    p_parasitic = 0.5 * cd * rho * frontal_area_m2 * (v_mps ** 3)
    return p_induced + p_parasitic


def headwind_component_mps(wind_mps: float, heading_deg: float, wind_dir_deg: float) -> float:
    """
    Component of the wind opposing travel, in m/s. Positive = headwind, negative = tailwind.

    Conventions (both degrees, 0 = North, clockwise):
      heading_deg  — direction of travel
      wind_dir_deg — meteorological: the direction the wind blows *from*
                     (315 = "wind from the NW", matching data/drone_specs.json)

    Flying straight into the wind means heading == wind_dir_deg, so cos(0) = 1
    and the full wind speed opposes you.
    """
    relative_angle = math.radians(heading_deg - wind_dir_deg)
    return wind_mps * math.cos(relative_angle)


def wind_adjusted_speed(v_air_mps: float, wind_mps: float, heading_deg: float, wind_dir_deg: float) -> float:
    """
    Ground speed achieved when holding airspeed `v_air_mps` on `heading_deg`.

    The drone flies at a fixed *airspeed* (that's what sets power draw); wind
    changes how fast the ground goes by underneath. A headwind therefore
    subtracts from ground speed, which lengthens the trip and so raises trip
    energy even though instantaneous power is unchanged.
    """
    return v_air_mps - headwind_component_mps(wind_mps, heading_deg, wind_dir_deg)


def bearing_deg(x1: float, y1: float, x2: float, y2: float) -> float:
    """
    Compass bearing (0 = North/+y, clockwise, degrees) from point 1 to point 2
    in the map's 2D coordinate frame.

    Pure geometry, no map knowledge — provided here so callers (graph.py) can
    supply a real per-edge `heading_deg` to trip_energy_wh() instead of letting
    it default to 0, which would make the directional wind model inert.
    """
    return math.degrees(math.atan2(x2 - x1, y2 - y1)) % 360.0


def trip_energy_wh(distance_m: float, payload_kg: float, specs: DroneSpecs,
                    altitude_m: float = 500.0, wind_mps: float = 0.0,
                    heading_deg: float = 0.0, wind_dir_deg: float = 315.0,
                    hover_time_s: float = 30.0) -> dict:
    """
    Total energy (Wh) for one one-way trip of `distance_m`, carrying `payload_kg`.

    Includes:
      - hover_time_s of hover (takeoff + drop-off hover, default 30s)
      - cruise at specs.cruise_speed_mps adjusted for wind

    Returns a dict with energy breakdown and a feasibility flag against the
    drone's usable (post-reserve) battery capacity.
    """
    rho = air_density(altitude_m)
    total_mass_kg = specs.empty_mass_kg + payload_kg
    total_weight_n = total_mass_kg * G
    area = specs.rotor_area_m2

    # Hover phase
    p_hover = hover_power_w(total_weight_n, rho, area, specs.eta)
    e_hover_wh = p_hover * (hover_time_s / 3600.0)

    # Cruise phase — the drone holds a constant *airspeed* (this sets power draw);
    # wind only changes the ground speed, and therefore how long the trip takes.
    ground_speed = wind_adjusted_speed(specs.cruise_speed_mps, wind_mps, heading_deg, wind_dir_deg)
    # A headwind at or above cruise airspeed means no real progress. Rather than
    # divide by zero we floor the ground speed; the resulting huge trip time and
    # energy then fail the feasibility check on their own, which is the correct
    # operational answer ("don't dispatch into that").
    ground_speed = max(ground_speed, 0.5)
    cruise_time_s = distance_m / ground_speed
    p_cruise = forward_power_w(specs.cruise_speed_mps, total_weight_n, rho, area,
                                specs.eta, specs.cd, specs.frontal_area_m2)
    e_cruise_wh = p_cruise * (cruise_time_s / 3600.0)

    total_energy_wh = e_hover_wh + e_cruise_wh
    feasible = total_energy_wh <= specs.usable_capacity_wh

    return {
        "distance_m": distance_m,
        "payload_kg": payload_kg,
        "hover_energy_wh": e_hover_wh,
        "cruise_energy_wh": e_cruise_wh,
        "total_energy_wh": total_energy_wh,
        "cruise_time_s": cruise_time_s,
        "total_time_s": cruise_time_s + hover_time_s,
        "ground_speed_mps": ground_speed,
        "feasible": feasible,
        "usable_capacity_wh": specs.usable_capacity_wh,
        # Two different denominators, deliberately — don't compare them directly:
        #   soc_after_frac      = state of charge vs. the *full* pack (what a pilot reads)
        #   usable_consumed_frac = fraction of the *usable* (post-reserve) budget spent,
        #                          which is what `feasible` above tests (>1.0 means infeasible)
        "soc_after_frac": max(0.0, 1 - total_energy_wh / specs.battery_capacity_wh),
        "usable_consumed_frac": total_energy_wh / specs.usable_capacity_wh,
    }


def round_trip_energy_wh(distance_m: float, payload_kg: float, specs: DroneSpecs, **kwargs) -> dict:
    """
    Energy for out-and-back: full payload outbound, empty return.
    This is what should be checked before dispatching a drone (it must get home).

    The return leg flies the reversed heading, so an outbound headwind becomes a
    return tailwind. Without this the same wind penalty gets applied twice and
    out-and-back wind costs compound instead of largely cancelling.
    """
    out_kwargs = dict(kwargs)
    back_kwargs = dict(kwargs)
    back_kwargs["heading_deg"] = (out_kwargs.get("heading_deg", 0.0) + 180.0) % 360.0

    out = trip_energy_wh(distance_m, payload_kg, specs, **out_kwargs)
    back = trip_energy_wh(distance_m, 0.0, specs, **back_kwargs)
    total = out["total_energy_wh"] + back["total_energy_wh"]
    return {
        "outbound": out,
        "return": back,
        "total_energy_wh": total,
        "feasible": total <= specs.usable_capacity_wh,
        "total_time_s": out["total_time_s"] + back["total_time_s"],
    }


# Ground vehicle baseline — deliberately simple, no physics, this is the control group
@dataclass
class GroundVehicleSpecs:
    name: str = "scooter"
    avg_speed_kmh: float = 18.0     # realistic Bhopal urban traffic average
    cost_per_km_inr: float = 6.0    # approx rider wage + fuel per km


def ground_trip_time_s(distance_m: float, specs: GroundVehicleSpecs) -> float:
    speed_mps = specs.avg_speed_kmh * 1000 / 3600
    return distance_m / speed_mps


# ---------------------------------------------------------------------------
# Derived performance metrics.
#
# These exist because they are the quantities the free aerodynamic constants
# actually control, which makes them the right targets to calibrate against
# (see calibration.py). Trip *time* is not one of them — it depends only on
# cruise speed and wind, so fitting eta/cd/frontal_area to a time target fits
# nothing at all.
# ---------------------------------------------------------------------------

def hover_endurance_min(specs: DroneSpecs, payload_kg: float = 0.0,
                        altitude_m: float = 500.0, use_reserve: bool = False) -> float:
    """
    How long the drone can hold a hover before hitting its energy budget.

    Sensitive to `eta` and nothing else aerodynamic (there is no forward speed,
    so drag never enters) — which is exactly what makes it a clean anchor for
    isolating eta.

    use_reserve=False measures against usable (post-reserve) capacity, the
    operationally meaningful number.
    """
    rho = air_density(altitude_m)
    weight_n = (specs.empty_mass_kg + payload_kg) * G
    p = hover_power_w(weight_n, rho, specs.rotor_area_m2, specs.eta)
    budget_wh = specs.battery_capacity_wh if use_reserve else specs.usable_capacity_wh
    return (budget_wh / p) * 60.0


def cruise_energy_per_km_wh(specs: DroneSpecs, payload_kg: float, speed_mps: float,
                            altitude_m: float = 500.0) -> float:
    """
    Steady-state cruise energy intensity (Wh per km) at a given airspeed, in
    still air and excluding hover phases.

    At high speed the v^3 parasitic term dominates, so this anchor is what
    pins the `cd * frontal_area_m2` product.
    """
    rho = air_density(altitude_m)
    weight_n = (specs.empty_mass_kg + payload_kg) * G
    p = forward_power_w(speed_mps, weight_n, rho, specs.rotor_area_m2,
                        specs.eta, specs.cd, specs.frontal_area_m2)
    hours_per_km = (1000.0 / speed_mps) / 3600.0
    return p * hours_per_km


# ---------------------------------------------------------------------------
# Self-test: qualitative invariants the model must satisfy.
# Run `python physics.py`. These are cheap insurance for anyone (including a
# future us) who edits constants or equations under time pressure — they catch
# sign errors and inverted relationships that still "run fine".
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    s = DroneSpecs(name="selftest", empty_mass_kg=12.0, max_payload_kg=6.0,
                   battery_capacity_wh=500.0, rotor_count=4, rotor_radius_m=0.20)
    D, W = 3000.0, 3.0

    def check(label, ok):
        print(f"  [{'PASS' if ok else 'FAIL'}] {label}")
        assert ok, label

    print("physics.py self-test")

    check("air thins with altitude",
          air_density(2000) < air_density(500) < air_density(0))

    check("heavier payload costs more energy",
          trip_energy_wh(D, 5.0, s)["total_energy_wh"] > trip_energy_wh(D, 0.0, s)["total_energy_wh"])

    check("thinner air costs more hover power",
          trip_energy_wh(D, 2.0, s, altitude_m=2000)["hover_energy_wh"]
          > trip_energy_wh(D, 2.0, s, altitude_m=0)["hover_energy_wh"])

    check("longer distance costs more energy",
          trip_energy_wh(6000.0, 2.0, s)["total_energy_wh"] > trip_energy_wh(3000.0, 2.0, s)["total_energy_wh"])

    # Wind sign: heading 315 into a wind *from* 315 is a pure headwind.
    head = trip_energy_wh(D, 2.0, s, wind_mps=W, heading_deg=315.0, wind_dir_deg=315.0)
    tail = trip_energy_wh(D, 2.0, s, wind_mps=W, heading_deg=135.0, wind_dir_deg=315.0)
    calm = trip_energy_wh(D, 2.0, s, wind_mps=0.0, heading_deg=315.0, wind_dir_deg=315.0)
    check("headwind slows ground speed below calm",
          head["ground_speed_mps"] < calm["ground_speed_mps"] < tail["ground_speed_mps"])
    check("headwind costs more energy than tailwind",
          head["total_energy_wh"] > calm["total_energy_wh"] > tail["total_energy_wh"])

    check("crosswind is ~neutral",
          abs(trip_energy_wh(D, 2.0, s, wind_mps=W, heading_deg=45.0, wind_dir_deg=315.0)["total_energy_wh"]
              - calm["total_energy_wh"]) < 1e-9)

    rt = round_trip_energy_wh(D, 2.0, s, wind_mps=W, heading_deg=315.0, wind_dir_deg=315.0)
    check("round trip costs more than one way",
          rt["total_energy_wh"] > head["total_energy_wh"])
    check("return leg gets the reciprocal wind (tailwind home)",
          rt["return"]["ground_speed_mps"] > rt["outbound"]["ground_speed_mps"])

    rt_calm = round_trip_energy_wh(D, 2.0, s, wind_mps=0.0)
    rt_wind = round_trip_energy_wh(D, 2.0, s, wind_mps=W, heading_deg=315.0, wind_dir_deg=315.0)
    check("out-and-back wind penalty is small but net positive (headwind hurts "
          "more than the tailwind helps, since you spend longer fighting it)",
          0 < rt_wind["total_energy_wh"] - rt_calm["total_energy_wh"] < 0.35 * rt_calm["total_energy_wh"])

    check("empty return leg is cheaper than loaded outbound",
          rt["return"]["total_energy_wh"] < rt["outbound"]["total_energy_wh"])

    check("hover endurance falls as payload rises",
          hover_endurance_min(s, 5.0) < hover_endurance_min(s, 0.0))

    # Wh/km is U-shaped in speed, not monotonic: crawling wastes energy holding
    # the aircraft up, and only well past the design envelope does v^3 drag take
    # over. For these specs the Wh/km minimum sits near 26 m/s, i.e. ABOVE
    # max_speed — so within the flyable envelope, faster is cheaper per km.
    check("crawling is very expensive per km (hover power dominates)",
          cruise_energy_per_km_wh(s, 5.0, 2.0) > 3 * cruise_energy_per_km_wh(s, 5.0, 12.0))

    check("drag eventually dominates: power rises steeply past best-endurance speed",
          cruise_energy_per_km_wh(s, 5.0, 40.0) > cruise_energy_per_km_wh(s, 5.0, 26.0))

    check("power curve has an interior minimum (induced falls, parasitic rises)",
          min((cruise_energy_per_km_wh(s, 5.0, v), v) for v in range(2, 45))[1] not in (2, 44))

    check("bearing: +y is North, +x is East",
          abs(bearing_deg(0, 0, 0, 1) - 0.0) < 1e-9 and abs(bearing_deg(0, 0, 1, 0) - 90.0) < 1e-9)

    print("\nAll physics invariants hold.")
