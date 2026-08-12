import { TILE_SIZE } from "../config/constants";
import { cellCenterPx, tileCenterPx } from "../game/maze/raster";
import type { Cell } from "../game/maze/types";
import { WORLD_UNITS_PER_TILE } from "./constants3d";

/** Pixel-space x/y (the 2D game's native coordinate system) to Three.js world x/z - Y is up in
 * the 3D scene, so the 2D game's "y" (depth on screen) becomes world "z". */
export function pxToWorld(px: number, py: number): { x: number; z: number } {
  return { x: (px / TILE_SIZE) * WORLD_UNITS_PER_TILE, z: (py / TILE_SIZE) * WORLD_UNITS_PER_TILE };
}

export function tileCenterWorld(tx: number, ty: number): { x: number; z: number } {
  const { x, y } = tileCenterPx(tx, ty);
  return pxToWorld(x, y);
}

export function cellCenterWorld(cell: Cell): { x: number; z: number } {
  const { x, y } = cellCenterPx(cell);
  return pxToWorld(x, y);
}

export const TILE_WORLD_SIZE = WORLD_UNITS_PER_TILE;
