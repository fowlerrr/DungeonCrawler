import { braidMaze } from "./braiding";
import { generateBaseMaze } from "./generator";
import { placeLocks, type DoorInstance, type KeyPlacement, type VaultRegion } from "./locks";
import { pickFarCell } from "./placement";
import { rasterizeMaze } from "./raster";
import { Rng } from "./rng";
import { cellKey, type Cell, type TileGrid } from "./types";
import { buildOpenAdjacency, type MazeGraph } from "./graph";
import { validateSolvable } from "./validator";

// A single hop reliably read as an instant win in practice: the boss's key drop lands right next
// to where the player is already standing (they just killed it in melee/ranged range), so one
// more step through an adjacent exit felt indistinguishable from the exit triggering on the kill
// itself. Requiring a real multi-tile walk back makes that gap actually readable as a gap.
const BOSS_DISTANCE_HOPS = 5;

export interface GeneratedLevel {
  graph: MazeGraph;
  grid: TileGrid;
  doors: DoorInstance[];
  keys: KeyPlacement[];
  vaults: VaultRegion[];
  entrance: Cell;
  exit: Cell;
  /** Where the boss actually stands - several open-edge hops from the exit (see
   * BOSS_DISTANCE_HOPS), never the exit cell itself, so beating the boss requires an actual walk
   * back rather than reading as an instant win. Falls back to the exit cell only in the
   * impossible case of an isolated exit. */
  bossCell: Cell;
}

/** BFS from `exit` over open edges (the same traversable graph used elsewhere for reachability,
 * so this never lands on a cell the player couldn't otherwise get to), returning whichever cell
 * is farthest away within `maxHops` steps - used to place the boss a real walk from the exit
 * rather than one step away. Falls back toward closer cells in a maze too small to reach the cap,
 * and to `exit` itself only in the degenerate case of an isolated exit cell. */
function findBossCell(graph: MazeGraph, exit: Cell, maxHops: number): Cell {
  const adjacency = buildOpenAdjacency(graph);
  const visited = new Set<string>([cellKey(exit)]);
  const queue: Array<{ cell: Cell; hops: number }> = [{ cell: exit, hops: 0 }];
  let farthest: { cell: Cell; hops: number } = { cell: exit, hops: 0 };

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.hops >= maxHops) continue;
    for (const { other } of adjacency.get(cellKey(current.cell)) ?? []) {
      const key = cellKey(other);
      if (visited.has(key)) continue;
      visited.add(key);
      const entry = { cell: other, hops: current.hops + 1 };
      queue.push(entry);
      if (entry.hops > farthest.hops) farthest = entry;
    }
  }
  return farthest.cell;
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
      const bossCell = findBossCell(graph, exit, BOSS_DISTANCE_HOPS);
      return { graph, grid: rasterizeMaze(graph), doors, keys, vaults, entrance, exit, bossCell };
    }
  }

  const rng = new Rng(seed);
  const exit = pickFarCell(cols, rows, entrance, minExitDistance, rng);
  const graph = generateBaseMaze(cols, rows, rng, entrance);
  braidMaze(graph, braidFactor, rng);
  const bossCell = findBossCell(graph, exit, BOSS_DISTANCE_HOPS);
  return { graph, grid: rasterizeMaze(graph), doors: [], keys: [], vaults: [], entrance, exit, bossCell };
}
