import * as THREE from "three";
import { PLAYER_MOVE_DURATION_MS } from "../../config/constants";
import { Player } from "../../game/entities/Player";
import { tileCenterPx } from "../../game/maze/raster";
import { pxToWorld } from "../coords";
import { PALETTE, PLAYER_MESH_HEIGHT, PLAYER_MESH_RADIUS } from "../constants3d";

export type Vec2 = { x: number; y: number };

/** Grid-locked movement, same model as PlayerSprite: always exactly one tile, animated over
 * PLAYER_MOVE_DURATION_MS (divided by the equipped accessory's speedMult) rather than free
 * continuous motion - there's no continuous-collision drift to catch on a wall edge, since a
 * step either is or isn't onto a valid tile. The tween itself is hand-rolled (a simple lerp
 * advanced each frame in update()) since there's no Phaser tween manager here. */
export class PlayerController3D {
  readonly logic: Player;
  readonly mesh: THREE.Group;
  tileX: number;
  tileY: number;
  facing: Vec2 = { x: 0, y: 1 };

  // See MonsterController3D's x/y for why these proxy straight to logic.x/y.
  get x(): number {
    return this.logic.x;
  }
  get y(): number {
    return this.logic.y;
  }

  private moving = false;
  private moveFromPx = { x: 0, y: 0 };
  private moveToPx = { x: 0, y: 0 };
  private moveElapsedMs = 0;
  private moveDurationMs = PLAYER_MOVE_DURATION_MS;
  private pendingOnArrive: (() => void) | undefined;

  constructor(tileX: number, tileY: number, logic: Player) {
    this.logic = logic;
    this.tileX = tileX;
    this.tileY = tileY;

    const { x, y } = tileCenterPx(tileX, tileY);
    this.logic.x = x;
    this.logic.y = y;
    this.moveFromPx = { x, y };
    this.moveToPx = { x, y };

    this.mesh = buildPlayerMesh();
    this.syncMeshToLogic();
  }

  get isMoving(): boolean {
    return this.moving;
  }

  tryStep(direction: Vec2, isPassable: (tx: number, ty: number) => boolean, speedMultiplier: number, onArrive?: () => void): void {
    if (direction.x === 0 && direction.y === 0) return;
    this.facing = direction;
    if (this.moving) return;

    const targetTileX = this.tileX + direction.x;
    const targetTileY = this.tileY + direction.y;
    if (!isPassable(targetTileX, targetTileY)) return;

    this.moving = true;
    this.moveFromPx = { x: this.logic.x, y: this.logic.y };
    this.moveToPx = tileCenterPx(targetTileX, targetTileY);
    this.moveElapsedMs = 0;
    this.moveDurationMs = PLAYER_MOVE_DURATION_MS / speedMultiplier;
    this.pendingOnArrive = () => {
      this.tileX = targetTileX;
      this.tileY = targetTileY;
      onArrive?.();
    };
  }

  update(deltaMs: number): void {
    if (this.moving) {
      this.moveElapsedMs += deltaMs;
      const t = Math.min(1, this.moveElapsedMs / this.moveDurationMs);
      this.logic.x = this.moveFromPx.x + (this.moveToPx.x - this.moveFromPx.x) * t;
      this.logic.y = this.moveFromPx.y + (this.moveToPx.y - this.moveFromPx.y) * t;

      if (t >= 1) {
        this.moving = false;
        const onArrive = this.pendingOnArrive;
        this.pendingOnArrive = undefined;
        onArrive?.();
      }
    }

    this.syncMeshToLogic();
  }

  private syncMeshToLogic(): void {
    const { x, z } = pxToWorld(this.logic.x, this.logic.y);
    this.mesh.position.set(x, 0, z);
    if (this.facing.x !== 0 || this.facing.y !== 0) {
      this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.y);
    }
  }
}

/** Low-poly capsule-and-hood silhouette - no external asset, just a couple of primitives colored
 * to match the game's blue accent (see PALETTE), following the same "procedural first" approach
 * TextureFactory.ts used for the 2D placeholder art. */
function buildPlayerMesh(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(PLAYER_MESH_RADIUS, PLAYER_MESH_HEIGHT - PLAYER_MESH_RADIUS * 2, 4, 8),
    new THREE.MeshLambertMaterial({ color: PALETTE.playerBody }),
  );
  body.position.y = PLAYER_MESH_HEIGHT / 2;
  group.add(body);

  // A small forward-facing wedge so the player's facing direction actually reads at a glance.
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.22, 4),
    new THREE.MeshLambertMaterial({ color: PALETTE.playerAccent }),
  );
  nose.position.set(0, PLAYER_MESH_HEIGHT * 0.65, PLAYER_MESH_RADIUS + 0.08);
  nose.rotation.x = Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  group.add(nose);

  return group;
}
