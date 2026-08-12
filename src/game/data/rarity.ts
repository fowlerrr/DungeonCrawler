import type { RarityConfig, RarityTier } from "./types";

/** Add a new tier by adding one entry here - LootTable and the UI both read this list, no
 * other code changes needed. Order matters only for display; weights drive drop odds. */
// Base weights are deliberately very low for anything above normal - these are the level-1
// odds (before LevelConfig's rarityWeightBonus scales them up with level), and the ask was for
// rare+ to feel extremely rare at the start of a run rather than merely uncommon.
export const RARITY_TIERS: RarityConfig[] = [
  { tier: "normal", color: "#cbd5e1", statMultiplier: 1.0, baseDropWeight: 100 },
  { tier: "rare", color: "#4ea8ff", statMultiplier: 1.3, baseDropWeight: 5 },
  { tier: "epic", color: "#b35eff", statMultiplier: 1.7, baseDropWeight: 1 },
  { tier: "legendary", color: "#ffb347", statMultiplier: 2.2, baseDropWeight: 0.15 },
];

export function getRarityConfig(tier: RarityTier): RarityConfig {
  const config = RARITY_TIERS.find((r) => r.tier === tier);
  if (!config) throw new Error(`Unknown rarity tier: ${tier}`);
  return config;
}
