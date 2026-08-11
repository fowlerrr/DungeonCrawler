import type { MonsterDef } from "./types";

/** Starter monster set - add more by appending entries here, no other code changes needed. */
export const MONSTERS: MonsterDef[] = [
  {
    id: "slime",
    name: "Slime",
    baseHp: 16,
    baseDamage: 3,
    moveSpeed: 35,
    aiType: "wander",
    spriteKey: "monster_basic",
  },
  {
    id: "goblin",
    name: "Goblin",
    baseHp: 22,
    baseDamage: 6,
    moveSpeed: 75,
    aiType: "chase",
    spriteKey: "monster_basic",
  },
];

/** The level boss - guards the exit and always drops the exit key on death. */
export const BOSS: MonsterDef = {
  id: "dungeon_lord",
  name: "Dungeon Lord",
  baseHp: 80,
  baseDamage: 10,
  moveSpeed: 55,
  aiType: "boss",
  spriteKey: "monster_boss",
  isBoss: true,
};

export function getMonsterDef(id: string): MonsterDef {
  const def = MONSTERS.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown monster id: ${id}`);
  return def;
}
