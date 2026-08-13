import Phaser from "phaser";
import { MONSTER_HIT_FLASH_MS, TILE_SIZE } from "../../config/constants";
import type { MonsterDef } from "../../game/data/types";
import { Monster } from "../../game/entities/Monster";
import { normalize } from "../../game/util/math";

const AGGRO_RANGE = 160;
const HEALTH_BAR_WIDTH = 22;
const HEALTH_BAR_HEIGHT = 4;
const HEALTH_BAR_GAP_ABOVE_SPRITE = 8;
const DEATH_FADE_MS = 280;
const DEATH_SCALE_UP = 1.35;
/** Target on-screen height for regular monsters vs the boss - collision stays a small fixed
 * circle regardless (see body.setCircle below), so this is purely a readability choice, not
 * tied to TILE_SIZE the way tile textures are. Applied to every monster texture uniformly, so
 * it works whether that texture happens to be a 32px placeholder or a few-hundred-px painted
 * sprite with its own native aspect ratio. */
const MONSTER_HEIGHT = TILE_SIZE * 1.5;
const BOSS_HEIGHT = TILE_SIZE * 2.2;

/** The visual + physics half of a monster - wraps a plain-data Monster (logic) and owns
 * everything Phaser-specific: sprite scaling, collision circle, wander/chase AI, hit flashes,
 * and the floating health bar. */
export class MonsterSprite extends Phaser.Physics.Arcade.Sprite {
  readonly logic: Monster;
  readonly def: MonsterDef;

  private wanderDir = { x: 0, y: 0 };
  private wanderTimerMs = 0;
  private healthBarBg: Phaser.GameObjects.Rectangle;
  private healthBarFill: Phaser.GameObjects.Rectangle;
  private healthBarY: number;
  private damaged = false;
  private fogVisible = true;

  constructor(scene: Phaser.Scene, x: number, y: number, def: MonsterDef, hpMult = 1, damageMult = 1) {
    super(scene, x, y, def.spriteKey);
    this.def = def;
    this.logic = new Monster(def, hpMult, damageMult);
    this.logic.x = x;
    this.logic.y = y;

    scene.add.existing(this);

    const targetHeight = def.isBoss ? BOSS_HEIGHT : MONSTER_HEIGHT;
    const scale = targetHeight / this.height;
    this.setDisplaySize(this.width * scale, targetHeight);

    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // setCircle's radius/offset are in the sprite's *unscaled* source pixels - Arcade
    // re-multiplies them by the GameObject's current scale on every physics step, so setting
    // them before setDisplaySize (as this used to) meant the collision circle silently shrank
    // by the same factor as the sprite's scale (as low as ~0.24x for some of the real-art
    // monster sprites, e.g. an intended 11.2px radius collapsing to ~2.7px) - small enough that
    // monsters could slip through wall collisions they should have been blocked by. Dividing by
    // `scale` here cancels that back out, keeping the actual in-world hitbox size constant
    // (TILE_SIZE * 0.35) regardless of how large or small the underlying art asset is.
    //
    // The offset is centered within the sprite's own (unscaled) width/height rather than a
    // fixed value, for the same reason: a fixed offset only happened to land the circle on the
    // sprite's registration point (this.x/this.y, what every distance/range/occupancy check
    // elsewhere assumes "the monster's position" means) for the original square 32x32
    // placeholder. Real art sprites aren't square or 32px, so a fixed offset left the collision
    // circle up to ~15px away from where the sprite is actually drawn - physics was genuinely
    // blocking movement at the right spot, but the art visibly overlapped the wall anyway.
    const sourceRadius = (TILE_SIZE * 0.35) / scale;
    body.setCircle(sourceRadius, this.width / 2 - sourceRadius, this.height / 2 - sourceRadius);

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
    this.damaged = fraction < 1;
    this.refreshBarVisibility();
    if (!this.damaged) return;

    this.healthBarFill.width = HEALTH_BAR_WIDTH * Math.max(0, fraction);
    const color = fraction > 0.6 ? 0x3fae5c : fraction > 0.3 ? 0xe0c341 : 0xd94f4f;
    this.healthBarFill.setFillStyle(color, 1);
  }

  /** Called by GameScene every frame with whether this monster's current tile is inside the
   * player's live fog-of-war vision - the fog overlay only *dims* previously-visited tiles
   * (so the map layout stays remembered), which isn't enough to actually hide something moving
   * through them, so the monster (and its health bar) needs to explicitly go invisible instead
   * of relying on the overlay to cover it. */
  setFogVisible(visible: boolean): void {
    this.fogVisible = visible;
    this.setVisible(visible);
    this.refreshBarVisibility();
  }

  private refreshBarVisibility(): void {
    const show = this.fogVisible && this.damaged;
    this.healthBarBg.setVisible(show);
    this.healthBarFill.setVisible(show);
  }

  /** Plays a brief flash-and-dissolve death animation (white flash into a scaled-up fade-out)
   * instead of just vanishing, then cleans up the health bar UI alongside the sprite itself.
   * Disables the physics body immediately so the fading corpse can't still be shoved around by
   * the player/other monsters walking through it during the animation. */
  die(): void {
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.setVelocity(0, 0);
    this.setTintFill(0xffffff);

    const fromScaleX = this.scaleX;
    const fromScaleY = this.scaleY;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: fromScaleX * DEATH_SCALE_UP,
      scaleY: fromScaleY * DEATH_SCALE_UP,
      duration: DEATH_FADE_MS,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => this.destroy(),
    });
  }
}
