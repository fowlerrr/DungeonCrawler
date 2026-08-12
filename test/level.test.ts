import { describe, expect, it } from "vitest";
import { generateLevel } from "../src/game/maze/level";
import { validateSolvable } from "../src/game/maze/validator";

describe("generateLevel", () => {
  it("always returns a solvable level across many seeds and lock counts", () => {
    for (const seed of [1, 2, 3, 4, 5, 100, 999]) {
      for (const lockCount of [0, 1, 3, 6]) {
        const level = generateLevel(seed, { cols: 10, rows: 8, braidFactor: 0.35, lockCount });
        expect(validateSolvable(level.graph, level.doors, level.keys, level.entrance, level.exit)).toBe(true);
      }
    }
  });

  it("respects the requested maze dimensions", () => {
    const level = generateLevel(42, { cols: 12, rows: 9, braidFactor: 0.3, lockCount: 4 });
    expect(level.graph.cols).toBe(12);
    expect(level.graph.rows).toBe(9);
    expect(level.grid.length).toBe(9 * 2 + 1);
    expect(level.grid[0].length).toBe(12 * 2 + 1);
  });

  it("places the boss a real walk away from the exit, never on the exit cell itself", () => {
    for (const seed of [1, 2, 3, 4, 5, 100, 999]) {
      const level = generateLevel(seed, { cols: 12, rows: 10, braidFactor: 0.3, lockCount: 4 });
      expect(level.bossCell).not.toEqual(level.exit);

      // The boss cell must be reachable from the exit purely via open edges (a real path back,
      // not just "somewhere else" on the grid) - BFS the open-edge graph from the exit and
      // confirm the boss cell turns up.
      const adjacency = new Map<string, { x: number; y: number }[]>();
      for (const e of level.graph.edges) {
        if (!e.open) continue;
        const ak = `${e.a.x},${e.a.y}`;
        const bk = `${e.b.x},${e.b.y}`;
        if (!adjacency.has(ak)) adjacency.set(ak, []);
        if (!adjacency.has(bk)) adjacency.set(bk, []);
        adjacency.get(ak)!.push(e.b);
        adjacency.get(bk)!.push(e.a);
      }
      const visited = new Set<string>([`${level.exit.x},${level.exit.y}`]);
      const queue = [level.exit];
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const other of adjacency.get(`${current.x},${current.y}`) ?? []) {
          const key = `${other.x},${other.y}`;
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push(other);
        }
      }
      expect(visited.has(`${level.bossCell.x},${level.bossCell.y}`)).toBe(true);
    }
  });
});
