import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";
import type { FogOfWar } from "../../game/systems/FogOfWar";

const VISITED_ALPHA = 0.65;

/** Draws unexplored tiles fully black and explored-but-not-currently-visible tiles dimmed,
 * leaving currently visible tiles clear - the classic "remembered map" look. */
export class FogOfWarRenderer {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);
  }

  redraw(fog: FogOfWar): void {
    this.graphics.clear();
    for (let y = 0; y < fog.height; y++) {
      for (let x = 0; x < fog.width; x++) {
        if (fog.isVisible(x, y)) continue;
        const alpha = fog.isVisited(x, y) ? VISITED_ALPHA : 1;
        this.graphics.fillStyle(0x000000, alpha);
        this.graphics.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
