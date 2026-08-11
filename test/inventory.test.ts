import { describe, expect, it } from "vitest";
import { Inventory } from "../src/game/systems/Inventory";
import type { ItemDef } from "../src/game/data/types";

const sword: ItemDef = { id: "sword", name: "Sword", kind: "weapon", slot: "weapon", rarity: "normal", stats: {}, spriteKey: "x", description: "" };
const axe: ItemDef = { id: "axe", name: "Axe", kind: "weapon", slot: "weapon", rarity: "rare", stats: {}, spriteKey: "x", description: "" };
const potion: ItemDef = { id: "potion", name: "Potion", kind: "consumable", rarity: "normal", stats: {}, spriteKey: "x", description: "" };

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
});
