/**
 * REAL DATA ADAPTER — reads engine output, invents nothing measurable.
 *
 * Everything numeric exported here comes from `trace.json`, which is written
 * by `engine/run_simulation.py`. Re-run that script to refresh this data; it
 * writes both `data/trace.json` (canonical) and the copy imported below.
 *
 * ---------------------------------------------------------------------------
 * Decisions this file makes, per INTEGRATION.md v2 §3 ("flag, don't silently
 * decide"). All three are recorded here because they change how the numbers
 * should be read:
 *
 * 1. TRACE DELIVERY (§2.5) — build-time import, option 1. Vite cannot import
 *    JSON from outside its project root, so `run_simulation.py` writes a
 *    second compact copy into this directory. The alternative (runtime fetch)
 *    would make SCENARIOS async, and the components consume it synchronously.
 *
 * 2. FLEET → SINGLE VEHICLE (§2.2a) — option (i), one representative vehicle
 *    per kind. This is forced by the existing architecture, not preference:
 *    `useSimulation.js` holds exactly one `droneState`/`groundState`, and the
 *    canvas renderers draw exactly one of each. Showing all 8 vehicles would
 *    require changing `src/canvas/` and the hook's shape, both off-limits.
 *    The representative is the BUSIEST vehicle of each kind (most completed
 *    deliveries). Consequence worth stating out loud: the animated drone and
 *    rider show ONE vehicle's real itinerary, while the metrics panel
 *    aggregates the WHOLE 4+4 fleet. The map is a sample of the run; the
 *    numbers are the whole run.
 *
 * 3. SCENARIO AXIS (§2.2b) — resolved on the engine side, as the doc
 *    recommends. `run_simulation.py` now runs a `DEMAND_SCENARIOS` sweep:
 *    the mixed fleet three times at increasing demand rate and wind speed,
 *    keyed `baseline`/`peak`/`stress`. Those genuinely vary along the
 *    demand-intensity/weather axis the UI cards already promise, so no UI
 *    copy had to change. The fleet-composition runs
 *    (drones_only/riders_only/mixed) are still in the trace under
 *    `scenarios`, untouched, for the engine-side reports.
 *
 * ---------------------------------------------------------------------------
 * REAL vs DECORATIVE — do not present the second group as simulated:
 *
 *   Real (engine-derived): every field in `metrics`, order weightKg,
 *   distanceKm, etaMinutes, energyKwh, completedAtSeconds, status,
 *   assignedVehicle, infeasibleReason, x/y positions, both trajectories,
 *   windKmh, trafficMultiplier, and all of DRONE_SPECS except the two
 *   fields noted below.
 *
 *   Decorative (no engine equivalent — fixed display values): drone
 *   maxFlightAltitudeM and sensorPayload; ground maxPayloadKg,
 *   batteryCapacityKwh, avgEnergyPerKmKwh and trafficSensitivity (the rider
 *   model is costed in INR/km with no energy model at all — see
 *   docs/PHYSICS.md); weather visibilityKm/tempC/condition; trajectory
 *   `alt` values; order title/category. Each is marked DECORATIVE inline.
 */

import trace from "./trace.json";
import { MAP_CONFIG } from "./mapVisuals";

const { drone, ground_vehicle, derived } = trace.specs;
// --- §2.4 coordinate rescaling: one function, used everywhere -------------
// Since the routing graph is now generated from the same OpenStreetMap
// basemap the canvas draws (engine/build_graph.py), both live in the same
// 2400x1600 frame and this is the identity transform. It is kept, and kept
// data-driven, so that regenerating the map in a different projection cannot
// silently desync the routes from the geography under them.
const MAP_SCALE = Math.min(
  MAP_CONFIG.width / derived.map_width,
  MAP_CONFIG.height / derived.map_height
);
const MAP_OFFSET_X = (MAP_CONFIG.width - derived.map_width * MAP_SCALE) / 2;
const MAP_OFFSET_Y = (MAP_CONFIG.height - derived.map_height * MAP_SCALE) / 2;

function toFrontendX(x) {
  return x * MAP_SCALE + MAP_OFFSET_X;
}
function toFrontendY(y) {
  return y * MAP_SCALE + MAP_OFFSET_Y;
}

const NODE_BY_ID = new Map(trace.map.nodes.map((n) => [n.id, n]));

function nodePoint(id) {
  const n = NODE_BY_ID.get(id);
  if (!n) return null;
  return { x: toFrontendX(n.x), y: toFrontendY(n.y) };
}

