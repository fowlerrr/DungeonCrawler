import { edgeKey, findBridges, reachableCells, type MazeGraph } from "./graph";
import type { Rng } from "./rng";
import { cellKey, type Cell } from "./types";

// Needs at least as many entries as LevelConfig's lockCount can ever reach (currently capped at
// 10) - reusing a color for two different doors/keys in the same level meant a held key could
// visually match a door (same color) without actually being that door's key (different id),
// which read as "I have the red key but this red door won't open."
export const DOOR_COLORS = ["red", "blue", "green", "yellow", "purple", "orange", "cyan", "pink", "teal", "brown"] as const;
export type DoorColor = (typeof DOOR_COLORS)[number];

/** Small pockets of cells with no route in or out except through one locked door - see
 * placeLocks. GameScene uses these to place bonus loot and keep them out of the normal
 * monster/chest spawn pool. */
export interface VaultRegion {
  doorId: string;
  cells: Cell[];
}

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
  vaults: VaultRegion[];
}

/** Cap on how many cells a single locked-off vault can contain - keeps them feeling like small
 * side rooms rather than gating off a large chunk of the maze. */
const MAX_VAULT_SIZE = 4;

/**
 * Locks real bridge edges - each chosen edge is the *only* route to some small pocket of cells,
 * so the lock is a genuine gate, not a bypassable decoration. What keeps this safe (no key ever
 * stranded behind a lock) is that every locked-off pocket is required to be a dead end: it can
 * never contain the exit, another door's key, or overlap a previously chosen vault. Nothing of
 * value is placed inside besides the vault's own bonus loot (see GameScene), so no other lock or
 * the exit ever depends on getting through one - validateSolvable still runs as a final safety
 * net regardless.
 */
export function placeLocks(
  graph: MazeGraph,
  targetLockCount: number,
  rng: Rng,
  entrance: Cell,
  exit: Cell,
  excludedCells: ReadonlySet<string> = new Set(),
): LockPlacementResult {
  const bridges = findBridges(graph, entrance);
  const pool = graph.edges.filter((e) => e.open && bridges.has(edgeKey(e.a, e.b)));

  const doors: DoorInstance[] = [];
  const keys: KeyPlacement[] = [];
  const vaults: VaultRegion[] = [];
  const claimedCells = new Set<string>([cellKey(entrance), cellKey(exit), ...excludedCells]);

  while (doors.length < targetLockCount && pool.length > 0) {
    const idx = rng.nextInt(pool.length);
    const [edge] = pool.splice(idx, 1);
    const ek = edgeKey(edge.a, edge.b);

    const reachableFromEntrance = reachableCells(graph, entrance, new Set([ek]));
    const vaultCells: Cell[] = [];
    for (let y = 0; y < graph.rows; y++) {
      for (let x = 0; x < graph.cols; x++) {
        const c = { x, y };
        if (!reachableFromEntrance.has(cellKey(c))) vaultCells.push(c);
      }
    }

    if (vaultCells.length === 0 || vaultCells.length > MAX_VAULT_SIZE) continue;
    if (vaultCells.some((c) => claimedCells.has(cellKey(c)))) continue;

    const doorId = `door_${doors.length}`;
    doors.push({ id: doorId, edgeKey: ek, a: edge.a, b: edge.b, color: DOOR_COLORS[doors.length % DOOR_COLORS.length] });
    vaults.push({ doorId, cells: vaultCells });
    for (const c of vaultCells) claimedCells.add(cellKey(c));
  }

  const floorCells: Cell[] = [];
  for (let y = 0; y < graph.rows; y++) {
    for (let x = 0; x < graph.cols; x++) {
      const c = { x, y };
      if (!claimedCells.has(cellKey(c))) floorCells.push(c);
    }
  }

  for (const door of doors) {
    if (floorCells.length === 0) break;
    const idx = rng.nextInt(floorCells.length);
    const [cell] = floorCells.splice(idx, 1);
    claimedCells.add(cellKey(cell));
    keys.push({ doorId: door.id, cell, color: door.color });
  }

  return { doors, keys, vaults };
}
