import { braidMaze } from "./braiding";
import { generateBaseMaze } from "./generator";
import { placeLocks, type DoorInstance, type KeyPlacement, type VaultRegion } from "./locks";
import { pickFarCell } from "./placement";
import { rasterizeMaze } from "./raster";
import { Rng } from "./rng";
import { cellKey, type Cell, type TileGrid } from "./types";
import type { MazeGraph } from "./graph";
import { validateSolvable } from "./validator";

export interface GeneratedLevel {
  graph: MazeGraph;
  grid: TileGrid;
  doors: DoorInstance[];
  keys: KeyPlacement[];
  vaults: VaultRegion[];
  entrance: Cell;
  exit: Cell;
}

export interface LevelGenerationOptions {
  cols: number;
  rows: number;
  braidFactor: number;
  lockCount: number;
  maxAttempts?: number;
}

/**
 * Generates a maze and validates it's solvable before returning it, retrying with a fresh seed
 * on the rare failure rather than attempting to repair a bad layout in place - the state space
 * is small so retries are cheap, and this is far simpler to reason about than repair logic.
 * Falls back to a lock-free maze (always solvable, since the base spanning tree always is) if
 * every attempt somehow fails, so this function can never return an unsolvable level.
 */
export function generateLevel(seed: number, options: LevelGenerationOptions): GeneratedLevel {
  const { cols, rows, braidFactor, lockCount, maxAttempts = 10 } = options;
  const entrance: Cell = { x: 0, y: 0 };
  // Keeps the exit from ever landing suspiciously close to the entrance while still allowing
  // anywhere else on the grid, rather than always the far corner.
  const minExitDistance = Math.floor((cols + rows) / 2);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = new Rng(seed + attempt);
    const exit = pickFarCell(cols, rows, entrance, minExitDistance, rng);
    const graph = generateBaseMaze(cols, rows, rng, entrance);
    braidMaze(graph, braidFactor, rng);
    const { doors, keys, vaults } = placeLocks(graph, lockCount, rng, entrance, exit, new Set([cellKey(exit)]));

    if (validateSolvable(graph, doors, keys, entrance, exit)) {
      return { graph, grid: rasterizeMaze(graph), doors, keys, vaults, entrance, exit };
    }
  }

  const rng = new Rng(seed);
  const exit = pickFarCell(cols, rows, entrance, minExitDistance, rng);
  const graph = generateBaseMaze(cols, rows, rng, entrance);
  braidMaze(graph, braidFactor, rng);
  return { graph, grid: rasterizeMaze(graph), doors: [], keys: [], vaults: [], entrance, exit };
}
