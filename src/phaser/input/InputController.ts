import Phaser from "phaser";
import { resolveDirection, type Direction } from "../../game/util/direction";

/** Reads keyboard state into the game's discrete-direction movement model - arrow keys and WASD
 * both map to the same four directions, and attack is a single held key. */
export class InputController {
  private keys: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private attackKey: Phaser.Input.Keyboard.Key;
  /** Most-recently-pressed direction last, so tapping a new direction while holding another
   * immediately changes course - the standard feel for tile-based movement. */
  private heldOrder: Direction[] = [];

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: [keyboard.addKey(KC.UP), keyboard.addKey(KC.W)],
      down: [keyboard.addKey(KC.DOWN), keyboard.addKey(KC.S)],
      left: [keyboard.addKey(KC.LEFT), keyboard.addKey(KC.A)],
      right: [keyboard.addKey(KC.RIGHT), keyboard.addKey(KC.D)],
    };
    this.attackKey = keyboard.addKey(KC.SPACE);

    for (const dir of Object.keys(this.keys) as Direction[]) {
      for (const key of this.keys[dir]) {
        key.on("down", () => {
          this.heldOrder = this.heldOrder.filter((d) => d !== dir);
          this.heldOrder.push(dir);
        });
        key.on("up", () => {
          if (this.keys[dir].every((k) => !k.isDown)) {
            this.heldOrder = this.heldOrder.filter((d) => d !== dir);
          }
        });
      }
    }
  }

  /** The most recently pressed direction that's still held, or null if none is. */
  getDiscreteDirection(): Direction | null {
    return resolveDirection(this.heldOrder, (dir) => this.keys[dir].some((k) => k.isDown));
  }

  /** Whether the attack key is currently held. */
  isAttackDown(): boolean {
    return this.attackKey.isDown;
  }
}
