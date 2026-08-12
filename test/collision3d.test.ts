import { describe, expect, it } from "vitest";
import { resolveCircleCollision, resolveWallCollision } from "../src/three/collision3d";
import { TileType, type TileGrid } from "../src/game/maze/types";
import { TILE_SIZE } from "../src/config/constants";

function gridFromRows(rows: string[]): TileGrid {
  return rows.map((row) => [...row].map((ch) => (ch === "#" ? TileType.Wall : TileType.Floor)));
}

describe("resolveWallCollision", () => {
  it("leaves a circle untouched when it isn't overlapping any wall", () => {
    const grid = gridFromRows(["###", "#.#", "###"]);
    const center = TILE_SIZE * 1.5;
    const result = resolveWallCollision(grid, center, center, TILE_SIZE * 0.3);
    expect(result.x).toBeCloseTo(center);
    expect(result.y).toBeCloseTo(center);
  });

  it("pushes a circle back out of a wall it has overlapped", () => {
    const grid = gridFromRows(["###", "#.#", "###"]);
    const radius = TILE_SIZE * 0.35;
    // Floor tile (1,1) spans [32,64); push the circle until it overlaps the wall tile at x<32.
    const x = TILE_SIZE + 5;
    const y = TILE_SIZE * 1.5;
    const result = resolveWallCollision(grid, x, y, radius);
    expect(result.x).toBeGreaterThanOrEqual(TILE_SIZE + radius - 1e-6);
    expect(result.y).toBeCloseTo(y);
  });

  it("resolves a corner overlap without producing NaN", () => {
    const grid = gridFromRows(["###", "#.#", "###"]);
    const radius = TILE_SIZE * 0.4;
    const result = resolveWallCollision(grid, TILE_SIZE + 1, TILE_SIZE + 1, radius);
    expect(Number.isNaN(result.x)).toBe(false);
    expect(Number.isNaN(result.y)).toBe(false);
  });
});

describe("resolveCircleCollision", () => {
  it("leaves circles untouched when they don't overlap", () => {
    const result = resolveCircleCollision(0, 0, 5, 100, 0, 5);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("pushes the mover directly away from a fixed obstacle along their shared axis", () => {
    const result = resolveCircleCollision(5, 0, 5, 0, 0, 5);
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(0);
  });

  it("never moves the fixed obstacle, only the mover", () => {
    const result = resolveCircleCollision(1, 1, 3, 0, 0, 3);
    const dist = Math.hypot(result.x, result.y);
    expect(dist).toBeCloseTo(6);
  });
});
