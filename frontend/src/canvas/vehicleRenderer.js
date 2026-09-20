/**
 * Vehicle and Delivery Marker Renderer for HTML5 Canvas — Phase 2 Game-Simulation Polish
 *
 * Renders:
 * - Hexacopter Drone with spinning rotors, dynamic altitude shadow, and vertical hover/bobbing
 * - Ground EV Courier Van with headlight cones and road heading
 * - Zoom-scaled game-map objective markers (Pending, Assigned, In Transit, Completed, Infeasible)
 */

export function renderVehicles(ctx, options = {}) {
  const {
    droneState,
    groundState,
    pulseTime = 0,
    cameraZoom = 1.0,
    selectedVehicle = null,
    hoveredVehicle = null
  } = options;

  // 1. Render Ground Courier Vehicle
  if (groundState && groundState.visible) {
    renderGroundVehicle(ctx, groundState, selectedVehicle === "ground", hoveredVehicle === "ground");
  }

  // 2. Render Aerial Hexacopter Drone
  if (droneState && droneState.visible) {
    renderDrone(ctx, droneState, pulseTime, selectedVehicle === "drone", hoveredVehicle === "drone");
  }
}

/**
 * Custom Vector Drone Renderer (Hexacopter with 3D Depth & Vertical Bobbing)
 */
