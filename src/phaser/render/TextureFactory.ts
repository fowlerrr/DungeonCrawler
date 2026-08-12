import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";

/**
 * Generates simple placeholder textures at runtime (colored shapes) so the game is playable
 * before real art exists. Swap for a real tileset later by loading it in PreloadScene and
 * reusing these same texture keys - nothing downstream needs to change.
 */
export function generatePlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const S = TILE_SIZE;
  const C = S / 2;

  const rect = (key: string, color: number, border?: number) => {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, S, S);
    if (border !== undefined) {
      g.lineStyle(2, border, 1);
      g.strokeRect(1, 1, S - 2, S - 2);
    }
    g.generateTexture(key, S, S);
  };

  /** A flat fill with a lighter inset panel, for a touch of depth without needing real
   * lighting - much of the maze is just this tile repeated, so it's worth the extra pass. */
  const shadedRect = (key: string, color: number, inset: number, border?: number) => {
    g.clear();
    g.fillStyle(color, 1);
    g.fillRect(0, 0, S, S);
    g.fillStyle(inset, 1);
    g.fillRect(3, 3, S - 6, S - 6);
    if (border !== undefined) {
      g.lineStyle(1, border, 0.6);
      g.strokeRect(1, 1, S - 2, S - 2);
    }
    g.generateTexture(key, S, S);
  };

  const circle = (key: string, color: number, radius: number, border?: number) => {
    g.clear();
    g.fillStyle(color, 1);
    g.fillCircle(C, C, radius);
    if (border !== undefined) {
      g.lineStyle(2, border, 1);
      g.strokeCircle(C, C, radius);
    }
    g.generateTexture(key, S, S);
  };

  /** A wedge pointing right by default - callers rotate it to match facing direction. */
  const wedge = (key: string, color: number) => {
    g.clear();
    g.fillStyle(color, 0.85);
    g.fillTriangle(2, 2, S - 2, C, 2, S - 2);
    g.generateTexture(key, S, S);
  };

  // Maze tiles - shaded for a little depth instead of a completely flat fill. Floor has one
  // key per MazeRenderer's autotile variant (see classifyFloorTile) - the placeholder doesn't
  // need to actually look different per variant, it just needs every key real art might not
  // end up covering to still resolve to something.
  for (const key of ["tile_floor_open", "tile_floor_edge1", "tile_floor_corner", "tile_floor_three", "tile_floor_edge_opp", "tile_floor_four"]) {
    shadedRect(key, 0x232330, 0x2b2b3a);
  }
  shadedRect("tile_wall", 0x0e0e14, 0x1c1c28, 0x323244);
  rect("tile_exit", 0xf5d76e, 0xffffff);

  // Player - soft outer glow ring behind a bright core reads better than a flat disc.
  g.clear();
  g.fillStyle(0x4ea8ff, 0.35);
  g.fillCircle(C, C, 15);
  g.fillStyle(0x4ea8ff, 1);
  g.fillCircle(C, C, 11);
  g.lineStyle(2, 0xffffff, 1);
  g.strokeCircle(C, C, 11);
  g.generateTexture("player", S, S);

  // Slime - a squashed blob, sits low and wide rather than a plain circle.
  g.clear();
  g.fillStyle(0x3fae5c, 1);
  g.fillEllipse(C, C + 3, 22, 15);
  g.lineStyle(2, 0x1f5c30, 1);
  g.strokeEllipse(C, C + 3, 22, 15);
  g.fillStyle(0xbdf5cc, 0.8);
  g.fillCircle(C - 3, C, 1.5);
  g.fillCircle(C + 3, C, 1.5);
  g.generateTexture("monster_slime", S, S);

  // Goblin - a body circle with two ear spikes, so it silhouettes differently from a slime.
  g.clear();
  g.fillStyle(0xd94f4f, 1);
  g.fillTriangle(C - 10, C - 4, C - 4, C - 12, C - 2, C - 2);
  g.fillTriangle(C + 10, C - 4, C + 4, C - 12, C + 2, C - 2);
  g.fillCircle(C, C, 10);
  g.lineStyle(2, 0x3a0000, 1);
  g.strokeCircle(C, C, 10);
  g.generateTexture("monster_goblin", S, S);

  // Boss - larger core with a spiked ring, unmistakably the biggest thing in the room.
  g.clear();
  g.fillStyle(0x8a2be2, 1);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const bx = C + Math.cos(angle) * 15;
    const by = C + Math.sin(angle) * 15;
    g.fillCircle(bx, by, 3);
  }
  g.fillCircle(C, C, 15);
  g.lineStyle(2, 0x2e0854, 1);
  g.strokeCircle(C, C, 15);
  g.generateTexture("monster_boss", S, S);

  // Pickups / interactables
  g.clear();
  g.fillStyle(0xb5772b, 1);
  g.fillRect(2, S / 2 - 2, S - 4, S / 2 - 4);
  g.fillStyle(0x8f5a1e, 1);
  g.fillRect(2, 6, S - 4, S / 2 - 8);
  g.lineStyle(2, 0x5c3a14, 1);
  g.strokeRect(2, 6, S - 4, S - 12);
  g.fillStyle(0xf5d76e, 1);
  g.fillCircle(C, S / 2, 2);
  g.generateTexture("chest", S, S);

  const door = (key: string, color: number, accent: number) => {
    g.clear();
    g.fillStyle(0x1a1a24, 1);
    g.fillRect(0, 0, S, S);
    g.fillStyle(color, 1);
    g.fillRect(4, 3, S - 8, S - 6);
    g.lineStyle(2, accent, 1);
    g.strokeRect(4, 3, S - 8, S - 6);
    g.fillStyle(accent, 1);
    g.fillRect(C - 1, 6, 2, S - 12);
    g.generateTexture(key, S, S);
  };
  door("door_red", 0x992222, 0xffdddd);
  door("door_blue", 0x224499, 0xddddff);
  door("door_green", 0x228844, 0xddffdd);
  door("door_yellow", 0x998822, 0xffffdd);
  door("door_purple", 0x662299, 0xe5ccff);
  door("door_orange", 0xcc6622, 0xffe0cc);
  door("door_cyan", 0x22999c, 0xccffff);
  door("door_pink", 0xcc4488, 0xffccee);
  door("door_teal", 0x227766, 0xccffee);
  door("door_brown", 0x6b4a2b, 0xe5c9a8);
  door("door_exit", 0x555555, 0xf5d76e);

  /** A ring with a small tooth, closer to a real key silhouette than a plain diamond. */
  const key_ = (id: string, color: number) => {
    g.clear();
    g.lineStyle(3, color, 1);
    g.strokeCircle(C - 3, C, 5);
    g.lineStyle(3, color, 1);
    g.lineBetween(C + 1, C, C + 9, C);
    g.lineBetween(C + 9, C, C + 9, C + 4);
    g.lineBetween(C + 5, C, C + 5, C + 3);
    g.generateTexture(id, S, S);
  };
  key_("key_red", 0xff5555);
  key_("key_blue", 0x5588ff);
  key_("key_green", 0x55dd77);
  key_("key_yellow", 0xffdd55);
  key_("key_purple", 0xaa66ff);
  key_("key_orange", 0xff9944);
  key_("key_cyan", 0x44eeff);
  key_("key_pink", 0xff77bb);
  key_("key_teal", 0x55ddcc);
  key_("key_brown", 0xa87d55);
  key_("key_exit", 0xf5d76e);

  circle("pickup_health", 0x4cd964, 8, 0x1c5c2a);
  wedge("attack_swipe", 0xffffff);

  // Item icons (used by inventory UI, not placed as world sprites - chests grant items directly)
  g.clear();
  g.fillStyle(0x9fb4c7, 1);
  g.fillRect(C - 2, 4, 4, S - 14);
  g.fillTriangle(C - 4, 4, C + 4, 4, C, 0);
  g.fillStyle(0x445566, 1);
  g.fillRect(C - 6, S - 11, 12, 4);
  g.generateTexture("item_weapon", S, S);

  g.clear();
  g.fillStyle(0xc79f4f, 1);
  g.fillPoints(
    [
      { x: C, y: 3 },
      { x: S - 5, y: 8 },
      { x: S - 5, y: C + 2 },
      { x: C, y: S - 3 },
      { x: 5, y: C + 2 },
      { x: 5, y: 8 },
    ],
    true,
  );
  g.lineStyle(2, 0x664d1c, 1);
  g.strokePoints(
    [
      { x: C, y: 3 },
      { x: S - 5, y: 8 },
      { x: S - 5, y: C + 2 },
      { x: C, y: S - 3 },
      { x: 5, y: C + 2 },
      { x: 5, y: 8 },
    ],
    true,
  );
  g.generateTexture("item_armor", S, S);

  g.clear();
  g.lineStyle(4, 0xd88fe0, 1);
  g.strokeCircle(C, C, 9);
  g.fillStyle(0xf5d76e, 1);
  g.fillCircle(C, C - 9, 2.5);
  g.generateTexture("item_accessory", S, S);

  circle("item_potion", 0xff6b6b, 9, 0x7a1f1f);

  g.destroy();
}
