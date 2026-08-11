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

/** Whether `toTarget` falls within a cone of `halfAngleDeg` either side of `facing` (both
 * treated as directions, not required to be pre-normalized). Targets essentially on top of
 * the attacker (near-zero direction) always count, to avoid a dead zone at point-blank range. */
export function isWithinAttackCone(
  facing: { x: number; y: number },
  toTarget: { x: number; y: number },
  halfAngleDeg: number,
): boolean {
  const facingLen = Math.hypot(facing.x, facing.y);
  const targetLen = Math.hypot(toTarget.x, toTarget.y);
  if (targetLen < 1e-6 || facingLen < 1e-6) return true;

  const dot = (facing.x * toTarget.x + facing.y * toTarget.y) / (facingLen * targetLen);
  return dot >= Math.cos((halfAngleDeg * Math.PI) / 180);
}

export interface AttackCandidate {
  x: number;
  y: number;
  logic: { isDead: boolean };
}

/** Filters candidates down to the ones an attack from `origin` actually hits: alive, within
 * `range`, and inside the facing cone. Candidates only need to structurally match
 * AttackCandidate, so this works directly against MonsterSprite without any adapting. */
export function selectAttackTargets<T extends AttackCandidate>(
  origin: { x: number; y: number },
  facing: { x: number; y: number },
  range: number,
  coneHalfAngleDeg: number,
  candidates: readonly T[],
): T[] {
  return candidates.filter((candidate) => {
    if (candidate.logic.isDead) return false;
    const toTarget = { x: candidate.x - origin.x, y: candidate.y - origin.y };
    if (Math.hypot(toTarget.x, toTarget.y) > range) return false;
    return isWithinAttackCone(facing, toTarget, coneHalfAngleDeg);
  });
}
