import React from "react";

export function Legend() {
  return (
    <div className="legend-panel">
      <div className="panel-subhead">MAP LEGEND</div>
      <div className="legend-grid">
        <div className="legend-item">
          <span className="legend-icon legend-drone">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
            </svg>
          </span>
          <span className="legend-text">Hexacopter Drone</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-ground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="7" width="20" height="11" rx="2" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="17" cy="18" r="2" />
            </svg>
          </span>
          <span className="legend-text">Ground EV Courier</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-pending"></span>
          <span className="legend-text">Pending Order</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-assigned"></span>
          <span className="legend-text">In Transit (Assigned)</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-completed">✓</span>
          <span className="legend-text">Delivered</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-infeasible">!</span>
          <span className="legend-text">Infeasible Order</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-nfz">⊘</span>
          <span className="legend-text">Restricted No-Fly Zone</span>
        </div>

        <div className="legend-item">
          <span className="legend-icon legend-depot">★</span>
          <span className="legend-text">Central Logistics Depot</span>
        </div>
      </div>
    </div>
  );
}
