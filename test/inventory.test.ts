import { describe, expect, it } from "vitest";
import { Inventory, isBetterEquipment } from "../src/game/systems/Inventory";
import type { ItemDef } from "../src/game/data/types";

const sword: ItemDef = { id: "sword", name: "Sword", kind: "weapon", slot: "weapon", rarity: "normal", stats: {}, spriteKey: "x", description: "" };
const axe: ItemDef = { id: "axe", name: "Axe", kind: "weapon", slot: "weapon", rarity: "rare", stats: {}, spriteKey: "x", description: "" };
const potion: ItemDef = { id: "potion", name: "Potion", kind: "consumable", rarity: "normal", stats: {}, spriteKey: "x", description: "" };

function weapon(id: string, damage: number, cooldownMs: number, rarity: ItemDef["rarity"] = "normal"): ItemDef {
  return { id, name: id, kind: "weapon", slot: "weapon", rarity, stats: { damage, cooldownMs }, spriteKey: "x", description: "" };
}

function armor(id: string, defense: number, rarity: ItemDef["rarity"] = "normal"): ItemDef {
  return { id, name: id, kind: "armor", slot: "armor", rarity, stats: { defense }, spriteKey: "x", description: "" };
}

function accessory(id: string, rarity: ItemDef["rarity"] = "normal"): ItemDef {
  return { id, name: id, kind: "accessory", slot: "accessory", rarity, stats: {}, spriteKey: "x", description: "" };
}

describe("Inventory", () => {
  it("auto-equips the first item added to an empty slot", () => {
    const inv = new Inventory();
    inv.addItem(sword);
    expect(inv.equipped.weapon).toBe(sword);
    expect(inv.owned).toContain(sword);
  });

  it("does not auto-equip a second item in an already-filled slot", () => {
    const inv = new Inventory();
    inv.addItem(sword);
    inv.addItem(axe);
    expect(inv.equipped.weapon).toBe(sword);
    expect(inv.owned).toEqual([sword, axe]);
  });

  it("equip() explicitly swaps the equipped item for that slot", () => {
    const inv = new Inventory();
    inv.addItem(sword);
    inv.equip(axe);
    expect(inv.equipped.weapon).toBe(axe);
  });

  it("ignores equip attempts for slotless items (consumables)", () => {
    const inv = new Inventory();
    inv.addItem(potion);
    expect(inv.equipped.weapon).toBeUndefined();
    expect(inv.owned).toContain(potion);
  });

  it("does not add a second copy of an already-owned item", () => {
    const inv = new Inventory();
    inv.addItem(sword);
    inv.addItem(sword);
    expect(inv.owned).toEqual([sword]);
  });

  it("a duplicate pickup after switching weapons doesn't re-add or re-equip it", () => {
    const inv = new Inventory();
    inv.addItem(sword);
    inv.addItem(axe);
    inv.equip(axe);
    inv.addItem(sword);
    expect(inv.owned).toEqual([sword, axe]);
    expect(inv.equipped.weapon).toBe(axe);
  });

  describe("auto-equip", () => {
    it("swaps in a strictly better weapon when autoEquip is on", () => {
      const inv = new Inventory();
      const weak = weapon("weak", 4, 400);
      const strong = weapon("strong", 12, 400);
      inv.addItem(weak, true);
      inv.addItem(strong, true);
      expect(inv.equipped.weapon).toBe(strong);
    });

    it("does not swap in a worse weapon even with autoEquip on", () => {
      const inv = new Inventory();
      const strong = weapon("strong", 12, 400);
      const weak = weapon("weak", 4, 400);
      inv.addItem(strong, true);
      inv.addItem(weak, true);
      expect(inv.equipped.weapon).toBe(strong);
    });

    it("does not swap a same-stat weapon of the same rarity", () => {
      const inv = new Inventory();
      const a = weapon("a", 8, 400);
      const b = weapon("b", 8, 400);
      inv.addItem(a, true);
      inv.addItem(b, true);
      expect(inv.equipped.weapon).toBe(a);
    });

    it("breaks a stat tie by rarity", () => {
      const inv = new Inventory();
      const common = weapon("common", 8, 400, "normal");
      const rare = weapon("rare", 8, 400, "rare");
      inv.addItem(common, true);
      inv.addItem(rare, true);
      expect(inv.equipped.weapon).toBe(rare);
    });

    it("swaps in higher-defense armor", () => {
      const inv = new Inventory();
      const light = armor("light", 2);
      const heavy = armor("heavy", 6);
      inv.addItem(light, true);
      inv.addItem(heavy, true);
      expect(inv.equipped.armor).toBe(heavy);
    });

    it("never auto-swaps an accessory even if autoEquip is on", () => {
      const inv = new Inventory();
      const first = accessory("first", "normal");
      const second = accessory("second", "legendary");
      inv.addItem(first, true);
      inv.addItem(second, true);
      expect(inv.equipped.accessory).toBe(first);
    });

    it("does not swap equipment when autoEquip is off, even for a clear upgrade", () => {
      const inv = new Inventory();
      const weak = weapon("weak", 4, 400);
      const strong = weapon("strong", 12, 400);
      inv.addItem(weak, false);
      inv.addItem(strong, false);
      expect(inv.equipped.weapon).toBe(weak);
    });
  });
});

describe("isBetterEquipment", () => {
  it("compares weapons by damage-per-cooldown rather than raw damage", () => {
    const slowHeavy = weapon("slow", 20, 1000); // 0.02 dmg/ms
    const fastLight = weapon("fast", 6, 200); // 0.03 dmg/ms
    expect(isBetterEquipment(fastLight, slowHeavy)).toBe(true);
    expect(isBetterEquipment(slowHeavy, fastLight)).toBe(false);
  });

  it("returns false comparing across different slots", () => {
    expect(isBetterEquipment(weapon("w", 10, 400), armor("a", 10))).toBe(false);
  });
});
