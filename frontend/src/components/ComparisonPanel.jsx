import React from "react";

export function ComparisonPanel({
  orderStats,
  selectedOrder,
  selectedVehicle,
  scenario,
  droneSpecs,
  groundSpecs,
  onSelectOrder,
  onSelectVehicle,
  isCollapsed = false,
  onToggleCollapse
}) {
  const metrics = scenario.metrics || {};

  return (
    <aside className={`right-panel ${isCollapsed ? "collapsed" : ""}`}>
      {/* Current Simulation Overview */}
      <section className="panel-card">
        <div className="panel-header-row">
          <div className="panel-subhead">SIMULATION DISPATCH OVERVIEW</div>
          {onToggleCollapse && (
            <button
              className="sidebar-collapse-btn"
              onClick={onToggleCollapse}
              title="Collapse Right Sidebar"
              aria-label="Collapse Right Sidebar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
        <div className="stats-metric-grid">
          <div className="stat-box">
            <span className="stat-label">TOTAL ORDERS</span>
            <span className="stat-value font-mono">{orderStats.total}</span>
          </div>

          <div className="stat-box stat-completed">
            <span className="stat-label">COMPLETED</span>
            <span className="stat-value font-mono">{orderStats.completed}</span>
          </div>

          <div className="stat-box stat-assigned">
            <span className="stat-label">IN PROGRESS</span>
            <span className="stat-value font-mono">{orderStats.assigned}</span>
          </div>

          <div className="stat-box stat-infeasible">
            <span className="stat-label">INFEASIBLE</span>
            <span className="stat-value font-mono">{orderStats.infeasible}</span>
          </div>
        </div>
      </section>

      {/* Vehicle Telemetry Card (When vehicle is clicked) */}
      {selectedVehicle && (
        <section className={`panel-card active-delivery-card card-${selectedVehicle}`}>
          <div className="delivery-card-header">
            <div className="delivery-order-id font-mono">
              {selectedVehicle === "drone" ? "HEXACOPTER DRONE 01" : "GROUND EV COURIER 01"}
            </div>
            <span className="status-badge status-assigned">
              LIVE TELEMETRY
            </span>
          </div>

          <div className="delivery-details-body">
            <div className="delivery-title">
              {selectedVehicle === "drone" ? droneSpecs.model : groundSpecs.model}
            </div>

            <div className="delivery-specs-grid">
              <div className="spec-row">
                <span className="spec-label">Operating Speed</span>
                <span className="spec-val font-mono">
                  {selectedVehicle === "drone"
                    ? `${(droneSpecs.cruiseSpeedKmh * (scenario.droneSpeedFactor || 1)).toFixed(1)} km/h`
                    : `${(groundSpecs.avgSpeedKmh * (scenario.groundSpeedFactor || 1)).toFixed(1)} km/h`}
                </span>
              </div>

              <div className="spec-row">
                <span className="spec-label">Payload Capacity</span>
                <span className="spec-val font-mono">
                  {selectedVehicle === "drone" ? `${droneSpecs.maxPayloadKg} kg` : `${groundSpecs.maxPayloadKg} kg`}
                </span>
              </div>

              <div className="spec-row">
                <span className="spec-label">Battery Capacity</span>
                <span className="spec-val font-mono">
                  {selectedVehicle === "drone" ? `${droneSpecs.batteryCapacityKwh} kWh` : `${groundSpecs.batteryCapacityKwh} kWh`}
                </span>
              </div>

              <div className="spec-row">
                <span className="spec-label">Energy Burn Rate</span>
                <span className="spec-val font-mono">
                  {selectedVehicle === "drone" ? `${droneSpecs.avgEnergyPerKmKwh} kWh/km` : `${groundSpecs.avgEnergyPerKmKwh} kWh/km`}
                </span>
              </div>

              {selectedVehicle === "drone" && (
                <div className="spec-row">
                  <span className="spec-label">Flight Ceiling</span>
                  <span className="spec-val font-mono">{droneSpecs.maxFlightAltitudeM}m AGL</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Active / Selected Delivery Inspection Card */}
      {!selectedVehicle && selectedOrder && (
        <section className="panel-card active-delivery-card">
          <div className="delivery-card-header">
            <div className="delivery-order-id font-mono">
              {selectedOrder.id}
            </div>
            <span className={`status-badge status-${selectedOrder.status}`}>
              {selectedOrder.status === "assigned"
                ? "IN TRANSIT"
                : selectedOrder.status.toUpperCase()}
            </span>
          </div>

          <div className="delivery-details-body">
            <div className="delivery-title">{selectedOrder.title}</div>
            <div className="delivery-location font-mono">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{selectedOrder.location}</span>
            </div>

            {selectedOrder.status === "infeasible" ? (
              <div className="infeasible-alert-box">
                <div className="infeasible-title">INFEASIBILITY RATIONALE</div>
                <div className="infeasible-desc">{selectedOrder.infeasibleReason || "Airspace constraint violation"}</div>
              </div>
            ) : (
              <div className="delivery-specs-grid">
                <div className="spec-row">
                  <span className="spec-label">Assigned Vehicle</span>
                  <span className={`spec-val font-mono vehicle-${selectedOrder.assignedVehicle}`}>
                    {selectedOrder.assignedVehicle === "drone" ? "HEXACOPTER DRONE" : "GROUND EV COURIER"}
                  </span>
                </div>

                <div className="spec-row">
                  <span className="spec-label">Estimated Transit (ETA)</span>
                  <span className="spec-val font-mono">
                    {selectedOrder.etaMinutes ? `${selectedOrder.etaMinutes.toFixed(1)} min` : "—"}
                  </span>
                </div>

                <div className="spec-row">
                  <span className="spec-label">Corridor Distance</span>
                  <span className="spec-val font-mono">{selectedOrder.distanceKm} km</span>
                </div>

                <div className="spec-row">
                  <span className="spec-label">Energy Consumed</span>
                  <span className="spec-val font-mono">
                    {selectedOrder.energyKwh ? `${selectedOrder.energyKwh.toFixed(2)} kWh` : "—"}
                  </span>
                </div>

                <div className="spec-row">
                  <span className="spec-label">Payload Mass</span>
                  <span className="spec-val font-mono">{selectedOrder.weightKg} kg</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty State when neither order nor vehicle is selected */}
      {!selectedVehicle && !selectedOrder && (
        <section className="panel-card empty-card">
          <div className="empty-selection-msg">Click any delivery marker or vehicle on the map to inspect live telemetry</div>
        </section>
      )}

      {/* Head-to-Head Comparison: Drone vs Ground */}
      <section className="panel-card comparison-section">
        <div className="panel-subhead">HEAD-TO-HEAD FEASIBILITY COMPARISON</div>
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="th-metric">METRIC</th>
              <th className="th-drone">DRONE</th>
              <th className="th-ground">GROUND</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="td-label">Average Delivery Time</td>
              <td className="td-val td-highlight-drone font-mono">
                {metrics.droneAvgDeliveryTimeMinutes?.toFixed(1)} min
              </td>
              <td className="td-val font-mono">
                {metrics.groundAvgDeliveryTimeMinutes?.toFixed(1)} min
              </td>
            </tr>

            <tr>
              <td className="td-label">Energy / Delivery</td>
              <td className="td-val td-highlight-drone font-mono">
                {(metrics.droneEnergyKwh / (metrics.droneDeliveries || 1)).toFixed(2)} kWh
              </td>
              <td className="td-val font-mono">
                {(metrics.groundEnergyKwh / (metrics.groundDeliveries || 1)).toFixed(2)} kWh
              </td>
            </tr>

            <tr>
              <td className="td-label">Average Route Distance</td>
              <td className="td-val td-highlight-drone font-mono">
                {metrics.droneAvgDistanceKm?.toFixed(1)} km
              </td>
              <td className="td-val font-mono">
                {metrics.groundAvgDistanceKm?.toFixed(1)} km
              </td>
            </tr>

            <tr>
              <td className="td-label">Completed Missions</td>
              <td className="td-val font-mono">{metrics.droneDeliveries}</td>
              <td className="td-val font-mono">{metrics.groundDeliveries}</td>
            </tr>

            <tr>
              <td className="td-label">Feasibility Rate</td>
              <td className="td-val td-highlight-drone font-mono" colSpan="2" style={{ textAlign: "center" }}>
                {metrics.feasibilityRatePct}% Nominal Corridor
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Quick Order Selector List */}
      <section className="panel-card order-quicklist-card">
        <div className="panel-subhead">MISSION MANIFEST</div>
        <div className="manifest-list">
          {scenario.orders.map(ord => (
            <button
              key={ord.id}
              className={`manifest-item ${selectedOrder?.id === ord.id ? "selected" : ""}`}
              onClick={() => {
                onSelectOrder(ord.id);
                if (onSelectVehicle) onSelectVehicle(null);
              }}
            >
              <div className="manifest-left">
                <span className={`manifest-status-dot dot-${ord.status}`}></span>
                <span className="manifest-id font-mono">{ord.id}</span>
                <span className="manifest-title">{ord.title}</span>
              </div>
              <span className="manifest-dist font-mono">{ord.distanceKm} km</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
