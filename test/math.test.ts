import { describe, expect, it } from "vitest";
import { computeMinimapTileSize, normalize } from "../src/game/util/math";

describe("normalize", () => {
  it("returns a zero vector for zero input", () => {
    expect(normalize(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("returns a unit-length vector preserving direction", () => {
    const { x, y } = normalize(3, 4);
    expect(Math.hypot(x, y)).toBeCloseTo(1);
    expect(x / y).toBeCloseTo(3 / 4);
  });

  it("normalizes an already-unit vector to itself", () => {
    expect(normalize(1, 0)).toEqual({ x: 1, y: 0 });
  });
});

describe("computeMinimapTileSize", () => {
  it("uses the max tile size when the grid comfortably fits", () => {
    expect(computeMinimapTileSize(10, 200, 4)).toBe(4);
  });

  it("shrinks the tile size so a wide grid still fits the available width", () => {
    // 100 tiles into 200px can only afford 2px/tile even though max is 4px.
    expect(computeMinimapTileSize(100, 200, 4)).toBe(2);
  });

  it("never returns less than 1px even for an enormous grid", () => {
    expect(computeMinimapTileSize(10000, 200, 4)).toBe(1);
  });

  it("treats a non-positive grid width as a no-op (falls back to max tile size)", () => {
    expect(computeMinimapTileSize(0, 200, 4)).toBe(4);
  });
});
