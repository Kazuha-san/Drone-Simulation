import React from "react";
import { Legend } from "./Legend";

const WEATHER_ICON_GLYPH = {
  sunny: "☀️",
  breezy: "🌤️",
  windy: "💨",
  storm: "⛈️",
};

function WeatherIcon({ iconKey }) {
  const glyph = WEATHER_ICON_GLYPH[iconKey] || "🌤️";
  return (
    <span className={`weather-icon weather-icon-${iconKey || "breezy"}`} aria-hidden="true">
      {glyph}
    </span>
  );
}

export function ScenarioPanel({
  presets,
  fleetPresetId,
  weatherPresetId,
  obstaclePresetId,
  fleetMode,
  onChangeFleetPreset,
  onChangeWeatherPreset,
  onChangeObstaclePreset,
  onChangeFleetMode,
  onRunSimulation,
  isLoading,
  runError,
  scenario,
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
  const speeds = [0.5, 1, 2, 4];
  const fleetModes = [
    { id: "drones_only", label: "Drones Only" },
    { id: "riders_only", label: "Riders Only" },
    { id: "mixed", label: "Mixed" },
  ];

  const selectedWeather = presets?.weather.find((w) => w.id === weatherPresetId);

  return (
    <aside className={`left-panel ${isCollapsed ? "collapsed" : ""}`}>
      {/* Live Run Configuration */}
      <section className="panel-card">
        <div className="panel-header-row">
          <div className="panel-header-left-title">
            <span className="panel-title">SIMULATION SETUP</span>
            {scenario && <span className="panel-chip-active">Seed {scenario.seedUsed}</span>}
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

        {!presets ? (
          <div className="scenario-tagline">Loading presets…</div>
        ) : (
          <>
            <label className="preset-field">
              <span className="meta-label">FLEET</span>
              <select
                className="preset-select"
                value={fleetPresetId}
                onChange={(e) => onChangeFleetPreset(e.target.value)}
              >
                {presets.fleet.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>

            <label className="preset-field">
              <span className="meta-label">WEATHER</span>
              <div className="preset-select-row">
                <WeatherIcon iconKey={selectedWeather?.icon} />
                <select
                  className="preset-select"
                  value={weatherPresetId}
                  onChange={(e) => onChangeWeatherPreset(e.target.value)}
                >
                  {presets.weather.map((w) => (
                    <option key={w.id} value={w.id}>{w.label}</option>
                  ))}
                </select>
              </div>
            </label>

            <label className="preset-field">
              <span className="meta-label">OBSTACLES / AIRSPACE</span>
              <select
                className="preset-select"
                value={obstaclePresetId}
                onChange={(e) => onChangeObstaclePreset(e.target.value)}
              >
                {presets.obstacles.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>

            <div className="preset-field">
              <span className="meta-label">FLEET MODE</span>
              <div className="segmented-control">
                {fleetModes.map((m) => (
                  <button
                    key={m.id}
                    className={`segmented-btn ${fleetMode === m.id ? "active" : ""}`}
                    onClick={() => onChangeFleetMode(m.id)}
                  >
                    <span className="segmented-label">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn-primary-action btn-run-simulation"
              onClick={() => onRunSimulation()}
              disabled={isLoading}
            >
              {isLoading ? (
                <span>RUNNING…</span>
              ) : (
                <span>RUN NEW SIMULATION</span>
              )}
            </button>
            {runError && <div className="sim-error-text">{runError}</div>}
          </>
        )}

        {scenario && (
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
                <span className="meta-label">NO-FLY ZONES</span>
                <span className="meta-value">{scenario.activeNoFlyZones.length} active</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Simulation Controls */}
      <section className="panel-card">
        <div className="panel-title">PLAYBACK CONTROLS</div>

        <div className="sim-control-actions">
          <button
            className={`btn-primary-action ${isPlaying ? "btn-pause" : "btn-play"}`}
            onClick={onTogglePlay}
            disabled={!scenario}
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

          <button className="btn-secondary-action" onClick={onRestart} disabled={!scenario}>
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
