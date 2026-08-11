import { describe, expect, it } from "vitest";
import { FogOfWar } from "../src/game/systems/FogOfWar";

describe("FogOfWar", () => {
  it("marks tiles within radius as visible and visited, and leaves the rest hidden", () => {
    const fog = new FogOfWar(10, 10);
    fog.update(5, 5, 2);

    expect(fog.isVisible(5, 5)).toBe(true);
    expect(fog.isVisible(6, 5)).toBe(true); // distance 1
    expect(fog.isVisible(7, 5)).toBe(true); // distance 2
    expect(fog.isVisible(8, 5)).toBe(false); // distance 3, outside radius
    expect(fog.isVisited(8, 5)).toBe(false);
  });

  it("keeps previously visible tiles as visited (but no longer visible) after moving away", () => {
    const fog = new FogOfWar(10, 10);
    fog.update(5, 5, 1);
    expect(fog.isVisible(5, 5)).toBe(true);

    fog.update(0, 0, 1);
    expect(fog.isVisible(5, 5)).toBe(false);
    expect(fog.isVisited(5, 5)).toBe(true);
  });

  it("clamps at grid edges without throwing", () => {
    const fog = new FogOfWar(5, 5);
    expect(() => fog.update(0, 0, 3)).not.toThrow();
    expect(fog.isVisible(0, 0)).toBe(true);
    expect(fog.isVisible(-1, -1)).toBe(false);
  });
});
