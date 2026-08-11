import { TILE_SIZE } from "../../config/constants";
import type { MazeGraph } from "./graph";
import { TileType, type Cell, type TileGrid } from "./types";

/**
 * Converts the logical cell/edge graph into a renderable tile grid using the classic
 * "doubled grid" technique: each maze cell becomes one floor tile at (2x+1, 2y+1), and each
 * open edge carves the wall tile directly between the two cells it connects. Everything else
 * stays a wall. This gives a grid Phaser can render as ordinary tiles/collision bodies.
 */
export function rasterizeMaze(graph: MazeGraph): TileGrid {
  const gridW = graph.cols * 2 + 1;
  const gridH = graph.rows * 2 + 1;
  const grid: TileGrid = Array.from({ length: gridH }, () => Array<TileType>(gridW).fill(TileType.Wall));

  for (let y = 0; y < graph.rows; y++) {
    for (let x = 0; x < graph.cols; x++) {
      grid[2 * y + 1][2 * x + 1] = TileType.Floor;
    }
  }

  for (const edge of graph.edges) {
    if (!edge.open) continue;
    const { a, b } = edge;
    if (a.y === b.y) {
      const minX = Math.min(a.x, b.x);
      grid[2 * a.y + 1][2 * minX + 2] = TileType.Floor;
    } else {
      const minY = Math.min(a.y, b.y);
      grid[2 * minY + 2][2 * a.x + 1] = TileType.Floor;
    }
  }

  return grid;
}

/** Tile-grid coordinates of a maze cell's floor tile. */
export function cellToTile(c: Cell): { tx: number; ty: number } {
  return { tx: c.x * 2 + 1, ty: c.y * 2 + 1 };
}

/** Pixel coordinates of the center of a tile, for placing sprites. */
export function tileCenterPx(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
}

/** Pixel coordinates of the center of a maze cell. */
export function cellCenterPx(c: Cell): { x: number; y: number } {
  const { tx, ty } = cellToTile(c);
  return tileCenterPx(tx, ty);
}

/** Which tile a pixel coordinate falls in. */
export function pxToTile(x: number, y: number): { tx: number; ty: number } {
  return { tx: Math.floor(x / TILE_SIZE), ty: Math.floor(y / TILE_SIZE) };
}

/** Tile-grid coordinates of the connector tile an edge carves open between its two cells -
 * i.e. where a door for that edge should be placed. Mirrors the carving logic in rasterizeMaze. */
export function edgeConnectorTile(a: Cell, b: Cell): { tx: number; ty: number } {
  if (a.y === b.y) {
    const minX = Math.min(a.x, b.x);
    return { tx: 2 * minX + 2, ty: 2 * a.y + 1 };
  }
  const minY = Math.min(a.y, b.y);
  return { tx: 2 * a.x + 1, ty: 2 * minY + 2 };
}
