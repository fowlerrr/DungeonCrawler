/** Scales a vector to length 1 (same direction, magnitude 1) - the zero vector maps to itself
 * rather than dividing by zero, since "no direction" is a valid input (e.g. a monster standing
 * still) that shouldn't crash. */
export function normalize(x: number, y: number): { x: number; y: number } {
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

/** Largest per-tile pixel size (up to `maxTilePx`) that fits `gridWidthTiles` tiles within
 * `maxWidthPx`, never smaller than 1px. Used to keep the minimap inside its sidebar panel
 * regardless of how large the maze gets at higher levels. */
export function computeMinimapTileSize(gridWidthTiles: number, maxWidthPx: number, maxTilePx: number): number {
  if (gridWidthTiles <= 0) return maxTilePx;
  return Math.max(1, Math.min(maxTilePx, Math.floor(maxWidthPx / gridWidthTiles)));
}
