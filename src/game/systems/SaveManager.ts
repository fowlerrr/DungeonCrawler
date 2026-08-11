import { ALL_ITEMS } from "../data/items";
import type { EquipmentSlot, ItemDef } from "../data/types";
import type { Inventory } from "./Inventory";

export interface PlayerProfile {
  equippedIds: Partial<Record<EquipmentSlot, string>>;
  ownedIds: string[];
  levelNumber: number;
  gold: number;
}

export interface SaveManager {
  save(profile: PlayerProfile): void;
  load(): PlayerProfile | null;
  clear(): void;
}

const STORAGE_KEY = "dungeoncrawler:save:v1";

/** localStorage-backed implementation - swap for a real backend later behind the same
 * SaveManager interface without touching any game logic that depends on it. */
export class LocalStorageSaveManager implements SaveManager {
  save(profile: PlayerProfile): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  load(): PlayerProfile | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PlayerProfile;
    } catch {
      return null;
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function resolveItemId(id: string): ItemDef | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** Inventory (owned/equipped items by reference) -> plain-data PlayerProfile (items by id),
 * so saves stay stable even if item stats get rebalanced later. */
export function buildProfile(inventory: Inventory, levelNumber: number): PlayerProfile {
  const equippedIds: Partial<Record<EquipmentSlot, string>> = {};
  for (const [slot, item] of Object.entries(inventory.equipped)) {
    if (item) equippedIds[slot as EquipmentSlot] = item.id;
  }
  return {
    equippedIds,
    ownedIds: inventory.owned.map((item) => item.id),
    levelNumber,
    gold: inventory.gold,
  };
}

/** Reverse of buildProfile - resolves saved ids back against the current item catalog, so an
 * id that no longer exists (e.g. removed content) is silently dropped rather than erroring. */
export function applyProfile(inventory: Inventory, profile: PlayerProfile): void {
  inventory.owned = profile.ownedIds.map(resolveItemId).filter((item): item is ItemDef => item !== undefined);
  inventory.gold = profile.gold;
  inventory.equipped = {};
  for (const [slot, id] of Object.entries(profile.equippedIds)) {
    const item = id ? resolveItemId(id) : undefined;
    if (item) inventory.equipped[slot as EquipmentSlot] = item;
  }
}
