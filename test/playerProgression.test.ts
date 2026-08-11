import { describe, expect, it } from "vitest";
import {
  allocatePoint,
  bonusesFromAllocation,
  EMPTY_ALLOCATION,
  totalStatPoints,
  unspentPoints,
} from "../src/game/systems/PlayerProgression";

describe("totalStatPoints", () => {
  it("grants no points when no level has been completed yet", () => {
    expect(totalStatPoints(1)).toBe(0);
  });

  it("grants one point per completed level", () => {
    expect(totalStatPoints(4)).toBe(3);
    expect(totalStatPoints(11)).toBe(10);
  });

  it("never goes negative even if given a value below 1", () => {
    expect(totalStatPoints(0)).toBe(0);
  });
});

describe("unspentPoints", () => {
  it("equals total points when nothing has been spent", () => {
    expect(unspentPoints(6, EMPTY_ALLOCATION)).toBe(5);
  });

  it("subtracts everything already allocated", () => {
    expect(unspentPoints(6, { atk: 2, def: 1, hp: 1 })).toBe(1);
  });

  it("never goes negative even if allocation somehow exceeds the total", () => {
    expect(unspentPoints(2, { atk: 5, def: 0, hp: 0 })).toBe(0);
  });
});

describe("allocatePoint", () => {
  it("spends one point on the chosen stat", () => {
    const next = allocatePoint(3, EMPTY_ALLOCATION, "atk");
    expect(next).toEqual({ atk: 1, def: 0, hp: 0 });
  });

  it("is a no-op (returns the same instance) once every point is spent", () => {
    const maxed = { atk: 1, def: 0, hp: 0 };
    const next = allocatePoint(2, maxed, "def");
    expect(next).toBe(maxed);
  });
});

describe("bonusesFromAllocation", () => {
  it("converts 1:1 for ATK/DEF and 1:5 for HP", () => {
    expect(bonusesFromAllocation({ atk: 3, def: 2, hp: 4 })).toEqual({
      bonusDamage: 3,
      bonusDefense: 2,
      bonusHp: 20,
    });
  });

  it("is all zero for an empty allocation", () => {
    expect(bonusesFromAllocation(EMPTY_ALLOCATION)).toEqual({ bonusDamage: 0, bonusDefense: 0, bonusHp: 0 });
  });
});