const round = (v, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

// --- specs ----------------------------------------------------------------

// Riders have NO energy model in the engine (see docs/PHYSICS.md) — they are
// costed in INR/km only. INTEGRATION.md v2 §2.3 suggests deriving rider energy
// as cost_inr / INR_PER_KWH, but that is a category error: cost_per_km_inr is
// a *service* rate (labour + vehicle + fuel), not an electricity tariff.
// Applying it yields ~11 kWh per rider delivery against ~0.26 kWh for a drone
// — a 40x gap that is not physically real, and it would render straight into
// the "Energy / Delivery" comparison row as if it were measured.
//
// Instead, rider energy is distance x a fixed published intensity for a petrol
// scooter (~45 km/l, petrol ~8.9 kWh/l => ~0.2 kWh/km). This is a DISPLAY
// CONSTANT, not a simulated quantity — the engine models rider cost, not rider
// energy. Rider INR cost remains real and is reported separately.
const RIDER_KWH_PER_KM = 0.2;


export const DRONE_SPECS = {
  model: drone.name,
  maxPayloadKg: drone.max_payload_kg,
  cruiseSpeedKmh: round(drone.cruise_speed_mps * 3.6, 1),
  batteryCapacityKwh: round(drone.battery_capacity_wh / 1000, 3),
  // From physics.cruise_energy_per_km_wh() at cruise speed and half max
  // payload, computed engine-side (see run_simulation.py specs.derived).
  avgEnergyPerKmKwh: round(derived.drone_cruise_wh_per_km / 1000, 4),
  maxFlightAltitudeM: 120, // DECORATIVE — altitude is not simulated
  sensorPayload: "GNSS + Barometric Altimeter" // DECORATIVE
};

export const GROUND_SPECS = {
  model: ground_vehicle.name,
  maxPayloadKg: 20, // DECORATIVE — the rider model has no payload cap
  avgSpeedKmh: ground_vehicle.avg_speed_kmh,
  batteryCapacityKwh: 1.5, // DECORATIVE — riders have no energy model
  avgEnergyPerKmKwh: RIDER_KWH_PER_KM, // DECORATIVE — see RIDER_KWH_PER_KM
  trafficSensitivity: "High" // DECORATIVE
};

// --- order-level display fields derived from real values ------------------

// Payload weight bucket. DECORATIVE label, but the bucket boundary is a real
// payload_kg reading, so it never contradicts the manifest weight shown.
function categoryFor(payloadKg) {
  if (payloadKg < 1.5) return "Pharmacy / Small Parcel";
  if (payloadKg < 3.0) return "Grocery Basket";
  return "Bulk Order";
}

function titleFor(order, payloadKg) {
  return `${categoryFor(payloadKg)} — ${order.destination.replace("DEL_", "")}`;
}

// Real rule, not an invented urgency tier: an order is "critical" if it
// missed its SLA or used more than 80% of its SLA window. Every order in the
// generated stream carries the same 900s SLA, so this is purely a function of
// measured delivery time.
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


function energyKwhFor(result) {
  if (result.energy_wh != null) return result.energy_wh / 1000; // drones: real
  if (result.distance_m != null) return (result.distance_m / 1000) * RIDER_KWH_PER_KM;
  return 0;
}

// --- trajectory construction (§2.2a) --------------------------------------

// Walks one vehicle's completed orders in time order and turns each order's
// node-id path into {x, y, t, alt} keyframes. Time within a leg is
// distributed by cumulative straight-line distance between path nodes, so a
// long hop takes proportionally longer than a short one. Between two orders
// the vehicle drifts from its last drop-off to the next pickup — that gap is
// real occupied time (the return/reposition leg the engine charges for), it
// is just not broken out as its own path in the trace.
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
      // DECORATIVE altitude profile: ground level at pickup, cruise in
      // between, low at the drop. Altitude is not physically simulated.
      let alt = 0;
      if (isDrone) alt = i === 0 ? 0 : i === pts.length - 1 ? 15 : 90;
      frames.push({
        x: round(pts[i].x, 1),
        y: round(pts[i].y, 1),
        t: round(t0 + (acc / total) * span, 1),
        alt
      });
      if (i < segLen.length) acc += segLen[i];
    }
  }
  // interpolateTrajectory() in useSimulation.js assumes strictly increasing t.
  return frames.filter((f, i) => i === 0 || f.t > frames[i - 1].t);
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

// --- scenario assembly ----------------------------------------------------

const SCENARIO_COPY = {
  baseline: {
    name: "Baseline",
    tagline: "Standard Urban Delivery Dispatch"
  },
  peak: {
    name: "Peak Demand",
    tagline: "Commercial High-Density Rush Hour"
  },
  stress: {
    name: "Stress Test",
    tagline: "Dynamic Airspace Reroute & Adverse Weather"
  }
};

// DECORATIVE: visibility/temp/condition have no engine equivalent. The
// condition string is at least kept consistent with the real wind speed.
function weatherFor(windKmh) {
  if (windKmh >= 25) return { condition: "Strong Headwind", visibilityKm: 6, tempC: 29 };
  if (windKmh >= 15) return { condition: "Breezy", visibilityKm: 8, tempC: 30 };
  return { condition: "Clear", visibilityKm: 10, tempC: 31 };
}

