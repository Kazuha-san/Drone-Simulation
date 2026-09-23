import React, { useRef, useEffect, useCallback, useState } from "react";
import { MapCamera } from "../canvas/camera";
import { renderBaseMap } from "../canvas/mapRenderer";
import { renderRoutes } from "../canvas/routeRenderer";
import { renderVehicles, renderDeliveryMarkers } from "../canvas/vehicleRenderer";
import { MapControls } from "./MapControls";
import { EventFeed } from "./EventFeed";

export function SimulationMap({
  mapConfig,
  simulationRef,
  selectedOrderId,
  onSelectOrder,
  hoveredOrderId,
  onHoverOrder,
  selectedVehicle,
  onSelectVehicle,
  layerToggles,
  onToggleLayer,
  events = [],
  justCompletedOrders = [],
  noFlyZones = null,
  weather = null
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(new MapCamera({ x: 1200, y: 880, zoom: 0.82 }));
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const totalDragDistRef = useRef(0);
  const [cursorStyle, setCursorStyle] = useState("grab");
  const [bubbleScreenPositions, setBubbleScreenPositions] = useState([]);

  // Active no-fly zones for THIS run's obstacle preset. Zone polygons are
  // real geometry shared with the engine (both sourced from
  // bhopal_basemap.json), so only which ones are drawn changes — never the
  // shapes — by filtering mapConfig's full zone set down to the active names.
  const activeZoneNames = noFlyZones ? new Set(noFlyZones.map((z) => z.name)) : null;
  const effectiveMapConfig = activeZoneNames
    ? { ...mapConfig, noFlyZones: (mapConfig.noFlyZones || []).filter((z) => activeZoneNames.has(z.name)) }
    : mapConfig;

  // Initial fit to ensure operational area is immediately framed
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      cameraRef.current.setViewport(rect.width, rect.height);
      cameraRef.current.fitCity(mapConfig.width, mapConfig.height, 40);
    }
  }, [mapConfig]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const camera = cameraRef.current;

    let animId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Fetch latest high-frequency telemetry from ref
      const sim = simulationRef.current;
      const scenario = sim.scenario;
      const pulseTime = sim.pulseTime;
      const activeToggles = sim.layerToggles || layerToggles;
      const currentZoom = camera.zoom;

      // Apply camera view transformation
      camera.applyTransform(ctx);

      // 1. Base Map Layer (Grid, Parks, Lakes, Blocks, Buildings, Layered Roads, NFZ, Depot, District Labels)
      renderBaseMap(ctx, effectiveMapConfig, {
        showBlocks: activeToggles.showBlocks,
        showZones: activeToggles.showZones,
        showLabels: activeToggles.showLabels,
        pulseTime,
        cameraZoom: currentZoom
      });

      // 2. Trajectories & Corridors (with moving flow particles & completed fade)
      renderRoutes(ctx, {
        droneTrajectory: scenario.droneTrajectory,
        groundTrajectory: scenario.groundTrajectory,
        droneCurrentIndex: sim.droneTrajectoryProgress.currentIndex,
        droneProgress: sim.droneTrajectoryProgress.progress,
        groundCurrentIndex: sim.groundTrajectoryProgress.currentIndex,
        groundProgress: sim.groundTrajectoryProgress.progress,
        pulseTime,
        showRoutes: activeToggles.showRoutes
      });

      // 3. Delivery Status Objective Markers (with Level-of-Detail scaling)
      if (activeToggles.showOrders !== false) {
        renderDeliveryMarkers(ctx, scenario.orders, {
          selectedOrderId: sim.selectedOrderId,
          hoveredOrderId: sim.hoveredOrderId,
          showLabels: activeToggles.showLabels,
          cameraZoom: currentZoom,
          pulseTime
        });
      }

      // 4. Active Vehicles (Ground Courier Van & Hexacopter Drone with bobbing)
      renderVehicles(ctx, {
        droneState: sim.droneState,
        groundState: sim.groundState,
        pulseTime,
        cameraZoom: currentZoom,
        selectedVehicle: sim.selectedVehicle,
        hoveredVehicle: sim.hoveredVehicle
      });

      // Restore camera transformation
      camera.restoreTransform(ctx);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [mapConfig, simulationRef, layerToggles, noFlyZones]);

  // Popup bubbles for just-completed orders — screen position follows the
  // camera. Throttled to ~12fps (not every animation frame): bubbles are
  // anchored to a fixed world point and only need repositioning while the
  // camera is actively panning/zooming, so updating this at 60fps was
  // forcing an unnecessary React re-render every frame for no visible gain.
  useEffect(() => {
    let animId;
    let lastUpdate = 0;
    const INTERVAL_MS = 80;
    const tick = (now) => {
      if (now - lastUpdate >= INTERVAL_MS) {
        lastUpdate = now;
        const camera = cameraRef.current;
        if (justCompletedOrders.length === 0) {
          setBubbleScreenPositions((prev) => (prev.length ? [] : prev));
        } else {
          setBubbleScreenPositions(
            justCompletedOrders.map((o) => {
              const pt = camera.worldToScreen(o.x, o.y);
              return { id: o.id, x: pt.x, y: pt.y, order: o };
            })
          );
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [justCompletedOrders]);

  // Dynamic ResizeObserver for Crisp HiDPI Canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      cameraRef.current.setViewport(rect.width, rect.height);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // Mouse Interactivity: Panning
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // only left-click
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    totalDragDistRef.current = 0;
    setCursorStyle("grabbing");
  };

  const handleMouseMove = (e) => {
    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      totalDragDistRef.current += Math.hypot(dx, dy);
      camera.pan(dx, dy);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Hit-detection for hover states and cursor change
    const worldPoint = camera.screenToWorld(screenX, screenY);
    const sim = simulationRef.current;
    const scenario = sim.scenario;

    // Check Drone hover
    const droneDist = Math.hypot(sim.droneState.x - worldPoint.x, sim.droneState.y - worldPoint.y);
    if (droneDist <= 28 / camera.zoom) {
      setCursorStyle("pointer");
      sim.hoveredVehicle = "drone";
      return;
    }

    // Check Ground Vehicle hover
    const groundDist = Math.hypot(sim.groundState.x - worldPoint.x, sim.groundState.y - worldPoint.y);
    if (groundDist <= 24 / camera.zoom) {
      setCursorStyle("pointer");
      sim.hoveredVehicle = "ground";
      return;
    }
    sim.hoveredVehicle = null;

    // Check Delivery Markers hover
    const hitRadius = 24 / camera.zoom;
    let foundOrderId = null;
    for (const ord of scenario.orders) {
      const dist = Math.hypot(ord.x - worldPoint.x, ord.y - worldPoint.y);
      if (dist <= hitRadius) {
        foundOrderId = ord.id;
        break;
      }
    }

    if (foundOrderId) {
      setCursorStyle("pointer");
    } else {
      setCursorStyle("grab");
    }

    if (foundOrderId !== hoveredOrderId) {
      onHoverOrder(foundOrderId);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setCursorStyle("grab");
  };

  // Mouse Click Handler: Differentiates Drag vs Click & Handles Marker / Vehicle / Empty Map
  const handleClick = (e) => {
    // If user dragged more than 6 pixels, ignore click (prevents accidental selection)
    if (totalDragDistRef.current > 6) {
      return;
    }

    const camera = cameraRef.current;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldPoint = camera.screenToWorld(screenX, screenY);
    const sim = simulationRef.current;
    const scenario = sim.scenario;

    // 1. Check Drone Click
    const droneDist = Math.hypot(sim.droneState.x - worldPoint.x, sim.droneState.y - worldPoint.y);
    if (droneDist <= 28 / camera.zoom) {
      if (onSelectVehicle) onSelectVehicle("drone");
      return;
    }

    // 2. Check Ground Vehicle Click
    const groundDist = Math.hypot(sim.groundState.x - worldPoint.x, sim.groundState.y - worldPoint.y);
    if (groundDist <= 24 / camera.zoom) {
      if (onSelectVehicle) onSelectVehicle("ground");
      return;
    }

    // 3. Check Delivery Markers Click
    const hitRadius = 26 / camera.zoom;
    for (const ord of scenario.orders) {
      const dist = Math.hypot(ord.x - worldPoint.x, ord.y - worldPoint.y);
      if (dist <= hitRadius) {
        onSelectOrder(ord.id);
        if (onSelectVehicle) onSelectVehicle(null);
        return;
      }
    }

    // 4. Clicked Empty Map Area: Deselect
    onSelectOrder(null);
    if (onSelectVehicle) onSelectVehicle(null);
  };

  // Mouse Wheel Zooming towards Cursor.
  // NOTE: this must NOT be wired via React's onWheel prop — React attaches
  // wheel listeners as passive by default, which makes e.preventDefault()
  // silently fail (and spam the console with "Unable to preventDefault
  // inside passive event listener invocation" on every scroll tick). That
  // failure let the underlying page try to scroll at the same time the
  // canvas was trying to zoom, which is what caused the severe lag/jank
  // when scrolling on the map. Attaching it manually below with
  // { passive: false } fixes both the console spam and the lag.
  const handleWheelRef = useRef(null);
  handleWheelRef.current = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    cameraRef.current.zoomAtPoint(screenX, screenY, zoomFactor);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const listener = (e) => handleWheelRef.current(e);
    container.addEventListener("wheel", listener, { passive: false });
    return () => container.removeEventListener("wheel", listener);
  }, []);

  // Map Controls Buttons Handlers
  const handleZoomIn = useCallback(() => {
    const camera = cameraRef.current;
    camera.zoomAtPoint(camera.viewportWidth / 2, camera.viewportHeight / 2, 1.25);
  }, []);

  const handleZoomOut = useCallback(() => {
    const camera = cameraRef.current;
    camera.zoomAtPoint(camera.viewportWidth / 2, camera.viewportHeight / 2, 0.8);
  }, []);

  const handleResetView = useCallback(() => {
    cameraRef.current.reset(1180, 860, 0.82);
  }, []);

  const handleFitCity = useCallback(() => {
    cameraRef.current.fitCity(mapConfig.width, mapConfig.height, 45);
  }, [mapConfig]);

  return (
    <div
      className="simulation-map-wrapper"
      ref={containerRef}
      style={{ cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="simulation-canvas" />

      {/* Popup bubbles for orders that just completed — replaces scrolling
          event-jump list with a bubble anchored over the actual delivery
          point on the map. */}
      <div className="delivery-bubble-layer">
        {bubbleScreenPositions.map(({ id, x, y, order }) => (
          <div key={id} className="delivery-bubble" style={{ left: x, top: y }}>
            <div className="delivery-bubble-inner">
              <span className="delivery-bubble-check">✓</span>
              <span className="delivery-bubble-text">
                Delivered — {order.etaMinutes.toFixed(1)} min
              </span>
            </div>
            <div className="delivery-bubble-tail" />
          </div>
        ))}
      </div>

      {weather && (
        <div className={`map-weather-badge map-weather-${weather.icon || "breezy"}`}>
          <span className="map-weather-glyph" aria-hidden="true">
            {{ sunny: "☀️", breezy: "🌤️", windy: "💨", storm: "⛈️" }[weather.icon] || "🌤️"}
          </span>
          <span className="map-weather-text">{weather.condition} · {weather.windKmh} km/h</span>
        </div>
      )}

      {/* Floating Map Controls & Layer Toggles */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onFitCity={handleFitCity}
        layerToggles={layerToggles}
        onToggleLayer={onToggleLayer}
      />

      {/* Unobtrusive Live Event Feed */}
      <EventFeed events={events} />

      {/* Coordinates / Map telemetry HUD */}
      <div className="map-hud-overlay">
        <span className="hud-tag font-mono">BHOPAL METRO AIRSPACE</span>
        <span className="hud-sep">•</span>
        <span className="hud-tag font-mono">DEPOT: TT NAGAR</span>
        <span className="hud-sep">•</span>
        <span className="hud-tag font-mono">ALT CEILING: 120M AGL</span>
      </div>
    </div>
  );
}
