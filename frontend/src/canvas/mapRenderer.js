/**
 * Map Renderer for HTML5 Canvas — Phase 2 Polished GTA-Inspired Urban City Simulation
 *
 * Strict Rendering Pipeline:
 * 1. Background terrain & tactical grid
 * 2. Parkland & Urban Greenery
 * 3. Water bodies (Upper Lake / Bada Talab prominent, Chhota Talab, Shahpura Lake)
 * 4. City blocks (polygonal parcels)
 * 5. Building clusters (subtle grouped footprints with directional micro-shadows)
 * 6. Major roads (layered boundary casing + surface + center markings)
 * 7. Secondary roads (layered boundary casing + surface)
 * 8. Local streets & visual connector lanes
 * 9. No-fly zones (translucent danger polygon + canvas-drawn ⚠ vector badge)
 * 10. Central Depot Hub (warehouse vector icon + circular operational radius)
 * 11. District labels (subtle low-contrast uppercase typography)
 */

export function renderBaseMap(ctx, mapConfig, options = {}) {
  const {
    showBlocks = true,
    showZones = true,
    showLabels = true,
    pulseTime = 0,
    cameraZoom = 1.0
  } = options;

  // 1. Background Terrain & Tactical Coordinates Grid
  renderTerrainAndGrid(ctx, mapConfig.width, mapConfig.height);

  // 2. Parkland & Nature Reserves
  if (mapConfig.parks) {
    renderParklands(ctx, mapConfig.parks);
  }

  // 3. Water Bodies (Upper Lake, Lower Lake, Shahpura Lake)
  renderWaterBodies(ctx, mapConfig.waterBodies, showLabels, pulseTime);

  // 4 & 5. City Blocks & Building Footprints (Grouped clusters)
  if (showBlocks && mapConfig.cityBlocks) {
    renderCityBlocksAndBuildings(ctx, mapConfig.cityBlocks, showLabels, cameraZoom);
  }

  // 6, 7 & 8. Hierarchical Road Network (Major, Secondary, Local)
  if (mapConfig.roads) {
    renderLayeredRoads(ctx, mapConfig.roads);
  }

  // 9. Restricted No-Fly Zones
  if (showZones && mapConfig.noFlyZones) {
    renderNoFlyZones(ctx, mapConfig.noFlyZones, showLabels, pulseTime);
  }

  // 10. Central Depot Hub
  if (mapConfig.depot) {
    renderDepot(ctx, mapConfig.depot, pulseTime);
  }

  // 11. Tactical District Labels
  if (showLabels && mapConfig.districtLabels) {
    renderDistrictLabels(ctx, mapConfig.districtLabels, cameraZoom);
  }
}

/**
 * 1. Renders subtle terrain base and tactical grid
 */
