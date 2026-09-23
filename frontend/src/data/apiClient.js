/**
 * apiClient.js — talks to the local FastAPI server (backend/server.py).
 *
 * Same-origin in the standalone app (run_app.py serves both from one
 * port), so relative paths work there. In `npm run dev` (a different
 * port), set VITE_API_BASE in a .env file, e.g. VITE_API_BASE=http://localhost:8000
 */

const BASE = import.meta.env.VITE_API_BASE || "";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore — non-JSON error body
    }
    throw new Error(`API ${path} failed: ${res.status} ${detail}`);
  }
  return res.json();
}

export function fetchPresets() {
  return request("/api/presets");
}

/**
 * Runs the real engine fresh, server-side, with a new random order stream
 * (unless `seed` is given). Not a replay of a checked-in file.
 */
export function runSimulation({ fleetPresetId, weatherPresetId, obstaclePresetId, fleetMode, seed }) {
  return request("/api/simulate", {
    method: "POST",
    body: JSON.stringify({
      fleet_preset_id: fleetPresetId,
      weather_preset_id: weatherPresetId,
      obstacle_preset_id: obstaclePresetId,
      fleet_mode: fleetMode,
      ...(seed != null ? { seed } : {}),
    }),
  });
}

export function fetchOptimalityGapDemo() {
  return request("/api/optimality-gap-demo");
}
