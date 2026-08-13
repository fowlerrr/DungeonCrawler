import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../src/config/constants";
import { hasLineOfSight, raycastDistance } from "../src/game/maze/lineOfSight";
import { TileType, type TileGrid } from "../src/game/maze/types";

const F = TileType.Floor;
const W = TileType.Wall;

function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

describe("hasLineOfSight", () => {
  it("sees clearly down an open corridor", () => {
    const grid: TileGrid = [[F, F, F, F, F]];
    const from = tileCenter(0, 0);
    const to = tileCenter(4, 0);
    expect(hasLineOfSight(grid, from.x, from.y, to.x, to.y)).toBe(true);
  });

  it("is blocked by a wall directly between the two points", () => {
    const grid: TileGrid = [[F, F, W, F, F]];
    const from = tileCenter(0, 0);
    const to = tileCenter(4, 0);
    expect(hasLineOfSight(grid, from.x, from.y, to.x, to.y)).toBe(false);
  });

  it("is blocked by a wall between two points on the same tile row, one step apart", () => {
    const grid: TileGrid = [[F, W, F]];
    const from = tileCenter(0, 0);
    const to = tileCenter(2, 0);
    expect(hasLineOfSight(grid, from.x, from.y, to.x, to.y)).toBe(false);
  });

  it("sees a diagonal path through an open room", () => {
    const grid: TileGrid = [
      [F, F, F, F],
      [F, F, F, F],
      [F, F, F, F],
      [F, F, F, F],
    ];
    const from = tileCenter(0, 0);
    const to = tileCenter(3, 3);
    expect(hasLineOfSight(grid, from.x, from.y, to.x, to.y)).toBe(true);
  });

  it("is blocked when a wall sits between two diagonal points", () => {
    const grid: TileGrid = [
      [F, F, F, F],
      [F, W, F, F],
      [F, F, W, F],
      [F, F, F, F],
    ];
    const from = tileCenter(0, 0);
    const to = tileCenter(3, 3);
    expect(hasLineOfSight(grid, from.x, from.y, to.x, to.y)).toBe(false);
  });

  it("treats the same point as having line of sight to itself", () => {
    const grid: TileGrid = [[F]];
    const { x, y } = tileCenter(0, 0);
    expect(hasLineOfSight(grid, x, y, x, y)).toBe(true);
  });
});

describe("raycastDistance", () => {
  it("travels the full distance down a clear corridor", () => {
    const grid: TileGrid = [[F, F, F, F, F]];
    const from = tileCenter(0, 0);
    const maxDistance = TILE_SIZE * 4;
    expect(raycastDistance(grid, from.x, from.y, 1, 0, maxDistance)).toBeCloseTo(maxDistance, 0);
  });

  it("stops short of a wall in the ray's path - a miss shouldn't fly through it", () => {
    const grid: TileGrid = [[F, F, W, F, F]];
    const from = tileCenter(0, 0);
    const maxDistance = TILE_SIZE * 4;
    const distance = raycastDistance(grid, from.x, from.y, 1, 0, maxDistance);
    // The wall tile starts at x = 2 * TILE_SIZE; the ray must stop at or before that boundary,
    // and clearly short of the requested max distance.
    expect(distance).toBeLessThanOrEqual(TILE_SIZE * 2);
    expect(distance).toBeLessThan(maxDistance);
  });

  it("stops almost immediately when a wall sits right next to the origin", () => {
    const grid: TileGrid = [[F, W]];
    const from = tileCenter(0, 0);
    const distance = raycastDistance(grid, from.x, from.y, 1, 0, TILE_SIZE * 2);
    expect(distance).toBeLessThan(TILE_SIZE);
  });

  it("stops short on a diagonal ray blocked by a wall", () => {
    const grid: TileGrid = [
      [F, F, F, F],
      [F, F, F, F],
      [F, F, W, F],
      [F, F, F, F],
    ];
    const from = tileCenter(0, 0);
    const maxDistance = Math.hypot(TILE_SIZE * 3, TILE_SIZE * 3);
    const distance = raycastDistance(grid, from.x, from.y, Math.SQRT1_2, Math.SQRT1_2, maxDistance);
    expect(distance).toBeLessThan(maxDistance);
  });

  it("never exceeds maxDistance even in a fully open grid", () => {
    const grid: TileGrid = [[F, F, F, F, F, F, F, F, F, F]];
    const from = tileCenter(0, 0);
    const maxDistance = TILE_SIZE * 3;
    expect(raycastDistance(grid, from.x, from.y, 1, 0, maxDistance)).toBeLessThanOrEqual(maxDistance);
  });
});
