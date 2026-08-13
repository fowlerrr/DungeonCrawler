import Phaser from "phaser";

/** A locked-door tile that blocks movement until the matching key (see Keyring) is used on it -
 * tileX/tileY record its grid position so game logic can match it against the maze's door data. */
export class DoorSprite extends Phaser.Physics.Arcade.Sprite {
  readonly doorId: string;
  readonly tileX: number;
  readonly tileY: number;
  /** The lock color (see DoorColor) - kept alongside the texture key so the minimap can render
   * a matching marker without having to parse it back out of `door_${color}`. */
  readonly color: string;

  constructor(scene: Phaser.Scene, x: number, y: number, tileX: number, tileY: number, doorId: string, color: string, textureKey: string) {
    super(scene, x, y, textureKey);
    this.doorId = doorId;
    this.tileX = tileX;
    this.tileY = tileY;
    this.color = color;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }

  /** Removes the door sprite once its key has been used, opening the passage. */
  open(): void {
    this.destroy();
  }
}
