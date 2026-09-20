/**
 * Route Renderer for HTML5 Canvas — Phase 2 Animated Flow System
 * Renders elevated aerial corridor for drone with directional flow particles,
 * and street-bound polyline for ground courier with pulse beads.
 * Completed segments smoothly fade to reduce visual clutter.
 */

export function renderRoutes(ctx, options = {}) {
  const {
    droneTrajectory = [],
    groundTrajectory = [],
    droneCurrentIndex = 0,
    droneProgress = 0,
    groundCurrentIndex = 0,
    groundProgress = 0,
    pulseTime = 0,
    showRoutes = true
  } = options;

  if (!showRoutes) return;

  // 1. Render Ground Route (Road-network constrained)
  if (groundTrajectory && groundTrajectory.length > 1) {
    renderGroundTrajectory(ctx, groundTrajectory, groundCurrentIndex, groundProgress, pulseTime);
  }

  // 2. Render Drone Route (Aerial elevated corridor)
  if (droneTrajectory && droneTrajectory.length > 1) {
    renderDroneTrajectory(ctx, droneTrajectory, droneCurrentIndex, droneProgress, pulseTime);
  }
}

/**
 * Renders Ground Courier Route in warm logistics amber with street-constrained flow beads
 */
function renderGroundTrajectory(ctx, trajectory, currentIndex, progress, pulseTime) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // A. Future Unvisited Route (Faint reference)
  if (currentIndex < trajectory.length - 1) {
    ctx.beginPath();
    ctx.moveTo(trajectory[currentIndex].x, trajectory[currentIndex].y);
    for (let i = currentIndex + 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.strokeStyle = "rgba(234, 88, 12, 0.16)";
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // B. Completed Path (Smoothly faded to avoid map clutter)
  if (currentIndex > 0) {
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i <= currentIndex; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.strokeStyle = "rgba(234, 88, 12, 0.22)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // C. Active Leg (High-visibility warm logistics amber)
  if (currentIndex < trajectory.length - 1) {
    const pCurrent = trajectory[currentIndex];
    const pNext = trajectory[currentIndex + 1];
    const interpX = pCurrent.x + (pNext.x - pCurrent.x) * progress;
    const interpY = pCurrent.y + (pNext.y - pCurrent.y) * progress;

    // Outer warm glow
    ctx.beginPath();
    ctx.moveTo(pCurrent.x, pCurrent.y);
    ctx.lineTo(interpX, interpY);
    ctx.strokeStyle = "rgba(234, 88, 12, 0.4)";
    ctx.lineWidth = 5.5;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    ctx.moveTo(pCurrent.x, pCurrent.y);
    ctx.lineTo(interpX, interpY);
    ctx.strokeStyle = "#ea580c";
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Animated directional pulse particles along active street leg: ────•────•────•────────>
    const legLength = Math.hypot(pNext.x - pCurrent.x, pNext.y - pCurrent.y);
    const particleCount = Math.max(1, Math.floor(legLength / 60));
    const speedPhase = (pulseTime * 1.5) % 1;

    for (let k = 0; k < particleCount; k++) {
      const partRatio = ((k / particleCount) + speedPhase) % 1;
      if (partRatio <= progress) {
        const px = pCurrent.x + (pNext.x - pCurrent.x) * partRatio;
        const py = pCurrent.y + (pNext.y - pCurrent.y) * partRatio;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ea580c";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  // Waypoint nodes
  trajectory.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, i === currentIndex ? 4 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = i <= currentIndex ? "#ea580c" : "rgba(234, 88, 12, 0.4)";
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Renders Drone Route in crisp aviation electric blue with elevated appearance and flow arrows
 */
function renderDroneTrajectory(ctx, trajectory, currentIndex, progress, pulseTime) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // A. Future Unvisited Aerial Corridor
  if (currentIndex < trajectory.length - 1) {
    ctx.beginPath();
    ctx.moveTo(trajectory[currentIndex].x, trajectory[currentIndex].y);
    for (let i = currentIndex + 1; i < trajectory.length; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.strokeStyle = "rgba(2, 132, 199, 0.16)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // B. Completed Flight Path (Smoothly faded)
  if (currentIndex > 0) {
    ctx.beginPath();
    ctx.moveTo(trajectory[0].x, trajectory[0].y);
    for (let i = 1; i <= currentIndex; i++) {
      ctx.lineTo(trajectory[i].x, trajectory[i].y);
    }
    ctx.strokeStyle = "rgba(2, 132, 199, 0.25)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // C. Active Aerial Corridor (Elevated glow with directional flow particles)
  if (currentIndex < trajectory.length - 1) {
    const pCurrent = trajectory[currentIndex];
    const pNext = trajectory[currentIndex + 1];
    const interpX = pCurrent.x + (pNext.x - pCurrent.x) * progress;
    const interpY = pCurrent.y + (pNext.y - pCurrent.y) * progress;

    // Elevated shadow on terrain
    ctx.beginPath();
    ctx.moveTo(pCurrent.x + 4, pCurrent.y + 6);
    ctx.lineTo(interpX + 4, interpY + 6);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.1)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Electric Cyan/Blue Outer Glow
    ctx.beginPath();
    ctx.moveTo(pCurrent.x, pCurrent.y);
    ctx.lineTo(interpX, interpY);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4.5;
    ctx.shadowColor = "rgba(56, 189, 248, 0.6)";
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Inner Aviation Core
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Animated directional stream particles: ─────────•────•────•────>
    const legLength = Math.hypot(pNext.x - pCurrent.x, pNext.y - pCurrent.y);
    const particleCount = Math.max(1, Math.floor(legLength / 55));
    const speedPhase = (pulseTime * 2.2) % 1;

    for (let k = 0; k < particleCount; k++) {
      const partRatio = ((k / particleCount) + speedPhase) % 1;
      if (partRatio <= progress) {
        const px = pCurrent.x + (pNext.x - pCurrent.x) * partRatio;
        const py = pCurrent.y + (pNext.y - pCurrent.y) * partRatio;

        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  // Aerial Waypoints
  trajectory.forEach((pt, i) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, i === currentIndex ? 4.5 : 2.5, 0, Math.PI * 2);
    ctx.fillStyle = i <= currentIndex ? "#0284c7" : "rgba(2, 132, 199, 0.35)";
    ctx.fill();
    if (i === currentIndex) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  ctx.restore();
}
