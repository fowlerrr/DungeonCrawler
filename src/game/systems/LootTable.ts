import { RARITY_TIERS } from "../data/rarity";
import type { ItemDef, RarityTier } from "../data/types";
import type { Rng } from "../maze/rng";

export type RarityWeightBonus = Partial<Record<RarityTier, number>>;

/** Rolls a rarity tier, weighted by each tier's baseDropWeight (optionally scaled per-tier by
 * `weightBonus`, e.g. from LevelConfig shifting odds toward rarer tiers at higher levels). */
export function rollRarity(rng: Rng, weightBonus: RarityWeightBonus = {}): RarityTier {
  const weights = RARITY_TIERS.map((t) => t.baseDropWeight * (weightBonus[t.tier] ?? 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng.next() * total;
  for (let i = 0; i < RARITY_TIERS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RARITY_TIERS[i].tier;
  }
  return RARITY_TIERS[RARITY_TIERS.length - 1].tier;
}

/** Rolls a rarity tier, then a random item within that tier from `pool`. Falls back to any
 * item in the pool if that tier happens to be empty (e.g. a small starter catalog). */
export function rollLoot(rng: Rng, pool: readonly ItemDef[], weightBonus: RarityWeightBonus = {}): ItemDef {
  const tier = rollRarity(rng, weightBonus);
  const candidates = pool.filter((item) => item.rarity === tier);
  return rng.pick(candidates.length > 0 ? candidates : pool);
}

const VAULT_RARITY_MULTIPLIER = 1.5;

/** A locked vault's chest rolls slightly better odds than a regular one, on top of whatever
 * LevelConfig already grants for the current level - the reward for bothering to find the key. */
export function boostForVault(weightBonus: RarityWeightBonus): RarityWeightBonus {
  return {
    ...weightBonus,
    rare: (weightBonus.rare ?? 1) * VAULT_RARITY_MULTIPLIER,
    epic: (weightBonus.epic ?? 1) * VAULT_RARITY_MULTIPLIER,
    legendary: (weightBonus.legendary ?? 1) * VAULT_RARITY_MULTIPLIER,
  };
}
