import type { Rng } from "./rng";
import { cellKey, type Cell } from "./types";

/** Picks a random cell at least `minDistance` (Manhattan) away from `from` - used to place the
 * exit somewhere that isn't a short walk from the entrance, instead of a fixed corner. Falls
 * back to whichever cell is farthest overall if nothing clears the threshold (only possible on
 * very small grids), so this always returns a valid in-bounds cell. */
export function pickFarCell(cols: number, rows: number, from: Cell, minDistance: number, rng: Rng): Cell {
  const candidates: Cell[] = [];
  let farthest = from;
  let farthestDistance = -1;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = { x, y };
      const distance = Math.abs(c.x - from.x) + Math.abs(c.y - from.y);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthest = c;
      }
      if (distance >= minDistance) candidates.push(c);
    }
  }

  return candidates.length > 0 ? rng.pick(candidates) : farthest;
}

/** Picks up to `count` distinct cells at random, skipping anything in `excluded`. Used to
 * scatter monsters/chests without landing on the entrance, exit, keys, etc. */
export function pickRandomCells(
  cols: number,
  rows: number,
  count: number,
  rng: Rng,
  excluded: ReadonlySet<string>,
): Cell[] {
  const candidates: Cell[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = { x, y };
      if (!excluded.has(cellKey(c))) candidates.push(c);
    }
  }

  const picked: Cell[] = [];
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const idx = rng.nextInt(candidates.length);
    picked.push(candidates.splice(idx, 1)[0]);
  }
  return picked;
}
