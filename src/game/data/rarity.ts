import type { RarityConfig, RarityTier } from "./types";

/** Add a new tier by adding one entry here - LootTable and the UI both read this list, no
 * other code changes needed. Order matters only for display; weights drive drop odds. */
// epic/legendary weights lowered after feedback that legendaries were turning up too often -
// see LevelConfig's rarityWeightBonus for the matching cut to their per-level growth.
export const RARITY_TIERS: RarityConfig[] = [
  { tier: "normal", color: "#cbd5e1", statMultiplier: 1.0, baseDropWeight: 100 },
  { tier: "rare", color: "#4ea8ff", statMultiplier: 1.3, baseDropWeight: 30 },
  { tier: "epic", color: "#b35eff", statMultiplier: 1.7, baseDropWeight: 6 },
  { tier: "legendary", color: "#ffb347", statMultiplier: 2.2, baseDropWeight: 0.6 },
];

export function getRarityConfig(tier: RarityTier): RarityConfig {
  const config = RARITY_TIERS.find((r) => r.tier === tier);
  if (!config) throw new Error(`Unknown rarity tier: ${tier}`);
  return config;
}
