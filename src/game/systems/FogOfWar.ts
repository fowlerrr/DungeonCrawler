/** Pure vision-radius fog of war over the tile grid - no line-of-sight occlusion in v1 (a
 * player can technically "see" a short distance through a thin wall). Flagged as a v2
 * enhancement; radius-only is simpler to implement and reason about for a first pass. */
export class FogOfWar {
  readonly width: number;
  readonly height: number;
  private visited: boolean[][];
  private visible: boolean[][];

  /** Starts with nothing visited or visible - call update() once the player's position is known. */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.visited = FogOfWar.emptyGrid(width, height);
    this.visible = FogOfWar.emptyGrid(width, height);
  }

  /** Builds a width x height grid of `false`, used to reset visited/visible. */
  private static emptyGrid(width: number, height: number): boolean[][] {
    return Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  }

  /** Recomputes what's currently visible from (centerTx, centerTy), and marks it visited. */
  update(centerTx: number, centerTy: number, radiusTiles: number): void {
    this.visible = FogOfWar.emptyGrid(this.width, this.height);
    const radiusSq = radiusTiles * radiusTiles;
    const minX = Math.max(0, centerTx - radiusTiles);
    const maxX = Math.min(this.width - 1, centerTx + radiusTiles);
    const minY = Math.max(0, centerTy - radiusTiles);
    const maxY = Math.min(this.height - 1, centerTy + radiusTiles);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - centerTx;
        const dy = y - centerTy;
        if (dx * dx + dy * dy <= radiusSq) {
          this.visible[y][x] = true;
          this.visited[y][x] = true;
        }
      }
    }
  }

  /** Whether this tile is inside the player's current vision radius (out-of-bounds tiles are
   * never visible). */
  isVisible(tx: number, ty: number): boolean {
    return this.visible[ty]?.[tx] ?? false;
  }

  /** Whether this tile has ever been seen - stays true after the player moves away, so explored
   * areas remain on the map (dimmed) rather than re-hiding behind the fog. */
  isVisited(tx: number, ty: number): boolean {
    return this.visited[ty]?.[tx] ?? false;
  }
}
