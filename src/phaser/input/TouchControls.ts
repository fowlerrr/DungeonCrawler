import type { Direction } from "../../game/util/direction";
import type { InputController } from "./InputController";

/** Whether this device is primarily touch-driven - used to decide whether to show the on-screen
 * d-pad at all, since it'd just be clutter over a mouse/keyboard desktop session. `pointer:
 * coarse` catches phones/tablets; `maxTouchPoints` is the fallback for browsers that don't
 * support the media query. Checked once at boot rather than live-updated, since a device doesn't
 * usually gain or lose a touchscreen mid-session. */
export function isTouchDevice(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

const BUTTON_SIZE = 60;
const DPAD_GAP = 4;

/**
 * A screen-space overlay (fixed position, not part of the Phaser canvas) with a 4-button d-pad
 * bottom-left and an attack button bottom-right - plain DOM rather than Phaser GameObjects, both
 * because DOM buttons are far simpler to size/style for touch and because that keeps this
 * entirely decoupled from Phaser's scene lifecycle (one instance survives every level rebuild and
 * scene transition; GameScene just calls show()/hide() around pauses, same as it would toggle
 * visibility on anything else screen-space).
 *
 * Feeds directly into InputController's virtual-input methods (see its doc comment) rather than
 * duplicating any movement logic here - this class only ever translates a touch into "which
 * direction/attack button is currently held," identically to how a real key does.
 */
export class TouchControls {
  private readonly root: HTMLDivElement;
  /** Every managed button, so hide() can force-release any still mid-press (see hide()) without
   * caring whether it's a direction or the attack button. */
  private readonly allButtons: HTMLDivElement[] = [];

  constructor(container: HTMLElement, input: InputController) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "300",
      userSelect: "none",
      touchAction: "none",
    } satisfies Partial<CSSStyleDeclaration>);

    this.root.append(this.buildDpad(input), this.buildAttackButton(input));
    container.appendChild(this.root);
  }

  /** A 3x3 CSS grid (center cell empty) of direction buttons, bottom-left of the screen. */
  private buildDpad(input: InputController): HTMLDivElement {
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

    const layout: { dir: Direction; label: string; col: number; row: number }[] = [
      { dir: "up", label: "▲", col: 2, row: 1 },
      { dir: "left", label: "◀", col: 1, row: 2 },
      { dir: "right", label: "▶", col: 3, row: 2 },
      { dir: "down", label: "▼", col: 2, row: 3 },
    ];

    for (const { dir, label, col, row } of layout) {
      const button = this.makeButton(label);
      button.style.gridColumn = String(col);
      button.style.gridRow = String(row);
      this.bindHold(
        button,
        () => input.pressVirtualDirection(dir),
        () => input.releaseVirtualDirection(dir),
      );
      el.appendChild(button);
    }

    return el;
  }

  private buildAttackButton(input: InputController): HTMLDivElement {
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
      () => input.setVirtualAttackDown(true),
      () => input.setVirtualAttackDown(false),
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

  /** Wires a button to call `onPress`/`onRelease` around however long it's actually held -
   * pointercancel/pointerleave are included alongside pointerup since a dragging finger sliding
   * off the button (common on a cramped phone screen) should release it too, not leave it stuck
   * "held" forever. setPointerCapture keeps every one of those events routed to this element even
   * once the finger has physically left it. */
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

  show(): void {
    this.root.style.display = "block";
  }

  /** Hides the overlay, and releases anything still visually "held" mid-press (e.g. opening the
   * pause menu while walking) - otherwise the direction/attack would stay stuck on once play
   * resumes, since the matching pointerup can never arrive for a button no longer in the DOM's
   * hit-testing path. Dispatching a synthetic pointercancel reuses bindHold's own release logic
   * rather than duplicating the input-controller calls here, so the two can't drift apart. */
  hide(): void {
    this.root.style.display = "none";
    for (const button of this.allButtons) button.dispatchEvent(new PointerEvent("pointercancel"));
  }

  destroy(): void {
    this.root.remove();
  }
}
