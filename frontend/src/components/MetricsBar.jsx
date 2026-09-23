import React from "react";

const DASH = "—";

/**
 * Every value here comes straight from the live run's summary
 * (see simulationAdapter.js's `metrics` block) — no fallback numbers.
 * When there's no scenario yet (still loading / run failed), cells show
 * a dash rather than a plausible-looking fake figure.
 */
export function MetricsBar({ metrics }) {
  const has = !!metrics;

  const metricItems = [
    {
      label: "TOTAL ORDERS",
      value: has ? metrics.totalOrders : DASH,
      unit: "UNITS",
      highlight: false
    },
    {
      label: "DRONE DELIVERIES",
      value: has ? metrics.droneDeliveries : DASH,
      unit: "MISSIONS",
      highlight: "drone"
    },
    {
      label: "GROUND DELIVERIES",
      value: has ? metrics.groundDeliveries : DASH,
      unit: "RUNS",
      highlight: "ground"
    },
    {
      label: "AVG DELIVERY TIME",
      value: has ? metrics.avgDeliveryTimeMinutes.toFixed(1) : DASH,
      unit: "MINUTES",
      highlight: false
    },
    {
      label: "ENERGY CONSUMED",
      value: has ? metrics.totalEnergyUsedKwh.toFixed(2) : DASH,
      unit: "kWh",
      highlight: false
    },
    {
      label: "FEASIBILITY RATE",
      value: has ? `${metrics.feasibilityRatePct.toFixed(1)}%` : DASH,
      unit: "DELIVERED",
      highlight: "optimal"
    }
  ];

  return (
    <div className="bottom-metrics-bar">
      {metricItems.map((m, idx) => (
        <div key={idx} className={`metric-cell ${m.highlight ? `metric-${m.highlight}` : ""}`}>
          <div className="metric-header-label">{m.label}</div>
          <div className="metric-value-container">
            <span className="metric-num font-mono">{m.value}</span>
            <span className="metric-unit font-mono">{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
