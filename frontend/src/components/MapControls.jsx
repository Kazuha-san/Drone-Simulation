import React from "react";

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  onFitCity,
  layerToggles = {},
  onToggleLayer
}) {
  return (
    <div className="map-floating-controls">
      {/* Zoom and Camera Controls */}
      <div className="map-btn-group">
        <button
          className="map-ctrl-btn"
          onClick={onZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          className="map-ctrl-btn"
          onClick={onZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          className="map-ctrl-btn map-ctrl-fit"
          onClick={onFitCity}
          title="Fit Entire City to Viewport"
          aria-label="Fit City"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>

        <button
          className="map-ctrl-btn"
          onClick={onResetView}
          title="Reset Camera View to Depot"
          aria-label="Reset Camera View"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        </button>
      </div>

      {/* Compass North Indicator */}
      <div className="map-orientation-badge" title="Map Orientation: North Up">
        <span>N</span>
      </div>

      {/* Layer Toggles Panel */}
      {onToggleLayer && (
        <div className="map-layers-floating-panel">
          <div className="map-layers-title">MAP LAYERS</div>
          <button
            className={`map-layer-btn ${layerToggles.showRoutes ? "active" : ""}`}
            onClick={() => onToggleLayer("showRoutes")}
          >
            <span className="layer-dot dot-routes"></span>
            <span>Routes</span>
          </button>
          <button
            className={`map-layer-btn ${layerToggles.showOrders !== false ? "active" : ""}`}
            onClick={() => onToggleLayer("showOrders")}
          >
            <span className="layer-dot dot-orders"></span>
            <span>Orders</span>
          </button>
          <button
            className={`map-layer-btn ${layerToggles.showZones ? "active" : ""}`}
            onClick={() => onToggleLayer("showZones")}
          >
            <span className="layer-dot dot-zones"></span>
            <span>No-Fly</span>
          </button>
          <button
            className={`map-layer-btn ${layerToggles.showBlocks ? "active" : ""}`}
            onClick={() => onToggleLayer("showBlocks")}
          >
            <span className="layer-dot dot-buildings"></span>
            <span>Buildings</span>
          </button>
        </div>
      )}
    </div>
  );
}
