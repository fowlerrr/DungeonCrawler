import Phaser from "phaser";
import type { KeyLabel } from "../../game/systems/Keyring";

/** A static world pickup that adds a key to the player's Keyring on contact - doorId identifies
 * which door it unlocks, label is which color/kind it displays as in the HUD. */
export class KeyPickupSprite extends Phaser.Physics.Arcade.Sprite {
  readonly doorId: string;
  readonly label: KeyLabel;

  constructor(scene: Phaser.Scene, x: number, y: number, doorId: string, label: KeyLabel, textureKey: string) {
    super(scene, x, y, textureKey);
    this.doorId = doorId;
    this.label = label;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
