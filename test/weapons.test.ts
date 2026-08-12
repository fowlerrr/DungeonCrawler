import { describe, expect, it } from "vitest";
import { WEAPONS } from "../src/game/data/weapons";
import { RARITY_TIERS } from "../src/game/data/rarity";
import type { RarityTier } from "../src/game/data/types";

const RARITY_ORDER: RarityTier[] = RARITY_TIERS.map((t) => t.tier);

/** A weapon reads as "ranged" once it clears melee reach by a comfortable margin - keeps this
 * independent of any specific range value so it doesn't need updating every time weapons.ts does. */
const MELEE_RANGE_CEILING = 70;

describe("weapon range progression", () => {
  it("every ranged weapon's range grows with rarity tier, tier-over-tier", () => {
    const rangedByTier = new Map<RarityTier, number[]>();
    for (const weapon of WEAPONS) {
      const range = weapon.stats.range ?? 0;
      if (range <= MELEE_RANGE_CEILING) continue;
      const list = rangedByTier.get(weapon.rarity) ?? [];
      list.push(range);
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
      const range = weapon.stats.range ?? 0;
      const isRanged = range > MELEE_RANGE_CEILING;
      if (!isRanged) {
        expect(range).toBeGreaterThan(0);
        expect(range).toBeLessThanOrEqual(MELEE_RANGE_CEILING);
      }
    }
  });
});
