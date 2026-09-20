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
  events = []
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(new MapCamera({ x: 1200, y: 880, zoom: 0.82 }));
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const totalDragDistRef = useRef(0);
  const [cursorStyle, setCursorStyle] = useState("grab");

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
      renderBaseMap(ctx, mapConfig, {
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
  }, [mapConfig, simulationRef, layerToggles]);

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

  // Mouse Wheel Zooming towards Cursor
  const handleWheel = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    cameraRef.current.zoomAtPoint(screenX, screenY, zoomFactor);
  };

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
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="simulation-canvas" />

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
