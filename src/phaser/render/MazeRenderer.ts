import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";
import { classifyFloorTile, type FloorTileVariant } from "../../game/maze/autotile";
import { TileType, type TileGrid } from "../../game/maze/types";

export interface RenderedMaze {
  wallGroup: Phaser.Physics.Arcade.StaticGroup;
  floorLayer: Phaser.GameObjects.Group;
  widthPx: number;
  heightPx: number;
}

const FLOOR_TEXTURE_KEYS: Record<FloorTileVariant, string> = {
  open: "tile_floor_open",
  edge1: "tile_floor_edge1",
  edgeOpposite: "tile_floor_edge_opp",
  corner: "tile_floor_corner",
  three: "tile_floor_three",
  four: "tile_floor_four",
};

/** Draws a TileGrid as placed images (not a Phaser Tilemap - simpler to reason about for a
 * grid this size, and gives us free Arcade Physics collision on the wall group). Floor cells
 * are autotiled per classifyFloorTile - which shape (and rotation) of wall-border decoration
 * to draw depends on which neighbors are walls, since the source art draws that decoration
 * onto the floor cell, not the wall cell. */
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
        const { variant, rotationDeg } = classifyFloorTile(grid, x, y);
        const image = scene.add.image(px, py, FLOOR_TEXTURE_KEYS[variant]);
        image.setAngle(rotationDeg);
        floorLayer.add(image);
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
