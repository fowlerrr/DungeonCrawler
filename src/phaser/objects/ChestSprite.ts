import Phaser from "phaser";

export class ChestSprite extends Phaser.Physics.Arcade.Sprite {
  /** Vault chests roll boosted loot odds (see LootTable's boostForVault) - the payoff for
   * finding the key to a locked-off room instead of a chest scattered on the open floor. */
  readonly isVault: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, isVault = false) {
    super(scene, x, y, "chest");
    this.isVault = isVault;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
  }
}
