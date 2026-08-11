import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../src/config/constants";
import { hasLineOfSight } from "../src/game/maze/lineOfSight";
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
