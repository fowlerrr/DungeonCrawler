import { TileType, type TileGrid } from "./types";

/** Whether a tile can be stepped onto right now: it must be a floor tile within the grid, and
 * not currently occupied by an active locked door. `blockedTiles` holds "tx,ty" keys for every
 * still-locked door - callers recompute it from whichever doors are currently active. */
export function isTilePassable(grid: TileGrid, tx: number, ty: number, blockedTiles: ReadonlySet<string>): boolean {
  const row = grid[ty];
  if (!row || row[tx] === undefined) return false;
  if (row[tx] !== TileType.Floor) return false;
  return !blockedTiles.has(`${tx},${ty}`);
}
