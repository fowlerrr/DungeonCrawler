import Phaser from "phaser";
import { normalize } from "../../game/util/math";

export class InputController {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private attackKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  /** Unit-length (or zero) direction vector combining arrow keys and WASD. */
  getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) y += 1;
    return normalize(x, y);
  }

  isAttackDown(): boolean {
    return this.attackKey.isDown;
  }
}
