import { braidMaze } from "./braiding";
import { generateBaseMaze } from "./generator";
import { placeLocks, type DoorInstance, type KeyPlacement, type VaultRegion } from "./locks";
import { pickFarCell } from "./placement";
import { rasterizeMaze } from "./raster";
import { Rng } from "./rng";
import { cellKey, type Cell, type TileGrid } from "./types";
import { buildOpenAdjacency, type MazeGraph } from "./graph";
import { validateSolvable } from "./validator";

export interface GeneratedLevel {
  graph: MazeGraph;
  grid: TileGrid;
  doors: DoorInstance[];
  keys: KeyPlacement[];
  vaults: VaultRegion[];
  entrance: Cell;
  exit: Cell;
  /** Where the boss actually stands - a cell adjacent to the exit, not the exit cell itself, so
   * beating the boss and grabbing its key-drop doesn't leave the player already standing on the
   * exit trigger. Falls back to the exit cell only in the impossible case of an isolated exit. */
  bossCell: Cell;
}

/** A cell reachable from `cell` via one open edge - used to place the boss a step away from the
 * exit rather than directly on top of it. Picks deterministically (first match in edge order)
 * rather than randomly; which neighbor doesn't need extra variety since the exit cell itself is
 * already randomized per level. */
function findAdjacentCell(graph: MazeGraph, cell: Cell): Cell | undefined {
  const neighbors = buildOpenAdjacency(graph).get(cellKey(cell));
  return neighbors && neighbors.length > 0 ? neighbors[0].other : undefined;
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
      const bossCell = findAdjacentCell(graph, exit) ?? exit;
      return { graph, grid: rasterizeMaze(graph), doors, keys, vaults, entrance, exit, bossCell };
    }
  }

  const rng = new Rng(seed);
  const exit = pickFarCell(cols, rows, entrance, minExitDistance, rng);
  const graph = generateBaseMaze(cols, rows, rng, entrance);
  braidMaze(graph, braidFactor, rng);
  const bossCell = findAdjacentCell(graph, exit) ?? exit;
  return { graph, grid: rasterizeMaze(graph), doors: [], keys: [], vaults: [], entrance, exit, bossCell };
}