function buildScenario(id, run) {
  const summary = run.summary;
  const resultById = new Map(run.results.map((r) => [r.order_id, r]));

  const orders = run.orders.map((order) => {
    const result = resultById.get(order.id) || { status: "failed" };
    const delivered = result.status === "delivered";
    const dest = nodePoint(order.destination) || { x: 0, y: 0 };

    return {
      id: `order_${order.id}`,
      title: titleFor(order, order.payload_kg), // DECORATIVE label
      category: categoryFor(order.payload_kg), // DECORATIVE label
      location: order.destination,
      x: round(dest.x, 1),
      y: round(dest.y, 1),
      priority: priorityFor(delivered ? result : null, order),
      // Only "completed"/"infeasible" are set here. getDynamicOrders() in
      // useSimulation.js derives "assigned"/"pending" from the playback clock.
      status: delivered ? "completed" : "infeasible",
      infeasibleReason: delivered ? null : (result.reason || "unassigned"),
      assignedVehicle: delivered ? (result.vehicle_kind === "rider" ? "ground" : "drone") : null,
      weightKg: order.payload_kg,
      distanceKm: delivered ? round(result.distance_m / 1000, 1) : 0,
      etaMinutes: delivered ? round(result.delivery_time_s / 60, 1) : 0,
      energyKwh: delivered ? round(energyKwhFor(result), 3) : 0,
      timeWindow: `${formatClock(order.created_at_s)}–${formatClock(order.created_at_s + order.sla_seconds)}`,
      completedAtSeconds: delivered ? round(order.created_at_s + result.delivery_time_s, 1) : null
    };
  });

  // Pair each delivered result with its order, in dispatch order.
  const orderById = new Map(run.orders.map((o) => [o.id, o]));
  const deliveredPairs = run.results
    .filter((r) => r.status === "delivered" && orderById.has(r.order_id))
    .map((r) => ({ order: orderById.get(r.order_id), result: r }))
    .sort((a, b) => a.order.created_at_s - b.order.created_at_s);

  const droneId = busiestVehicleId(deliveredPairs, "drone");
  const riderId = busiestVehicleId(deliveredPairs, "rider");

  const droneTrajectory = buildTrajectory(
    deliveredPairs.filter((p) => p.result.vehicle_id === droneId), true);
  const groundTrajectory = buildTrajectory(
    deliveredPairs.filter((p) => p.result.vehicle_id === riderId), false);

  // Per-kind aggregates over the whole fleet (not the representative vehicle).
  const droneDone = deliveredPairs.filter((p) => p.result.vehicle_kind === "drone");
  const riderDone = deliveredPairs.filter((p) => p.result.vehicle_kind === "rider");
  const mean = (arr, fn) => (arr.length ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : 0);
  const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);

  const droneEnergyKwh = sum(droneDone, (p) => energyKwhFor(p.result));
  const groundEnergyKwh = sum(riderDone, (p) => energyKwhFor(p.result));

  const windKmh = round(summary.wind_mps * 3.6, 1);
  const weather = weatherFor(windKmh);

  return {
    id,
    name: SCENARIO_COPY[id].name,
    tagline: SCENARIO_COPY[id].tagline,
    description:
      `Mixed fleet of ${trace.specs.fleet.num_drones} drones and ` +
      `${trace.specs.fleet.num_riders} riders at ` +
      `${round(summary.orders_per_hour_per_store, 1)} orders/hr per dark store ` +
      `in a ${summary.wind_mps} m/s wind.`,
    weather: { windKmh, ...weather },
    trafficMultiplier: run.params.traffic_multiplier,
    droneSpeedFactor: 1.0, // no engine equivalent — wind already affects speed
    groundSpeedFactor: 1.0,
    orders,
    droneTrajectory,
    groundTrajectory,
    metrics: {
      totalOrders: summary.total_orders,
      droneDeliveries: summary.delivered_by_kind.drone || 0,
      groundDeliveries: summary.delivered_by_kind.rider || 0,
      infeasibleOrders: summary.failed,
      avgDeliveryTimeMinutes: round(summary.avg_delivery_time_s / 60, 1),
      droneAvgDeliveryTimeMinutes: round(mean(droneDone, (p) => p.result.delivery_time_s) / 60, 1),
      groundAvgDeliveryTimeMinutes: round(mean(riderDone, (p) => p.result.delivery_time_s) / 60, 1),
      droneAvgDistanceKm: round(mean(droneDone, (p) => p.result.distance_m) / 1000, 2),
      groundAvgDistanceKm: round(mean(riderDone, (p) => p.result.distance_m) / 1000, 2),
      droneEnergyKwh: round(droneEnergyKwh, 3),
      groundEnergyKwh: round(groundEnergyKwh, 3),
      // Same value on every scenario: the gap demo is one fixed 5-order batch,
      // not a per-scenario measurement.
      optimalityGapPct: round(trace.optimality_gap_demo.optimality_gap_pct, 2),
      totalEnergyUsedKwh: round(droneEnergyKwh + groundEnergyKwh, 3),
      feasibilityRatePct: round((1 - summary.failure_rate) * 100, 1)
    }
  };
}

export const SCENARIOS = {
  baseline: buildScenario("baseline", trace.demand_scenarios.baseline),
  peak: buildScenario("peak", trace.demand_scenarios.peak),
  stress: buildScenario("stress", trace.demand_scenarios.stress)
};
