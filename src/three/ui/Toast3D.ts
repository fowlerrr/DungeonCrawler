import { el, THEME } from "./domHelpers";
import { SIDEBAR_WIDTH } from "./Hud3D";

const TOAST_VISIBLE_MS = 1400;
const TOAST_FADE_MS = 200;

/**
 * A brief floating notification for pickups - the 3D equivalent of the 2D game's
 * spawnLootPopup, which rises and fades over the chest in world space. There's no convenient
 * "over the object" world-space text here (the object is usually behind the player by the time
 * the pickup registers, and DOM text doesn't project into 3D anyway without extra machinery), so
 * this stacks toasts at the top of the viewport instead - still rarity/key-colored, still names
 * the specific thing collected, just screen-space rather than world-space.
 */
export class ToastLayer3D {
  private readonly container: HTMLDivElement;

  constructor(root: HTMLElement) {
    this.container = el("div", {
      position: "fixed",
      top: "16px",
      left: `calc((100% - ${SIDEBAR_WIDTH}px) / 2)`,
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
      zIndex: "80",
      pointerEvents: "none",
    });
    root.appendChild(this.container);
  }

  /** Adds a new toast that fades in, holds for TOAST_VISIBLE_MS, then fades out and removes
   * itself. */
  show(text: string, color: string): void {
    const toast = el(
      "div",
      {
        fontFamily: "monospace",
        fontSize: "14px",
        color,
        background: "rgba(26,26,36,0.9)",
        border: `1px solid ${THEME.panelBorder}`,
        borderRadius: "6px",
        padding: "6px 14px",
        opacity: "0",
        transform: "translateY(-6px)",
        transition: `opacity ${TOAST_FADE_MS}ms ease, transform ${TOAST_FADE_MS}ms ease`,
        whiteSpace: "nowrap",
      },
      text,
    );
    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), TOAST_FADE_MS);
    }, TOAST_VISIBLE_MS);
  }

  /** Removes the toast container from the DOM. */
  dispose(): void {
    this.container.remove();
  }
}
