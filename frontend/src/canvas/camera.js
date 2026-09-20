/**
 * Camera System for 2D Canvas Map
 * Handles coordinates transformations, panning, zooming towards cursor, and bounds.
 */

export class MapCamera {
  constructor(options = {}) {
    this.x = options.x || 1200;
    this.y = options.y || 880;
    this.zoom = options.zoom || 0.85;
    this.minZoom = options.minZoom || 0.35;
    this.maxZoom = options.maxZoom || 3.5;
    this.viewportWidth = options.viewportWidth || 1000;
    this.viewportHeight = options.viewportHeight || 800;
  }

  setViewport(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Convert World Coordinates to Screen (Canvas) Coordinates
   */
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.viewportWidth / 2,
      y: (wy - this.y) * this.zoom + this.viewportHeight / 2
    };
  }

  /**
   * Convert Screen (Canvas) Coordinates to World Coordinates
   */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.viewportWidth / 2) / this.zoom + this.x,
      y: (sy - this.viewportHeight / 2) / this.zoom + this.y
    };
  }

  /**
   * Pan camera by delta screen pixels
   */
  pan(dx, dy) {
    this.x -= dx / this.zoom;
    this.y -= dy / this.zoom;
  }

  /**
   * Zoom at a specific screen point (e.g. mouse cursor position)
   */
  zoomAtPoint(screenX, screenY, factor) {
    const prevWorld = this.screenToWorld(screenX, screenY);
    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    if (newZoom === this.zoom) return;

    this.zoom = newZoom;
    const newWorld = this.screenToWorld(screenX, screenY);

    // Adjust camera position so world point under cursor remains invariant
    this.x += prevWorld.x - newWorld.x;
    this.y += prevWorld.y - newWorld.y;
  }

  /**
   * Smoothly reset view to center on target coordinates (default depot)
   */
  reset(centerX = 1180, centerY = 860, zoom = 0.85) {
    this.x = centerX;
    this.y = centerY;
    this.zoom = zoom;
  }

  /**
   * Frame the entire metropolitan operational zone within the viewport
   */
  fitCity(worldWidth = 2400, worldHeight = 1600, padding = 60) {
    const availW = Math.max(200, this.viewportWidth - padding * 2);
    const availH = Math.max(200, this.viewportHeight - padding * 2);
    const zoomX = availW / worldWidth;
    const zoomY = availH / worldHeight;
    const fitZoom = Math.max(this.minZoom, Math.min(this.maxZoom, Math.min(zoomX, zoomY)));

    this.x = worldWidth / 2;
    this.y = worldHeight / 2;
    this.zoom = fitZoom;
  }

  /**
   * Apply camera transform to 2D canvas context
   */
  applyTransform(ctx) {
    ctx.save();
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  /**
   * Restore canvas transform
   */
  restoreTransform(ctx) {
    ctx.restore();
  }
}
