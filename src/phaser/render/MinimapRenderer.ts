import Phaser from "phaser";
import { TileType, type TileGrid } from "../../game/maze/types";
import type { FogOfWar } from "../../game/systems/FogOfWar";

const MINIMAP_TILE_PX = 4;
const MINIMAP_MARGIN = 12;

/** Small fixed-position overlay (screen space, not world space) showing only visited tiles,
 * plus the player's current position - fills in as the fog of war reveals the maze. */
export class MinimapRenderer {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(200);
  }

  redraw(grid: TileGrid, fog: FogOfWar, playerTx: number, playerTy: number): void {
    this.graphics.clear();
    const originX = MINIMAP_MARGIN;
    const originY = MINIMAP_MARGIN;
    const w = grid[0].length * MINIMAP_TILE_PX;
    const h = grid.length * MINIMAP_TILE_PX;

    this.graphics.fillStyle(0x000000, 0.5);
    this.graphics.fillRect(originX - 2, originY - 2, w + 4, h + 4);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (!fog.isVisited(x, y)) continue;
        const isWall = grid[y][x] === TileType.Wall;
        this.graphics.fillStyle(isWall ? 0x333344 : 0x8899aa, 1);
        this.graphics.fillRect(
          originX + x * MINIMAP_TILE_PX,
          originY + y * MINIMAP_TILE_PX,
          MINIMAP_TILE_PX,
          MINIMAP_TILE_PX,
        );
      }
    }

    this.graphics.fillStyle(0x4ea8ff, 1);
    this.graphics.fillRect(
      originX + playerTx * MINIMAP_TILE_PX,
      originY + playerTy * MINIMAP_TILE_PX,
      MINIMAP_TILE_PX,
      MINIMAP_TILE_PX,
    );
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
