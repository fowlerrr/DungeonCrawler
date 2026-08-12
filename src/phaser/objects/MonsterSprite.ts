import Phaser from "phaser";
import { MONSTER_HIT_FLASH_MS, TILE_SIZE } from "../../config/constants";
import type { MonsterDef } from "../../game/data/types";
import { Monster } from "../../game/entities/Monster";
import { normalize } from "../../game/util/math";

const AGGRO_RANGE = 160;
const HEALTH_BAR_WIDTH = 22;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_GAP_ABOVE_SPRITE = 8;
/** Target on-screen height for regular monsters vs the boss - collision stays a small fixed
 * circle regardless (see body.setCircle below), so this is purely a readability choice, not
 * tied to TILE_SIZE the way tile textures are. Applied to every monster texture uniformly, so
 * it works whether that texture happens to be a 32px placeholder or a few-hundred-px painted
 * sprite with its own native aspect ratio. */
const MONSTER_HEIGHT = TILE_SIZE * 1.5;
const BOSS_HEIGHT = TILE_SIZE * 2.2;

export class MonsterSprite extends Phaser.Physics.Arcade.Sprite {
  readonly logic: Monster;
  readonly def: MonsterDef;

  private wanderDir = { x: 0, y: 0 };
  private wanderTimerMs = 0;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private healthBarY: number;

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

    const targetHeight = def.isBoss ? BOSS_HEIGHT : MONSTER_HEIGHT;
    const scale = targetHeight / this.height;
    this.setDisplaySize(this.width * scale, targetHeight);

    this.healthBarY = -(this.displayHeight / 2) - HEALTH_BAR_GAP_ABOVE_SPRITE;

    // Hidden until the monster actually takes a hit (see updateHealthBar) - a visual clue for
    // how close to dead something is, not a permanent status readout.
    this.healthBarBg = scene.add
      .rectangle(x, y + this.healthBarY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0x14141c, 0.85)
      .setDepth(70)
      .setVisible(false);
    this.healthBarFill = scene.add
      .rectangle(x - HEALTH_BAR_WIDTH / 2, y + this.healthBarY, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 0x3fae5c, 1)
      .setOrigin(0, 0.5)
      .setDepth(71)
      .setVisible(false);
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

    this.healthBarBg.setPosition(this.x, this.y + this.healthBarY);
    this.healthBarFill.setPosition(this.x - HEALTH_BAR_WIDTH / 2, this.y + this.healthBarY);
  }

  /** Brief white flash so a hit reads clearly even without a real hit animation yet. */
  flashHit(): void {
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(MONSTER_HIT_FLASH_MS, () => {
      if (this.active) this.clearTint();
    });
  }

  /** Called by GameScene right after damage is applied - shows the bar (staying hidden at full
   * health) and colors it green/yellow/red by remaining fraction, per the design ask for a
   * rough visual clue rather than an exact HP readout. */
  updateHealthBar(): void {
    const fraction = this.logic.hp / this.logic.maxHp;
    const damaged = fraction < 1;
    this.healthBarBg.setVisible(damaged);
    this.healthBarFill.setVisible(damaged);
    if (!damaged) return;

    this.healthBarFill.width = HEALTH_BAR_WIDTH * Math.max(0, fraction);
    const color = fraction > 0.6 ? 0x3fae5c : fraction > 0.3 ? 0xe0c341 : 0xd94f4f;
    this.healthBarFill.setFillStyle(color, 1);
  }

  die(): void {
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    this.destroy();
  }
}
