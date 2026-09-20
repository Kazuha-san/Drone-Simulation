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


def wind_adjusted_speed(v_air_mps: float, wind_mps: float, heading_deg: float, wind_dir_deg: float) -> float:
    """
    Effective airspeed contribution when flying into/with wind.
    Returns the headwind component added to required airspeed (can be negative = tailwind help).
    heading_deg / wind_dir_deg: 0 = North, clockwise, degrees.
    """
    relative_angle = math.radians(heading_deg - wind_dir_deg)
    headwind_component = wind_mps * math.cos(relative_angle)
    return v_air_mps + headwind_component


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

    # Cruise phase — effective ground speed adjusted by wind (headwind slows progress)
    effective_speed = wind_adjusted_speed(specs.cruise_speed_mps, wind_mps, heading_deg, wind_dir_deg)
    effective_speed = max(effective_speed, 1.0)  # avoid div-by-zero / crawling flight
    cruise_time_s = distance_m / effective_speed
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
        "feasible": feasible,
        "usable_capacity_wh": specs.usable_capacity_wh,
        "soc_after_frac": max(0.0, 1 - total_energy_wh / specs.battery_capacity_wh),
    }


def round_trip_energy_wh(distance_m: float, payload_kg: float, specs: DroneSpecs, **kwargs) -> dict:
    """
    Energy for out-and-back: full payload outbound, empty return.
    This is what should be checked before dispatching a drone (it must get home).
    """
    out = trip_energy_wh(distance_m, payload_kg, specs, **kwargs)
    back = trip_energy_wh(distance_m, 0.0, specs, **kwargs)
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
