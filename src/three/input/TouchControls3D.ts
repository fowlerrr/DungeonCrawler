import type { InputController3D } from "./InputController3D";

const BUTTON_SIZE = 60;
const DPAD_GAP = 4;

/**
 * A screen-space overlay (fixed position, not part of the Three.js canvas) with a 4-button
 * movement cluster bottom-left and an attack button bottom-right - the 3D equivalent of the 2D
 * game's TouchControls.ts, laid out identically (same 3x3-grid-with-empty-center shape) but
 * repurposed for tank controls: up/down are forward/backward (held, like the 2D d-pad's
 * directions), left/right are a discrete 90° turn rather than a held direction, matching
 * PlayerController3D.turn's one-shot-per-tap feel.
 *
 * Feeds directly into InputController3D's virtual-input methods (see its doc comment) rather
 * than duplicating any movement/turn logic here.
 */
export class TouchControls3D {
  private readonly root: HTMLDivElement;
  private readonly allButtons: HTMLDivElement[] = [];

  constructor(container: HTMLElement, input: InputController3D) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "300",
      userSelect: "none",
      touchAction: "none",
    } satisfies Partial<CSSStyleDeclaration>);

    this.root.append(this.buildMoveCluster(input), this.buildAttackButton(input));
    container.appendChild(this.root);
  }

  /** A 3x3 CSS grid (center cell empty): forward/backward on top/bottom (held), turn-left/
   * turn-right on the sides (a discrete tap each, via simulatePress). */
  private buildMoveCluster(input: InputController3D): HTMLDivElement {
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      left: "16px",
      bottom: "16px",
      display: "grid",
      gridTemplateColumns: `repeat(3, ${BUTTON_SIZE}px)`,
      gridTemplateRows: `repeat(3, ${BUTTON_SIZE}px)`,
      gap: `${DPAD_GAP}px`,
      pointerEvents: "auto",
    } satisfies Partial<CSSStyleDeclaration>);

    const forward = this.makeButton("▲");
    forward.style.gridColumn = "2";
    forward.style.gridRow = "1";
    this.bindHold(
      forward,
      () => input.setVirtualForward(true),
      () => input.setVirtualForward(false),
    );

    const backward = this.makeButton("▼");
    backward.style.gridColumn = "2";
    backward.style.gridRow = "3";
    this.bindHold(
      backward,
      () => input.setVirtualBackward(true),
      () => input.setVirtualBackward(false),
    );

    const turnLeft = this.makeButton("↺");
    turnLeft.style.gridColumn = "1";
    turnLeft.style.gridRow = "2";
    this.bindTap(turnLeft, () => input.simulatePress("KeyA"));

    const turnRight = this.makeButton("↻");
    turnRight.style.gridColumn = "3";
    turnRight.style.gridRow = "2";
    this.bindTap(turnRight, () => input.simulatePress("KeyD"));

    el.append(forward, backward, turnLeft, turnRight);
    return el;
  }

  private buildAttackButton(input: InputController3D): HTMLDivElement {
    const button = this.makeButton("⚔");
    Object.assign(button.style, {
      position: "absolute",
      right: "20px",
      bottom: "20px",
      width: `${BUTTON_SIZE + 16}px`,
      height: `${BUTTON_SIZE + 16}px`,
      fontSize: "26px",
      pointerEvents: "auto",
    } satisfies Partial<CSSStyleDeclaration>);
    this.bindHold(
      button,
      () => input.setVirtualAttack(true),
      () => input.setVirtualAttack(false),
    );
    return button;
  }

  private makeButton(label: string): HTMLDivElement {
    const button = document.createElement("div");
    button.textContent = label;
    Object.assign(button.style, {
      width: `${BUTTON_SIZE}px`,
      height: `${BUTTON_SIZE}px`,
      borderRadius: "50%",
      background: "rgba(26, 26, 36, 0.7)",
      border: "1px solid rgba(78, 168, 255, 0.5)",
      color: "#ffffff",
      fontSize: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      touchAction: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    this.allButtons.push(button);
    return button;
  }

  /** Wires a button to call `onPress`/`onRelease` around however long it's actually held - see
   * the 2D TouchControls.ts's bindHold for why pointercancel/pointerleave are included alongside
   * pointerup, and why setPointerCapture is used. */
  private bindHold(el: HTMLDivElement, onPress: () => void, onRelease: () => void): void {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.style.background = "rgba(78, 168, 255, 0.5)";
      onPress();
    });
    const release = () => {
      el.style.background = "rgba(26, 26, 36, 0.7)";
      onRelease();
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
  }

  /** Wires a button to fire `onTap` once per press, with a brief flash for visual feedback -
   * used for the turn buttons, which are a discrete one-shot action rather than a held state. */
  private bindTap(el: HTMLDivElement, onTap: () => void): void {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.style.background = "rgba(78, 168, 255, 0.5)";
      onTap();
    });
    const release = () => {
      el.style.background = "rgba(26, 26, 36, 0.7)";
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
  }

  show(): void {
    this.root.style.display = "block";
  }

  /** Hides the overlay, and releases anything still visually "held" mid-press (e.g. opening the
   * pause menu while walking) - see the 2D TouchControls.ts's hide() for why this dispatches a
   * synthetic pointercancel rather than calling the input-controller methods directly. */
  hide(): void {
    this.root.style.display = "none";
    for (const button of this.allButtons) button.dispatchEvent(new PointerEvent("pointercancel"));
  }

  destroy(): void {
    this.root.remove();
  }
}
