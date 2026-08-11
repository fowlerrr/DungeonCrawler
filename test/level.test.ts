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
});
