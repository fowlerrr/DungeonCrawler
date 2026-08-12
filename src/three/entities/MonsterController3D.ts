import * as THREE from "three";
import { TILE_SIZE } from "../../config/constants";
import { Monster } from "../../game/entities/Monster";
import type { FogOfWar } from "../../game/systems/FogOfWar";
import type { MonsterDef } from "../../game/data/types";
import { normalize } from "../../game/util/math";
import { pxToTile } from "../../game/maze/raster";
import { resolveCircleCollision, resolveWallCollision } from "../collision3d";
import { pxToWorld } from "../coords";
import { BOSS_MESH_HEIGHT, MONSTER_MESH_HEIGHT, PALETTE } from "../constants3d";
import type { TileGrid } from "../../game/maze/types";

const AGGRO_RANGE = 160;
const OCCUPANCY_RADIUS = TILE_SIZE * 0.35;
const HEALTH_BAR_WIDTH = 0.5;
const HEALTH_BAR_HEIGHT = 0.06;

const MONSTER_COLOR: Record<string, number> = {
  slime: PALETTE.slime,
  goblin: PALETTE.goblin,
  dungeon_lord: PALETTE.boss,
};

/** Continuous (not grid-locked) movement, unlike the player - wander/chase exactly mirrors
 * MonsterSprite.step's logic, but since there's no Arcade Physics here, wall/player collision is
 * resolved manually every frame via collision3d.ts instead of a collider. */
export class MonsterController3D {
  readonly logic: Monster;
  readonly def: MonsterDef;
  readonly mesh: THREE.Group;
  active = true;

  // Combat.ts's AttackCandidate shape (and occupancy.ts) expect x/y directly on the candidate,
  // matching how MonsterSprite exposes its Phaser transform position separately from
  // this.logic.x/y - these just proxy straight through since there's no separate transform here.
  get x(): number {
    return this.logic.x;
  }
  get y(): number {
    return this.logic.y;
  }

  private wanderDir = { x: 0, y: 0 };
  private wanderTimerMs = 0;
  private damaged = false;
  private fogVisible = true;
  private healthBarBg: THREE.Mesh;
  private healthBarFill: THREE.Mesh;
  private bodyMesh: THREE.Mesh;
  private bodyMaterial: THREE.MeshLambertMaterial;
  private flashUntilMs = 0;

  constructor(x: number, y: number, def: MonsterDef, hpMult = 1, damageMult = 1) {
    this.def = def;
    this.logic = new Monster(def, hpMult, damageMult);
    this.logic.x = x;
    this.logic.y = y;

    const height = def.isBoss ? BOSS_MESH_HEIGHT : MONSTER_MESH_HEIGHT;
    const color = MONSTER_COLOR[def.id] ?? PALETTE.goblin;
    this.bodyMaterial = new THREE.MeshLambertMaterial({ color });
    this.bodyMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(height / 2, def.isBoss ? 1 : 0), this.bodyMaterial);
    this.bodyMesh.position.y = height / 2;

