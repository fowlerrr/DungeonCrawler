import Phaser from "phaser";
import { PLAYER_MOVE_SPEED, TILE_SIZE } from "../../config/constants";
import { Player } from "../../game/entities/Player";

export class PlayerSprite extends Phaser.Physics.Arcade.Sprite {
  readonly logic: Player;

  constructor(scene: Phaser.Scene, x: number, y: number, logic: Player) {
    super(scene, x, y, "player");
    this.logic = logic;
    this.logic.x = x;
    this.logic.y = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(TILE_SIZE * 0.35, TILE_SIZE * 0.15, TILE_SIZE * 0.15);
    this.setCollideWorldBounds(true);
  }

  /** input -> logic intent, applied as physics velocity; logic.x/y synced back for other
   * systems (fog of war, etc.) to read without needing a Phaser reference. `speedMultiplier`
   * lets equipped gear (e.g. a speed-boosting accessory) scale movement without this class
   * needing to know anything about the Inventory system. */
  applyMovement(direction: { x: number; y: number }, speedMultiplier = 1): void {
    const speed = PLAYER_MOVE_SPEED * speedMultiplier;
    this.setVelocity(direction.x * speed, direction.y * speed);
    this.logic.x = this.x;
    this.logic.y = this.y;
  }
}
