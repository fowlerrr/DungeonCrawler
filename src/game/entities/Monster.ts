import type { MonsterDef } from "../data/types";

export class Monster {
  readonly defId: string;
  hp: number;
  maxHp: number;
  /** Scaled by LevelConfig's monsterDamageMult/bossDamageMult at construction time. */
  damage: number;
  x = 0;
  y = 0;

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
