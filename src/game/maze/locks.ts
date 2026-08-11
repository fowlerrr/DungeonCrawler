import { edgeKey, findBridges, type MazeGraph } from "./graph";
import type { Rng } from "./rng";
import { cellKey, type Cell } from "./types";

export const DOOR_COLORS = ["red", "blue", "green", "yellow"] as const;
export type DoorColor = (typeof DOOR_COLORS)[number];

export interface DoorInstance {
  id: string;
  edgeKey: string;
  /** The two cells this door's edge connects, for placing/rendering it. */
  a: Cell;
  b: Cell;
  color: DoorColor;
}

export interface KeyPlacement {
  /** Matches the DoorInstance this key opens - one key per door, consumed on use. */
  doorId: string;
  cell: Cell;
  color: DoorColor;
}

export interface LockPlacementResult {
  doors: DoorInstance[];
  keys: KeyPlacement[];
}

/**
 * Picks lock-worthy edges one at a time, only ever choosing an edge that is currently a
 * non-bridge in the graph with every previously-chosen lock also treated as removed. That
 * invariant is maintained inductively: the graph starts fully connected (guaranteed by the
 * generator), and removing a non-bridge edge can never disconnect it - so after every pick the
 * graph-minus-all-chosen-locks is still guaranteed fully connected. Locked doors end up as
 * optional shortcuts rather than mandatory gates: the player can always reach the exit and
 * every key without needing any key at all, which is what makes "no key ever locked behind a
 * door" true by construction rather than by luck. Bridge-based mandatory gating (locking the
 * sole route into a region) is a deliberately deferred v2 enhancement - see build plan.
 */
export function placeLocks(
  graph: MazeGraph,
  targetLockCount: number,
  rng: Rng,
  entrance: Cell,
  excludedCells: ReadonlySet<string> = new Set(),
): LockPlacementResult {
  const lockedEdgeKeys = new Set<string>();
  const chosenEdges: { a: Cell; b: Cell; key: string }[] = [];

  for (let i = 0; i < targetLockCount; i++) {
    const bridges = findBridges(graph, entrance, lockedEdgeKeys);
    const candidates = graph.edges.filter((e) => {
      if (!e.open) return false;
      const ek = edgeKey(e.a, e.b);
      return !lockedEdgeKeys.has(ek) && !bridges.has(ek);
    });
    if (candidates.length === 0) break; // no more edges can be safely locked

    const chosen = rng.pick(candidates);
    const ek = edgeKey(chosen.a, chosen.b);
    lockedEdgeKeys.add(ek);
    chosen.lockId = `door_${chosenEdges.length}`;
    chosenEdges.push({ a: chosen.a, b: chosen.b, key: ek });
  }

  const doors: DoorInstance[] = chosenEdges.map((edge, i) => ({
    id: `door_${i}`,
    edgeKey: edge.key,
    a: edge.a,
    b: edge.b,
    color: DOOR_COLORS[i % DOOR_COLORS.length],
  }));

  const usedCells = new Set<string>(excludedCells);
  usedCells.add(cellKey(entrance));
  const floorCells: Cell[] = [];
  for (let y = 0; y < graph.rows; y++) {
    for (let x = 0; x < graph.cols; x++) {
      const c = { x, y };
      if (!usedCells.has(cellKey(c))) floorCells.push(c);
    }
  }

  const keys: KeyPlacement[] = [];
  for (const door of doors) {
    if (floorCells.length === 0) break;
    const idx = rng.nextInt(floorCells.length);
    const [cell] = floorCells.splice(idx, 1);
    usedCells.add(cellKey(cell));
    keys.push({ doorId: door.id, cell, color: door.color });
  }

  return { doors, keys };
}
