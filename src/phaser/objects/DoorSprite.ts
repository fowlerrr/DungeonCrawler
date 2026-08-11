import Phaser from "phaser";

export class DoorSprite extends Phaser.Physics.Arcade.Sprite {
  readonly doorId: string;
  readonly tileX: number;
  readonly tileY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, tileX: number, tileY: number, doorId: string, textureKey: string) {
    super(scene, x, y, textureKey);
    this.doorId = doorId;
    this.tileX = tileX;
    this.tileY = tileY;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }

  open(): void {
    this.destroy();
  }
}
