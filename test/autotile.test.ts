import { describe, expect, it } from "vitest";
import { classifyFloorTile } from "../src/game/maze/autotile";
import { TileType, type TileGrid } from "../src/game/maze/types";

const F = TileType.Floor;
const W = TileType.Wall;

describe("classifyFloorTile", () => {
  it("is 'open' when every neighbor is floor", () => {
    const grid: TileGrid = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "open", rotationDeg: 0 });
  });

  it("is 'four' when every neighbor is wall", () => {
    const grid: TileGrid = [
      [W, W, W],
      [W, F, W],
      [W, W, W],
    ];
    expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "four", rotationDeg: 0 });
  });

  it("treats out-of-bounds neighbors as wall, same as 'four'", () => {
    const grid: TileGrid = [[F]];
    expect(classifyFloorTile(grid, 0, 0)).toEqual({ variant: "four", rotationDeg: 0 });
  });

  describe("single wall edge (edge1)", () => {
    const base: TileGrid = [
      [F, F, F],
      [F, F, F],
      [F, F, F],
    ];
    const withWallAt = (dx: number, dy: number): TileGrid => {
      const grid = base.map((row) => [...row]);
      grid[1 + dy][1 + dx] = W;
      return grid;
    };

    it("rotates 0deg for a wall to the east", () => {
      expect(classifyFloorTile(withWallAt(1, 0), 1, 1)).toEqual({ variant: "edge1", rotationDeg: 0 });
    });
    it("rotates 90deg for a wall to the south", () => {
      expect(classifyFloorTile(withWallAt(0, 1), 1, 1)).toEqual({ variant: "edge1", rotationDeg: 90 });
    });
    it("rotates 180deg for a wall to the west", () => {
      expect(classifyFloorTile(withWallAt(-1, 0), 1, 1)).toEqual({ variant: "edge1", rotationDeg: 180 });
    });
    it("rotates 270deg for a wall to the north", () => {
      expect(classifyFloorTile(withWallAt(0, -1), 1, 1)).toEqual({ variant: "edge1", rotationDeg: 270 });
    });
  });

  describe("opposite wall edges (edgeOpposite)", () => {
    it("rotates 0deg for walls east+west (a north-south corridor)", () => {
      const grid: TileGrid = [
        [F, F, F],
        [W, F, W],
        [F, F, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "edgeOpposite", rotationDeg: 0 });
    });

    it("rotates 90deg for walls north+south (an east-west corridor)", () => {
      const grid: TileGrid = [
        [F, W, F],
        [F, F, F],
        [F, W, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "edgeOpposite", rotationDeg: 90 });
    });
  });

  describe("adjacent wall edges / corner", () => {
    it("rotates 0deg for walls north+east", () => {
      const grid: TileGrid = [
        [F, W, F],
        [F, F, W],
        [F, F, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "corner", rotationDeg: 0 });
    });

    it("rotates 90deg for walls east+south", () => {
      const grid: TileGrid = [
        [F, F, F],
        [F, F, W],
        [F, W, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "corner", rotationDeg: 90 });
    });

    it("rotates 180deg for walls south+west", () => {
      const grid: TileGrid = [
        [F, F, F],
        [W, F, F],
        [F, W, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "corner", rotationDeg: 180 });
    });

    it("rotates 270deg for walls north+west", () => {
      const grid: TileGrid = [
        [F, W, F],
        [W, F, F],
        [F, F, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "corner", rotationDeg: 270 });
    });
  });

  describe("three wall edges", () => {
    it("rotates 0deg when only south is open (walls n, e, w)", () => {
      const grid: TileGrid = [
        [F, W, F],
        [W, F, W],
        [F, F, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "three", rotationDeg: 0 });
    });

    it("rotates 90deg when only west is open (walls n, e, s)", () => {
      const grid: TileGrid = [
        [F, W, F],
        [F, F, W],
        [F, W, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "three", rotationDeg: 90 });
    });

    it("rotates 180deg when only north is open (walls e, s, w)", () => {
      const grid: TileGrid = [
        [F, F, F],
        [W, F, W],
        [F, W, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "three", rotationDeg: 180 });
    });

    it("rotates 270deg when only east is open (walls n, s, w)", () => {
      const grid: TileGrid = [
        [F, W, F],
        [W, F, F],
        [F, W, F],
      ];
      expect(classifyFloorTile(grid, 1, 1)).toEqual({ variant: "three", rotationDeg: 270 });
    });
  });
});
