import { WEAPONS } from "./weapons";
import type { ItemDef } from "./types";

/** Standard non-weapon items - armor, accessories, consumables. Add more by appending here. */
export const ITEMS: ItemDef[] = [
  {
    id: "armor_leather",
    name: "Leather Armor",
    kind: "armor",
    slot: "armor",
    rarity: "normal",
    stats: { defense: 3 },
    spriteKey: "item_armor",
    description: "Basic protection.",
  },
  {
    id: "armor_chainmail",
    name: "Chainmail",
    kind: "armor",
    slot: "armor",
    rarity: "rare",
    stats: { defense: 6 },
    spriteKey: "item_armor",
    description: "Sturdy interlocking rings.",
  },
  {
    id: "ring_swiftness",
    name: "Ring of Swiftness",
    kind: "accessory",
    slot: "accessory",
    rarity: "rare",
    stats: { speedMult: 1.15 },
    spriteKey: "item_accessory",
    description: "A faint breeze follows you.",
  },
  {
    id: "amulet_vitality",
    name: "Amulet of Vitality",
    kind: "accessory",
    slot: "accessory",
    rarity: "epic",
    stats: { defense: 2 },
    spriteKey: "item_accessory",
    description: "Warm to the touch.",
  },
  {
    id: "potion_health",
    name: "Health Potion",
    kind: "consumable",
    rarity: "normal",
    stats: { healAmount: 12 },
    spriteKey: "item_potion",
    description: "Restores a bit of health - drunk immediately on pickup.",
  },
];

/** Full loot pool for chests - weapons plus standard items. */
export const ALL_ITEMS: ItemDef[] = [...WEAPONS, ...ITEMS];
