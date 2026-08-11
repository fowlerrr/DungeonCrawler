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

  /** Adds an item to the owned list, auto-equipping it if that slot is empty. */
  addItem(item: ItemDef): void {
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
