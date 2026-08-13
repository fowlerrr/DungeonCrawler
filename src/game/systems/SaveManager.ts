import { ALL_ITEMS } from "../data/items";
import type { EquipmentSlot, ItemDef } from "../data/types";
import type { Inventory } from "./Inventory";
import { EMPTY_ALLOCATION, type StatAllocation } from "./PlayerProgression";

export interface PlayerProfile {
  equippedIds: Partial<Record<EquipmentSlot, string>>;
  ownedIds: string[];
  levelNumber: number;
  highestLevelReached: number;
  gold: number;
  /** How the player has spent their earned stat points - optional so older saves (which had no
   * allocation system) still load, defaulting to none spent via EMPTY_ALLOCATION. */
  statAllocation?: StatAllocation;
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
  /** Writes the profile to localStorage as JSON, overwriting any previous save. */
  save(profile: PlayerProfile): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  /** Reads the saved profile back, or null if there isn't one (or it's corrupt JSON). */
  load(): PlayerProfile | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PlayerProfile;
    } catch {
      return null;
    }
  }

  /** Deletes the saved profile, e.g. for a full restart. */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Looks up an item by its saved id against the current catalog - returns undefined rather than
 * throwing, since a stale/removed id in an old save is expected, not a bug. */
function resolveItemId(id: string): ItemDef | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

/** Inventory (owned/equipped items by reference) -> plain-data PlayerProfile (items by id),
 * so saves stay stable even if item stats get rebalanced later. */
export function buildProfile(
  inventory: Inventory,
  levelNumber: number,
  highestLevelReached: number,
  statAllocation: StatAllocation = EMPTY_ALLOCATION,
): PlayerProfile {
  const equippedIds: Partial<Record<EquipmentSlot, string>> = {};
  for (const [slot, item] of Object.entries(inventory.equipped)) {
    if (item) equippedIds[slot as EquipmentSlot] = item.id;
  }
  return {
    equippedIds,
    ownedIds: inventory.owned.map((item) => item.id),
    levelNumber,
    highestLevelReached,
    gold: inventory.gold,
    statAllocation,
  };
}

/** Reverse of buildProfile - resolves saved ids back against the current item catalog, so an
 * id that no longer exists (e.g. removed content) is silently dropped rather than erroring.
 * Also dedupes by id: older saves (from before Inventory.addItem deduped on the way in) can
 * still have the same item saved multiple times, and this is the one place that data gets
 * read back in, so it's the right boundary to clean it up. */
export function applyProfile(inventory: Inventory, profile: PlayerProfile): void {
  inventory.owned = [...new Set(profile.ownedIds)].map(resolveItemId).filter((item): item is ItemDef => item !== undefined);
  inventory.gold = profile.gold;
  inventory.equipped = {};
  for (const [slot, id] of Object.entries(profile.equippedIds)) {
    const item = id ? resolveItemId(id) : undefined;
    if (item) inventory.equipped[slot as EquipmentSlot] = item;
  }
}
