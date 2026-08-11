import { describe, expect, it } from "vitest";
import { isTileOccupiedByMonster } from "../src/game/entities/occupancy";

function monster(x: number, y: number, isDead = false) {
  return { x, y, logic: { isDead } };
}

describe("isTileOccupiedByMonster", () => {
  it("is occupied when a live monster is within the radius of the tile center", () => {
    const monsters = [monster(100, 100)];
    expect(isTileOccupiedByMonster(105, 100, monsters, 20)).toBe(true);
  });

  it("is not occupied when the nearest monster is outside the radius", () => {
    const monsters = [monster(100, 100)];
    expect(isTileOccupiedByMonster(200, 100, monsters, 20)).toBe(false);
  });

  it("ignores dead monsters", () => {
    const monsters = [monster(100, 100, true)];
    expect(isTileOccupiedByMonster(100, 100, monsters, 20)).toBe(false);
  });

  it("is occupied if any monster in a mixed list is close enough", () => {
    const monsters = [monster(500, 500), monster(100, 100), monster(-500, -500, true)];
    expect(isTileOccupiedByMonster(100, 105, monsters, 20)).toBe(true);
  });

  it("is never occupied when there are no monsters", () => {
    expect(isTileOccupiedByMonster(0, 0, [], 20)).toBe(false);
  });
});
