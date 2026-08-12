import Phaser from "phaser";
import { PLAYER_MOVE_DURATION_MS, TILE_SIZE } from "../../config/constants";
import { Player } from "../../game/entities/Player";
import { tileCenterPx } from "../../game/maze/raster";

export type Vec2 = { x: number; y: number };

/** Target on-screen height for the player sprite - see MonsterSprite's MONSTER_HEIGHT for why
 * this is independent of the underlying texture's native size: real art isn't 32x32 or square,
 * so both the display size and the collision circle below have to be derived from it rather
 * than assumed. */
const PLAYER_HEIGHT = TILE_SIZE * 1.6;

/**
 * Grid-locked movement: the player always occupies exactly one raster tile and steps to an
 * adjacent one at a time, animated via tween rather than snapping instantly. This is what
 * makes cornering in a corridor maze unambiguous - there's no continuous-collision drift to
 * catch on a wall edge, since a step either is or isn't onto a valid tile.
 */
export class PlayerSprite extends Phaser.Physics.Arcade.Sprite {
  readonly logic: Player;
  tileX: number;
  tileY: number;
  /** Last direction moved (or attempted) - used to aim the attack. */
  facing: Vec2 = { x: 0, y: 1 };

  private moving = false;

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, logic: Player) {
    const { x, y } = tileCenterPx(tileX, tileY);
    super(scene, x, y, "player");
    this.logic = logic;
    this.logic.x = x;
    this.logic.y = y;
    this.tileX = tileX;
    this.tileY = tileY;

    scene.add.existing(this);

    const scale = PLAYER_HEIGHT / this.height;
    this.setDisplaySize(this.width * scale, PLAYER_HEIGHT);

    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // setCircle's radius/offset are in the sprite's *unscaled* source pixels and get
    // re-multiplied by the GameObject's current scale every physics step (see MonsterSprite's
    // constructor for the full explanation) - dividing by `scale` here keeps the actual
    // in-world hitbox a constant size regardless of the underlying art asset's resolution, and
    // centering the offset within the sprite's own unscaled dimensions keeps the circle at
    // (this.x, this.y) regardless of aspect ratio.
    const sourceRadius = (TILE_SIZE * 0.35) / scale;
    body.setCircle(sourceRadius, this.width / 2 - sourceRadius, this.height / 2 - sourceRadius);
    // Movement is entirely tween-driven (see tryStep), never physics velocity - both flags
    // are needed to stop a collider from ever displacing the player's body during
    // separation, so a collision with a monster pushes the monster back and never the
    // player. Phaser's circle-vs-circle separation (World.separateCircle) only skips moving
    // a body when `!body.immovable || body.pushable` is false - since pushable defaults to
    // true, immovable alone doesn't stop it from being displaced; pushable=false is required
    // too.
    body.immovable = true;
    body.pushable = false;
  }

  get isMoving(): boolean {
    return this.moving;
  }

  /**
   * Attempts to step one tile in `direction` (must be a unit cardinal vector). Always updates
   * facing, even if the step is blocked, so attacking into a wall still aims the right way.
   * `isPassable` is the caller's authority on whether the target tile can be entered (maze
   * floor + no active locked door there) - this class knows nothing about maze data itself.
   */
  tryStep(direction: Vec2, isPassable: (tx: number, ty: number) => boolean, speedMultiplier: number, onArrive?: () => void): void {
    if (direction.x === 0 && direction.y === 0) return;
    this.facing = direction;
    if (this.moving) return;

    const targetTileX = this.tileX + direction.x;
    const targetTileY = this.tileY + direction.y;
    if (!isPassable(targetTileX, targetTileY)) return;

    this.moving = true;
    const { x, y } = tileCenterPx(targetTileX, targetTileY);
    const duration = PLAYER_MOVE_DURATION_MS / speedMultiplier;

    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration,
      ease: Phaser.Math.Easing.Linear,
      onUpdate: () => {
        (this.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
        this.logic.x = this.x;
        this.logic.y = this.y;
      },
      onComplete: () => {
        this.tileX = targetTileX;
        this.tileY = targetTileY;
        this.moving = false;
        this.logic.x = this.x;
        this.logic.y = this.y;
        onArrive?.();
      },
    });
  }
}
