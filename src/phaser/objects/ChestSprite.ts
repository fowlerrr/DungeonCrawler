import Phaser from "phaser";

export class ChestSprite extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "chest");
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
