import type { MonsterDef } from "../data/types";

/** Pure per-instance monster state - one of these exists per monster actually spawned in a
 * level, separate from the shared MonsterDef template it was built from (which just describes
 * "what a goblin is", not "this specific goblin's current HP"). No Phaser/Three.js dependency,
 * same reasoning as Player. */
export class Monster {
  readonly defId: string;
  hp: number;
  maxHp: number;
  /** Scaled by LevelConfig's monsterDamageMult/bossDamageMult at construction time. */
  damage: number;
  x = 0;
  y = 0;

  /** Builds a fresh, full-health monster from a template, with this level's difficulty
   * multipliers baked into its actual HP/damage. */
  constructor(def: MonsterDef, hpMult = 1, damageMult = 1) {
    this.defId = def.id;
    this.maxHp = Math.round(def.baseHp * hpMult);
    this.hp = this.maxHp;
    this.damage = Math.round(def.baseDamage * damageMult);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }
}
