const FORWARD_CODES = new Set(["ArrowUp", "KeyW"]);
const BACKWARD_CODES = new Set(["ArrowDown", "KeyS"]);

/** Tank-style controls: forward/backward are held (continuous, checked every frame), turning is
 * a discrete action fired once per keypress (see onPress) rather than something that spins you
 * continuously while held - the same edge-triggered feel classic grid-based dungeon crawlers use
 * for turning, matching PlayerController3D's cardinal-only facing. */
export class InputController3D {
  private down = new Set<string>();
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

  /** Records the key as held and fires its registered onPress callback, but only on the actual
   * transition to held (repeat keydown events while held are ignored). */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.down.has(e.code)) this.onKeyPress.get(e.code)?.();
    this.down.add(e.code);
    if (e.code === "Space") this.attackDown = true;
  }

  /** Records the key as released. */
  private handleKeyUp(e: KeyboardEvent): void {
    this.down.delete(e.code);
    if (e.code === "Space") this.attackDown = false;
  }

  /** Whether a forward-move key is currently held. */
  isForwardDown(): boolean {
    return [...FORWARD_CODES].some((code) => this.down.has(code));
  }

  /** Whether a backward-move key is currently held. */
  isBackwardDown(): boolean {
    return [...BACKWARD_CODES].some((code) => this.down.has(code));
  }

  /** Whether the attack key is currently held. */
  isAttackDown(): boolean {
    return this.attackDown;
  }

  /** Removes the window key listeners, e.g. when leaving 3D mode. */
  dispose(): void {
    window.removeEventListener("keydown", this.listeners.keydown);
    window.removeEventListener("keyup", this.listeners.keyup);
  }
}
