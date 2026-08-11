import { describe, expect, it } from "vitest";
import { applyDamage, canAttack, heal, isWithinAttackCone, mitigateDamage, selectAttackTargets } from "../src/game/entities/Combat";
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

describe("mitigateDamage", () => {
  it("subtracts defense from the raw amount", () => {
    expect(mitigateDamage(10, 4)).toBe(6);
  });

  it("floors at 1 rather than reducing to 0 or negative", () => {
    expect(mitigateDamage(5, 5)).toBe(1);
    expect(mitigateDamage(5, 100)).toBe(1);
  });

  it("is a no-op with zero defense", () => {
    expect(mitigateDamage(7, 0)).toBe(7);
  });
});

describe("isWithinAttackCone", () => {
  it("hits a target directly ahead", () => {
    expect(isWithinAttackCone({ x: 1, y: 0 }, { x: 5, y: 0 }, 60)).toBe(true);
  });

  it("misses a target behind the attacker", () => {
    expect(isWithinAttackCone({ x: 1, y: 0 }, { x: -5, y: 0 }, 60)).toBe(false);
  });

  it("respects the cone's edge angle", () => {
    // 45 degrees off facing: inside a 60-degree half-angle, outside a 30-degree one.
    const toTarget = { x: 1, y: 1 };
    expect(isWithinAttackCone({ x: 1, y: 0 }, toTarget, 60)).toBe(true);
    expect(isWithinAttackCone({ x: 1, y: 0 }, toTarget, 30)).toBe(false);
  });

  it("always hits a target at essentially the same position", () => {
    expect(isWithinAttackCone({ x: 1, y: 0 }, { x: 0, y: 0 }, 10)).toBe(true);
  });
});

function candidate(x: number, y: number, isDead = false) {
  return { x, y, logic: { isDead } };
}

describe("selectAttackTargets", () => {
  const origin = { x: 0, y: 0 };
  const facing = { x: 1, y: 0 }; // facing right

  it("selects a live target ahead and within range", () => {
    const target = candidate(20, 0);
    expect(selectAttackTargets(origin, facing, 40, 60, [target])).toEqual([target]);
  });

  it("excludes a dead candidate even if otherwise in range and cone", () => {
    const target = candidate(20, 0, true);
    expect(selectAttackTargets(origin, facing, 40, 60, [target])).toEqual([]);
  });

  it("excludes a target beyond range", () => {
    const target = candidate(100, 0);
    expect(selectAttackTargets(origin, facing, 40, 60, [target])).toEqual([]);
  });

  it("excludes a target outside the facing cone even if in range", () => {
    const behind = candidate(-20, 0);
    expect(selectAttackTargets(origin, facing, 40, 60, [behind])).toEqual([]);
  });

  it("filters a mixed list down to only the valid targets", () => {
    const inFront = candidate(10, 0);
    const behind = candidate(-10, 0);
    const tooFar = candidate(1000, 0);
    const dead = candidate(5, 0, true);
    const result = selectAttackTargets(origin, facing, 40, 60, [inFront, behind, tooFar, dead]);
    expect(result).toEqual([inFront]);
  });
});
