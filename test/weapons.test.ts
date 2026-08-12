import { describe, expect, it } from "vitest";
import { WEAPONS } from "../src/game/data/weapons";
import { RARITY_TIERS } from "../src/game/data/rarity";
import type { RarityTier } from "../src/game/data/types";

const RARITY_ORDER: RarityTier[] = RARITY_TIERS.map((t) => t.tier);
const MELEE_RANGE_CEILING = 70;

describe("weapon range progression", () => {
  it("every ranged weapon's range grows with rarity tier, tier-over-tier", () => {
    const rangedByTier = new Map<RarityTier, number[]>();
    for (const weapon of WEAPONS) {
      if (!weapon.stats.ranged) continue;
      const list = rangedByTier.get(weapon.rarity) ?? [];
      list.push(weapon.stats.range ?? 0);
      rangedByTier.set(weapon.rarity, list);
    }

    const tiersWithRangedWeapons = RARITY_ORDER.filter((tier) => rangedByTier.has(tier));
    expect(tiersWithRangedWeapons.length).toBeGreaterThanOrEqual(3);

    for (let i = 1; i < tiersWithRangedWeapons.length; i++) {
      const prevTier = tiersWithRangedWeapons[i - 1];
      const tier = tiersWithRangedWeapons[i];
      const prevMax = Math.max(...rangedByTier.get(prevTier)!);
      const currentMax = Math.max(...rangedByTier.get(tier)!);
      expect(currentMax).toBeGreaterThan(prevMax);
    }
  });

  it("keeps melee weapons close-range regardless of rarity", () => {
    for (const weapon of WEAPONS) {
      if (weapon.stats.ranged) continue;
      const range = weapon.stats.range ?? 0;
      expect(range).toBeGreaterThan(0);
      expect(range).toBeLessThanOrEqual(MELEE_RANGE_CEILING);
    }
  });

  it("every weapon marked ranged actually has a range beyond melee reach", () => {
    for (const weapon of WEAPONS) {
      if (!weapon.stats.ranged) continue;
      expect(weapon.stats.range ?? 0).toBeGreaterThan(MELEE_RANGE_CEILING);
    }
  });
});
