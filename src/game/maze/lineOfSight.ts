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

/**
 * How far a ray from (fromX, fromY), heading in the unit direction (dirX, dirY), can travel
 * before hitting a wall - capped at `maxDistance`. Used to stop a ranged attack's projectile
 * visual at the wall it would actually hit on a miss, rather than flying through it out to the
 * weapon's full range: a miss's destination has no target position to already be filtered by
 * hasLineOfSight the way a hit's does, so this exists to give it the same wall-awareness. Same
 * quarter-tile sampling approach as hasLineOfSight, for the same reasons.
 */
export function raycastDistance(grid: TileGrid, fromX: number, fromY: number, dirX: number, dirY: number, maxDistance: number): number {
  const steps = Math.max(1, Math.ceil(maxDistance / (TILE_SIZE / 4)));

  for (let i = 1; i <= steps; i++) {
    const distance = (i / steps) * maxDistance;
    const x = fromX + dirX * distance;
    const y = fromY + dirY * distance;
    const { tx, ty } = pxToTile(x, y);
    const row = grid[ty];
    if (!row || row[tx] !== TileType.Floor) {
      // Stops at the last confirmed-floor sample rather than the wall tile itself, so the
      // projectile's visual endpoint doesn't land inside (or past) the wall it's stopping for.
      return ((i - 1) / steps) * maxDistance;
    }
  }

  return maxDistance;
}
