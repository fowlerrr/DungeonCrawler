import type { MazeGraph } from "./graph";
import type { Rng } from "./rng";

/**
 * Opens a fraction of the still-closed edges to turn the perfect maze into one with loops
 * ("braiding"). Every closed edge connects two cells that are already reachable via the
 * spanning tree the generator built, so opening any subset of them can never disconnect
 * anything - this is what makes it safe to lock some of these edges later without risking
 * solvability.
 */
export function braidMaze(graph: MazeGraph, braidFactor: number, rng: Rng): void {
  for (const edge of graph.edges) {
    if (!edge.open && rng.next() < braidFactor) {
      edge.open = true;
    }
  }
}
