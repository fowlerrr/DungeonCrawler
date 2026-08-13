/** Pure maze data types - no Phaser here, so this stays testable with plain Node/Vitest. */

export const TileType = {
  Wall: 0,
  Floor: 1,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

/** grid[y][x], one entry per rendered tile. */
export type TileGrid = TileType[][];

/** A logical maze cell, in cell coordinates (not tile/pixel coordinates). */
export interface Cell {
  x: number;
  y: number;
}

export type Direction = "N" | "S" | "E" | "W";

export const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  S: { dx: 0, dy: 1 },
  E: { dx: 1, dy: 0 },
  W: { dx: -1, dy: 0 },
};

/** Turns a cell into a string so it can be used as a Map/Set key - plain object identity
 * wouldn't work since two `{x,y}` objects with the same coordinates aren't `===` equal. */
export function cellKey(c: Cell): string {
  return `${c.x},${c.y}`;
}
