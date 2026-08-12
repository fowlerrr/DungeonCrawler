export type AiType = "wander" | "chase" | "stationary" | "boss";

export interface MonsterDef {
  id: string;
  name: string;
  baseHp: number;
  baseDamage: number;
  moveSpeed: number;
  aiType: AiType;
  spriteKey: string;
  isBoss?: boolean;
}

export type RarityTier = "normal" | "rare" | "epic" | "legendary";

export interface RarityConfig {
  tier: RarityTier;
  color: string;
  statMultiplier: number;
  /** Relative weight when rolling loot at level 1 - scaled per-level by LevelConfig later. */
  baseDropWeight: number;
}

export type EquipmentSlot = "weapon" | "armor" | "accessory";
export type ItemKind = "weapon" | "armor" | "accessory" | "consumable";

/** Which shape a weapon's attack visual uses - melee weapons get a swipe silhouette, ranged
 * weapons get a projectile silhouette (see AttackSwipe.ts / Projectile.ts and the matching
 * `attack_swipe_*` / `projectile_*` texture keys in TextureFactory.ts). Purely cosmetic - doesn't
 * affect combat math. */
export type WeaponArt = "sword" | "axe" | "dagger" | "mace" | "spear" | "arrow" | "stone" | "frost" | "fireball" | "arcane";

export interface ItemStats {
  damage?: number;
  cooldownMs?: number;
  /** Attack reach in pixels for weapons - defaults to PLAYER_ATTACK_RANGE when unset. Ranged
   * weapons (bows, staves, ...) set this well beyond melee range; line-of-sight still applies,
   * so a wall blocks the hit either way. */
  range?: number;
  /** Marks a weapon as a projectile rather than a swing - an attack only ever hits the single
   * closest valid target instead of everything in the cone, since an arrow/bolt stops at
   * whatever it hits first rather than piercing through to whatever's behind it. */
  ranged?: boolean;
  /** Which attack-visual shape this weapon uses - defaults to "sword" (melee) or "arrow" (ranged)
   * when unset, so non-weapon items and older data never need this field. */
  art?: WeaponArt;
  defense?: number;
  speedMult?: number;
  healAmount?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Present only for equippable kinds (weapon/armor/accessory). */
  slot?: EquipmentSlot;
  rarity: RarityTier;
  stats: ItemStats;
  spriteKey: string;
  description: string;
}
