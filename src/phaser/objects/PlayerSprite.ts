import Phaser from "phaser";
import { PLAYER_MOVE_DURATION_MS, TILE_SIZE } from "../../config/constants";
import { Player } from "../../game/entities/Player";
import { tileCenterPx } from "../../game/maze/raster";

export type Vec2 = { x: number; y: number };

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
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(TILE_SIZE * 0.35, TILE_SIZE * 0.15, TILE_SIZE * 0.15);
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
