import { cellKey, type Cell } from "./types";

export interface MazeEdge {
  a: Cell;
  b: Cell;
  open: boolean;
}

export interface MazeGraph {
  cols: number;
  rows: number;
  edges: MazeEdge[];
}

export function edgeKey(a: Cell, b: Cell): string {
  // Canonical regardless of direction, so both traversal orders map to the same edge.
  const ak = cellKey(a);
  const bk = cellKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

/** Builds a graph with every orthogonally-adjacent cell pair present as a closed edge. */
export function makeEmptyGraph(cols: number, rows: number): MazeGraph {
  const edges: MazeEdge[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x + 1 < cols) edges.push({ a: { x, y }, b: { x: x + 1, y }, open: false });
      if (y + 1 < rows) edges.push({ a: { x, y }, b: { x, y: y + 1 }, open: false });
    }
  }
  return { cols, rows, edges };
}

interface AdjacencyEntry {
  edge: MazeEdge;
  other: Cell;
}

/** cellKey -> every edge touching that cell (both open and closed), each with the neighbor cell. */
export function buildAdjacency(graph: MazeGraph): Map<string, AdjacencyEntry[]> {
  const map = new Map<string, AdjacencyEntry[]>();
  const add = (from: Cell, to: Cell, edge: MazeEdge) => {
    const k = cellKey(from);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push({ edge, other: to });
  };
  for (const edge of graph.edges) {
    add(edge.a, edge.b, edge);
    add(edge.b, edge.a, edge);
  }
  return map;
}

/**
 * Same as buildAdjacency but only includes currently-open edges - i.e. the traversable graph.
 * `excluded` lets callers pretend a set of edges (by edgeKey) is closed, without mutating the
 * graph - used to test "is the maze still fully connected if these locks were removed?".
 */
export function buildOpenAdjacency(graph: MazeGraph, excluded?: ReadonlySet<string>): Map<string, AdjacencyEntry[]> {
  const map = new Map<string, AdjacencyEntry[]>();
  const add = (from: Cell, to: Cell, edge: MazeEdge) => {
    const k = cellKey(from);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push({ edge, other: to });
  };
  for (const edge of graph.edges) {
    if (!edge.open) continue;
    if (excluded?.has(edgeKey(edge.a, edge.b))) continue;
    add(edge.a, edge.b, edge);
    add(edge.b, edge.a, edge);
  }
  return map;
}

/**
 * BFS over the currently-open edges from `start`, treating any edge in `excluded` as closed -
 * the set of cells reachable without crossing one of them. Used to find what a bridge edge
 * actually gates: the cells unreachable from the entrance once that one edge is removed.
 */
export function reachableCells(graph: MazeGraph, start: Cell, excluded?: ReadonlySet<string>): Set<string> {
  const adjacency = buildOpenAdjacency(graph, excluded);
  const visited = new Set<string>([cellKey(start)]);
  const queue: Cell[] = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { other } of adjacency.get(cellKey(current)) ?? []) {
      const k = cellKey(other);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push(other);
      }
    }
  }
  return visited;
}

/**
 * Tarjan's bridge-finding algorithm over the currently-open edges of the maze graph.
 * A bridge is an edge whose removal would disconnect the graph - i.e. the sole route between
 * two regions. Non-bridge edges always have an alternate route and are safe to lock without
 * risking solvability. Assumes the open-edge graph is fully connected (true right after
 * generation, since the base maze is a spanning tree before braiding only adds edges).
 */
export function findBridges(graph: MazeGraph, start: Cell, excluded?: ReadonlySet<string>): Set<string> {
  const adjacency = buildOpenAdjacency(graph, excluded);
  const bridges = new Set<string>();
  const visited = new Set<string>();
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  let timer = 0;

  // Iterative DFS to avoid stack-depth issues on large mazes.
  type Frame = { u: string; parentEdge: string | null; iter: number };
  const stack: Frame[] = [{ u: cellKey(start), parentEdge: null, iter: 0 }];
  visited.add(cellKey(start));
  disc.set(cellKey(start), timer);
  low.set(cellKey(start), timer);
  timer++;

  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const neighbors = adjacency.get(frame.u) ?? [];

    if (frame.iter < neighbors.length) {
      const { edge, other } = neighbors[frame.iter];
      frame.iter++;
      const ek = edgeKey(edge.a, edge.b);
      if (ek === frame.parentEdge) continue;
      const v = cellKey(other);
      if (!visited.has(v)) {
        visited.add(v);
        disc.set(v, timer);
        low.set(v, timer);
        timer++;
        stack.push({ u: v, parentEdge: ek, iter: 0 });
      } else {
        low.set(frame.u, Math.min(low.get(frame.u)!, disc.get(v)!));
      }
    } else {
      stack.pop();
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        low.set(parent.u, Math.min(low.get(parent.u)!, low.get(frame.u)!));
        if (low.get(frame.u)! > disc.get(parent.u)!) {
          bridges.add(frame.parentEdge!);
        }
      }
    }
  }

  return bridges;
}
