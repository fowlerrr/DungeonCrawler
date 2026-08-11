import { TILE_SIZE } from "../../config/constants";
import { pxToTile } from "./raster";
import { TileType, type TileGrid } from "./types";

/**
 * Whether a straight line between two pixel points stays entirely within floor tiles - used to
 * stop a ranged attack from hitting a target through a wall. Samples every quarter-tile along
 * the line rather than doing exact tile-edge/DDA math; at this tile size that's precise enough
 * and much simpler to reason about. Endpoints themselves aren't checked (attacker and target
 * are always standing somewhere valid already), only what's between them.
 */
export function hasLineOfSight(grid: TileGrid, fromX: number, fromY: number, toX: number, toY: number): boolean {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const steps = Math.max(1, Math.ceil(distance / (TILE_SIZE / 4)));

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = fromX + (toX - fromX) * t;
    const y = fromY + (toY - fromY) * t;
    const { tx, ty } = pxToTile(x, y);
    const row = grid[ty];
    if (!row || row[tx] !== TileType.Floor) return false;
  }

  return true;
}
