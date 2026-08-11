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
    // Slowed from 0.1/level and, for the boss, dropped the +20% level-1 head start - playtest
    // feedback was that damage taken was already punishing by level 2.
    monsterDamageMult: 1 + (n - 1) * 0.06,
    chestCount: clamp(3 + Math.floor(n / 2), 3, 12),
    // epic/legendary growth halved after feedback that legendaries were showing up too often
    // (paired with the lower base weights in rarity.ts) - the game had gotten a bit too easy.
    rarityWeightBonus: {
      normal: 1,
      rare: 1 + (n - 1) * 0.3,
      epic: 1 + (n - 1) * 0.4,
      legendary: 1 + (n - 1) * 0.5,
    },
    // Lowered both the level-1 base and early growth after feedback that the boss was
    // consistently the hardest part of a level even early on - ramps up faster after that to
    // land close to the old curve by level 8+, so late-game difficulty is largely unchanged.
    bossHpMult: 1 + (n - 1) * 0.3,
    bossDamageMult: 0.8 + (n - 1) * 0.15,
  };
}
