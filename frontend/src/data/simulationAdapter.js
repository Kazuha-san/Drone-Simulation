/**
 * REAL DATA ADAPTER — reads a LIVE engine response, invents nothing
 * measurable.
 *
 * This used to build-time import a static `trace.json` baked by
 * `run_simulation.py`. That meant the same three fixed scenarios replayed
 * every time the app loaded. It has been replaced: `buildScenario(liveTrace)`
 * below takes the JSON body of a POST /api/simulate call (see apiClient.js)
 * — fresh presets, fresh random orders, actually re-run server-side — and
 * shapes it into the same UI-facing "scenario" object the rest of the app
 * already consumes. Call it again for a new run; nothing here is cached
 * across calls.
 *
 * ---------------------------------------------------------------------------
 * Decisions carried over from the original adapter, still true:
 *
 * 1. FLEET → SINGLE VEHICLE. `useSimulation.js` holds exactly one
 *    `droneState`/`groundState` and the canvas renders exactly one of each.
 *    The representative shown is the BUSIEST vehicle of each kind for this
 *    run. The map is a sample of the run; the metrics panel aggregates the
 *    WHOLE fleet as configured by the fleet preset.
 *
 * ---------------------------------------------------------------------------
 * REAL vs DECORATIVE — do not present the second group as simulated:
 *
 *   Real (engine-derived, this run): every field in `metrics`, order
 *   weightKg, distanceKm, etaMinutes, energyKwh, completedAtSeconds, status,
 *   assignedVehicle, infeasibleReason, x/y positions, both trajectories,
 *   windKmh, trafficMultiplier, activeNoFlyZones, and all of DRONE_SPECS/
 *   GROUND_SPECS except the fields noted below.
 *
 *   Decorative (no engine equivalent — fixed display values): drone
 *   maxFlightAltitudeM and sensorPayload; ground weather visibilityKm/tempC/
 *   condition; trajectory `alt` values; order title/category. Ground/rider
 *   energy is not decorative-but-invented — it is reported as 0 / "not
 *   modeled" rather than backfilled with a made-up constant, since the
 *   engine has no energy model for riders at all (see docs/PHYSICS.md).
 */

import { MAP_CONFIG } from "./mapVisuals";

const round = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

function energyKwhFor(result) {
  // Riders have NO energy model in the engine (see docs/PHYSICS.md — costed
  // in INR/km only). Returning 0 here is a statement of fact ("not
  // modeled"), not an estimate dressed up as a measurement — do not
  // replace this with a made-up kWh/km constant.
  if (result.energy_wh != null) return result.energy_wh / 1000; // drones: real
  return 0;
}

function categoryFor(payloadKg) {
  if (payloadKg < 1.5) return "Pharmacy / Small Parcel";
  if (payloadKg < 3.0) return "Grocery Basket";
  return "Bulk Order";
}

function titleFor(order, payloadKg) {
  return `${categoryFor(payloadKg)} — ${order.destination.replace("DEL_", "")}`;
}

// Real rule: an order is "critical" if it missed SLA or used >80% of its
// SLA window. Not an invented urgency tier.
function priorityFor(result, order) {
  if (!result || result.status !== "delivered") return "critical";
  if (result.sla_violated) return "critical";
  return result.delivery_time_s > 0.8 * order.sla_seconds ? "critical" : "standard";
}

function formatClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function busiestVehicleId(pairs, kind) {
  const counts = new Map();
  for (const { result } of pairs) {
    if (result.vehicle_kind !== kind) continue;
    counts.set(result.vehicle_id, (counts.get(result.vehicle_id) || 0) + 1);
  }
  let best = null;
  let bestN = -1;
  for (const [id, n] of counts) {
    if (n > bestN) {
      best = id;
      bestN = n;
    }
  }
  return best;
}

// DECORATIVE: visibility/temp have no engine equivalent. Condition label
// stays consistent with the real wind speed and the chosen weather preset.
function weatherConditionFor(windKmh) {
  if (windKmh >= 25) return { condition: "Storm", visibilityKm: 5, tempC: 28 };
  if (windKmh >= 18) return { condition: "Strong Headwind", visibilityKm: 6, tempC: 29 };
  if (windKmh >= 9) return { condition: "Breezy", visibilityKm: 8, tempC: 30 };
  return { condition: "Clear", visibilityKm: 10, tempC: 31 };
}

