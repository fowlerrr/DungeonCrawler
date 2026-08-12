import { resolveDirection, type Direction } from "../../game/util/direction";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

/** DOM-keyboard equivalent of the 2D game's Phaser InputController - same "most recently pressed
 * direction wins" feel (see resolveDirection), same key bindings, just wired to window key
 * events instead of a Phaser Scene's input plugin. */
export class InputController3D {
  private down = new Set<string>();
  private heldOrder: Direction[] = [];
  private attackDown = false;
  private listeners: { keydown: (e: KeyboardEvent) => void; keyup: (e: KeyboardEvent) => void };
  private onKeyPress = new Map<string, () => void>();

  constructor() {
    this.listeners = {
      keydown: (e) => this.handleKeyDown(e),
      keyup: (e) => this.handleKeyUp(e),
    };
    window.addEventListener("keydown", this.listeners.keydown);
    window.addEventListener("keyup", this.listeners.keyup);
  }

  /** Registers a one-shot callback fired on the initial keydown (not while held) of `code`. */
  onPress(code: string, callback: () => void): void {
    this.onKeyPress.set(code, callback);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.down.has(e.code)) this.onKeyPress.get(e.code)?.();
    this.down.add(e.code);

    const dir = KEY_TO_DIRECTION[e.code];
    if (dir) {
      this.heldOrder = this.heldOrder.filter((d) => d !== dir);
      this.heldOrder.push(dir);
    }
    if (e.code === "Space") this.attackDown = true;
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.down.delete(e.code);
    const dir = KEY_TO_DIRECTION[e.code];
    if (dir && !this.isDirectionHeld(dir)) {
      this.heldOrder = this.heldOrder.filter((d) => d !== dir);
    }
    if (e.code === "Space") this.attackDown = false;
  }

  private isDirectionHeld(dir: Direction): boolean {
    return Object.entries(KEY_TO_DIRECTION).some(([code, d]) => d === dir && this.down.has(code));
  }

  getDiscreteDirection(): Direction | null {
    return resolveDirection(this.heldOrder, (dir) => this.isDirectionHeld(dir));
  }

  isAttackDown(): boolean {
    return this.attackDown;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.listeners.keydown);
    window.removeEventListener("keyup", this.listeners.keyup);
  }
}
