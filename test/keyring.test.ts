import { describe, expect, it } from "vitest";
import { Keyring } from "../src/game/systems/Keyring";

describe("Keyring", () => {
  it("has() is false until a key is collected", () => {
    const ring = new Keyring();
    expect(ring.has("door_0")).toBe(false);
    ring.collect("door_0", "red");
    expect(ring.has("door_0")).toBe(true);
  });

  it("consume() removes the key, single-use", () => {
    const ring = new Keyring();
    ring.collect("door_0", "red");
    ring.consume("door_0");
    expect(ring.has("door_0")).toBe(false);
  });

  it("heldLabels() lists every currently held key's label, not its doorId", () => {
    const ring = new Keyring();
    ring.collect("door_0", "red");
    ring.collect("door_1", "blue");
    ring.collect("exit", "exit");
    expect(ring.heldLabels().sort()).toEqual(["blue", "exit", "red"]);
  });

  it("heldLabels() drops a label once its key is consumed", () => {
    const ring = new Keyring();
    ring.collect("door_0", "red");
    ring.collect("door_1", "blue");
    ring.consume("door_0");
    expect(ring.heldLabels()).toEqual(["blue"]);
  });
});
