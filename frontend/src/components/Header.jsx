import React from "react";

function formatSimulationTime(seconds) {
  const totalSecs = Math.floor(seconds);
  const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSecs % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export function Header({
  scenarioName,
  isPlaying,
  currentTime,
  onTogglePlay,
  onRestart
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="header-titles">
          <h1 className="header-main-title">
            DRONE DELIVERY <span>FEASIBILITY SIMULATOR</span>
          </h1>
          <div className="header-location-badge">
            <span className="location-dot"></span>
            BHOPAL • INDIA • METROPOLITAN REGION
          </div>
        </div>
      </div>

      <div className="header-center">
        <div className="header-status-pill">
          <span className="pill-label">SCENARIO:</span>
          <span className="pill-value">{scenarioName.toUpperCase()}</span>
        </div>

        <div className={`header-live-indicator ${isPlaying ? "live-active" : "live-paused"}`}>
          <span className="live-dot"></span>
          <span>{isPlaying ? "LIVE SIMULATION" : "SIMULATION PAUSED"}</span>
        </div>
      </div>

      <div className="header-right">
        <div className="header-clock-panel">
          <span className="clock-label">SIMULATION TIME</span>
          <span className="clock-time">{formatSimulationTime(currentTime)}</span>
        </div>

        <button
          className="header-icon-btn"
          onClick={onRestart}
          title="Restart Simulation"
          aria-label="Restart Simulation"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
    </header>
  );
}
