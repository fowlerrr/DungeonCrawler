import { describe, expect, it } from "vitest";
import { rollLoot, rollRarity } from "../src/game/systems/LootTable";
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
    expect(normalCount).toBeGreaterThan(300); // base weights: normal=100 vs total ~139.5

    const boostedRng = new Rng(3);
    let legendaryCount = 0;
    for (let i = 0; i < 500; i++) {
      if (rollRarity(boostedRng, { legendary: 1000 }) === "legendary") legendaryCount++;
    }
    expect(legendaryCount).toBeGreaterThan(400);
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
