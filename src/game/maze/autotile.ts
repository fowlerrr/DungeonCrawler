import { TileType, type TileGrid } from "./types";

export type FloorTileVariant = "open" | "edge1" | "edgeOpposite" | "corner" | "three" | "four";

export interface FloorTileTransform {
  variant: FloorTileVariant;
  rotationDeg: 0 | 90 | 180 | 270;
}

/**
 * Classifies a floor cell's wall-adjacency into which of a hand-painted tileset's 6 base
 * wall-border shapes to use, and how many degrees (clockwise) to rotate it - e.g. a cell with
 * a wall only to its west uses the same "single edge" art as one with a wall only to its
 * north, just rotated 270°. This is what makes a ~6-image tileset cover all 16 possible
 * N/E/S/W wall configurations without needing a separately-drawn tile for each.
 *
 * This mirrors how the source tileset (Penzilla's "Dungeon Crawler Map Pack") is actually
 * built: wall-border decoration is drawn onto the *floor* cell bordering a wall, not onto the
 * wall cell itself - a wall cell's interior is deliberately undetailed in that art, since nothing
 * ever renders it without an adjacent floor cell's border tile alongside it. Has no
 * Phaser/rendering dependency, so this is unit-testable without a running game - see
 * RealArtTextures.ts for how the returned variant maps to an actual texture key.
 */
export function classifyFloorTile(grid: TileGrid, tx: number, ty: number): FloorTileTransform {
  const isWall = (x: number, y: number): boolean => {
    const row = grid[y];
    return row === undefined || row[x] === undefined || row[x] === TileType.Wall;
  };

  const n = isWall(tx, ty - 1);
  const e = isWall(tx + 1, ty);
  const s = isWall(tx, ty + 1);
  const w = isWall(tx - 1, ty);
  const count = [n, e, s, w].filter(Boolean).length;

  if (count === 0) return { variant: "open", rotationDeg: 0 };
  if (count === 4) return { variant: "four", rotationDeg: 0 };

  if (count === 1) {
    if (e) return { variant: "edge1", rotationDeg: 0 };
    if (s) return { variant: "edge1", rotationDeg: 90 };
    if (w) return { variant: "edge1", rotationDeg: 180 };
    return { variant: "edge1", rotationDeg: 270 }; // n
  }

  if (count === 2) {
    if (e && w) return { variant: "edgeOpposite", rotationDeg: 0 };
    if (n && s) return { variant: "edgeOpposite", rotationDeg: 90 };
    if (n && e) return { variant: "corner", rotationDeg: 0 };
    if (e && s) return { variant: "corner", rotationDeg: 90 };
    if (s && w) return { variant: "corner", rotationDeg: 180 };
    return { variant: "corner", rotationDeg: 270 }; // n && w
  }

  // count === 3: exactly one side is open to floor.
  if (!s) return { variant: "three", rotationDeg: 0 }; // walls on n, e, w
  if (!w) return { variant: "three", rotationDeg: 90 }; // walls on n, e, s
  if (!n) return { variant: "three", rotationDeg: 180 }; // walls on e, s, w
  return { variant: "three", rotationDeg: 270 }; // walls on n, s, w
}
