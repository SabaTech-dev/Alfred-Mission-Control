/**
 * Office3D Config — layout constants for the 3D office scene
 */

import type { PlantDecoration, WalkwayLane } from "@/lib/office3d-types";

export const PLANT_DECORATIONS: PlantDecoration[] = [
  { position: [-5.2, 0, 8.6], size: "large", type: "tree", radius: 0.65 },
  { position: [5.2, 0, 8.6], size: "large", type: "tree", radius: 0.65 },
  { position: [-12.8, 0, -8.6], size: "medium", type: "bush", radius: 0.52 },
  { position: [12.8, 0, -8.6], size: "medium", type: "bush", radius: 0.52 },
  { position: [-3.2, 0, -3.2], size: "medium", type: "tree", radius: 0.52 },
];

export const FILE_CABINET_POSITION: [number, number, number] = [-12.5, 0, -7.5];
export const WHITEBOARD_POSITION: [number, number, number] = [0, 0, -8];
export const COFFEE_MACHINE_POSITION: [number, number, number] = [12.5, 0, -7.5];

export const LEFT_BOOKSHELF_POSITION: [number, number, number] = [-14.1, 0, -5.0];
export const RIGHT_BOOKSHELF_POSITION: [number, number, number] = [14.1, 0, -5.0];

export const FRONT_WINDOW_POSITION: [number, number, number] = [5.2, 2.5, -9.85];
export const SIDE_WINDOW_LEFT: [number, number, number] = [-14.85, 2.5, 0.4];
export const SIDE_WINDOW_RIGHT: [number, number, number] = [14.85, 2.5, 0.4];

export const COLLAB_ZONE_CENTER: [number, number, number] = [0, 0, -5.9];
export const FOCUS_ZONE_CENTER: [number, number, number] = [-11.5, 0, -7.5];
export const BREAK_ZONE_CENTER: [number, number, number] = [11.5, 0, -7.5];

export const WALKWAY_LANES: WalkwayLane[] = [
  {
    id: "main-corridor",
    position: [0, 0.006, 1.3],
    size: [14.5, 1.25],
    color: "#474136",
  },
  {
    id: "collab-connector",
    position: [0, 0.006, -2.9],
    size: [1.25, 6.2],
    color: "#4a4238",
  },
  {
    id: "left-aisle",
    position: [-6.6, 0.006, -2.6],
    size: [4.1, 1.1],
    color: "#474136",
  },
  {
    id: "right-aisle",
    position: [6.2, 0.006, -3.55],
    size: [4.4, 0.95],
    color: "#4a4238",
  },
];

export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const IDLE_WINDOW_MS = 30 * 60 * 1000;
export const SUBAGENT_DESK_BOUNDS = {
  minX: -8.4,
  maxX: 8.4,
  minZ: -6.4,
  maxZ: 6.4,
} as const;

export const FETCH_TIMEOUT_MS = 10000;
