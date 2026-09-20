/**
 * Basemap layer — real Bhopal geography, not hand-drawn art.
 *
 * This file used to hold a hand-authored stylized map (invented terrain
 * contours, block grids and road lines). It now derives MAP_CONFIG from
 * `bhopal_basemap.json`, an OpenStreetMap extract (ODbL) covering the same
 * 2400x1600 canvas at 8 m/unit. `engine/build_graph.py` mirrors that file
 * into this directory and also derives the engine's routing graph from it, so
 * the geography drawn here and the geography the simulation routes over are
 * the same source.
 *
 * The exported shape is unchanged — every key the canvas renderers already
 * read (`width`, `height`, `depot`, `roads`, `waterBodies`, `parks`,
 * `noFlyZones`, `districtLabels`, `cityBlocks`) is still present and in the
 * same format. Only the contents are now real.
 *
 * Two deliberate omissions, both because inventing them would put fictional
 * geography back on a map whose whole point is that it is real:
 *   - `cityBlocks` is empty. The OSM extract carries no building footprints,
 *     and the renderer already guards the layer, so it simply does not draw.
 *   - `terrainContours` and `airport` are gone. Nothing in src/canvas/ reads
 *     them; they were decorative shapes in the old hand-drawn version.
 */

import basemap from "./bhopal_basemap.json";

// Colours preserved from the original hand-authored basemap so the palette is
// unchanged — only the geometry underneath it has been replaced.
const PARK_FILL = "rgba(134, 239, 172, 0.22)";
const PARK_STROKE = "rgba(74, 222, 128, 0.45)";

// The depot marker is the primary dark store. TT Nagar is the central hub in
// engine/build_graph.py's DARK_STORES, and this is its real OSM label
// position, so the marker sits where the simulation actually dispatches from.
const TT_NAGAR = basemap.districtLabels.find((d) => d.text === "TT NAGAR");

export const MAP_CONFIG = {
  width: basemap.meta.width,
  height: basemap.meta.height,

  depot: {
    id: "depot-tt-nagar",
    name: "TT Nagar Logistics Depot",
    shortLabel: "TT NAGAR DEPOT",
    x: TT_NAGAR.x,
    y: TT_NAGAR.y,
    elevation: 520,
    chargingPads: 4,
    // 5 km at the basemap's 8 m/unit scale.
    operationalRadius: 5000 / basemap.meta.metresPerUnit
  },

  roads: basemap.roads,

  waterBodies: basemap.waterBodies,

  parks: basemap.parks.map((p) => ({
    ...p,
    color: PARK_FILL,
    stroke: PARK_STROKE
  })),

  noFlyZones: basemap.noFlyZones,

  districtLabels: basemap.districtLabels,

  // No building footprints in the OSM extract — see the header note.
  cityBlocks: [],

  // Provenance, so anything rendering an attribution line has it to hand.
  attribution: basemap.meta.source
};
