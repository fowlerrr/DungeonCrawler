import type { Player } from "./Player";

/** Whether enough time has passed since the player's last attack to swing again - the weapon's
 * (or the unarmed default's) cooldown. */
export function canAttack(player: Player, now: number, cooldownMs: number): boolean {
  return now - player.lastAttackAt >= cooldownMs;
}

/** Whether enough time has passed since the player was last hit to take contact damage again -
 * stops a monster standing on top of the player from dealing damage every single frame. */
export function canBeHit(player: Player, now: number, cooldownMs: number): boolean {
  return now - player.lastHitAt >= cooldownMs;
}

/** Subtracts damage from a target's HP, floored at 0 (health never goes negative). */
export function applyDamage(target: { hp: number }, amount: number): void {
  target.hp = Math.max(0, target.hp - amount);
}

/** Flat damage reduction from defense (armor + accessory + PlayerProgression's bonusDefense) -
 * floored at 1 so stacking defense can make a hit trivial but never a no-op, which would make
 * some monsters permanently harmless rather than just easy. */
export function mitigateDamage(amount: number, defense: number): number {
  return Math.max(1, amount - defense);
}

/** Adds HP to a target, capped at its max (health never goes above the cap). */
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

/** Picks whichever candidate is closest to `origin` - used for ranged weapons, which (unlike a
 * melee swing) shouldn't hit everything in the cone at once: an arrow stops at whatever it hits
 * first rather than piercing through to hit something standing behind it. Returns undefined for
 * an empty list rather than throwing, so callers can treat "no target" and "nothing in range"
 * the same way. */
export function selectNearestTarget<T extends AttackCandidate>(
  origin: { x: number; y: number },
  candidates: readonly T[],
): T | undefined {
  let nearest: T | undefined;
  let nearestDistanceSq = Infinity;
  for (const candidate of candidates) {
    const distanceSq = (candidate.x - origin.x) ** 2 + (candidate.y - origin.y) ** 2;
    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearest = candidate;
    }
  }
  return nearest;
}
