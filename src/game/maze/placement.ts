import type { Rng } from "./rng";
import { cellKey, type Cell } from "./types";

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
