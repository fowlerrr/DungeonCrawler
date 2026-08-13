import { rarityRank } from "../data/rarity";
import type { EquipmentSlot, ItemDef } from "../data/types";

export type EquippedItems = Partial<Record<EquipmentSlot, ItemDef>>;

/** Rough "is `candidate` strictly better than `current`" heuristic for auto-equip. Weapons
 * compare damage-per-cooldown (a rate, so a fast weak weapon and a slow strong one still compare
 * fairly); armor compares raw defense. A tie in that primary stat falls back to rarity tier, so a
 * same-stat upgrade in a rarer skin still counts as better. Accessories aren't handled - their
 * stats (speedMult etc.) don't reduce to one comparable number cleanly enough to auto-compare, so
 * those always stay manual. */
export function isBetterEquipment(candidate: ItemDef, current: ItemDef): boolean {
  if (candidate.slot === "weapon" && current.slot === "weapon") {
    const candidateDps = (candidate.stats.damage ?? 0) / (candidate.stats.cooldownMs || 1);
    const currentDps = (current.stats.damage ?? 0) / (current.stats.cooldownMs || 1);
    if (candidateDps !== currentDps) return candidateDps > currentDps;
  } else if (candidate.slot === "armor" && current.slot === "armor") {
    const candidateDef = candidate.stats.defense ?? 0;
    const currentDef = current.stats.defense ?? 0;
    if (candidateDef !== currentDef) return candidateDef > currentDef;
  } else {
    return false;
  }
  return rarityRank(candidate.rarity) > rarityRank(current.rarity);
}

/** Permanent, cross-level equipment - distinct from the level-scoped Keyring. Persisted via
 * SaveManager to localStorage after level transitions and equip changes. */
export class Inventory {
  equipped: EquippedItems = {};
  owned: ItemDef[] = [];
  /** Not spent anywhere yet (no shop in v1) - tracked now so a shop can be added later
   * without reworking how monsters/chests grant currency. */
  gold = 0;

  /** Adds an item to the owned list, auto-equipping it if that slot is empty - or, when
   * `autoEquip` is on, replacing what's equipped there if the new item is a clear upgrade (see
   * isBetterEquipment; accessories are never auto-swapped, only filled when empty). A second
   * copy of an already-owned item (by id) is a no-op - there's never a reason to hold more than
   * one. */
  addItem(item: ItemDef, autoEquip = false): void {
    if (this.owned.some((owned) => owned.id === item.id)) return;
    this.owned.push(item);
    if (!item.slot) return;

    const current = this.equipped[item.slot];
    if (!current) {
      this.equip(item);
    } else if (autoEquip && item.slot !== "accessory" && isBetterEquipment(item, current)) {
      this.equip(item);
    }
  }

  /** Puts `item` in its slot, unconditionally replacing whatever was equipped there. */
  equip(item: ItemDef): void {
    if (!item.slot) return;
    this.equipped[item.slot] = item;
  }
}
