import Phaser from "phaser";
import { resolveDirection, type Direction } from "../../game/util/direction";

/** Reads keyboard state into the game's discrete-direction movement model - arrow keys and WASD
 * both map to the same four directions, and attack is a single held key. Touch controls (see
 * TouchControls.ts) feed into this exact same model via pressVirtualDirection/
 * releaseVirtualDirection/setVirtualAttackDown, rather than needing a parallel input path -
 * GameScene only ever reads getDiscreteDirection()/isAttackDown(), so it can't tell (and doesn't
 * need to) which input source is currently driving them. */
export class InputController {
  private keys: Record<Direction, Phaser.Input.Keyboard.Key[]>;
  private attackKey: Phaser.Input.Keyboard.Key;
  /** Most-recently-pressed direction last, so tapping a new direction while holding another
   * immediately changes course - the standard feel for tile-based movement. */
  private heldOrder: Direction[] = [];
  /** Mirrors `keys`, but for the on-screen d-pad rather than physical keys - kept separate since
   * there's no Phaser.Input.Keyboard.Key to ask "is this down" for a touch button. */
  private virtualDown: Record<Direction, boolean> = { up: false, down: false, left: false, right: false };
  private virtualAttackDown = false;

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

  /** The most recently pressed direction that's still held (keyboard or the on-screen d-pad),
   * or null if none is. */
  getDiscreteDirection(): Direction | null {
    return resolveDirection(this.heldOrder, (dir) => this.virtualDown[dir] || this.keys[dir].some((k) => k.isDown));
  }

  /** Whether the attack key or the on-screen attack button is currently held. */
  isAttackDown(): boolean {
    return this.virtualAttackDown || this.attackKey.isDown;
  }

  /** Registers a d-pad button press - same "most recent wins" ordering as a real keypress, so
   * touch and keyboard can even be mixed without either feeling like it's fighting the other. */
  pressVirtualDirection(dir: Direction): void {
    this.heldOrder = this.heldOrder.filter((d) => d !== dir);
    this.heldOrder.push(dir);
    this.virtualDown[dir] = true;
  }

  /** Registers a d-pad button release - only drops `dir` from the held-order history once
   * neither the touch button nor a real key for it is still down. */
  releaseVirtualDirection(dir: Direction): void {
    this.virtualDown[dir] = false;
    if (!this.keys[dir].some((k) => k.isDown)) {
      this.heldOrder = this.heldOrder.filter((d) => d !== dir);
    }
  }

  /** Sets whether the on-screen attack button is currently held. */
  setVirtualAttackDown(down: boolean): void {
    this.virtualAttackDown = down;
  }
}
