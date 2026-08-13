import Phaser from "phaser";
import { TileType, type TileGrid } from "../../game/maze/types";
import type { FogOfWar } from "../../game/systems/FogOfWar";
import { computeMinimapTileSize } from "../../game/util/math";

const MAX_MINIMAP_TILE_PX = 4;

/** Bright, saturated marker colors distinct from the muted wall/floor palette (see
 * DOOR_COLORS in locks.ts) - a door's minimap dot doesn't need to be pixel-perfect to its actual
 * in-world tint, just recognizably "that door's color" at a glance. */
const DOOR_MARKER_COLOR_HEX: Record<string, number> = {
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
};

export interface MinimapDoor {
  tileX: number;
  tileY: number;
  color: string;
}

/** Small fixed-position overlay (screen space, not world space) showing only visited tiles,
 * plus the player's current position and any locked doors found so far - fills in as the fog of
 * war reveals the maze. Lives entirely within a caller-supplied origin/width so it never overlaps
 * the maze viewport. */
export class MinimapRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private originX: number;
  private originY: number;
  private maxWidth: number;

  constructor(scene: Phaser.Scene, originX: number, originY: number, maxWidth: number) {
    this.originX = originX;
    this.originY = originY;
    this.maxWidth = maxWidth;
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(200);
  }

  /** Repaints the minimap from scratch: a dark backing panel, every visited tile shaded by
   * whether it's a wall, a colored dot for each still-locked door whose tile has been found, and
   * the player's current tile marked with a bright white ring so it never blends into the rest
   * of the palette. */
  redraw(grid: TileGrid, fog: FogOfWar, playerTx: number, playerTy: number, doors: readonly MinimapDoor[] = []): void {
    this.graphics.clear();
    const tilePx = computeMinimapTileSize(grid[0].length, this.maxWidth, MAX_MINIMAP_TILE_PX);
    const w = grid[0].length * tilePx;
    const h = grid.length * tilePx;

    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(this.originX - 2, this.originY - 2, w + 4, h + 4);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (!fog.isVisited(x, y)) continue;
        const isWall = grid[y][x] === TileType.Wall;
        this.graphics.fillStyle(isWall ? 0x333344 : 0x8899aa, 1);
        this.graphics.fillRect(this.originX + x * tilePx, this.originY + y * tilePx, tilePx, tilePx);
      }
    }

    for (const door of doors) {
      if (!fog.isVisited(door.tileX, door.tileY)) continue;
      this.graphics.fillStyle(DOOR_MARKER_COLOR_HEX[door.color] ?? 0xf5d76e, 1);
      this.graphics.fillRect(this.originX + door.tileX * tilePx, this.originY + door.tileY * tilePx, tilePx, tilePx);
    }

    // A plain same-size tile fill (the old approach) reads as just another floor tile at this
    // scale - a white-cored dot with a dark ring around it stays visibly "the player" regardless
    // of what color tile or door marker happens to be underneath it.
    const playerCx = this.originX + playerTx * tilePx + tilePx / 2;
    const playerCy = this.originY + playerTy * tilePx + tilePx / 2;
    const playerRadius = tilePx * 0.9 + 1.5;
    this.graphics.fillStyle(0x14141c, 1);
    this.graphics.fillCircle(playerCx, playerCy, playerRadius + 1);
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(playerCx, playerCy, playerRadius);
  }

  /** Releases the underlying Phaser graphics object, e.g. on scene shutdown. */
  destroy(): void {
    this.graphics.destroy();
  }
}
