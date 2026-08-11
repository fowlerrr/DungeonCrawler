import Phaser from "phaser";

export class HealthPickupSprite extends Phaser.Physics.Arcade.Sprite {
  readonly healAmount: number;

  constructor(scene: Phaser.Scene, x: number, y: number, healAmount: number) {
    super(scene, x, y, "pickup_health");
    this.healAmount = healAmount;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
