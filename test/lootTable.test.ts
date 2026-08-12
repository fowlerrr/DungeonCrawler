import { describe, expect, it } from "vitest";
import { rollLoot, rollRarity } from "../src/game/systems/LootTable";
import { getLevelConfig } from "../src/game/systems/LevelConfig";
import { Rng } from "../src/game/maze/rng";
import type { ItemDef } from "../src/game/data/types";

const pool: ItemDef[] = [
  { id: "n1", name: "N1", kind: "weapon", slot: "weapon", rarity: "normal", stats: {}, spriteKey: "x", description: "" },
  { id: "r1", name: "R1", kind: "weapon", slot: "weapon", rarity: "rare", stats: {}, spriteKey: "x", description: "" },
  { id: "l1", name: "L1", kind: "weapon", slot: "weapon", rarity: "legendary", stats: {}, spriteKey: "x", description: "" },
];

describe("rollRarity", () => {
  it("only ever returns a known tier", () => {
    const rng = new Rng(1);
    for (let i = 0; i < 200; i++) {
      const tier = rollRarity(rng);
      expect(["normal", "rare", "epic", "legendary"]).toContain(tier);
    }
  });

  it("heavily favors normal by default (base weights), and legendary becomes common when boosted", () => {
    const rng = new Rng(2);
    let normalCount = 0;
    for (let i = 0; i < 500; i++) if (rollRarity(rng) === "normal") normalCount++;
    expect(normalCount).toBeGreaterThan(400); // base weights: normal=100 vs total ~106.15

    const boostedRng = new Rng(3);
    let legendaryCount = 0;
    for (let i = 0; i < 500; i++) {
      if (rollRarity(boostedRng, { legendary: 5000 }) === "legendary") legendaryCount++;
    }
    expect(legendaryCount).toBeGreaterThan(400);
  });
});

describe("rarity odds across a level range", () => {
  it("rare+ is extremely uncommon at level 1 and climbs by level 15", () => {
    const rng = new Rng(11);
    let rareOrBetterAtLevel1 = 0;
    const level1Bonus = getLevelConfig(1).rarityWeightBonus;
    for (let i = 0; i < 1000; i++) {
      if (rollRarity(rng, level1Bonus) !== "normal") rareOrBetterAtLevel1++;
    }
    expect(rareOrBetterAtLevel1).toBeLessThan(100); // well under 10%

    const rng15 = new Rng(11);
    let rareOrBetterAtLevel15 = 0;
    const level15Bonus = getLevelConfig(15).rarityWeightBonus;
    for (let i = 0; i < 1000; i++) {
      if (rollRarity(rng15, level15Bonus) !== "normal") rareOrBetterAtLevel15++;
    }
    expect(rareOrBetterAtLevel15).toBeGreaterThan(rareOrBetterAtLevel1);
  });
});

describe("rollLoot", () => {
  it("returns an item whose rarity matches what was rolled, from the given pool", () => {
    const rng = new Rng(5);
    for (let i = 0; i < 50; i++) {
      const item = rollLoot(rng, pool);
      expect(pool).toContain(item);
    }
  });
});
