import type { AttackCandidate } from "./Combat";

/** Whether a live monster is close enough to (tileCenterX, tileCenterY) that the player
 * shouldn't be allowed to tile-step onto it - without this check, a full-speed tile-step can
 * land the player directly on a monster in one jump, forcing a deep physics overlap that can
 * shove the monster clean through a wall it happens to be standing against. */
export function isTileOccupiedByMonster(
  tileCenterX: number,
  tileCenterY: number,
  monsters: readonly AttackCandidate[],
  occupancyRadius: number,
): boolean {
  return monsters.some(
    (monster) => !monster.logic.isDead && Math.hypot(monster.x - tileCenterX, monster.y - tileCenterY) < occupancyRadius,
  );
}
