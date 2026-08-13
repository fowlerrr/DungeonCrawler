import { buildOpenAdjacency, edgeKey, type MazeGraph } from "./graph";
import type { DoorInstance, KeyPlacement } from "./locks";
import { cellKey, type Cell } from "./types";

/** Turns a (cell, held keys) pair into a single string key, so the BFS below can track "have I
 * already visited this cell with this exact set of keys" instead of just "have I visited this
 * cell" - the same cell can be worth revisiting once you're holding a key you didn't have
 * before, since that might open a previously-locked route. */
function stateKey(cell: Cell, heldDoorIds: readonly string[]): string {
  return `${cellKey(cell)}|${[...heldDoorIds].sort().join(",")}`;
}

/**
 * Independent safety net, run after generation regardless of how carefully locks were placed:
 * a BFS over (cell, set of collected door keys) from the entrance. A locked edge is only
 * traversable once its specific key has been collected. Returns true iff the exit is reachable
 * in some reached state. Small state space (cells * 2^numLocks, numLocks capped low) so this is
 * cheap enough to run every level and simply regenerate on the rare failure.
 */
export function validateSolvable(
  graph: MazeGraph,
  doors: readonly DoorInstance[],
  keys: readonly KeyPlacement[],
  entrance: Cell,
  exit: Cell,
): boolean {
  const doorByEdge = new Map(doors.map((d) => [d.edgeKey, d]));
  const keyDoorIdByCell = new Map(keys.map((k) => [cellKey(k.cell), k.doorId]));
  const adjacency = buildOpenAdjacency(graph);

  const startKeys: string[] = [];
  const start = { cell: entrance, keys: startKeys };
  const visited = new Set<string>([stateKey(entrance, startKeys)]);
  const queue: { cell: Cell; keys: string[] }[] = [start];

  while (queue.length > 0) {
    const { cell, keys: heldKeys } = queue.shift()!;

    if (cell.x === exit.x && cell.y === exit.y) return true;

    const doorIdHere = keyDoorIdByCell.get(cellKey(cell));
    const currentKeys = doorIdHere && !heldKeys.includes(doorIdHere) ? [...heldKeys, doorIdHere] : heldKeys;

    for (const { edge, other } of adjacency.get(cellKey(cell)) ?? []) {
      const door = doorByEdge.get(edgeKey(edge.a, edge.b));
      if (door && !currentKeys.includes(door.id)) continue;

      const nextState = stateKey(other, currentKeys);
      if (!visited.has(nextState)) {
        visited.add(nextState);
        queue.push({ cell: other, keys: currentKeys });
      }
    }
  }

  return false;
}
