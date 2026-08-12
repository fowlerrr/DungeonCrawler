import { LocalStorageSaveManager } from "../game/systems/SaveManager";
import { button, el, THEME } from "./ui/domHelpers";
import { showOptions3D, showTutorial3D } from "./ui/Overlays3D";

export interface MenuScreen3DCallbacks {
  onStart: (fresh: boolean) => void;
  onBackTo2D: () => void;
}

/** DOM port of MenuScene.ts's first screen, shown whenever 3D mode is entered without an
 * in-progress game - same title/panel treatment, same New Game/Continue/How to Play/Options
 * buttons (Options and the tutorial overlay are shared verbatim with the 2D pause menu's
 * equivalents via Overlays3D.ts, since they're page-level concerns, not per-mode ones), plus a
 * "Back to 2D" button the 2D game doesn't need. */
export class MenuScreen3D {
  private readonly root: HTMLDivElement;

  constructor(container: HTMLElement, callbacks: MenuScreen3DCallbacks) {
    const hasSave = new LocalStorageSaveManager().load() !== null;

    this.root = el("div", {
      position: "fixed",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0d0d14",
      zIndex: "500",
      fontFamily: "monospace",
    });

    const panel = el("div", {
      width: "360px",
      background: THEME.panelBg,
      border: `1px solid ${THEME.panelBorder}`,
      borderTop: `4px solid ${THEME.accent}`,
      borderRadius: "14px",
      padding: "28px 32px",
      textAlign: "center",
    });

    panel.appendChild(el("div", { fontSize: "34px", color: THEME.text, marginBottom: "26px" }, "Dungeon Crawler 3D"));

    const buttons = el("div", { display: "flex", flexDirection: "column", gap: "14px", alignItems: "center" });
    buttons.appendChild(button("New Game", () => callbacks.onStart(true), { fontSize: "18px", color: THEME.text }));
    const continueBtn = button("Continue", () => callbacks.onStart(false), {
      fontSize: "18px",
      color: hasSave ? THEME.text : "#3a3a44",
    });
    if (!hasSave) continueBtn.disabled = true;
    buttons.appendChild(continueBtn);
    buttons.appendChild(button("How to Play", () => showTutorial3D(this.root), { fontSize: "18px", color: THEME.text }));
    buttons.appendChild(button("Options", () => showOptions3D(this.root), { fontSize: "18px", color: THEME.text }));
    buttons.appendChild(button("Back to 2D", () => callbacks.onBackTo2D(), { fontSize: "14px", color: THEME.dim, marginTop: "10px" }));
    panel.appendChild(buttons);

    this.root.appendChild(panel);
    container.appendChild(this.root);
  }

  dispose(): void {
    this.root.remove();
  }
}