function renderDrone(ctx, droneState, pulseTime, isSelected, isHovered) {
  const { x, y, angle = 0, altitude = 85, speedKmh = 65 } = droneState;

  // Vertical hover bobbing animation (subtle harmonic hover displacement)
  const hoverBob = Math.sin(pulseTime * 3.5) * 3.5;
  const droneY = y + hoverBob;

  ctx.save();

  // 1. Ground Altitude Shadow (Offset based on sun angle & altitude, stays grounded at original y)
  const shadowDist = Math.max(10, altitude * 0.18);
  ctx.save();
  ctx.translate(x + shadowDist * 0.7, y + shadowDist * 0.9);
  ctx.rotate(angle);
  ctx.fillStyle = `rgba(15, 23, 42, ${Math.max(0.12, 0.32 - altitude * 0.0018)})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Translate and Rotate Drone at bobbed position
  ctx.translate(x, droneY);

  // Selection / Hover Target Reticle
  if (isSelected || isHovered) {
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.rotate(angle);

  // 3. Motor Booms (6 Arms for Hexacopter)
  const boomLen = 18;
  const motorPositions = [
    { x: Math.cos(0) * boomLen, y: Math.sin(0) * boomLen },
    { x: Math.cos(Math.PI / 3) * boomLen, y: Math.sin(Math.PI / 3) * boomLen },
    { x: Math.cos((2 * Math.PI) / 3) * boomLen, y: Math.sin((2 * Math.PI) / 3) * boomLen },
    { x: Math.cos(Math.PI) * boomLen, y: Math.sin(Math.PI) * boomLen },
    { x: Math.cos((4 * Math.PI) / 3) * boomLen, y: Math.sin((4 * Math.PI) / 3) * boomLen },
    { x: Math.cos((5 * Math.PI) / 3) * boomLen, y: Math.sin((5 * Math.PI) / 3) * boomLen }
  ];

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2.5;
  motorPositions.forEach(m => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();
  });

  // 4. Spinning Rotors (Discs with spinning blades)
  const rotorSpin = pulseTime * 48;
  motorPositions.forEach((m, idx) => {
    // Motor hub
    ctx.beginPath();
    ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // Spinning disc blur
    ctx.beginPath();
    ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(56, 189, 248, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rotor blade line
    const bladeAngle = rotorSpin * (idx % 2 === 0 ? 1 : -1) + idx;
    ctx.beginPath();
    ctx.moveTo(m.x - Math.cos(bladeAngle) * 7.5, m.y - Math.sin(bladeAngle) * 7.5);
    ctx.lineTo(m.x + Math.cos(bladeAngle) * 7.5, m.y + Math.sin(bladeAngle) * 7.5);
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.8;
    ctx.stroke();
  });

  // 5. Central Aerodynamic Fuselage
  ctx.beginPath();
  ctx.moveTo(14, 0); // Nose
  ctx.lineTo(5, -9);
  ctx.lineTo(-11, -7);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-11, 7);
  ctx.lineTo(5, 9);
  ctx.closePath();

  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(2, 132, 199, 0.45)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#0284c7";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avionics Dome
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#0284c7";
  ctx.fill();

  // Nose Heading Light
  ctx.beginPath();
  ctx.arc(12, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();

  // 6. Compact Status Telemetry Tag
  ctx.save();
  ctx.translate(x, droneY - 26);
  const tagText = isSelected
    ? `DRONE 01 • ${Math.round(speedKmh)} KM/H • ALT ${Math.round(altitude)}M`
    : `DRONE 01 • ${Math.round(speedKmh)} KM/H`;
  ctx.font = "700 9.5px 'JetBrains Mono', monospace";
  const tagMetrics = ctx.measureText(tagText);
  const tagW = tagMetrics.width + 12;
  const tagH = 18;

  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  roundRect(ctx, -tagW / 2, -tagH / 2, tagW, tagH, 4);
  ctx.fill();

  ctx.fillStyle = "#38bdf8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tagText, 0, 1);
  ctx.restore();
}

/**
 * Custom Vector Ground Delivery Vehicle Renderer
 */
function renderGroundVehicle(ctx, groundState, isSelected, isHovered) {
  const { x, y, angle = 0, speedKmh = 24.5 } = groundState;

  ctx.save();
  ctx.translate(x, y);

  // Ground drop shadow
  ctx.save();
  ctx.translate(2, 3);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
  roundRect(ctx, -14, -8, 28, 16, 4);
  ctx.fill();
  ctx.restore();

  // Selection / Hover Target Reticle
  if (isSelected || isHovered) {
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.strokeStyle = "#fb923c";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Rotate vehicle along street trajectory
  ctx.rotate(angle);

  // Headlight beam cones
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(13, -5);
  ctx.lineTo(38, -14);
  ctx.lineTo(38, 14);
  ctx.lineTo(13, 5);
  ctx.closePath();
  const grad = ctx.createLinearGradient(13, 0, 38, 0);
  grad.addColorStop(0, "rgba(253, 224, 71, 0.4)");
  grad.addColorStop(1, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Wheels
  ctx.fillStyle = "#1e293b";
  roundRect(ctx, -12, -10, 7, 3, 1);
  ctx.fill();
  roundRect(ctx, 5, -10, 7, 3, 1);
  ctx.fill();
  roundRect(ctx, -12, 7, 7, 3, 1);
  ctx.fill();
  roundRect(ctx, 5, 7, 7, 3, 1);
  ctx.fill();

  // Van Body
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(234, 88, 12, 0.3)";
  ctx.shadowBlur = 8;
  roundRect(ctx, -13, -7, 26, 14, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#ea580c";
  ctx.lineWidth = 1.8;
  roundRect(ctx, -13, -7, 26, 14, 4);
  ctx.stroke();

  // Front Windshield
  ctx.fillStyle = "#334155";
  roundRect(ctx, 4, -5, 5, 10, 2);
  ctx.fill();

  // Cargo Roof Accent
  ctx.fillStyle = "#ea580c";
  roundRect(ctx, -10, -4, 10, 8, 2);
  ctx.fill();

  ctx.restore();

  // Status Tag
  ctx.save();
  ctx.translate(x, y + 22);
  const tagText = `GROUND 01 • ${speedKmh.toFixed(1)} KM/H`;
  ctx.font = "700 9px 'JetBrains Mono', monospace";
  const tagMetrics = ctx.measureText(tagText);
  const tagW = tagMetrics.width + 10;
  const tagH = 16;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  roundRect(ctx, -tagW / 2, -tagH / 2, tagW, tagH, 3);
  ctx.fill();

  ctx.fillStyle = "#fb923c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(tagText, 0, 1);
  ctx.restore();
}

/**
 * Renders Game-Map Objective Markers with Level-Of-Detail Scaling
 */
export function renderDeliveryMarkers(ctx, orders = [], options = {}) {
  const {
    selectedOrderId = null,
    hoveredOrderId = null,
    showLabels = true,
    cameraZoom = 1.0,
    pulseTime = 0
  } = options;

  orders.forEach(order => {
    const isSelected = order.id === selectedOrderId;
    const isHovered = order.id === hoveredOrderId;

    ctx.save();
    ctx.translate(order.x, order.y);

    // Render based on state
    switch (order.status) {
      case "completed":
        renderCompletedObjective(ctx, order, isSelected, isHovered, cameraZoom);
        break;
      case "assigned":
        renderInTransitObjective(ctx, order, isSelected, isHovered, pulseTime, cameraZoom);
        break;
      case "infeasible":
        renderInfeasibleObjective(ctx, order, isSelected, isHovered, cameraZoom);
        break;
      case "pending":
      default:
        renderPendingObjective(ctx, order, isSelected, isHovered, pulseTime, cameraZoom);
        break;
    }

    // Callout inspection badge for selected or hovered
    if (isSelected || isHovered) {
      renderOrderCallout(ctx, order, isSelected);
    } else if (showLabels && cameraZoom > 0.65) {
      // Subtle Order ID label at close zoom
      ctx.font = "700 8.5px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "center";
      ctx.fillText(order.id, 0, -12);
    }

    ctx.restore();
  });
}

function renderPendingObjective(ctx, order, isSelected, isHovered, pulseTime, cameraZoom) {
  const radius = isSelected || isHovered ? 8 : (cameraZoom > 0.65 ? 6 : 4.5);

  // Pulse ring
  ctx.beginPath();
  ctx.arc(0, 0, radius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(100, 116, 139, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pin base
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = order.priority === "critical" ? "#ef4444" : "#64748b";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Inner center dot
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = order.priority === "critical" ? "#ef4444" : "#64748b";
  ctx.fill();
}

function renderInTransitObjective(ctx, order, isSelected, isHovered, pulseTime, cameraZoom) {
  const isDrone = order.assignedVehicle === "drone";
  const mainColor = isDrone ? "#0284c7" : "#ea580c";
  const radius = isSelected || isHovered ? 9 : (cameraZoom > 0.65 ? 7 : 5);
  const pulse = (Math.sin(pulseTime * 4.5) + 1) * 3.5;

  // Active Radar Pulse
  ctx.beginPath();
  ctx.arc(0, 0, radius + 3 + pulse, 0, Math.PI * 2);
  ctx.strokeStyle = isDrone ? "rgba(2, 132, 199, 0.38)" : "rgba(234, 88, 12, 0.38)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Marker Body
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = mainColor;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner Vehicle Indicator
  ctx.beginPath();
  ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = mainColor;
  ctx.fill();
}

function renderCompletedObjective(ctx, order, isSelected, isHovered, cameraZoom) {
  const radius = isSelected || isHovered ? 8 : (cameraZoom > 0.65 ? 6.5 : 4.5);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#059669"; // Emerald success
  ctx.shadowColor = "rgba(5, 150, 105, 0.35)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Vector checkmark (at normal/close zoom)
  if (cameraZoom > 0.65 || isSelected || isHovered) {
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-1, 2);
    ctx.lineTo(3, -2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function renderInfeasibleObjective(ctx, order, isSelected, isHovered, cameraZoom) {
  const size = isSelected || isHovered ? 15 : (cameraZoom > 0.65 ? 12 : 9);

  // Warning Diamond
  ctx.beginPath();
  ctx.moveTo(0, -size / 2 - 2);
  ctx.lineTo(size / 2 + 2, size / 2);
  ctx.lineTo(-size / 2 - 2, size / 2);
  ctx.closePath();

  ctx.fillStyle = "#fee2e2";
  ctx.fill();
  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Vector exclamation stem and dot
  if (cameraZoom > 0.65 || isSelected || isHovered) {
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -size / 2 + 2.5);
    ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(0, 2.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderOrderCallout(ctx, order, isSelected) {
  const title = order.id;
  const subtitle = order.title || order.category;
  const detail = order.status === "infeasible"
    ? "INFEASIBLE"
    : `${order.assignedVehicle?.toUpperCase() || "PENDING"} • ${order.distanceKm}KM`;

  ctx.font = "700 10px 'JetBrains Mono', monospace";
  const titleMetrics = ctx.measureText(title);
  ctx.font = "500 9px 'Inter', sans-serif";
  const subMetrics = ctx.measureText(subtitle);
  const boxW = Math.max(titleMetrics.width, subMetrics.width, 114) + 16;
  const boxH = 46;

  ctx.save();
  ctx.translate(0, -boxH - 12);

  // Card background with shadow
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(15, 23, 42, 0.12)";
  ctx.shadowBlur = 12;
  roundRect(ctx, -boxW / 2, 0, boxW, boxH, 6);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = isSelected ? "#0284c7" : "#cbd5e1";
  ctx.lineWidth = isSelected ? 2 : 1;
  roundRect(ctx, -boxW / 2, 0, boxW, boxH, 6);
  ctx.stroke();

  // Order ID
  ctx.font = "700 10px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "left";
  ctx.fillText(title, -boxW / 2 + 8, 14);

  // Status Badge
  ctx.font = "700 8px 'JetBrains Mono', monospace";
  ctx.fillStyle = order.status === "completed"
    ? "#059669"
    : order.status === "infeasible"
    ? "#dc2626"
    : "#0284c7";
  ctx.textAlign = "right";
  ctx.fillText(order.status.toUpperCase(), boxW / 2 - 8, 14);

  // Title
  ctx.font = "500 8.5px 'Inter', sans-serif";
  ctx.fillStyle = "#475569";
  ctx.textAlign = "left";
  const truncatedSub = subtitle.length > 21 ? subtitle.slice(0, 20) + "…" : subtitle;
  ctx.fillText(truncatedSub, -boxW / 2 + 8, 27);

  // Detail
  ctx.font = "600 8px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText(detail, -boxW / 2 + 8, 39);

  // Arrow
  ctx.beginPath();
  ctx.moveTo(-5, boxH);
  ctx.lineTo(0, boxH + 6);
  ctx.lineTo(5, boxH);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = isSelected ? "#0284c7" : "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

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
