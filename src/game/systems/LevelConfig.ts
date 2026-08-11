import type { RarityTier } from "../data/types";

export interface LevelConfig {
  levelNumber: number;
  mazeCols: number;
  mazeRows: number;
  braidFactor: number;
  lockCount: number;
  monsterCount: number;
  monsterHpMult: number;
  monsterDamageMult: number;
  chestCount: number;
  rarityWeightBonus: Partial<Record<RarityTier, number>>;
  bossHpMult: number;
  bossDamageMult: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Difficulty and reward scaling, purely as a function of level number - no state machine, just
 * clamped linear formulas so they're easy to tune by eye (and easy to experiment with: "what
 * happens if we double the monster HP slope?"). Clamps keep maze size and the solvability
 * validator's state space bounded even deep into an endless run.
 */
export function getLevelConfig(levelNumber: number): LevelConfig {
  const n = Math.max(1, levelNumber);
  return {
    levelNumber: n,
    mazeCols: clamp(10 + n, 10, 30),
    mazeRows: clamp(8 + n, 8, 24),
    braidFactor: clamp(0.3 + n * 0.01, 0.3, 0.55),
    lockCount: clamp(2 + Math.floor(n / 2), 2, 10),
    monsterCount: clamp(5 + n * 2, 5, 40),
    monsterHpMult: 1 + (n - 1) * 0.15,
    monsterDamageMult: 1 + (n - 1) * 0.1,
    chestCount: clamp(3 + Math.floor(n / 2), 3, 12),
    rarityWeightBonus: {
      normal: 1,
      rare: 1 + (n - 1) * 0.3,
      epic: 1 + (n - 1) * 0.6,
      legendary: 1 + (n - 1) * 1.2,
    },
    bossHpMult: 1.5 + (n - 1) * 0.25,
    bossDamageMult: 1.2 + (n - 1) * 0.15,
  };
}
