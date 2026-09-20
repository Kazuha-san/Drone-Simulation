import React from "react";
import { Legend } from "./Legend";

export function ScenarioPanel({
  activeScenarioId,
  scenario,
  onSelectScenario,
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onRestart,
  onChangeSpeed,
  layerToggles,
  onToggleLayer,
  isCollapsed = false,
  onToggleCollapse
}) {
  const scenarioList = [
    { id: "baseline", label: "Baseline", badge: "Nominal" },
    { id: "peak", label: "Peak Demand", badge: "2.2× Traffic" },
    { id: "stress", label: "Stress Test", badge: "NFZ Reroute" }
  ];

  const speeds = [0.5, 1, 2, 4];

  return (
    <aside className={`left-panel ${isCollapsed ? "collapsed" : ""}`}>
      {/* Scenario Selection */}
      <section className="panel-card">
        <div className="panel-header-row">
          <div className="panel-header-left-title">
            <span className="panel-title">SCENARIO</span>
            <span className="panel-chip-active">{scenario.name}</span>
          </div>
          {onToggleCollapse && (
            <button
              className="sidebar-collapse-btn"
              onClick={onToggleCollapse}
              title="Collapse Left Sidebar"
              aria-label="Collapse Left Sidebar"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
        </div>

        <div className="segmented-control">
          {scenarioList.map(item => (
            <button
              key={item.id}
              className={`segmented-btn ${activeScenarioId === item.id ? "active" : ""}`}
              onClick={() => onSelectScenario(item.id)}
            >
              <span className="segmented-label">{item.label}</span>
              <span className="segmented-badge">{item.badge}</span>
            </button>
          ))}
        </div>

        <div className="scenario-meta-box">
          <div className="scenario-tagline">{scenario.tagline}</div>
          <div className="scenario-conditions-grid">
            <div className="meta-item">
              <span className="meta-label">CONDITIONS</span>
              <span className="meta-value">{scenario.weather.condition}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">WIND</span>
              <span className="meta-value">{scenario.weather.windKmh} km/h</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">TRAFFIC INDEX</span>
              <span className="meta-value">{scenario.trafficMultiplier}× Congestion</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">VISIBILITY</span>
              <span className="meta-value">{scenario.weather.visibilityKm} km</span>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation Controls */}
      <section className="panel-card">
        <div className="panel-title">SIMULATION CONTROLS</div>

        <div className="sim-control-actions">
          <button
            className={`btn-primary-action ${isPlaying ? "btn-pause" : "btn-play"}`}
            onClick={onTogglePlay}
          >
            {isPlaying ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>PLAY</span>
              </>
            )}
          </button>

          <button className="btn-secondary-action" onClick={onRestart}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span>RESTART</span>
          </button>
        </div>

        {/* Playback Speed */}
        <div className="speed-selector-group">
          <span className="speed-label">PLAYBACK SPEED</span>
          <div className="speed-buttons">
            {speeds.map(spd => (
              <button
                key={spd}
                className={`speed-chip ${playbackSpeed === spd ? "active" : ""}`}
                onClick={() => onChangeSpeed(spd)}
              >
                {spd}×
              </button>
            ))}
          </div>
        </div>

        {/* Layer Visibility Toggles */}
        <div className="layer-toggles-container">
          <span className="speed-label">LAYER FILTERS</span>
          <div className="layer-toggle-chips">
            <button
              className={`layer-chip ${layerToggles.showRoutes ? "active" : ""}`}
              onClick={() => onToggleLayer("showRoutes")}
            >
              Routes
            </button>
            <button
              className={`layer-chip ${layerToggles.showZones ? "active" : ""}`}
              onClick={() => onToggleLayer("showZones")}
            >
              No-Fly Zones
            </button>
            <button
              className={`layer-chip ${layerToggles.showBlocks ? "active" : ""}`}
              onClick={() => onToggleLayer("showBlocks")}
            >
              City Blocks
            </button>
            <button
              className={`layer-chip ${layerToggles.showLabels ? "active" : ""}`}
              onClick={() => onToggleLayer("showLabels")}
            >
              Labels
            </button>
          </div>
        </div>
      </section>

      {/* Map Legend */}
      <Legend />
    </aside>
  );
}
