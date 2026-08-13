/**
 * spriteKey (matches MonsterDef.spriteKey) -> filename within the shared monster art pack
 * (public/assets/sprites/negative-monster-pack/, Negative's Ever Growing Monster Pack - see
 * CREDITS.md). Used by both the 2D game's RealArtTextures.ts and the 3D game's Textures3D.ts, so
 * the two clients' art can't drift out of sync with each other or with monsters.ts - adding a
 * monster means adding one entry here plus the MonsterDef itself, nothing else.
 */
export const MONSTER_ART_FILENAMES: Record<string, string> = {
  monster_slime: "mushroom_01.png",
  monster_goblin: "imp_01.png",
  monster_boss: "ogre_01.png",
  monster_worm: "worm_01.png",
  monster_skeleton: "skeleton_01.png",
  monster_spider: "spider_01.png",
  monster_snake: "snake_01.png",
  monster_wolf: "wolf_01.png",
  monster_beastman: "beastman_01.png",
  monster_crocodog: "crocodog_01.png",
  monster_bug: "Bug_01.png",
  monster_dreg: "Dreg_01.png",
  monster_koboglin: "koboglins.png",
  monster_golem_armor: "golem_armor.png",
  monster_golem_acid: "golem_acid.png",
  monster_float_armor: "Float_Armour_01.png",
  monster_succubus: "succubus_01.png",
  monster_necro_thrall: "Necromaster_Thrall_01.png",
  monster_golem_magma: "golem_magma.png",
};
