import { IS_TOUCH_DEVICE } from "./device";

export const TILE_SIZE = 32;

// Touch devices get a design resolution close to an actual phone's landscape viewport, rather
// than the desktop-sized one below. Phaser's Scale.FIT (see bootPhaser.ts) scales this whole
// resolution uniformly to fit whatever screen it's actually running on - if the design
// resolution already roughly matches device size, that scaling stays close to 1:1 and text/tiles
// render near their authored size. The alternative (one resolution for everyone, scaled down
// harder on small screens) is what an earlier pass did, and shrank the map and HUD both down to
// the point of being hard to read. Every other 2D scene's own spacing/panel-size constants are
// separately adjusted for IS_TOUCH_DEVICE too (see their own comments) - a smaller canvas alone
// doesn't reflow content sized for the taller/wider desktop one.
export const MAZE_VIEW_WIDTH = IS_TOUCH_DEVICE ? 480 : 800;
export const SIDEBAR_WIDTH = IS_TOUCH_DEVICE ? 190 : 220;
export const GAME_WIDTH = MAZE_VIEW_WIDTH + SIDEBAR_WIDTH;
export const GAME_HEIGHT = IS_TOUCH_DEVICE ? 380 : 600;

export const VISION_RADIUS_TILES = 5;

export const PLAYER_MOVE_DURATION_MS = 150; // time to animate one tile-step
// Was raised to 30 after early playtest feedback that damage taken was too punishing; brought
// back down to 25 (still above the original 20) after the game swung the other way and got too
// easy - PlayerProgression's stat points are the intended way to grow past this now, not a
// generous starting baseline. There's no equivalent "starting DEF" to lower alongside it -
// unarmed players already start at 0 defense (see Combat's mitigateDamage).
export const PLAYER_BASE_HP = 25;
export const PLAYER_ATTACK_COOLDOWN_MS = 400;
export const PLAYER_ATTACK_DAMAGE = 5;
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
  OPTIONS: "OptionsScene",
  CREDITS: "CreditsScene",
} as const;
