import Phaser from "phaser";

export class KeyPickupSprite extends Phaser.Physics.Arcade.Sprite {
  readonly doorId: string;

  constructor(scene: Phaser.Scene, x: number, y: number, doorId: string, textureKey: string) {
    super(scene, x, y, textureKey);
    this.doorId = doorId;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
