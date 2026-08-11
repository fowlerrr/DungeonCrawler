import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";

/**
 * Generates simple placeholder textures at runtime (colored shapes) so the game is playable
 * before real art exists. Swap for a real tileset later by loading it in PreloadScene and
 * reusing these same texture keys - nothing downstream needs to change.
 */
export function generatePlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });

  const rect = (key: string, color: number, border?: number) => {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    if (border !== undefined) {
      g.lineStyle(2, border, 1);
      g.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  };

  const circle = (key: string, color: number, radius: number, border?: number) => {
    g.clear();
    g.fillStyle(color, 1);
    g.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, radius);
    if (border !== undefined) {
      g.lineStyle(2, border, 1);
      g.strokeCircle(TILE_SIZE / 2, TILE_SIZE / 2, radius);
    }
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  };

  const diamond = (key: string, color: number) => {
    g.clear();
    g.fillStyle(color, 1);
    const c = TILE_SIZE / 2;
    const s = TILE_SIZE / 4;
    g.fillPoints(
      [
        { x: c, y: c - s },
        { x: c + s, y: c },
        { x: c, y: c + s },
        { x: c - s, y: c },
      ],
      true,
    );
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  };

  /** A wedge pointing right by default - callers rotate it to match facing direction. */
  const wedge = (key: string, color: number) => {
    g.clear();
    g.fillStyle(color, 0.85);
    g.fillTriangle(2, 2, TILE_SIZE - 2, TILE_SIZE / 2, 2, TILE_SIZE - 2);
    g.generateTexture(key, TILE_SIZE, TILE_SIZE);
  };

  // Maze tiles
  rect("tile_floor", 0x2b2b3a);
  rect("tile_wall", 0x14141c);
  rect("tile_exit", 0xf5d76e, 0xffffff);

  // Actors
  circle("player", 0x4ea8ff, 12, 0xffffff);
  circle("monster_basic", 0xd94f4f, 11, 0x3a0000);
  circle("monster_boss", 0x8a2be2, 15, 0x2e0854);

  // Pickups / interactables
  rect("chest", 0xb5772b, 0x5c3a14);
  rect("door_red", 0x992222, 0xffdddd);
  rect("door_blue", 0x224499, 0xddddff);
  rect("door_green", 0x228844, 0xddffdd);
  rect("door_yellow", 0x998822, 0xffffdd);
  rect("door_exit", 0x555555, 0xf5d76e);
  diamond("key_red", 0xff5555);
  diamond("key_blue", 0x5588ff);
  diamond("key_green", 0x55dd77);
  diamond("key_yellow", 0xffdd55);
  diamond("key_exit", 0xf5d76e);

  circle("pickup_health", 0x4cd964, 8, 0x1c5c2a);
  wedge("attack_swipe", 0xffffff);

  // Item icons (used by inventory UI, not placed as world sprites - chests grant items directly)
  rect("item_weapon", 0x9fb4c7, 0x445566);
  rect("item_armor", 0xc79f4f, 0x664d1c);
  rect("item_accessory", 0xd88fe0, 0x6a3d70);
  circle("item_potion", 0xff6b6b, 9, 0x7a1f1f);

  g.destroy();
}
