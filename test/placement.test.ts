import { describe, expect, it } from "vitest";
import { pickFarCell, pickRandomCells } from "../src/game/maze/placement";
import { Rng } from "../src/game/maze/rng";

describe("pickFarCell", () => {
  it("always picks a cell at least minDistance away when one exists", () => {
    const from = { x: 0, y: 0 };
    for (const seed of [1, 2, 3, 4, 5]) {
      const cell = pickFarCell(10, 8, from, 9, new Rng(seed));
      const distance = Math.abs(cell.x - from.x) + Math.abs(cell.y - from.y);
      expect(distance).toBeGreaterThanOrEqual(9);
    }
  });

  it("varies the result across seeds rather than always returning the same cell", () => {
    const from = { x: 0, y: 0 };
    const results = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const cell = pickFarCell(12, 10, from, 6, new Rng(seed));
      results.add(`${cell.x},${cell.y}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("falls back to the farthest available cell when nothing meets minDistance", () => {
    const cell = pickFarCell(2, 1, { x: 0, y: 0 }, 100, new Rng(1));
    expect(cell).toEqual({ x: 1, y: 0 });
  });

  it("stays within grid bounds", () => {
    for (const seed of [10, 20, 30]) {
      const cell = pickFarCell(6, 6, { x: 0, y: 0 }, 4, new Rng(seed));
      expect(cell.x).toBeGreaterThanOrEqual(0);
      expect(cell.x).toBeLessThan(6);
      expect(cell.y).toBeGreaterThanOrEqual(0);
      expect(cell.y).toBeLessThan(6);
    }
  });
});

describe("pickRandomCells", () => {
  it("never picks an excluded cell", () => {
    const excluded = new Set(["0,0", "1,1"]);
    const cells = pickRandomCells(3, 3, 9, new Rng(1), excluded);
    expect(cells.some((c) => c.x === 0 && c.y === 0)).toBe(false);
    expect(cells.some((c) => c.x === 1 && c.y === 1)).toBe(false);
  });
});
