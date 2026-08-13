import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";
import { MONSTER_ART_FILENAMES } from "../../game/data/monsterArt";

const TILES_MEDIUM = "assets/tilesets/Assets/Tiles_Medium";
const MONSTER_PACK = "assets/sprites/negative-monster-pack";

/**
 * Prototype swap-in for two free hand-drawn/hand-painted itch.io packs (Penzilla's "Dungeon
 * Crawler Map Pack" for tiles, Negative Inspiration's "Ever Growing Monster Pack" for
 * creatures), replacing a handful of generatePlaceholderTextures's procedural keys with real
 * art - everything downstream only ever references these by texture key, so nothing else
 * needs to change to try this on or roll it back.
 *
 * The tileset turned out to be an edge/corner autotile set, not one texture per wall cell:
 * every source tile is fundamentally the floor art, with a brick border drawn only along
 * whichever edges face a wall. classifyFloorTile (src/game/maze/autotile.ts) figures out which
 * of the 6 base shapes below a floor cell needs and how to rotate it; MazeRenderer applies
 * that. Wall *cells* just get a flat fill sampled from the tileset's own wall-interior color -
 * the art never draws detail there either, since nothing in the source pack ever shows a wall
 * without an adjacent floor cell's border tile doing the actual decoration.
 *
 * Monster and player art keep their native resolution and aspect ratio rather than being baked
 * to TILE_SIZE - both sprites' collision circles are already independent of texture size (see
 * MonsterSprite/PlayerSprite), so there's no tiling requirement forcing it down, and letting it
 * render larger shows off far more of the linework than the tile grid's 32px budget ever could.
 */
/** Queues every real-art source image (tiles, monsters, player) for loading, under `raw_`-
 * prefixed keys so applyRealArt can process them before they replace any placeholder. */
export function preloadRealArt(scene: Phaser.Scene): void {
  scene.load.image("raw_floor_open", `${TILES_MEDIUM}/Tile01_Floor.png`);
  scene.load.image("raw_floor_edge1", `${TILES_MEDIUM}/Tile03_Wall.png`);
  scene.load.image("raw_floor_corner", `${TILES_MEDIUM}/Tile04_Wall.png`);
  scene.load.image("raw_floor_three", `${TILES_MEDIUM}/Tile05_Wall.png`);
  scene.load.image("raw_floor_edge_opp", `${TILES_MEDIUM}/Tile08_Wall.png`);
  scene.load.image("raw_floor_four", `${TILES_MEDIUM}/Tile18_Wall.png`);
  scene.load.image("raw_door_exit", "assets/tilesets/Assets/Decor/Door.png");

  for (const [spriteKey, filename] of Object.entries(MONSTER_ART_FILENAMES)) {
    scene.load.image(`raw_${spriteKey}`, `${MONSTER_PACK}/${filename}`);
  }
  scene.load.image("raw_player", `${MONSTER_PACK}/pirate_01.png`);
}

/** Turns the raw loaded images into the actual in-game texture keys - tiles get baked down to
 * TILE_SIZE, monster/player art keeps native resolution, and the wall fill is sampled from the
 * tileset itself. Must run after preloadRealArt's images have finished loading. */
export function applyRealArt(scene: Phaser.Scene): void {
  bakeToTile(scene, "raw_floor_open", "tile_floor_open");
  bakeToTile(scene, "raw_floor_edge1", "tile_floor_edge1");
  bakeToTile(scene, "raw_floor_corner", "tile_floor_corner");
  bakeToTile(scene, "raw_floor_three", "tile_floor_three");
  bakeToTile(scene, "raw_floor_edge_opp", "tile_floor_edge_opp");
  bakeToTile(scene, "raw_floor_four", "tile_floor_four");
  bakeToTile(scene, "raw_door_exit", "door_exit");

  bakeWallFill(scene, "raw_floor_four", "tile_wall");

  for (const spriteKey of Object.keys(MONSTER_ART_FILENAMES)) {
    replaceWithNativeArt(scene, `raw_${spriteKey}`, spriteKey);
  }
  replaceWithNativeArt(scene, "raw_player", "player");
}

/** Downscales a loaded image onto a TILE_SIZE x TILE_SIZE canvas at load time, then registers
 * that as `targetKey`, replacing whatever texture (the procedural placeholder, in practice)
 * already used it. */
function bakeToTile(scene: Phaser.Scene, rawKey: string, targetKey: string): void {
  const source = scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
  const canvas = downscaleSmooth(source, TILE_SIZE, TILE_SIZE);

  if (scene.textures.exists(targetKey)) scene.textures.remove(targetKey);
  scene.textures.addCanvas(targetKey, canvas);
}

/** A wall *cell's* fill - sampled from the source tileset's own wall-interior color (a corner
 * of the "surrounded on all sides" tile, well away from its floor patch and brick border) so it
 * actually matches the palette, rather than a texture in its own right - see the module doc for
 * why wall cells don't need real art. */
function bakeWallFill(scene: Phaser.Scene, rawKey: string, targetKey: string): void {
  const source = scene.textures.get(rawKey).getSourceImage() as HTMLImageElement;
  const sample = document.createElement("canvas");
  sample.width = source.naturalWidth;
  sample.height = source.naturalHeight;
  const sampleCtx = sample.getContext("2d")!;
  sampleCtx.drawImage(source, 0, 0);
  const [r, g, b, a] = sampleCtx.getImageData(10, 10, 1, 1).data;

  const canvas = document.createElement("canvas");
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);

  if (scene.textures.exists(targetKey)) scene.textures.remove(targetKey);
  scene.textures.addCanvas(targetKey, canvas);
}

/** Canvas 2D's drawImage does one bilinear sample per output pixel, which only blends a ~2x2
 * neighborhood of source texels - fine for a modest resize, but these tiles are a ~15.6x
 * downscale (500px paintings onto a 32px tile) in a single step, which undersamples so badly
 * that smooth painted color turns into speckled noise ("dots" instead of a solid tile).
 * Repeatedly halving until within 2x of the target, then doing the final draw, keeps every
 * individual step inside bilinear's actual quality range - the standard fix for high-ratio
 * canvas downscaling (equivalent to generating a mipmap chain by hand). */
function downscaleSmooth(source: HTMLImageElement, targetWidth: number, targetHeight: number): HTMLCanvasElement {
  let currentWidth = source.naturalWidth;
  let currentHeight = source.naturalHeight;
  let current: CanvasImageSource = source;

  while (currentWidth / 2 >= targetWidth && currentHeight / 2 >= targetHeight) {
    const stepWidth = Math.floor(currentWidth / 2);
    const stepHeight = Math.floor(currentHeight / 2);
    const step = document.createElement("canvas");
    step.width = stepWidth;
    step.height = stepHeight;
    const stepCtx = step.getContext("2d")!;
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = "high";
    stepCtx.drawImage(current, 0, 0, stepWidth, stepHeight);
    current = step;
    currentWidth = stepWidth;
    currentHeight = stepHeight;
  }

  const final = document.createElement("canvas");
  final.width = targetWidth;
  final.height = targetHeight;
  const finalCtx = final.getContext("2d")!;
  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = "high";
  finalCtx.drawImage(current, 0, 0, targetWidth, targetHeight);
  return final;
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
