export interface PlayerProgression {
  bonusHp: number;
  bonusDamage: number;
  bonusDefense: number;
}

/**
 * Permanent player growth from clearing levels, keyed off highestLevelReached ("Best" in the
 * HUD) rather than the current level - unlike LevelConfig's per-level difficulty scaling, this
 * never resets on death, since it represents lasting mastery rather than the danger of whatever
 * level you're currently on. highestLevelReached starts at 1 (no levels cleared yet), so it's
 * one ahead of the actual clear count.
 */
export function getPlayerProgression(highestLevelReached: number): PlayerProgression {
  const levelsCompleted = Math.max(0, highestLevelReached - 1);
  return {
    bonusHp: Math.floor(levelsCompleted / 5) * 5,
    bonusDamage: levelsCompleted,
    bonusDefense: levelsCompleted,
  };
}