/**
 * Builds the UI scenario object from one live /api/simulate response.
 * `liveTrace` is exactly what apiClient.runSimulation() resolves to.
 */
export function buildScenario(liveTrace) {
  const { map, orders: rawOrders, results, summary, specs, presets_used, seed_used } = liveTrace;

  const derived = specs.derived;
  const MAP_SCALE = Math.min(
    MAP_CONFIG.width / derived.map_width,
    MAP_CONFIG.height / derived.map_height
  );
  const MAP_OFFSET_X = (MAP_CONFIG.width - derived.map_width * MAP_SCALE) / 2;
  const MAP_OFFSET_Y = (MAP_CONFIG.height - derived.map_height * MAP_SCALE) / 2;

  const NODE_BY_ID = new Map(map.nodes.map((n) => [n.id, n]));
  const toFrontendX = (x) => x * MAP_SCALE + MAP_OFFSET_X;
  const toFrontendY = (y) => y * MAP_SCALE + MAP_OFFSET_Y;
  const nodePoint = (id) => {
    const n = NODE_BY_ID.get(id);
    if (!n) return null;
    return { x: toFrontendX(n.x), y: toFrontendY(n.y) };
  };

  function buildTrajectory(orderResultPairs, isDrone) {
    const frames = [];
    for (const { order, result } of orderResultPairs) {
      const pts = (result.path || []).map(nodePoint).filter(Boolean);
      if (pts.length < 2) continue;

      const segLen = [];
      let total = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        segLen.push(d);
        total += d;
      }
      if (total <= 0) continue;

      const t0 = order.created_at_s;
      const span = result.delivery_time_s;
      let acc = 0;
      for (let i = 0; i < pts.length; i++) {
        // DECORATIVE altitude profile: not physically simulated.
        let alt = 0;
        if (isDrone) alt = i === 0 ? 0 : i === pts.length - 1 ? 15 : 90;
        frames.push({
          x: round(pts[i].x, 1),
          y: round(pts[i].y, 1),
          t: round(t0 + (acc / total) * span, 1),
          alt,
        });
        if (i < segLen.length) acc += segLen[i];
      }
    }
    return frames.filter((f, i) => i === 0 || f.t > frames[i - 1].t);
  }

  const orders = rawOrders.map((order) => {
    const result = results.find((r) => r.order_id === order.id) || { status: "failed" };
    const delivered = result.status === "delivered";
    const dest = nodePoint(order.destination) || { x: 0, y: 0 };

    return {
      id: `order_${order.id}`,
      title: titleFor(order, order.payload_kg),
      category: categoryFor(order.payload_kg),
      location: order.destination,
      x: round(dest.x, 1),
      y: round(dest.y, 1),
      priority: priorityFor(delivered ? result : null, order),
      status: delivered ? "completed" : "infeasible",
      infeasibleReason: delivered ? null : (result.reason || "unassigned"),
      assignedVehicle: delivered ? (result.vehicle_kind === "rider" ? "ground" : "drone") : null,
      weightKg: order.payload_kg,
      distanceKm: delivered ? round(result.distance_m / 1000, 1) : 0,
      etaMinutes: delivered ? round(result.delivery_time_s / 60, 1) : 0,
      energyKwh: delivered ? round(energyKwhFor(result), 3) : 0,
      timeWindow: `${formatClock(order.created_at_s)}–${formatClock(order.created_at_s + order.sla_seconds)}`,
      completedAtSeconds: delivered ? round(order.created_at_s + result.delivery_time_s, 1) : null,
    };
  });

  const orderById = new Map(rawOrders.map((o) => [o.id, o]));
  const deliveredPairs = results
    .filter((r) => r.status === "delivered" && orderById.has(r.order_id))
    .map((r) => ({ order: orderById.get(r.order_id), result: r }))
    .sort((a, b) => a.order.created_at_s - b.order.created_at_s);

  const droneId = busiestVehicleId(deliveredPairs, "drone");
  const riderId = busiestVehicleId(deliveredPairs, "rider");

  const droneTrajectory = buildTrajectory(
    deliveredPairs.filter((p) => p.result.vehicle_id === droneId), true);
  const groundTrajectory = buildTrajectory(
    deliveredPairs.filter((p) => p.result.vehicle_id === riderId), false);

  const droneDone = deliveredPairs.filter((p) => p.result.vehicle_kind === "drone");
  const riderDone = deliveredPairs.filter((p) => p.result.vehicle_kind === "rider");
  const mean = (arr, fn) => (arr.length ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0);
  const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);

  const droneEnergyKwh = sum(droneDone, (p) => energyKwhFor(p.result));
  const groundEnergyKwh = sum(riderDone, (p) => energyKwhFor(p.result));

  const windKmh = round(summary.wind_mps * 3.6, 1);
  const weatherCondition = weatherConditionFor(windKmh);

  const fleetModeLabel = {
    drones_only: "Drones Only",
    riders_only: "Riders Only",
    mixed: "Mixed Fleet",
  }[summary.fleet_mode] || summary.fleet_mode;

  return {
    seedUsed: seed_used,
    name: `${presets_used.fleet.label} · ${presets_used.weather.label} · ${presets_used.obstacles.label}`,
    tagline: `${fleetModeLabel} — live run`,
    description:
      `${presets_used.fleet.description} Weather: ${presets_used.weather.description} ` +
      `Airspace/traffic: ${presets_used.obstacles.description}`,
    fleetMode: summary.fleet_mode,
    presetsUsed: presets_used,
    weather: { windKmh, ...weatherCondition, icon: presets_used.weather.icon },
    trafficMultiplier: summary.traffic_multiplier,
    activeNoFlyZones: summary.active_no_fly_zones,
    droneSpeedFactor: 1.0,
    groundSpeedFactor: 1.0,
    orders,
    noFlyZones: map.no_fly_zones,
    droneTrajectory,
    groundTrajectory,
    metrics: {
      totalOrders: summary.total_orders,
      droneDeliveries: summary.delivered_by_kind.drone || 0,
      groundDeliveries: summary.delivered_by_kind.rider || 0,
      infeasibleOrders: summary.failed,
      failureReasons: summary.failure_reasons,
      avgDeliveryTimeMinutes: round(summary.avg_delivery_time_s / 60, 1),
      droneAvgDeliveryTimeMinutes: round(mean(droneDone, (p) => p.result.delivery_time_s) / 60, 1),
      groundAvgDeliveryTimeMinutes: round(mean(riderDone, (p) => p.result.delivery_time_s) / 60, 1),
      droneAvgDistanceKm: round(mean(droneDone, (p) => p.result.distance_m) / 1000, 2),
      groundAvgDistanceKm: round(mean(riderDone, (p) => p.result.distance_m) / 1000, 2),
      droneEnergyKwh: round(droneEnergyKwh, 3),
      groundEnergyKwh: round(groundEnergyKwh, 3),
      totalEnergyUsedKwh: round(droneEnergyKwh + groundEnergyKwh, 3),
      feasibilityRatePct: round((1 - summary.failure_rate) * 100, 1),
      computeMs: round(summary.compute_ms, 0),
    },
  };
}

export function buildSpecs(liveTrace) {
  const { drone, ground_vehicle, derived } = liveTrace.specs;
  return {
    droneSpecs: {
      model: drone.name,
      maxPayloadKg: drone.max_payload_kg,
      cruiseSpeedKmh: round(drone.cruise_speed_mps * 3.6, 1),
      batteryCapacityKwh: round(drone.battery_capacity_wh / 1000, 3),
      avgEnergyPerKmKwh: round(derived.drone_cruise_wh_per_km / 1000, 4),
      maxFlightAltitudeM: 120, // DECORATIVE
      sensorPayload: "GNSS + Barometric Altimeter", // DECORATIVE
    },
    groundSpecs: {
      // Riders have NO energy/battery/payload model in the engine (see
      // docs/PHYSICS.md — costed in INR/km only) — those fields are `null`
      // here rather than an invented number, and the UI shows "N/A" for
      // them instead of a fake figure.
      model: ground_vehicle.name,
      maxPayloadKg: null,
      avgSpeedKmh: ground_vehicle.avg_speed_kmh,
      batteryCapacityKwh: null,
      avgEnergyPerKmKwh: null,
      costPerKmInr: ground_vehicle.cost_per_km_inr, // real
    },
  };
}
