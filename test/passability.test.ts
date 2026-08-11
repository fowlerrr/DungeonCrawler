import { describe, expect, it } from "vitest";
import { isTilePassable } from "../src/game/maze/passability";
import { TileType, type TileGrid } from "../src/game/maze/types";

const F = TileType.Floor;
const W = TileType.Wall;

const grid: TileGrid = [
  [W, W, W],
  [W, F, F],
  [W, W, W],
];

describe("isTilePassable", () => {
  it("allows stepping onto an open floor tile", () => {
    expect(isTilePassable(grid, 2, 1, new Set())).toBe(true);
  });

  it("blocks a wall tile", () => {
    expect(isTilePassable(grid, 0, 0, new Set())).toBe(false);
  });

  it("blocks anything outside the grid", () => {
    expect(isTilePassable(grid, -1, 1, new Set())).toBe(false);
    expect(isTilePassable(grid, 5, 1, new Set())).toBe(false);
    expect(isTilePassable(grid, 1, -1, new Set())).toBe(false);
    expect(isTilePassable(grid, 1, 5, new Set())).toBe(false);
  });

  it("blocks a floor tile currently occupied by a locked door", () => {
    expect(isTilePassable(grid, 1, 1, new Set(["1,1"]))).toBe(false);
  });

  it("allows the tile again once its door is no longer in the blocked set (opened)", () => {
    expect(isTilePassable(grid, 1, 1, new Set())).toBe(true);
  });
});
