import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { buildScenario, buildSpecs } from "../data/simulationAdapter";
import { fetchPresets, runSimulation as apiRunSimulation } from "../data/apiClient";
import { MAP_CONFIG } from "../data/mapVisuals";

const FALLBACK_VEHICLE_STATE = { x: 1180, y: 860, angle: 0, altitude: 0, speedKmh: 0, visible: false };

export function useSimulation() {
  // --- preset catalog + current selection ----------------------------------
  const [presets, setPresets] = useState(null); // { fleet: [...], weather: [...], obstacles: [...] }
  const [fleetPresetId, setFleetPresetId] = useState("standard");
  const [weatherPresetId, setWeatherPresetId] = useState("breezy");
  const [obstaclePresetId, setObstaclePresetId] = useState("normal_ops");
  const [fleetMode, setFleetMode] = useState("mixed");

  // --- live run state --------------------------------------------------------
  const [scenario, setScenario] = useState(null);
  const [specs, setSpecs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [runError, setRunError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(450);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null); // 'drone' | 'ground' | null
  const [layerToggles, setLayerToggles] = useState({
    showRoutes: true,
    showOrders: true,
    showZones: true,
    showBlocks: true,
    showLabels: true
  });

  const simulationRef = useRef({
    scenario: null,
    currentTime: 450,
    isPlaying: true,
    playbackSpeed: 1,
    droneState: { ...FALLBACK_VEHICLE_STATE },
    groundState: { ...FALLBACK_VEHICLE_STATE },
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

  // --- load the preset catalog once -----------------------------------------
  useEffect(() => {
    fetchPresets()
      .then(setPresets)
      .catch((e) => setRunError(e.message));
  }, []);

  // --- runSimulation(): the real, live engine call ---------------------------
  const runSimulationNow = useCallback(async (overrides = {}) => {
    setIsLoading(true);
    setRunError(null);
    try {
      const liveTrace = await apiRunSimulation({
        fleetPresetId: overrides.fleetPresetId ?? fleetPresetId,
        weatherPresetId: overrides.weatherPresetId ?? weatherPresetId,
        obstaclePresetId: overrides.obstaclePresetId ?? obstaclePresetId,
        fleetMode: overrides.fleetMode ?? fleetMode,
      });
      const nextScenario = buildScenario(liveTrace);
      const nextSpecs = buildSpecs(liveTrace);
      setScenario(nextScenario);
      setSpecs(nextSpecs);
      simulationRef.current.scenario = nextScenario;
      simulationRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(true);
      setSelectedOrderId(nextScenario.orders[0]?.id || null);
    } catch (e) {
      setRunError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [fleetPresetId, weatherPresetId, obstaclePresetId, fleetMode]);

  // --- kick off one run automatically once presets are loaded, so the app
  //     isn't blank on first load -------------------------------------------
  const hasAutoRun = useRef(false);
  useEffect(() => {
    if (presets && !hasAutoRun.current) {
      hasAutoRun.current = true;
      runSimulationNow();
    }
  }, [presets, runSimulationNow]);

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

  useEffect(() => {
    let animId;
    let lastTimestamp = performance.now();
    let lastUiSyncTime = performance.now();

    const loop = (now) => {
      const deltaMs = now - lastTimestamp;
      lastTimestamp = now;

      const sim = simulationRef.current;
      sim.pulseTime += deltaMs * 0.001;

      const currentScenario = sim.scenario;
      if (!currentScenario) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (sim.isPlaying) {
        sim.currentTime += (deltaMs / 1000) * sim.playbackSpeed * 3.5;
        if (sim.currentTime > 3600) {
          sim.currentTime = 0;
        }
      }

      const droneInterp = interpolateTrajectory(currentScenario.droneTrajectory, sim.currentTime);
      const groundInterp = interpolateTrajectory(currentScenario.groundTrajectory, sim.currentTime);

      sim.droneState = {
        x: droneInterp.x,
        y: droneInterp.y,
        angle: droneInterp.angle,
        altitude: droneInterp.altitude,
        speedKmh: (specs?.droneSpecs.cruiseSpeedKmh || 0) * (currentScenario.droneSpeedFactor || 1),
        visible: currentScenario.droneTrajectory.length > 0
      };
      sim.droneTrajectoryProgress = {
        currentIndex: droneInterp.currentIndex,
        progress: droneInterp.progress
      };

      sim.groundState = {
        x: groundInterp.x,
        y: groundInterp.y,
        angle: groundInterp.angle,
        speedKmh: (specs?.groundSpecs.avgSpeedKmh || 0) * (currentScenario.groundSpeedFactor || 1),
        visible: currentScenario.groundTrajectory.length > 0
      };
      sim.groundTrajectoryProgress = {
        currentIndex: groundInterp.currentIndex,
        progress: groundInterp.progress
      };

      if (now - lastUiSyncTime > 250) {
        setCurrentTime(sim.currentTime);
        lastUiSyncTime = now;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [interpolateTrajectory, specs]);

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

  const toggleLayer = useCallback((layerKey) => {
    setLayerToggles(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  const currentOrders = scenario ? getDynamicOrders(scenario.orders, currentTime) : [];
  const selectedOrder = currentOrders.find(o => o.id === selectedOrderId) || null;

  const orderStats = {
    total: currentOrders.length,
    completed: currentOrders.filter(o => o.status === "completed").length,
    assigned: currentOrders.filter(o => o.status === "assigned").length,
    pending: currentOrders.filter(o => o.status === "pending").length,
    infeasible: currentOrders.filter(o => o.status === "infeasible").length
  };

  const events = useMemo(() => {
    const evts = [];
    // "completed" events are shown as map popup bubbles (see
    // justCompletedOrders / SimulationMap's delivery-bubble-layer), not
    // duplicated here as scrolling event-jump entries.
    currentOrders.forEach(o => {
      if (o.status === "assigned") {
        evts.push({
          id: `asg-${o.id}`,
          type: "assigned",
          badge: o.assignedVehicle === "drone" ? "DRONE" : "RIDER",
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
          message: `${o.id} • ${o.infeasibleReason || "no capacity"}`,
          timestamp: 100
        });
      }
    });
    return evts.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
  }, [currentOrders]);

  // Orders that completed within the last few seconds of sim-time — drives
  // the map's popup bubbles rather than a scrolling event-jump list.
  const justCompletedOrders = useMemo(() => {
    const window = 12; // seconds of sim-time a bubble stays anchored for
    return currentOrders.filter(
      (o) => o.status === "completed" &&
        o.completedAtSeconds != null &&
        currentTime - o.completedAtSeconds >= 0 &&
        currentTime - o.completedAtSeconds <= window
    );
  }, [currentOrders, currentTime]);

  return {
    presets,
    fleetPresetId,
    weatherPresetId,
    obstaclePresetId,
    fleetMode,
    setFleetPresetId,
    setWeatherPresetId,
    setObstaclePresetId,
    setFleetMode,
    runSimulationNow,
    isLoading,
    runError,

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
    justCompletedOrders,
    mapConfig: MAP_CONFIG,
    droneSpecs: specs?.droneSpecs,
    groundSpecs: specs?.groundSpecs,

    play,
    pause,
    togglePlay,
    restart,
    seek,
    changeSpeed,
    setSelectedOrderId,
    setHoveredOrderId,
    setSelectedVehicle,
    toggleLayer,

    simulationRef
  };
}
