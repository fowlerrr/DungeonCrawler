/** Pure player state - no Phaser here. PlayerSprite owns the physics body and syncs x/y
 * back into this each frame, so game logic (fog of war, combat, etc.) can read position
 * without depending on Phaser. */
export class Player {
  hp: number;
  maxHp: number;
  x = 0;
  y = 0;
  lastAttackAt = -Infinity;
  lastHitAt = -Infinity;

  constructor(maxHp: number) {
    this.maxHp = maxHp;
    this.hp = maxHp;
  }
}
