import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";
import { MONSTER_ART_FILENAMES } from "../../game/data/monsterArt";

const DUNGEON_TILESET = "assets/tilesets/dungeon-tileset-ii";
const MONSTER_PACK = "assets/sprites/negative-monster-pack";

/**
 * Swap-in for two free itch.io packs (0x72's CC0 "16x16 DungeonTileset II" for floor/wall/door
 * art, Negative Inspiration's CC BY-SA "Ever Growing Monster Pack" for creatures), replacing a
 * handful of generatePlaceholderTextures's procedural keys with real art - everything downstream
 * only ever references these by texture key, so nothing else needs to change to try this on, roll
 * it back, or swap in a different pack later (see CREDITS.md for full license details).
 *
 * Unlike the 2D game's earlier tileset, this one isn't an edge/corner autotile set - there's just
 * one floor tile and one wall tile, baked identically into every one of classifyFloorTile's 6
 * variant keys (that classification/rotation logic in autotile.ts still runs; it just has nothing
 * visually different to show per variant now, the same as how the 3D game's floor already looks
 * uniform). Simpler to integrate, at the cost of the old pack's brick-border-near-walls detail.
 *
 * Monster and player art keep their native resolution and aspect ratio rather than being baked
 * to TILE_SIZE - both sprites' collision circles are already independent of texture size (see
 * MonsterSprite/PlayerSprite), so there's no tiling requirement forcing it down, and letting it
 * render larger shows off far more of the linework than the tile grid's 32px budget ever could.
 */
export function preloadRealArt(scene: Phaser.Scene): void {
  scene.load.image("raw_floor", `${DUNGEON_TILESET}/floor_1.png`);
  scene.load.image("raw_wall", `${DUNGEON_TILESET}/wall_mid.png`);
  scene.load.image("raw_door_exit", `${DUNGEON_TILESET}/doors_leaf_closed.png`);

  for (const [spriteKey, filename] of Object.entries(MONSTER_ART_FILENAMES)) {
    scene.load.image(`raw_${spriteKey}`, `${MONSTER_PACK}/${filename}`);
  }
  scene.load.image("raw_player", `${MONSTER_PACK}/pirate_01.png`);
}

const FLOOR_VARIANT_KEYS = ["tile_floor_open", "tile_floor_edge1", "tile_floor_corner", "tile_floor_three", "tile_floor_edge_opp", "tile_floor_four"];

/** Turns the raw loaded images into the actual in-game texture keys - tiles get scaled up to
 * TILE_SIZE, monster/player art keeps native resolution. Must run after preloadRealArt's images
 * have finished loading. */
export function applyRealArt(scene: Phaser.Scene): void {
  for (const key of FLOOR_VARIANT_KEYS) bakePixelArtTile(scene, "raw_floor", key);
  bakePixelArtTile(scene, "raw_wall", "tile_wall");
  bakePixelArtTile(scene, "raw_door_exit", "door_exit");

  for (const spriteKey of Object.keys(MONSTER_ART_FILENAMES)) {
    replaceWithNativeArt(scene, `raw_${spriteKey}`, spriteKey);
  }
  replaceWithNativeArt(scene, "raw_player", "player");
}

/** Scales a small pixel-art source (16x16 or 32x32) up to TILE_SIZE with nearest-neighbor
 * sampling rather than smoothing, so it stays crisp instead of blurring - the opposite problem
 * from a large painted image being downscaled, since this pack's tiles start smaller than
 * TILE_SIZE rather than larger. */
function bakePixelArtTile(scene: Phaser.Scene, rawKey: string, targetKey: string): void {
  const source = scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, TILE_SIZE, TILE_SIZE);

  if (scene.textures.exists(targetKey)) scene.textures.remove(targetKey);
  scene.textures.addCanvas(targetKey, canvas);
}

/** Points `targetKey` at the already-loaded raw image with no resizing - used for monster art,
 * which (unlike tiles) isn't required to match TILE_SIZE. Smooth-filtered despite the game's
 * global pixelArt:true setting, since nearest-neighbor scaling of painted linework looks noisy
 * rather than crisp. */
function replaceWithNativeArt(scene: Phaser.Scene, rawKey: string, targetKey: string): void {
  if (scene.textures.exists(targetKey)) scene.textures.remove(targetKey);
  scene.textures.addImage(targetKey, scene.textures.get(rawKey).getSourceImage() as HTMLImageElement);
  scene.textures.get(targetKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
}
