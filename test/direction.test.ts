import { describe, expect, it } from "vitest";
import { resolveDirection } from "../src/game/util/direction";

describe("resolveDirection", () => {
  it("returns null when nothing is held", () => {
    expect(resolveDirection([], () => false)).toBeNull();
  });

  it("returns the single held direction", () => {
    expect(resolveDirection(["up"], (d) => d === "up")).toBe("up");
  });

  it("prefers the most recently pressed direction when multiple are held", () => {
    const held = ["up", "left", "right"];
    expect(resolveDirection(held, () => true)).toBe("right");
  });

  it("falls back to an earlier direction once the most recent one is released", () => {
    // "right" was pressed last but is no longer held; "left" (pressed before it) still is.
    const held = ["up", "left", "right"];
    expect(resolveDirection(held, (d) => d !== "right")).toBe("left");
  });

  it("skips over multiple released directions to find the most recent held one", () => {
    const held = ["down", "up", "left", "right"];
    expect(resolveDirection(held, (d) => d === "down" || d === "up")).toBe("up");
  });
});
