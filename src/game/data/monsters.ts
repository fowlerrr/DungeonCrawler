import type { MonsterDef } from "./types";

/**
 * Six difficulty tiers, unlocking roughly every 4-6 levels across a planned 30-level run (see
 * minLevel on each entry, and getSpawnableMonsters below). A tier's monsters stay in the pool
 * once unlocked rather than being replaced outright - the pool just keeps growing, so a level 30
 * run can still turn up an early slime alongside far tougher things, and the mix visibly shifts
 * toward harder monster types as you go deeper. Each tier is also a real jump in base stats on
 * top of LevelConfig's own continuous per-level HP/damage multiplier, so the escalation compounds
 * from two directions instead of just one. Add more by appending entries here, no other code
 * changes needed beyond wiring the sprite into TextureFactory.ts's placeholder pass and (for real
 * art) RealArtTextures.ts / Textures3D.ts.
 */
export const MONSTERS: MonsterDef[] = [
  // Tier 1 - levels 1-4
  {
    id: "slime",
    name: "Slime",
    baseHp: 16,
    baseDamage: 3,
    moveSpeed: 35,
    aiType: "wander",
    spriteKey: "monster_slime",
    tier: 1,
    minLevel: 1,
  },
  {
    id: "goblin",
    name: "Goblin",
    baseHp: 22,
    baseDamage: 6,
    moveSpeed: 75,
    aiType: "chase",
    spriteKey: "monster_goblin",
    tier: 1,
    minLevel: 1,
  },
  {
    id: "worm",
    name: "Giant Worm",
    baseHp: 12,
    baseDamage: 2,
    moveSpeed: 25,
    aiType: "wander",
    spriteKey: "monster_worm",
    tier: 1,
    minLevel: 1,
  },

  // Tier 2 - levels 5-9
  {
    id: "skeleton",
    name: "Skeleton",
    baseHp: 30,
    baseDamage: 8,
    moveSpeed: 60,
    aiType: "chase",
    spriteKey: "monster_skeleton",
    tier: 2,
    minLevel: 5,
  },
  {
    id: "spider",
    name: "Giant Spider",
    baseHp: 26,
    baseDamage: 7,
    moveSpeed: 90,
    aiType: "chase",
    spriteKey: "monster_spider",
    tier: 2,
    minLevel: 5,
  },
  {
    id: "snake",
    name: "Venomous Snake",
    baseHp: 24,
    baseDamage: 9,
    moveSpeed: 50,
    aiType: "wander",
    spriteKey: "monster_snake",
    tier: 2,
    minLevel: 5,
  },

  // Tier 3 - levels 10-14
  {
    id: "wolf",
    name: "Dire Wolf",
    baseHp: 40,
    baseDamage: 11,
    moveSpeed: 100,
    aiType: "chase",
    spriteKey: "monster_wolf",
    tier: 3,
    minLevel: 10,
  },
  {
    id: "beastman",
    name: "Beastman",
    baseHp: 55,
    baseDamage: 13,
    moveSpeed: 65,
    aiType: "chase",
    spriteKey: "monster_beastman",
    tier: 3,
    minLevel: 10,
  },
  {
    id: "crocodog",
    name: "Crocodog",
    baseHp: 48,
    baseDamage: 12,
    moveSpeed: 70,
    aiType: "chase",
    spriteKey: "monster_crocodog",
    tier: 3,
    minLevel: 10,
  },

  // Tier 4 - levels 15-19
  {
    id: "carapace_bug",
    name: "Carapace Bug",
    baseHp: 65,
    baseDamage: 16,
    moveSpeed: 55,
    aiType: "chase",
    spriteKey: "monster_bug",
    tier: 4,
    minLevel: 15,
  },
  {
    id: "dreg",
    name: "Dreg Fiend",
    baseHp: 70,
    baseDamage: 15,
    moveSpeed: 60,
    aiType: "chase",
    spriteKey: "monster_dreg",
    tier: 4,
    minLevel: 15,
  },
  {
    id: "koboglin",
    name: "Koboglin Raider",
    baseHp: 60,
    baseDamage: 17,
    moveSpeed: 75,
    aiType: "chase",
    spriteKey: "monster_koboglin",
    tier: 4,
    minLevel: 15,
  },

  // Tier 5 - levels 20-24
  {
    id: "golem_armor",
    name: "Armored Golem",
    baseHp: 110,
    baseDamage: 20,
    moveSpeed: 40,
    aiType: "chase",
    spriteKey: "monster_golem_armor",
    tier: 5,
    minLevel: 20,
  },
  {
    id: "golem_acid",
    name: "Acid Golem",
    baseHp: 95,
    baseDamage: 22,
    moveSpeed: 45,
    aiType: "chase",
    spriteKey: "monster_golem_acid",
    tier: 5,
    minLevel: 20,
  },
  {
    id: "float_armor",
    name: "Haunted Armor",
    baseHp: 90,
    baseDamage: 21,
    moveSpeed: 55,
    aiType: "chase",
    spriteKey: "monster_float_armor",
    tier: 5,
    minLevel: 20,
  },

  // Tier 6 - levels 25-30
  {
    id: "succubus",
    name: "Succubus",
    baseHp: 120,
    baseDamage: 26,
    moveSpeed: 80,
    aiType: "chase",
    spriteKey: "monster_succubus",
    tier: 6,
    minLevel: 25,
  },
  {
    id: "necro_thrall",
    name: "Necromaster Thrall",
    baseHp: 130,
    baseDamage: 24,
    moveSpeed: 50,
    aiType: "chase",
    spriteKey: "monster_necro_thrall",
    tier: 6,
    minLevel: 25,
  },
  {
    id: "golem_magma",
    name: "Magma Golem",
    baseHp: 150,
    baseDamage: 28,
    moveSpeed: 40,
    aiType: "chase",
    spriteKey: "monster_golem_magma",
    tier: 6,
    minLevel: 25,
  },
];

/** The level boss - guards the exit and always drops the exit key on death. Not part of the
 * tiered pool above (always spawned directly, once per level), so its own difficulty scaling
 * comes entirely from LevelConfig's bossHpMult/bossDamageMult rather than a minLevel gate. */
export const BOSS: MonsterDef = {
  id: "dungeon_lord",
  name: "Dungeon Lord",
  baseHp: 80,
  baseDamage: 10,
  moveSpeed: 55,
  aiType: "boss",
  spriteKey: "monster_boss",
  isBoss: true,
  tier: 0,
  minLevel: 1,
};

export function getMonsterDef(id: string): MonsterDef {
  const def = MONSTERS.find((m) => m.id === id);
  if (!def) throw new Error(`Unknown monster id: ${id}`);
  return def;
}

/** Every regular (non-boss) monster unlocked by `levelNumber` - the pool a level's random spawns
 * are drawn from. Cumulative: once a tier unlocks it never leaves the pool, it just becomes
 * proportionally rarer as later tiers add more options alongside it. */
export function getSpawnableMonsters(levelNumber: number): MonsterDef[] {
  return MONSTERS.filter((m) => m.minLevel <= levelNumber);
}
