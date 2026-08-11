import Phaser from "phaser";
import { TileType, type TileGrid } from "../../game/maze/types";
import type { FogOfWar } from "../../game/systems/FogOfWar";
import { computeMinimapTileSize } from "../../game/util/math";

const MAX_MINIMAP_TILE_PX = 4;

/** Small fixed-position overlay (screen space, not world space) showing only visited tiles,
 * plus the player's current position - fills in as the fog of war reveals the maze. Lives
 * entirely within a caller-supplied origin/width so it never overlaps the maze viewport. */
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

  redraw(grid: TileGrid, fog: FogOfWar, playerTx: number, playerTy: number): void {
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

    this.graphics.fillStyle(0x4ea8ff, 1);
    this.graphics.fillRect(this.originX + playerTx * tilePx, this.originY + playerTy * tilePx, tilePx, tilePx);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
