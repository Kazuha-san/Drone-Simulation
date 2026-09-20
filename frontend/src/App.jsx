import React from "react";
import { useSimulation } from "./hooks/useSimulation";
import { Header } from "./components/Header";
import { ScenarioPanel } from "./components/ScenarioPanel";
import { SimulationMap } from "./components/SimulationMap";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { MetricsBar } from "./components/MetricsBar";
import { Timeline } from "./components/Timeline";

export function App() {
  const {
    activeScenarioId,
    scenario,
    currentTime,
    isPlaying,
    playbackSpeed,
    selectedOrderId,
    selectedOrder,
    hoveredOrderId,
    selectedVehicle,
    layerToggles,
    orderStats,
    events,
    mapConfig,
    droneSpecs,
    groundSpecs,
    play,
    pause,
    togglePlay,
    restart,
    seek,
    changeSpeed,
    selectScenario,
    setSelectedOrderId,
    setHoveredOrderId,
    setSelectedVehicle,
    toggleLayer,
    simulationRef
  } = useSimulation();

  const [leftCollapsed, setLeftCollapsed] = React.useState(false);
  const [rightCollapsed, setRightCollapsed] = React.useState(false);

  return (
    <div className="simulator-app-root">
      {/* 1. Header */}
      <Header
        scenarioName={scenario.name}
        isPlaying={isPlaying}
        currentTime={currentTime}
        onTogglePlay={togglePlay}
        onRestart={restart}
      />

      {/* 2. Main Workspace (3-column layout: Left Controls | Central Map | Right Inspector) */}
      <main className="simulator-workspace">
        <ScenarioPanel
          activeScenarioId={activeScenarioId}
          scenario={scenario}
          onSelectScenario={selectScenario}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onChangeSpeed={changeSpeed}
          layerToggles={layerToggles}
          onToggleLayer={toggleLayer}
          isCollapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed(true)}
        />

        <section className="central-map-section">
          {leftCollapsed && (
            <button
              className="floating-sidebar-toggle toggle-left"
              onClick={() => setLeftCollapsed(false)}
              title="Expand Scenario & Controls Panel"
              aria-label="Expand Scenario Panel"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span>SCENARIO</span>
            </button>
          )}

          {rightCollapsed && (
            <button
              className="floating-sidebar-toggle toggle-right"
              onClick={() => setRightCollapsed(false)}
              title="Expand Telemetry & Manifest Panel"
              aria-label="Expand Telemetry Panel"
            >
              <span>TELEMETRY</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <SimulationMap
            mapConfig={mapConfig}
            simulationRef={simulationRef}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            hoveredOrderId={hoveredOrderId}
            onHoverOrder={setHoveredOrderId}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            layerToggles={layerToggles}
            onToggleLayer={toggleLayer}
            events={events}
          />
        </section>

        <ComparisonPanel
          orderStats={orderStats}
          selectedOrder={selectedOrder}
          selectedVehicle={selectedVehicle}
          scenario={scenario}
          droneSpecs={droneSpecs}
          groundSpecs={groundSpecs}
          onSelectOrder={setSelectedOrderId}
          onSelectVehicle={setSelectedVehicle}
          isCollapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed(true)}
        />
      </main>

      {/* 3. Bottom Dashboard Strip (Metrics Bar + Timeline) */}
      <footer className="simulator-bottom-dock">
        <MetricsBar metrics={scenario.metrics} />
        <Timeline
          currentTime={currentTime}
          maxTime={3600}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          onTogglePlay={togglePlay}
          onRestart={restart}
          onSeek={seek}
          onChangeSpeed={changeSpeed}
        />
      </footer>
    </div>
  );
}

export default App;
