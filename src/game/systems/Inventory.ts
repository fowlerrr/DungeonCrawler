import type { EquipmentSlot, ItemDef } from "../data/types";

export type EquippedItems = Partial<Record<EquipmentSlot, ItemDef>>;

/** Permanent, cross-level equipment - distinct from the level-scoped Keyring. Persisted via
 * SaveManager to localStorage after level transitions and equip changes. */
export class Inventory {
  equipped: EquippedItems = {};
  owned: ItemDef[] = [];
  /** Not spent anywhere yet (no shop in v1) - tracked now so a shop can be added later
   * without reworking how monsters/chests grant currency. */
  gold = 0;

  /** Adds an item to the owned list, auto-equipping it if that slot is empty. A second copy of
   * an already-owned item (by id) is a no-op - there's never a reason to hold more than one. */
  addItem(item: ItemDef): void {
    if (this.owned.some((owned) => owned.id === item.id)) return;
    this.owned.push(item);
    if (item.slot && !this.equipped[item.slot]) {
      this.equip(item);
    }
  }

  equip(item: ItemDef): void {
    if (!item.slot) return;
    this.equipped[item.slot] = item;
  }
}
