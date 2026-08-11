import type { Player } from "./Player";

export function canAttack(player: Player, now: number, cooldownMs: number): boolean {
  return now - player.lastAttackAt >= cooldownMs;
}

export function canBeHit(player: Player, now: number, cooldownMs: number): boolean {
  return now - player.lastHitAt >= cooldownMs;
}

export function applyDamage(target: { hp: number }, amount: number): void {
  target.hp = Math.max(0, target.hp - amount);
}

export function heal(target: { hp: number; maxHp: number }, amount: number): void {
  target.hp = Math.min(target.maxHp, target.hp + amount);
}
