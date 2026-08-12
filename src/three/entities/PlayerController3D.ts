import * as THREE from "three";
import { PLAYER_MOVE_DURATION_MS } from "../../config/constants";
import { Player } from "../../game/entities/Player";
import { tileCenterPx } from "../../game/maze/raster";
import { pxToWorld } from "../coords";
import { PALETTE, PLAYER_MESH_HEIGHT, PLAYER_MESH_RADIUS, TURN_DURATION_MS } from "../constants3d";

export type Vec2 = { x: number; y: number };

/** Facing cycles through these four in order (each a 90° turn) - keeping facing cardinal-only
 * matches the maze grid itself (every wall/floor edge is axis-aligned) and is what lets a
 * "forward" step reuse the exact same one-tile grid-step logic multiple directions used to. */
const CARDINAL_ORDER: readonly Vec2[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function angleFromFacing(facing: Vec2): number {
  return Math.atan2(facing.x, facing.y);
}

/** Shortest signed distance from `from` to `to`, both radians - e.g. going from 179° to -179°
 * is a 2° step, not a 358° one. Used so the turn animation always spins the short way around
 * and so repeated turns keep chaining smoothly instead of unwrapping through a full circle. */
function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Tank-style dungeon-crawler controls: turning (rotating `facing` by 90°) is completely separate
 * from stepping (always exactly one tile, in whatever direction is requested - forward along
 * facing, or backward opposite it). Movement itself is still grid-locked and animated over
 * PLAYER_MOVE_DURATION_MS the same way PlayerSprite/the old free-direction version were; only
 * "which way is forward" changed, not how a step itself works. The move tween is hand-rolled (a
 * simple lerp advanced each frame in update()) since there's no Phaser tween manager here.
 *
 * `facing` itself changes instantly on turn() - combat/movement care which way you're *actually*
 * facing right now, not where the camera has visually settled - but what the camera and mesh
 * actually render (`visualAngle`) eases toward it over TURN_DURATION_MS, so a turn reads as an
 * actual rotation instead of a disorienting snap.
 */
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

  private readonly bodyParts: THREE.Object3D[];
  private moving = false;
  private moveFromPx = { x: 0, y: 0 };
  private moveToPx = { x: 0, y: 0 };
  private moveElapsedMs = 0;
  private moveDurationMs = PLAYER_MOVE_DURATION_MS;
  private pendingOnArrive: (() => void) | undefined;

  private visualAngle = angleFromFacing(this.facing);
  private turning = false;
  private turnFromAngle = 0;
  private turnToAngle = 0;
  private turnElapsedMs = 0;

  constructor(tileX: number, tileY: number, logic: Player) {
    this.logic = logic;
    this.tileX = tileX;
    this.tileY = tileY;

    const { x, y } = tileCenterPx(tileX, tileY);
    this.logic.x = x;
    this.logic.y = y;
    this.moveFromPx = { x, y };
    this.moveToPx = { x, y };

    const built = buildPlayerMesh();
    this.mesh = built.group;
    this.bodyParts = built.bodyParts;
    this.syncMeshToLogic();
  }

  get isMoving(): boolean {
    return this.moving;
  }

  get isTurning(): boolean {
    return this.turning;
  }

  /** The direction actually being rendered right now - mid-turn this lags behind `facing` by
   * design (see the class doc). Camera look direction should always use this, not `facing`
   * directly, so the view rotates smoothly instead of snapping the instant a turn is requested. */
  get visualFacing(): Vec2 {
    return { x: Math.sin(this.visualAngle), y: Math.cos(this.visualAngle) };
  }

  /** Rotates facing by one 90° increment - `1` for a right turn, `-1` for a left turn. Doesn't
   * move the player and isn't blocked by an in-progress step; the two are independent. Commits
   * the new facing immediately (gameplay - attack direction, which way "forward" means - isn't
   * delayed by the animation), then kicks off the visual turn from wherever the camera currently
   * is, so spamming the turn key mid-animation keeps chaining smoothly rather than jumping. */
  turn(delta: 1 | -1): void {
    const currentIndex = CARDINAL_ORDER.findIndex((v) => v.x === this.facing.x && v.y === this.facing.y);
    const nextIndex = (currentIndex + delta + CARDINAL_ORDER.length) % CARDINAL_ORDER.length;
    this.facing = CARDINAL_ORDER[nextIndex];

    const targetAngle = angleFromFacing(this.facing);
    this.turnFromAngle = this.visualAngle;
    this.turnToAngle = this.visualAngle + shortestAngleDelta(this.visualAngle, targetAngle);
    this.turnElapsedMs = 0;
    this.turning = true;
  }

  tryStepForward(isPassable: (tx: number, ty: number) => boolean, speedMultiplier: number, onArrive?: () => void): void {
    this.tryStepInDirection(this.facing, isPassable, speedMultiplier, onArrive);
  }

  tryStepBackward(isPassable: (tx: number, ty: number) => boolean, speedMultiplier: number, onArrive?: () => void): void {
    this.tryStepInDirection({ x: -this.facing.x, y: -this.facing.y }, isPassable, speedMultiplier, onArrive);
  }

  /** Hides the visible body mesh (keeping the group - and the torch light attached to it in
   * Game3D - present) since the camera sits at the player's own position in first person; there
   * would be nothing worth seeing of your own model even if it weren't hidden. */
  hideBody(): void {
    for (const part of this.bodyParts) part.visible = false;
  }

  private tryStepInDirection(direction: Vec2, isPassable: (tx: number, ty: number) => boolean, speedMultiplier: number, onArrive?: () => void): void {
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

    if (this.turning) {
      this.turnElapsedMs += deltaMs;
      const t = Math.min(1, this.turnElapsedMs / TURN_DURATION_MS);
      this.visualAngle = this.turnFromAngle + (this.turnToAngle - this.turnFromAngle) * easeOutQuad(t);
      if (t >= 1) {
        this.turning = false;
        this.visualAngle = this.turnToAngle;
      }
    }

    this.syncMeshToLogic();
  }

  private syncMeshToLogic(): void {
    const { x, z } = pxToWorld(this.logic.x, this.logic.y);
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = this.visualAngle;
  }
}

/** Low-poly capsule-and-hood silhouette - no external asset, just a couple of primitives colored
 * to match the game's blue accent (see PALETTE), following the same "procedural first" approach
 * TextureFactory.ts used for the 2D placeholder art. Only ever seen in the pause/inventory-panel
 * sense of "this is my character" rather than on screen during play, since the camera sits at
 * the player's own position in first person (see hideBody). */
function buildPlayerMesh(): { group: THREE.Group; bodyParts: THREE.Object3D[] } {
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

  return { group, bodyParts: [body, nose] };
}
