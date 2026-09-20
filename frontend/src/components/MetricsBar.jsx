import React from "react";

export function MetricsBar({ metrics = {} }) {
  const metricItems = [
    {
      label: "TOTAL ORDERS",
      value: metrics.totalOrders ?? 22,
      unit: "UNITS",
      highlight: false
    },
    {
      label: "DRONE DELIVERIES",
      value: metrics.droneDeliveries ?? 12,
      unit: "MISSIONS",
      highlight: "drone"
    },
    {
      label: "GROUND DELIVERIES",
      value: metrics.groundDeliveries ?? 7,
      unit: "RUNS",
      highlight: "ground"
    },
    {
      label: "AVG DELIVERY TIME",
      value: (metrics.avgDeliveryTimeMinutes ?? 14.2).toFixed(1),
      unit: "MINUTES",
      highlight: false
    },
    {
      label: "ENERGY CONSUMED",
      value: (metrics.totalEnergyUsedKwh ?? 9.76).toFixed(2),
      unit: "kWh",
      highlight: false
    },
    {
      label: "OPTIMALITY GAP",
      value: `${(metrics.optimalityGapPct ?? 0.0).toFixed(1)}%`,
      unit: "CONVERGED",
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
