import * as THREE from "three";
import type { FogOfWar } from "../game/systems/FogOfWar";
import { TileType, type TileGrid } from "../game/maze/types";
import { CEILING_Y, PALETTE, WALL_HEIGHT } from "./constants3d";

const HIDDEN_SCALE = new THREE.Matrix4().makeScale(0, 0, 0);

/**
 * Renders the tile grid as two InstancedMeshes (one per floor tile, one per wall tile) rather
 * than a handful of large merged shapes, so each tile can be individually revealed as the
 * fog-of-war visits it. Once visited, a tile stays at full brightness permanently rather than
 * being re-dimmed the moment it falls outside the player's current vision radius - a 2D top-down
 * fog overlay can get away with that (see FogOfWarRenderer's visited/visible split), but the
 * same idea in a first-person hallway view reads as the corridor ending in a wall of black a few
 * steps ahead, well before it actually does. Depth/mood instead comes from real lighting (the
 * torch's falloff, ambient level - see Game3D) and Three.js's own distance fog, the way an actual
 * first-person renderer would do it.
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
    // Every floor instance is the same color, and every wall instance is the same color, so
    // there's no need for per-instance vertex colors - just a plain material color per mesh.
    // (InstancedMesh + MeshLambertMaterial({vertexColors:true}) + setColorAt also turned out to
    // render solid black in this Three.js version regardless of lighting - confirmed isolated
    // from everything else in this file - so this is a correctness fix as much as a simplification.)
    const floorMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.floor });
    const wallMaterial = new THREE.MeshLambertMaterial({ color: PALETTE.wallTop });

    this.floorMesh = new THREE.InstancedMesh(floorGeo, floorMaterial, Math.max(1, floorCount));
    this.wallMesh = new THREE.InstancedMesh(wallGeo, wallMaterial, Math.max(1, wallCount));
    this.floorMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.wallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Every instance starts hidden (scale 0) and gets its real position the first time
    // updateFog() runs - nothing is visible before the player has actually seen it.
    let fi = 0;
    let wi = 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        if (grid[ty][tx] === TileType.Floor) {
          this.floorMesh.setMatrixAt(fi, HIDDEN_SCALE);
          this.floorTiles.push({ tx, ty, index: fi });
          fi++;
        } else {
          this.wallMesh.setMatrixAt(wi, HIDDEN_SCALE);
          this.wallTiles.push({ tx, ty, index: wi });
          wi++;
        }
      }
    }

    this.floorMesh.instanceMatrix.needsUpdate = true;
    this.wallMesh.instanceMatrix.needsUpdate = true;

    // InstancedMesh's automatic frustum-culling bounds are computed from wherever the instances
    // happened to be the first time the renderer needed them - every instance starts at the
    // origin (see HIDDEN_SCALE above) and only moves out to its real tile position later, in
    // updateFog(), which never recomputes that cached bounds. Left alone, the mesh keeps using
    // a stale near-the-origin bounding volume forever, so the renderer culls (skips drawing)
    // entire walls/floor the moment the camera is somewhere that stale volume doesn't cover -
    // exactly the "can see through the walls" hole. There's no cheap way to keep the bounds
    // accurate as tiles reveal over time, and the instance count here is small enough (a few
    // thousand simple boxes, one draw call each) that per-mesh culling buys nothing worth having
    // this bug for - just always draw both meshes in full.
    this.floorMesh.frustumCulled = false;
    this.wallMesh.frustumCulled = false;

    this.group.add(this.floorMesh, this.wallMesh);
  }

  /** Reveals any newly-visited tile at full brightness - called whenever the player moves to a
   * new tile (fog only changes then, so there's no reason to run this every frame). Never hides
   * a tile back once revealed. */
  updateFog(fog: FogOfWar): void {
    const matrix = new THREE.Matrix4();
    let changed = false;

    for (const f of this.floorTiles) {
      if (!fog.isVisited(f.tx, f.ty)) continue;
      matrix.makeTranslation(f.tx + 0.5, -0.05, f.ty + 0.5);
      this.floorMesh.setMatrixAt(f.index, matrix);
      changed = true;
    }

    for (const w of this.wallTiles) {
      // A wall reveals if any orthogonally-adjacent floor tile has been visited - matches how a
      // real wall would only ever be seen from the floor cell(s) next to it.
      const neighborsVisited =
        this.tileVisited(fog, w.tx + 1, w.ty) ||
        this.tileVisited(fog, w.tx - 1, w.ty) ||
        this.tileVisited(fog, w.tx, w.ty + 1) ||
        this.tileVisited(fog, w.tx, w.ty - 1);
      if (!neighborsVisited) continue;
      matrix.makeTranslation(w.tx + 0.5, WALL_HEIGHT / 2, w.ty + 0.5);
      this.wallMesh.setMatrixAt(w.index, matrix);
      changed = true;
    }

    if (!changed) return;
    this.floorMesh.instanceMatrix.needsUpdate = true;
    this.wallMesh.instanceMatrix.needsUpdate = true;
  }

  private tileVisited(fog: FogOfWar, tx: number, ty: number): boolean {
    return this.grid[ty]?.[tx] !== undefined && fog.isVisited(tx, ty);
  }

  dispose(): void {
    this.floorMesh.geometry.dispose();
    this.wallMesh.geometry.dispose();
    (this.floorMesh.material as THREE.Material).dispose();
    (this.wallMesh.material as THREE.Material).dispose();
  }
}

export { CEILING_Y };
