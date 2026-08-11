export const TILE_SIZE = 32;

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const VISION_RADIUS_TILES = 5;

export const PLAYER_MOVE_SPEED = 160; // pixels/sec
export const PLAYER_BASE_HP = 20;
export const PLAYER_ATTACK_COOLDOWN_MS = 400;
export const PLAYER_ATTACK_DAMAGE = 6;
export const PLAYER_ATTACK_RANGE = 40; // pixels

export const MONSTER_CONTACT_DAMAGE_COOLDOWN_MS = 800;
export const HEALTH_PICKUP_HEAL = 6;
export const MONSTER_GOLD_DROP = 2;
export const BOSS_GOLD_DROP = 20;

export const SCENE_KEYS = {
  BOOT: "BootScene",
  PRELOAD: "PreloadScene",
  GAME: "GameScene",
  UI: "UIScene",
  GAME_OVER: "GameOverScene",
} as const;
