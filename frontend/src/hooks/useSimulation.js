import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { SCENARIOS, DRONE_SPECS, GROUND_SPECS } from "../data/simulationAdapter";
import { MAP_CONFIG } from "../data/mapVisuals";

export function useSimulation() {
  const [activeScenarioId, setActiveScenarioId] = useState("baseline");
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(450); // Immediate rich action on launch
  // Seeded from real data rather than a fixed id: order ids now come from the
  // engine (`order_<n>`), so the old hardcoded "ORD-105" never matched and the
  // detail panel opened empty.
  const [selectedOrderId, setSelectedOrderId] = useState(
    () => SCENARIOS.baseline?.orders[0]?.id || null
  );
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null); // 'drone' | 'ground' | null
  const [layerToggles, setLayerToggles] = useState({
    showRoutes: true,
    showOrders: true,
    showZones: true,
    showBlocks: true,
    showLabels: true
  });

  const scenario = SCENARIOS[activeScenarioId] || SCENARIOS.baseline;

  // High-frequency mutable ref for 60fps canvas engine
  const simulationRef = useRef({
    scenarioId: activeScenarioId,
    scenario: scenario,
    currentTime: 450,
    isPlaying: true,
    playbackSpeed: 1,
    droneState: { x: 1180, y: 860, angle: 0, altitude: 0, speedKmh: 65, visible: true },
    groundState: { x: 1180, y: 860, angle: 0, speedKmh: 24.5, visible: true },
    droneTrajectoryProgress: { currentIndex: 0, progress: 0 },
    groundTrajectoryProgress: { currentIndex: 0, progress: 0 },
    pulseTime: 0,
    selectedOrderId: null,
    hoveredOrderId: null,
    selectedVehicle: null,
    hoveredVehicle: null,
    layerToggles: {
      showRoutes: true,
      showOrders: true,
      showZones: true,
      showBlocks: true,
      showLabels: true
    }
  });

  // Keep ref synchronized with high-level React state
  useEffect(() => {
    simulationRef.current.scenarioId = activeScenarioId;
    simulationRef.current.scenario = SCENARIOS[activeScenarioId];
  }, [activeScenarioId]);

  useEffect(() => {
    simulationRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    simulationRef.current.playbackSpeed = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    simulationRef.current.selectedOrderId = selectedOrderId;
  }, [selectedOrderId]);

  useEffect(() => {
    simulationRef.current.hoveredOrderId = hoveredOrderId;
  }, [hoveredOrderId]);

  useEffect(() => {
    simulationRef.current.selectedVehicle = selectedVehicle;
  }, [selectedVehicle]);

  useEffect(() => {
    simulationRef.current.layerToggles = layerToggles;
  }, [layerToggles]);

  // Interpolate vehicle position along trajectory
  const interpolateTrajectory = useCallback((trajectory, time) => {
    if (!trajectory || trajectory.length === 0) {
      return { x: 1180, y: 860, angle: 0, altitude: 0, currentIndex: 0, progress: 0 };
    }
    if (trajectory.length === 1 || time <= trajectory[0].t) {
      return {
        x: trajectory[0].x,
        y: trajectory[0].y,
        angle: 0,
        altitude: trajectory[0].alt || 0,
        currentIndex: 0,
        progress: 0
      };
    }
    const last = trajectory[trajectory.length - 1];
    if (time >= last.t) {
      const prev = trajectory[trajectory.length - 2] || trajectory[0];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      return {
        x: last.x,
        y: last.y,
        angle,
        altitude: last.alt || 0,
        currentIndex: trajectory.length - 2,
        progress: 1
      };
    }

    // Find bounding keyframes
    let i = 0;
    while (i < trajectory.length - 1 && trajectory[i + 1].t <= time) {
      i++;
    }

    const p0 = trajectory[i];
    const p1 = trajectory[i + 1];
    const duration = p1.t - p0.t;
    const progress = duration > 0 ? (time - p0.t) / duration : 0;

    const x = p0.x + (p1.x - p0.x) * progress;
    const y = p0.y + (p1.y - p0.y) * progress;
    const altitude = (p0.alt || 0) + ((p1.alt || 0) - (p0.alt || 0)) * progress;
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    return { x, y, angle, altitude, currentIndex: i, progress };
  }, []);

  // Compute dynamic order status based on simulation clock
  const getDynamicOrders = useCallback((rawOrders, simTime) => {
    return rawOrders.map(order => {
      if (order.status === "infeasible") {
        return order;
      }
      if (order.completedAtSeconds && simTime >= order.completedAtSeconds) {
        return { ...order, status: "completed" };
      }
      const transitWindow = 450;
      if (order.completedAtSeconds && simTime >= order.completedAtSeconds - transitWindow) {
        return { ...order, status: "assigned" };
      }
      return { ...order, status: "pending" };
    });
  }, []);

  // Master Clock & Telemetry Tick (requestAnimationFrame loop)
  useEffect(() => {
    let animId;
    let lastTimestamp = performance.now();
    let lastUiSyncTime = performance.now();

    const loop = (now) => {
      const deltaMs = now - lastTimestamp;
      lastTimestamp = now;

      const sim = simulationRef.current;
      sim.pulseTime += deltaMs * 0.001;

      if (sim.isPlaying) {
        sim.currentTime += (deltaMs / 1000) * sim.playbackSpeed * 3.5; // Optimized playback rate
        if (sim.currentTime > 3600) {
          sim.currentTime = 0;
        }
      }

      // Update vehicle positions in ref
      const currentScenario = sim.scenario;
      const droneInterp = interpolateTrajectory(currentScenario.droneTrajectory, sim.currentTime);
      const groundInterp = interpolateTrajectory(currentScenario.groundTrajectory, sim.currentTime);

      sim.droneState = {
        x: droneInterp.x,
        y: droneInterp.y,
        angle: droneInterp.angle,
        altitude: droneInterp.altitude,
        speedKmh: DRONE_SPECS.cruiseSpeedKmh * (currentScenario.droneSpeedFactor || 1),
        visible: true
      };
      sim.droneTrajectoryProgress = {
        currentIndex: droneInterp.currentIndex,
        progress: droneInterp.progress
      };

      sim.groundState = {
        x: groundInterp.x,
        y: groundInterp.y,
        angle: groundInterp.angle,
        speedKmh: GROUND_SPECS.avgSpeedKmh * (currentScenario.groundSpeedFactor || 1),
        visible: true
      };
      sim.groundTrajectoryProgress = {
        currentIndex: groundInterp.currentIndex,
        progress: groundInterp.progress
      };

      // Throttled UI sync to React state (~4 times per second)
      if (now - lastUiSyncTime > 250) {
        setCurrentTime(sim.currentTime);
        lastUiSyncTime = now;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [interpolateTrajectory]);

  // Simulation Controls
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);

  const restart = useCallback(() => {
    simulationRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const seek = useCallback((timeSeconds) => {
    const clamped = Math.max(0, Math.min(3600, timeSeconds));
    simulationRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const changeSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
  }, []);

  const selectScenario = useCallback((scenarioId) => {
    if (SCENARIOS[scenarioId]) {
      setActiveScenarioId(scenarioId);
      simulationRef.current.currentTime = 0;
      setCurrentTime(0);
      setSelectedOrderId(SCENARIOS[scenarioId].orders[0]?.id || null);
    }
  }, []);

  const toggleLayer = useCallback((layerKey) => {
    setLayerToggles(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  // Compute live current orders and counts for UI
  const currentOrders = getDynamicOrders(scenario.orders, currentTime);
  const selectedOrder = currentOrders.find(o => o.id === selectedOrderId) || null;

  const orderStats = {
    total: currentOrders.length,
    completed: currentOrders.filter(o => o.status === "completed").length,
    assigned: currentOrders.filter(o => o.status === "assigned").length,
    pending: currentOrders.filter(o => o.status === "pending").length,
    infeasible: currentOrders.filter(o => o.status === "infeasible").length
  };

  // Generate dynamic live event feed derived from orders and current clock
  const events = useMemo(() => {
    const evts = [];
    currentOrders.forEach(o => {
      if (o.status === "completed") {
        evts.push({
          id: `del-${o.id}`,
          type: "completed",
          badge: "DELIVERED",
          timeStr: `${Math.floor(o.completedAtSeconds / 60)}m`,
          message: `${o.id} delivered • ${o.etaMinutes ? o.etaMinutes.toFixed(1) : "—"} min`,
          timestamp: o.completedAtSeconds
        });
      } else if (o.status === "assigned") {
        evts.push({
          id: `asg-${o.id}`,
          type: "assigned",
          badge: o.assignedVehicle === "drone" ? "DRONE 01" : "GROUND 01",
          timeStr: "ACTIVE",
          message: `Assigned ${o.id} • ${o.location}`,
          timestamp: (o.completedAtSeconds || 1000) - 450
        });
      } else if (o.status === "infeasible") {
        evts.push({
          id: `inf-${o.id}`,
          type: "infeasible",
          badge: "INFEASIBLE",
          timeStr: "FLAGGED",
          message: `${o.id} • ${o.infeasibleReason || "Airspace constraint"}`,
          timestamp: 100
        });
      }
    });
    // Sort recent first
    return evts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
  }, [currentOrders]);

  return {
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
    currentOrders,
    orderStats,
    events,
    mapConfig: MAP_CONFIG,
    droneSpecs: DRONE_SPECS,
    groundSpecs: GROUND_SPECS,

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
  };
}
