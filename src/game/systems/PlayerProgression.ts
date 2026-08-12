import { PLAYER_ATTACK_DAMAGE } from "../../config/constants";

export interface StatAllocation {
  atk: number;
  def: number;
  hp: number;
}

export const EMPTY_ALLOCATION: StatAllocation = { atk: 0, def: 0, hp: 0 };

/** How much each allocated point is worth - HP gets a bigger raw number since a single point of
 * ATK or DEF already swings a full hit either way, while a single HP is comparatively trivial. */
export const ATK_PER_POINT = 1;
export const DEF_PER_POINT = 1;
export const HP_PER_POINT = 5;

/**
 * One stat point is earned per level completed (persisted as highestLevelReached, "Highest
 * Level" in the HUD - it starts at 1, one ahead of the actual clear count, so points = that
 * minus 1). Unlike the old auto-applied bonuses, the player chooses where each point goes.
 */
export function totalStatPoints(highestLevelReached: number): number {
  return Math.max(0, highestLevelReached - 1);
}

export function spentPoints(allocation: StatAllocation): number {
  return allocation.atk + allocation.def + allocation.hp;
}

export function unspentPoints(highestLevelReached: number, allocation: StatAllocation): number {
  return Math.max(0, totalStatPoints(highestLevelReached) - spentPoints(allocation));
}

export interface StatBonuses {
  bonusDamage: number;
  bonusDefense: number;
  bonusHp: number;
}

export function bonusesFromAllocation(allocation: StatAllocation): StatBonuses {
  return {
    bonusDamage: allocation.atk * ATK_PER_POINT,
    bonusDefense: allocation.def * DEF_PER_POINT,
    bonusHp: allocation.hp * HP_PER_POINT,
  };
}

/** Total outgoing damage: equipped weapon (or the unarmed base) plus allocated ATK points -
 * the same formula GameScene's tryPlayerAttack, its monster-contact handler, PauseScene, and the
 * HUD all need, kept in one place so they can't silently drift apart. */
export function totalAtk(weaponDamage: number | undefined, allocation: StatAllocation): number {
  return (weaponDamage ?? PLAYER_ATTACK_DAMAGE) + bonusesFromAllocation(allocation).bonusDamage;
}

/** Total damage mitigation: armor + accessory defense plus allocated DEF points. */
export function totalDef(armorDefense: number | undefined, accessoryDefense: number | undefined, allocation: StatAllocation): number {
  return (armorDefense ?? 0) + (accessoryDefense ?? 0) + bonusesFromAllocation(allocation).bonusDefense;
}

/** Spends one unspent point on `stat`, if any are available - a no-op (returns the same
 * allocation instance) otherwise, so callers can cheaply check "did anything change". */
export function allocatePoint(highestLevelReached: number, allocation: StatAllocation, stat: keyof StatAllocation): StatAllocation {
  if (unspentPoints(highestLevelReached, allocation) <= 0) return allocation;
  return { ...allocation, [stat]: allocation[stat] + 1 };
}
