import { describe, expect, it } from "vitest";
import { Inventory } from "../src/game/systems/Inventory";
import { applyProfile, buildProfile } from "../src/game/systems/SaveManager";
import { WEAPONS } from "../src/game/data/weapons";
import { ITEMS } from "../src/game/data/items";

describe("buildProfile / applyProfile", () => {
  it("round-trips equipped and owned items through plain-data ids", () => {
    const inventory = new Inventory();
    inventory.addItem(WEAPONS[0]);
    inventory.addItem(ITEMS[0]);
    inventory.gold = 42;

    const profile = buildProfile(inventory, 5);
    expect(profile.levelNumber).toBe(5);
    expect(profile.gold).toBe(42);
    expect(profile.equippedIds.weapon).toBe(WEAPONS[0].id);

    const restored = new Inventory();
    applyProfile(restored, profile);

    expect(restored.gold).toBe(42);
    expect(restored.equipped.weapon?.id).toBe(WEAPONS[0].id);
    expect(restored.owned.map((i) => i.id)).toEqual([WEAPONS[0].id, ITEMS[0].id]);
  });

  it("silently drops ids that no longer exist in the item catalog", () => {
    const restored = new Inventory();
    applyProfile(restored, { equippedIds: { weapon: "nonexistent_id" }, ownedIds: ["nonexistent_id"], levelNumber: 1, gold: 0 });

    expect(restored.equipped.weapon).toBeUndefined();
    expect(restored.owned).toEqual([]);
  });
});
