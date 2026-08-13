import Phaser from "phaser";

/** A static world pickup that heals the player on contact (see GameScene's overlap handler) -
 * dropped by monster kills per LevelConfig's healthDropChance. */
export class HealthPickupSprite extends Phaser.Physics.Arcade.Sprite {
  readonly healAmount: number;

  constructor(scene: Phaser.Scene, x: number, y: number, healAmount: number) {
    super(scene, x, y, "pickup_health");
    this.healAmount = healAmount;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
