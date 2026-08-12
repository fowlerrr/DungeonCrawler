/**
 * All game *simulation* state (positions, speeds, ranges) stays in the exact same "pixel space"
 * (TILE_SIZE=32 px per tile) the 2D game already uses - src/game/ has no idea a renderer exists,
 * so reusing it as-is means reusing every constant tuned for it (PLAYER_ATTACK_RANGE, monster
 * moveSpeed, MONSTER_OCCUPANCY_RADIUS, ...) unchanged. WORLD_UNITS_PER_TILE is the one and only
 * conversion factor between that pixel space and Three.js world units, applied at render time
 * (see coords.ts) - everything below it is presentation-only.
 */
export const WORLD_UNITS_PER_TILE = 1;

export const WALL_HEIGHT = 1.6;
export const FLOOR_Y = 0;
export const CEILING_Y = WALL_HEIGHT;

export const PLAYER_MESH_HEIGHT = 1.1;
export const PLAYER_MESH_RADIUS = 0.28;
export const MONSTER_MESH_HEIGHT = 0.8;
export const BOSS_MESH_HEIGHT = 1.3;

export const CAMERA_HEIGHT = 6.5;
export const CAMERA_BACK_OFFSET = 4.5;
export const CAMERA_LERP = 0.12;

/** Dark, desaturated palette matching the 2D UI's existing dark theme (#1a1a24 panels, #4ea8ff
 * accent) rather than a generic default - low-poly flat-shaded blocks, no textures. */
export const PALETTE = {
  floor: 0x232330,
  floorAlt: 0x2b2b3a,
  wall: 0x14141c,
  wallTop: 0x1c1c28,
  exitDoor: 0xf5d76e,
  fog: 0x0a0a10,
  ambient: 0x3a3a55,
  torchLight: 0xffcf8a,
  playerBody: 0x2f6fb0,
  playerAccent: 0x9fd6ff,
  slime: 0x3fae5c,
  goblin: 0xd94f4f,
  boss: 0x8a2be2,
  health: 0x4cd964,
  chest: 0xb5772b,
} as const;

export const DOOR_COLOR_HEX: Record<string, number> = {
  red: 0x992222,
  blue: 0x224499,
  green: 0x228844,
  yellow: 0x998822,
  purple: 0x662299,
  orange: 0xcc6622,
  cyan: 0x22999c,
  pink: 0xcc4488,
  teal: 0x227766,
  brown: 0x6b4a2b,
  exit: 0x555555,
};

export const KEY_COLOR_HEX: Record<string, number> = {
  red: 0xff5555,
  blue: 0x5588ff,
  green: 0x55dd77,
  yellow: 0xffdd55,
  purple: 0xaa66ff,
  orange: 0xff9944,
  cyan: 0x44eeff,
  pink: 0xff77bb,
  teal: 0x55ddcc,
  brown: 0xa87d55,
  exit: 0xf5d76e,
};
