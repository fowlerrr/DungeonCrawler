import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";
import { TileType, type TileGrid } from "../../game/maze/types";

export interface RenderedMaze {
  wallGroup: Phaser.Physics.Arcade.StaticGroup;
  floorLayer: Phaser.GameObjects.Group;
  widthPx: number;
  heightPx: number;
}

/** Draws a TileGrid as placed images (not a Phaser Tilemap - simpler to reason about for a
 * grid this size, and gives us free Arcade Physics collision on the wall group). */
export function renderMaze(scene: Phaser.Scene, grid: TileGrid): RenderedMaze {
  const floorLayer = scene.add.group();
  const wallGroup = scene.physics.add.staticGroup();

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const px = x * TILE_SIZE + TILE_SIZE / 2;
      const py = y * TILE_SIZE + TILE_SIZE / 2;
      if (grid[y][x] === TileType.Wall) {
        const wall = wallGroup.create(px, py, "tile_wall") as Phaser.Physics.Arcade.Sprite;
        wall.refreshBody();
      } else {
        floorLayer.add(scene.add.image(px, py, "tile_floor"));
      }
    }
  }

  return {
    wallGroup,
    floorLayer,
    widthPx: grid[0].length * TILE_SIZE,
    heightPx: grid.length * TILE_SIZE,
  };
}
