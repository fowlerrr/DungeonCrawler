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

  it("places the boss a step away from the exit, never on the exit cell itself", () => {
    for (const seed of [1, 2, 3, 4, 5, 100, 999]) {
      const level = generateLevel(seed, { cols: 12, rows: 10, braidFactor: 0.3, lockCount: 4 });
      expect(level.bossCell).not.toEqual(level.exit);

      // The boss cell must actually be reachable from the exit via one open edge (a real
      // adjacent cell, not just "somewhere else").
      const touchesExit = level.graph.edges.some(
        (e) =>
          e.open &&
          ((e.a.x === level.exit.x && e.a.y === level.exit.y && e.b.x === level.bossCell.x && e.b.y === level.bossCell.y) ||
            (e.b.x === level.exit.x && e.b.y === level.exit.y && e.a.x === level.bossCell.x && e.a.y === level.bossCell.y)),
      );
      expect(touchesExit).toBe(true);
    }
  });
});
