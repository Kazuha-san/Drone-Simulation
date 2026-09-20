/**
 * REAL DATA ADAPTER — STUB. This replaces the removed mockSimulation.js
 * fake SCENARIOS/DRONE_SPECS/GROUND_SPECS. It intentionally exports safe,
 * empty-but-valid shapes right now so the app still builds and renders
 * (empty map, zeroed metrics) instead of crashing — filling this in for
 * real is the main remaining task. Full mapping spec, field-by-field, is
 * in INTEGRATION.md § "Frontend adapter — exact contract".
 *
 * Do not change the shape of anything exported here — every field below
 * is read by components (SimulationMap, ComparisonPanel, MetricsBar,
 * EventFeed, Timeline) that this task must NOT modify. The job is to
 * populate these exact shapes from data/trace.json, not to change what
 * the shapes are.
 */

export const DRONE_SPECS = {
  model: "",
  maxPayloadKg: 0,
  cruiseSpeedKmh: 0,
  batteryCapacityKwh: 0,
  avgEnergyPerKmKwh: 0,
  maxFlightAltitudeM: 0,
  sensorPayload: ""
};

export const GROUND_SPECS = {
  model: "",
  maxPayloadKg: 0,
  avgSpeedKmh: 0,
  batteryCapacityKwh: 0,
  avgEnergyPerKmKwh: 0,
  trafficSensitivity: ""
};

// ScenarioPanel.jsx hardcodes the id/label/badge for these three cards —
// do not rename or add/remove keys here without also checking that file.
const EMPTY_SCENARIO = (id, name, tagline, description) => ({
  id,
  name,
  tagline,
  description,
  weather: { windKmh: 0, visibilityKm: 0, condition: "", tempC: 0 },
  trafficMultiplier: 1.0,
  droneSpeedFactor: 1.0,
  groundSpeedFactor: 1.0,
  orders: [],
  droneTrajectory: [],
  groundTrajectory: [],
  metrics: {
    totalOrders: 0,
    droneDeliveries: 0,
    groundDeliveries: 0,
    infeasibleOrders: 0,
    avgDeliveryTimeMinutes: 0,
    droneAvgDeliveryTimeMinutes: 0,
    groundAvgDeliveryTimeMinutes: 0,
    droneAvgDistanceKm: 0,
    groundAvgDistanceKm: 0,
    droneEnergyKwh: 0,
    groundEnergyKwh: 0,
    optimalityGapPct: 0,
    totalEnergyUsedKwh: 0,
    feasibilityRatePct: 0
  }
});

export const SCENARIOS = {
  baseline: EMPTY_SCENARIO("baseline", "Baseline", "Standard Urban Delivery Dispatch", ""),
  peak: EMPTY_SCENARIO("peak", "Peak Demand", "Commercial High-Density Rush Hour", ""),
  stress: EMPTY_SCENARIO("stress", "Stress Test", "Dynamic Airspace Reroute & Adverse Weather", "")
};

// TODO(claude-code): replace the above with real data loaded from
// ../../../data/trace.json (see INTEGRATION.md for the exact field-by-field
// mapping from trace.json's {map, scenarios, optimality_gap_demo} shape
// into DRONE_SPECS / GROUND_SPECS / SCENARIOS as defined above).
