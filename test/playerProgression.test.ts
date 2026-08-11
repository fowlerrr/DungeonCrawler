import { describe, expect, it } from "vitest";
import { getPlayerProgression } from "../src/game/systems/PlayerProgression";

describe("getPlayerProgression", () => {
  it("grants no bonuses when no level has been completed yet", () => {
    expect(getPlayerProgression(1)).toEqual({ bonusHp: 0, bonusDamage: 0, bonusDefense: 0 });
  });

  it("grants +1 damage and +1 defense per completed level", () => {
    expect(getPlayerProgression(4)).toMatchObject({ bonusDamage: 3, bonusDefense: 3 });
  });

  it("grants +5 HP for every 5 completed levels, rounding down", () => {
    expect(getPlayerProgression(6)).toMatchObject({ bonusHp: 5 }); // 5 completed -> +5
    expect(getPlayerProgression(10)).toMatchObject({ bonusHp: 5 }); // 9 completed -> still +5
    expect(getPlayerProgression(11)).toMatchObject({ bonusHp: 10 }); // 10 completed -> +10
  });

  it("never goes negative even if given a value below 1", () => {
    expect(getPlayerProgression(0)).toEqual({ bonusHp: 0, bonusDamage: 0, bonusDefense: 0 });
  });
});
