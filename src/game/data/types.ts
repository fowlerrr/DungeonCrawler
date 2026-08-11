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

export interface ItemStats {
  damage?: number;
  cooldownMs?: number;
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
