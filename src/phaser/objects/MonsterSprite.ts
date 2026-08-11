import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";
import type { MonsterDef } from "../../game/data/types";
import { Monster } from "../../game/entities/Monster";
import { normalize } from "../../game/util/math";

const AGGRO_RANGE = 160;

export class MonsterSprite extends Phaser.Physics.Arcade.Sprite {
  readonly logic: Monster;
  readonly def: MonsterDef;

  private wanderDir = { x: 0, y: 0 };
  private wanderTimerMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef, hpMult = 1, damageMult = 1) {
    super(scene, x, y, def.spriteKey);
    this.def = def;
    this.logic = new Monster(def, hpMult, damageMult);
    this.logic.x = x;
    this.logic.y = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(TILE_SIZE * 0.35, TILE_SIZE * 0.15, TILE_SIZE * 0.15);
  }

  /** Runs each frame: wander randomly, or chase the player once within aggro range. */
  step(playerX: number, playerY: number, deltaMs: number): void {
    if (this.logic.isDead) return;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
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

    this.setVelocity(direction.x * this.def.moveSpeed, direction.y * this.def.moveSpeed);
    this.logic.x = this.x;
    this.logic.y = this.y;
  }

  die(): void {
    this.destroy();
  }
}
