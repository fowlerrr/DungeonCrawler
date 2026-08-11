import { buildAdjacency, makeEmptyGraph, type MazeGraph } from "./graph";
import type { Rng } from "./rng";
import { cellKey, type Cell } from "./types";

/**
 * Randomized DFS ("recursive backtracker"), implemented iteratively with an explicit stack.
 * Carves a spanning tree over every cell - by construction this is a "perfect maze": exactly
 * one path between any two cells, so it's trivially fully connected before any loops/locks
 * are added later.
 */
export function generateBaseMaze(cols: number, rows: number, rng: Rng, start: Cell = { x: 0, y: 0 }): MazeGraph {
  const graph = makeEmptyGraph(cols, rows);
  const adjacency = buildAdjacency(graph);

  const visited = new Set<string>([cellKey(start)]);
  const stack: Cell[] = [start];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const candidates = (adjacency.get(cellKey(current)) ?? []).filter((entry) => !visited.has(cellKey(entry.other)));

    if (candidates.length === 0) {
      stack.pop();
      continue;
    }

    const chosen = rng.pick(candidates);
    chosen.edge.open = true;
    visited.add(cellKey(chosen.other));
    stack.push(chosen.other);
  }

  return graph;
}
