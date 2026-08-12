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

/** First-person only - camera sits at the player's own position and eye height, looking
 * wherever `facing` points, rather than trailing behind/above like a third-person chase cam. */
export const EYE_HEIGHT = 1.0;

/** How long a 90° turn takes to visually settle (see PlayerController3D's turn animation) -
 * matches PLAYER_MOVE_DURATION_MS so turning and walking read as the same brisk pace, rather
 * than a turn feeling sluggish next to a step or snapping instantly and losing your bearings. */
export const TURN_DURATION_MS = 150;

/** How many tiles the fog-of-war reveals from the player's current tile - deliberately much
 * larger than the 2D game's VISION_RADIUS_TILES (5). A 2D top-down radius reads fine as "how far
 * you can see", but the same radius in a first-person hallway view means the corridor ahead
 * visibly ends in a wall of black a few steps out, well before it should. Revealed tiles are
 * lit realistically from here on (see MazeMesh) rather than re-hidden once out of radius, so
 * this only controls how far *ahead* gets revealed as you walk, not how dark things look. */
export const VISION_RADIUS_TILES_3D = 12;

/** Dark, desaturated palette matching the 2D UI's existing dark theme (#1a1a24 panels, #4ea8ff
 * accent) rather than a generic default - low-poly flat-shaded blocks, no textures. Lighter than
 * a first instinct "moody dungeon" palette would suggest: MeshLambertMaterial only ever shows
 * light reflected off these colors, so a genuinely dark base color plus modest lighting reads as
 * near-black on screen - these are tuned to stay legible once actually lit (see Game3D's lights
 * and MazeMesh's fully-lit-once-visited reveal), not to look right as flat swatches alone. */
export const PALETTE = {
  floor: 0x4a4a5e,
  floorAlt: 0x3c3c4c,
  wall: 0x565668,
  wallTop: 0x5c5c70,
  exitDoor: 0xf5d76e,
  fog: 0x22222e,
  ambient: 0x8888aa,
  torchLight: 0xffd9a0,
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
