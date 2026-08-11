import { describe, expect, it } from "vitest";
import { applyDamage, canAttack, heal } from "../src/game/entities/Combat";
import { Player } from "../src/game/entities/Player";

describe("Combat", () => {
  it("applyDamage clamps at zero and never goes negative", () => {
    const target = { hp: 5 };
    applyDamage(target, 10);
    expect(target.hp).toBe(0);
  });

  it("heal clamps at maxHp", () => {
    const target = { hp: 8, maxHp: 10 };
    heal(target, 5);
    expect(target.hp).toBe(10);
  });

  it("canAttack respects the cooldown window", () => {
    const player = new Player(20);
    player.lastAttackAt = 1000;
    expect(canAttack(player, 1200, 400)).toBe(false);
    expect(canAttack(player, 1400, 400)).toBe(true);
  });
});