    this.healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: 0x14141c, transparent: true, opacity: 0.85 }),
    );
    this.healthBarFill = new THREE.Mesh(
      new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT),
      new THREE.MeshBasicMaterial({ color: PALETTE.health }),
    );
    this.healthBarBg.position.set(0, height + 0.35, 0);
    this.healthBarFill.position.set(0, height + 0.35, 0.001);
    this.healthBarBg.visible = false;
    this.healthBarFill.visible = false;

    this.mesh = new THREE.Group();
    this.mesh.add(this.bodyMesh, this.healthBarBg, this.healthBarFill);
    this.syncMeshPosition();
  }

  /** Runs each frame: wander randomly, or chase the player once within aggro range - identical
   * decision logic to MonsterSprite.step, just producing a velocity this class integrates itself
   * instead of handing to Arcade Physics. */
  step(playerX: number, playerY: number, deltaMs: number, grid: TileGrid, blockedByPlayer: { x: number; y: number; radius: number }): void {
    if (this.logic.isDead) return;

    const dx = playerX - this.logic.x;
    const dy = playerY - this.logic.y;
    const distance = Math.hypot(dx, dy);

    let direction = { x: 0, y: 0 };
    if ((this.def.aiType === "chase" || this.def.aiType === "boss") && distance < AGGRO_RANGE) {
      direction = normalize(dx, dy);
    } else if (this.def.aiType === "wander") {
      this.wanderTimerMs -= deltaMs;
      if (this.wanderTimerMs <= 0) {
        this.wanderTimerMs = 1000 + Math.random() * 1500;
        const angle = Math.random() * Math.PI * 2;
        this.wanderDir = { x: Math.cos(angle), y: Math.sin(angle) };
      }
      direction = this.wanderDir;
    }

    const dtSec = deltaMs / 1000;
    let x = this.logic.x + direction.x * this.def.moveSpeed * dtSec;
    let y = this.logic.y + direction.y * this.def.moveSpeed * dtSec;

    const afterWalls = resolveWallCollision(grid, x, y, OCCUPANCY_RADIUS);
    x = afterWalls.x;
    y = afterWalls.y;
    const afterPlayer = resolveCircleCollision(x, y, OCCUPANCY_RADIUS, blockedByPlayer.x, blockedByPlayer.y, blockedByPlayer.radius);
    x = afterPlayer.x;
    y = afterPlayer.y;

    this.logic.x = x;
    this.logic.y = y;
    this.syncMeshPosition();
  }

  setFogVisible(fog: FogOfWar): void {
    const { tx, ty } = pxToTile(this.logic.x, this.logic.y);
    this.fogVisible = fog.isVisible(tx, ty);
    this.mesh.visible = this.fogVisible;
    this.refreshBarVisibility();
  }

  updateHealthBar(): void {
    const fraction = this.logic.hp / this.logic.maxHp;
    this.damaged = fraction < 1;
    this.refreshBarVisibility();
    if (!this.damaged) return;

    this.healthBarFill.scale.x = Math.max(0.001, fraction);
    this.healthBarFill.position.x = -(HEALTH_BAR_WIDTH * (1 - Math.max(0, fraction))) / 2;
    const color = fraction > 0.6 ? PALETTE.health : fraction > 0.3 ? 0xe0c341 : 0xd94f4f;
    (this.healthBarFill.material as THREE.MeshBasicMaterial).color.setHex(color);
  }

  flashHit(nowMs: number): void {
    this.flashUntilMs = nowMs + 120;
    this.bodyMaterial.emissive.setHex(0xffffff);
  }

  /** Clears the hit-flash once its duration has elapsed - called every frame from Game3D since
   * there's no scene.time.delayedCall equivalent here. */
  updateFlash(nowMs: number): void {
    if (this.flashUntilMs > 0 && nowMs >= this.flashUntilMs) {
      this.flashUntilMs = 0;
      this.bodyMaterial.emissive.setHex(0x000000);
    }
  }

  private refreshBarVisibility(): void {
    const show = this.fogVisible && this.damaged;
    this.healthBarBg.visible = show;
    this.healthBarFill.visible = show;
  }

  private syncMeshPosition(): void {
    const { x, z } = pxToWorld(this.logic.x, this.logic.y);
    this.mesh.position.set(x, 0, z);
  }

  faceCamera(cameraPos: THREE.Vector3): void {
    // Health bar planes are simple billboards - always face the camera rather than being drawn
    // once at a fixed rotation, so they stay readable regardless of view angle.
    this.healthBarBg.lookAt(cameraPos.x, this.healthBarBg.getWorldPosition(new THREE.Vector3()).y, cameraPos.z);
    this.healthBarFill.lookAt(cameraPos.x, this.healthBarFill.getWorldPosition(new THREE.Vector3()).y, cameraPos.z);
  }

  die(): void {
    this.active = false;
    this.bodyMesh.geometry.dispose();
    this.bodyMaterial.dispose();
    this.healthBarBg.geometry.dispose();
    (this.healthBarBg.material as THREE.Material).dispose();
    this.healthBarFill.geometry.dispose();
    (this.healthBarFill.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}

export { OCCUPANCY_RADIUS as MONSTER_OCCUPANCY_RADIUS_3D };