function renderTerrainAndGrid(ctx, width, height) {
  ctx.save();
  // Soft architectural terrain tone
  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(0, 0, width, height);

  // Soft grid
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  const gridSize = 120;

  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Coordinate intersection crosshairs
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px 'JetBrains Mono', monospace";
  for (let x = 240; x < width; x += 240) {
    for (let y = 240; y < height; y += 240) {
      ctx.fillText(`${x}E, ${y}N`, x + 6, y - 6);
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "#cbd5e1";
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * 2. Renders parkland and shoreline reserves
 */
function renderParklands(ctx, parks) {
  ctx.save();
  parks.forEach(park => {
    if (!park.points || park.points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(park.points[0][0], park.points[0][1]);
    for (let i = 1; i < park.points.length; i++) {
      ctx.lineTo(park.points[i][0], park.points[i][1]);
    }
    ctx.closePath();

    ctx.fillStyle = park.color || "rgba(220, 252, 231, 0.65)";
    ctx.fill();

    ctx.strokeStyle = park.stroke || "#bbf7d0";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * 3. Renders Water Bodies (Upper Lake, Lower Lake, Shahpura Lake)
 * Featuring deep water gradient, shoreline casing, and gentle shoreline ripple contours
 */
function renderWaterBodies(ctx, waterBodies, showLabels, pulseTime) {
  ctx.save();

  waterBodies.forEach(lake => {
    if (!lake.points || lake.points.length < 3) return;

    // A. Shoreline ripple ring (very subtle wave effect)
    const wavePhase = (pulseTime * 0.25) % 1;
    ctx.beginPath();
    ctx.moveTo(lake.points[0][0], lake.points[0][1]);
    for (let i = 1; i < lake.points.length; i++) {
      const p0 = lake.points[i - 1];
      const p1 = lake.points[i];
      ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(147, 197, 253, ${0.35 * (1 - wavePhase)})`;
    ctx.lineWidth = 6 + wavePhase * 6;
    ctx.stroke();

    // B. Lake Main Polygon
    ctx.beginPath();
    ctx.moveTo(lake.points[0][0], lake.points[0][1]);
    for (let i = 1; i < lake.points.length; i++) {
      const p0 = lake.points[i - 1];
      const p1 = lake.points[i];
      ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
    }
    ctx.closePath();

    // Subtle water gradient fill
    const minX = Math.min(...lake.points.map(p => p[0]));
    const maxX = Math.max(...lake.points.map(p => p[0]));
    const minY = Math.min(...lake.points.map(p => p[1]));
    const maxY = Math.max(...lake.points.map(p => p[1]));

    const grad = ctx.createLinearGradient(minX, minY, maxX, maxY);
    grad.addColorStop(0, lake.color || "#dbeafe");
    grad.addColorStop(1, lake.deepColor || "#bfdbfe");
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp shoreline border
    ctx.strokeStyle = lake.stroke || "#60a5fa";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle inner water ripple contour
    ctx.beginPath();
    for (let i = 0; i < lake.points.length; i += 2) {
      const p = lake.points[i];
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;
      const rx = p[0] + (midX - p[0]) * 0.15;
      const ry = p[1] + (midY - p[1]) * 0.15;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  ctx.restore();
}

/**
 * 4 & 5. Renders City Blocks and Grouped Building Footprints with 3D Depth
 */
function renderCityBlocksAndBuildings(ctx, blocks, showLabels, cameraZoom) {
  ctx.save();

  // First pass: City Block Parcels
  blocks.forEach(block => {
    if (!block.points || block.points.length < 3) return;

    ctx.beginPath();
    ctx.moveTo(block.points[0][0], block.points[0][1]);
    for (let i = 1; i < block.points.length; i++) {
      ctx.lineTo(block.points[i][0], block.points[i][1]);
    }
    ctx.closePath();

    // Clean neutral city block base
    ctx.fillStyle = "#edf2f7";
    ctx.fill();

    // Block boundary curb
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Second pass: Grouped Building Clusters inside blocks
  blocks.forEach(block => {
    if (!block.buildings) return;

    block.buildings.forEach(b => {
      // Directional Micro-Shadow for 3D aerial feeling
      ctx.fillStyle = "rgba(15, 23, 42, 0.08)";
      roundRect(ctx, b.x + 2, b.y + 3, b.w, b.h, 2);
      ctx.fill();

      // Building Rooftop Fill
      ctx.fillStyle = b.color || "#ffffff";
      roundRect(ctx, b.x, b.y, b.w, b.h, 2);
      ctx.fill();

      // Building Outline
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      roundRect(ctx, b.x, b.y, b.w, b.h, 2);
      ctx.stroke();

      // Architectural Rooftop Parapet / HVAC details at close zoom
      if (cameraZoom > 0.65 && b.w > 45 && b.h > 30) {
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        roundRect(ctx, b.x + 5, b.y + 5, b.w - 10, b.h - 10, 1);
        ctx.stroke();

        // Subtle rooftop HVAC box
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(b.x + b.w / 2 - 4, b.y + b.h / 2 - 4, 8, 8);
      }
    });
  });

  ctx.restore();
}

/**
 * 6, 7 & 8. Renders Layered Road Network
 * Layered approach: Outer Road Casing -> Asphalt Surface -> Lane Markings
 */
function renderLayeredRoads(ctx, roads) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // A. Visual Local Streets (Lowest tier)
  if (roads.localStreets) {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 4;
    roads.localStreets.forEach(path => drawPolyline(ctx, path));

    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2.5;
    roads.localStreets.forEach(path => drawPolyline(ctx, path));
  }

  // B. Tertiary Streets
  if (roads.tertiary) {
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 6;
    roads.tertiary.forEach(path => drawPolyline(ctx, path));

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    roads.tertiary.forEach(path => drawPolyline(ctx, path));
  }

  // C. Secondary Roads
  if (roads.secondary) {
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 10;
    roads.secondary.forEach(path => drawPolyline(ctx, path));

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 7;
    roads.secondary.forEach(path => drawPolyline(ctx, path));
  }

  // D. Major Arterial Highways (VIP Road, Hoshangabad Hwy, Link Roads)
  if (roads.primary) {
    // 1. Darker Road Boundary Casing
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 16;
    roads.primary.forEach(path => drawPolyline(ctx, path));

    // 2. High-grade Asphalt Surface
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 12;
    roads.primary.forEach(path => drawPolyline(ctx, path));

    // 3. Subtle Dashed Centerline
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([9, 9]);
    roads.primary.forEach(path => drawPolyline(ctx, path));
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawPolyline(ctx, points) {
  if (!points || points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
}

/**
 * 9. Renders No-Fly Zones with custom Canvas-drawn ⚠ vector warning badge (NO EMOJIS)
 */
function renderNoFlyZones(ctx, zones, showLabels, pulseTime) {
  ctx.save();

  zones.forEach(zone => {
    if (!zone.points || zone.points.length < 3) return;

    // Translucent restricted airspace polygon
    ctx.beginPath();
    ctx.moveTo(zone.points[0][0], zone.points[0][1]);
    for (let i = 1; i < zone.points.length; i++) {
      ctx.lineTo(zone.points[i][0], zone.points[i][1]);
    }
    ctx.closePath();

    ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
    ctx.fill();

    // Pulsing danger dashed boundary
    const pulseAlpha = 0.6 + 0.3 * Math.sin(pulseTime * 2.5);
    ctx.strokeStyle = `rgba(220, 38, 38, ${pulseAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([12, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate zone centroid
    const avgX = zone.points.reduce((sum, p) => sum + p[0], 0) / zone.points.length;
    const avgY = zone.points.reduce((sum, p) => sum + p[1], 0) / zone.points.length;

    if (showLabels) {
      const badgeW = 146;
      const badgeH = 28;

      // Card Background
      ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
      ctx.shadowColor = "rgba(220, 38, 38, 0.2)";
      ctx.shadowBlur = 8;
      roundRect(ctx, avgX - badgeW / 2, avgY - badgeH / 2, badgeW, badgeH, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1.2;
      roundRect(ctx, avgX - badgeW / 2, avgY - badgeH / 2, badgeW, badgeH, 6);
      ctx.stroke();

      // Custom Canvas-drawn ⚠ Vector Warning Icon (Zero Emoji)
      const iconX = avgX - badgeW / 2 + 14;
      const iconY = avgY;
      drawVectorWarningIcon(ctx, iconX, iconY);

      // Label Text
      ctx.font = "700 9.5px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#b91c1c";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`NO-FLY ZONE • ${zone.code}`, iconX + 11, avgY);
    }
  });

  ctx.restore();
}

/**
 * Draws a clean vector warning triangle symbol ⚠ on canvas
 */
function drawVectorWarningIcon(ctx, cx, cy) {
  ctx.save();
  const s = 6.5;

  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s, cy + s);
  ctx.lineTo(cx - s, cy + s);
  ctx.closePath();

  ctx.fillStyle = "#dc2626";
  ctx.fill();

  // Exclamation stem
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s + 3.5);
  ctx.lineTo(cx, cy + 1.5);
  ctx.stroke();

  // Exclamation dot
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy + 4.2, 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 10. Renders Central Logistics Depot with warehouse vector icon & operational radius
 */
function renderDepot(ctx, depot, pulseTime) {
  ctx.save();
  const { x, y, shortLabel, operationalRadius = 540 } = depot;

  // A. Subtle Circular Operational Coverage Radius (Visual only)
  ctx.beginPath();
  ctx.arc(x, y, operationalRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(2, 132, 199, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Radius label
  ctx.font = "600 9px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#0284c7";
  ctx.textAlign = "center";
  ctx.fillText("OPERATIONAL SERVICE RADIUS (5.5 KM)", x, y - operationalRadius - 6);

  // B. Pulsating Radar Rings
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const phase = ((pulseTime * 0.8 + i / ringCount) % 1);
    const radius = 20 + phase * 42;
    const alpha = (1 - phase) * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(2, 132, 199, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // C. Depot Base Disc
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(2, 132, 199, 0.35)";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 3;
  ctx.stroke();

  // D. Custom Warehouse / Logistics Hub Vector Icon
  drawWarehouseVectorIcon(ctx, x, y);

  // E. Depot Label Badge
  ctx.font = "700 10.5px 'JetBrains Mono', monospace";
  const labelText = `★ ${shortLabel}`;
  const textMetrics = ctx.measureText(labelText);
  const pad = 8;
  const labelW = textMetrics.width + pad * 2;
  const labelH = 22;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  roundRect(ctx, x - labelW / 2, y + 25, labelW, labelH, 4);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labelText, x, y + 36);

  ctx.restore();
}

/**
 * Draws a clean vector warehouse / hub icon on canvas
 */
function drawWarehouseVectorIcon(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = "#0284c7";
  ctx.fillStyle = "#0284c7";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Warehouse roof & walls
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy + 6);
  ctx.lineTo(cx - 9, cy - 2);
  ctx.lineTo(cx, cy - 8);
  ctx.lineTo(cx + 9, cy - 2);
  ctx.lineTo(cx + 9, cy + 6);
  ctx.closePath();
  ctx.stroke();

  // Loading bay door
  roundRect(ctx, cx - 4, cy, 8, 6, 1);
  ctx.fill();

  ctx.restore();
}

/**
 * 11. Tactical District Labels
 */
function renderDistrictLabels(ctx, labels, cameraZoom) {
  ctx.save();
  ctx.font = "700 11px 'Inter', sans-serif";
  ctx.fillStyle = "rgba(100, 116, 139, 0.75)";
  ctx.textAlign = "center";
  ctx.letterSpacing = "0.08em";

  labels.forEach(lbl => {
    ctx.fillText(lbl.text, lbl.x, lbl.y);
  });
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
