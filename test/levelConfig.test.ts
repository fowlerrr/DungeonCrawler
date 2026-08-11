import { describe, expect, it } from "vitest";
import { getLevelConfig } from "../src/game/systems/LevelConfig";

describe("getLevelConfig", () => {
  it("scales difficulty and reward odds upward with level number", () => {
    const l1 = getLevelConfig(1);
    const l10 = getLevelConfig(10);

    expect(l10.monsterCount).toBeGreaterThan(l1.monsterCount);
    expect(l10.monsterHpMult).toBeGreaterThan(l1.monsterHpMult);
    expect(l10.monsterDamageMult).toBeGreaterThan(l1.monsterDamageMult);
    expect(l10.bossHpMult).toBeGreaterThan(l1.bossHpMult);
    expect(l10.chestCount).toBeGreaterThanOrEqual(l1.chestCount);
    expect(l10.rarityWeightBonus.legendary!).toBeGreaterThan(l1.rarityWeightBonus.legendary!);
  });

  it("clamps maze size and lock count so they never grow unbounded", () => {
    const veryLate = getLevelConfig(1000);
    expect(veryLate.mazeCols).toBeLessThanOrEqual(30);
    expect(veryLate.mazeRows).toBeLessThanOrEqual(24);
    expect(veryLate.lockCount).toBeLessThanOrEqual(10);
    expect(veryLate.braidFactor).toBeLessThanOrEqual(0.55);
  });

  it("treats level numbers below 1 as level 1", () => {
    expect(getLevelConfig(0)).toEqual(getLevelConfig(1));
    expect(getLevelConfig(-5)).toEqual(getLevelConfig(1));
  });
});
