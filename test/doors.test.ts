import { describe, expect, it } from "vitest";
import { findBlockingDoorAt } from "../src/game/entities/doors";

function door(tileX: number, tileY: number, doorId: string, active = true) {
  return { tileX, tileY, doorId, active };
}

describe("findBlockingDoorAt", () => {
  it("finds an active door at the given tile", () => {
    const doors = [door(3, 4, "red")];
    expect(findBlockingDoorAt(doors, 3, 4)?.doorId).toBe("red");
  });

  it("returns undefined when no door occupies the tile", () => {
    const doors = [door(3, 4, "red")];
    expect(findBlockingDoorAt(doors, 0, 0)).toBeUndefined();
  });

  it("ignores doors that are no longer active (already opened)", () => {
    const doors = [door(3, 4, "red", false)];
    expect(findBlockingDoorAt(doors, 3, 4)).toBeUndefined();
  });

  it("picks the right door out of a mixed list", () => {
    const doors = [door(1, 1, "blue"), door(3, 4, "red"), door(9, 9, "green", false)];
    expect(findBlockingDoorAt(doors, 3, 4)?.doorId).toBe("red");
  });
});
