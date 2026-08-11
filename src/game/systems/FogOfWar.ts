/** Pure vision-radius fog of war over the tile grid - no line-of-sight occlusion in v1 (a
 * player can technically "see" a short distance through a thin wall). Flagged as a v2
 * enhancement; radius-only is simpler to implement and reason about for a first pass. */
export class FogOfWar {
  readonly width: number;
  readonly height: number;
  private visited: boolean[][];
  private visible: boolean[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.visited = FogOfWar.emptyGrid(width, height);
    this.visible = FogOfWar.emptyGrid(width, height);
  }

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

  isVisible(tx: number, ty: number): boolean {
    return this.visible[ty]?.[tx] ?? false;
  }

  isVisited(tx: number, ty: number): boolean {
    return this.visited[ty]?.[tx] ?? false;
  }
}
