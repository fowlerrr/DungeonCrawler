export const TILE_SIZE = 32;

export const MAZE_VIEW_WIDTH = 800;
export const SIDEBAR_WIDTH = 220;
export const GAME_WIDTH = MAZE_VIEW_WIDTH + SIDEBAR_WIDTH;
export const GAME_HEIGHT = 600;

export const VISION_RADIUS_TILES = 5;

export const PLAYER_MOVE_DURATION_MS = 150; // time to animate one tile-step
// Raised from 20 after playtest feedback that monster/boss contact damage (see LevelConfig's
// damage multipliers) was killing the player in 2-3 hits as early as level 2.
export const PLAYER_BASE_HP = 30;
export const PLAYER_ATTACK_COOLDOWN_MS = 400;
export const PLAYER_ATTACK_DAMAGE = 6;
export const PLAYER_ATTACK_RANGE = 40; // pixels
export const PLAYER_ATTACK_CONE_HALF_ANGLE_DEG = 60;

export const MONSTER_CONTACT_DAMAGE_COOLDOWN_MS = 800;
export const MONSTER_HIT_FLASH_MS = 120;
// A tile within this radius of a live monster counts as "occupied" and blocks the player's
// tile-step - without this, a full-speed tile-step can land the player directly on top of a
// monster in one jump, forcing a deep overlap that can shove the monster clean through a wall.
export const MONSTER_OCCUPANCY_RADIUS = TILE_SIZE * 0.6;
export const HEALTH_PICKUP_HEAL = 6;
export const MONSTER_GOLD_DROP = 2;
export const BOSS_GOLD_DROP = 20;

export const SCENE_KEYS = {
  BOOT: "BootScene",
  PRELOAD: "PreloadScene",
  MENU: "MenuScene",
  GAME: "GameScene",
  UI: "UIScene",
  GAME_OVER: "GameOverScene",
  PAUSE: "PauseScene",
  TUTORIAL: "TutorialScene",
} as const;
