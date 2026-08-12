import * as THREE from "three";
import type { FogOfWar } from "../game/systems/FogOfWar";
import { TileType, type TileGrid } from "../game/maze/types";
import { CEILING_Y, PALETTE, WALL_HEIGHT } from "./constants3d";

const VISIBLE_FLOOR_COLOR = new THREE.Color(PALETTE.floor);
const DIM_FLOOR_COLOR = VISIBLE_FLOOR_COLOR.clone().multiplyScalar(0.35);
const VISIBLE_WALL_COLOR = new THREE.Color(PALETTE.wallTop);
const DIM_WALL_COLOR = VISIBLE_WALL_COLOR.clone().multiplyScalar(0.35);
const HIDDEN_SCALE = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Renders the tile grid as two InstancedMeshes (one per floor tile, one per wall tile) rather
 * than a handful of large merged shapes, so each tile can be individually dimmed/hidden per the
 * fog-of-war state - mirroring FogOfWarRenderer's visited (dimmed)/visible (full brightness)/
 * never-visited (hidden entirely) distinction from the 2D game, just done as instance color and
 * scale instead of a 2D alpha overlay.
 */
export class MazeMesh {
  readonly group = new THREE.Group();
  private readonly grid: TileGrid;
  private readonly floorMesh: THREE.InstancedMesh;
  private readonly wallMesh: THREE.InstancedMesh;
  private readonly floorTiles: { tx: number; ty: number; index: number }[] = [];
  private readonly wallTiles: { tx: number; ty: number; index: number }[] = [];

  constructor(grid: TileGrid) {
    this.grid = grid;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    let floorCount = 0;
    let wallCount = 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        if (grid[ty][tx] === TileType.Floor) floorCount++;
        else wallCount++;
      }
    }

    const floorGeo = new THREE.BoxGeometry(1, 0.1, 1);
    const wallGeo = new THREE.BoxGeometry(1, WALL_HEIGHT, 1);
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });

    this.floorMesh = new THREE.InstancedMesh(floorGeo, material.clone(), Math.max(1, floorCount));
    this.wallMesh = new THREE.InstancedMesh(wallGeo, material.clone(), Math.max(1, wallCount));
    this.floorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.wallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Every instance starts hidden (scale 0) and gets its real position/color the first time
    // updateFog() runs - nothing is visible before the player has actually seen it.
    let fi = 0;
    let wi = 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        if (grid[ty][tx] === TileType.Floor) {
          this.floorMesh.setMatrixAt(fi, HIDDEN_SCALE);
          this.floorMesh.setColorAt(fi, DIM_FLOOR_COLOR);
          this.floorTiles.push({ tx, ty, index: fi });
          fi++;
        } else {
          this.wallMesh.setMatrixAt(wi, HIDDEN_SCALE);
          this.wallMesh.setColorAt(wi, DIM_WALL_COLOR);
          this.wallTiles.push({ tx, ty, index: wi });
          wi++;
        }
      }
    }

    this.floorMesh.instanceMatrix.needsUpdate = true;
    this.wallMesh.instanceMatrix.needsUpdate = true;
    if (this.floorMesh.instanceColor) this.floorMesh.instanceColor.needsUpdate = true;
    if (this.wallMesh.instanceColor) this.wallMesh.instanceColor.needsUpdate = true;

    this.group.add(this.floorMesh, this.wallMesh);
  }

  /** Re-applies fog-of-war state to every tile instance - called whenever the player moves to a
   * new tile (fog only changes then, so there's no reason to run this every frame). */
  updateFog(fog: FogOfWar): void {
    const matrix = new THREE.Matrix4();

    for (const f of this.floorTiles) {
      if (fog.isVisible(f.tx, f.ty)) {
        matrix.makeTranslation(f.tx + 0.5, -0.05, f.ty + 0.5);
        this.floorMesh.setMatrixAt(f.index, matrix);
        this.floorMesh.setColorAt(f.index, VISIBLE_FLOOR_COLOR);
      } else if (fog.isVisited(f.tx, f.ty)) {
        matrix.makeTranslation(f.tx + 0.5, -0.05, f.ty + 0.5);
        this.floorMesh.setMatrixAt(f.index, matrix);
        this.floorMesh.setColorAt(f.index, DIM_FLOOR_COLOR);
      } else {
        this.floorMesh.setMatrixAt(f.index, HIDDEN_SCALE);
      }
    }

    for (const w of this.wallTiles) {
      // A wall reveals if any orthogonally-adjacent floor tile has been visited - matches how a
      // real wall would only ever be seen from the floor cell(s) next to it.
      const neighborsVisited =
        this.tileVisited(fog, w.tx + 1, w.ty) ||
        this.tileVisited(fog, w.tx - 1, w.ty) ||
        this.tileVisited(fog, w.tx, w.ty + 1) ||
        this.tileVisited(fog, w.tx, w.ty - 1);
      const neighborsVisible =
        this.tileVisible(fog, w.tx + 1, w.ty) ||
        this.tileVisible(fog, w.tx - 1, w.ty) ||
        this.tileVisible(fog, w.tx, w.ty + 1) ||
        this.tileVisible(fog, w.tx, w.ty - 1);

      if (neighborsVisible) {
        matrix.makeTranslation(w.tx + 0.5, WALL_HEIGHT / 2, w.ty + 0.5);
        this.wallMesh.setMatrixAt(w.index, matrix);
        this.wallMesh.setColorAt(w.index, VISIBLE_WALL_COLOR);
      } else if (neighborsVisited) {
        matrix.makeTranslation(w.tx + 0.5, WALL_HEIGHT / 2, w.ty + 0.5);
        this.wallMesh.setMatrixAt(w.index, matrix);
        this.wallMesh.setColorAt(w.index, DIM_WALL_COLOR);
      } else {
        this.wallMesh.setMatrixAt(w.index, HIDDEN_SCALE);
      }
    }

    this.floorMesh.instanceMatrix.needsUpdate = true;
    this.wallMesh.instanceMatrix.needsUpdate = true;
    if (this.floorMesh.instanceColor) this.floorMesh.instanceColor.needsUpdate = true;
    if (this.wallMesh.instanceColor) this.wallMesh.instanceColor.needsUpdate = true;
  }

  private tileVisited(fog: FogOfWar, tx: number, ty: number): boolean {
    return this.grid[ty]?.[tx] !== undefined && fog.isVisited(tx, ty);
  }

  private tileVisible(fog: FogOfWar, tx: number, ty: number): boolean {
    return this.grid[ty]?.[tx] !== undefined && fog.isVisible(tx, ty);
  }

  dispose(): void {
    this.floorMesh.geometry.dispose();
    this.wallMesh.geometry.dispose();
    (this.floorMesh.material as THREE.Material).dispose();
    (this.wallMesh.material as THREE.Material).dispose();
  }
}

export { CEILING_Y };
