/** Small DOM builder helpers shared by every 3D-mode UI overlay (HUD, inventory, pause, options,
 * tutorial, game over, menu) - plain HTML/CSS rather than a Phaser Scene, styled to match the 2D
 * game's existing dark theme (#1a1a24 panels, #4ea8ff accent, monospace type) so switching
 * between 2D and 3D doesn't feel like two different products. */

export const THEME = {
  panelBg: "#1a1a24",
  panelBorder: "#33334a",
  accent: "#4ea8ff",
  text: "#ffffff",
  dim: "#9a9aa5",
  faint: "#5a5a68",
} as const;

/** Creates an element with inline styles and optional text content in one call - avoids the
 * usual createElement + assign-a-bunch-of-properties boilerplate repeated across every overlay. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A borderless text-styled button with the theme's hover-to-white behavior baked in - the DOM
 * equivalent of the 2D game's pointerover/pointerout text-color pattern. */
export function button(label: string, onClick: () => void, style: Partial<CSSStyleDeclaration> = {}): HTMLButtonElement {
  const b = el("button", {
    fontFamily: "monospace",
    fontSize: "14px",
    color: THEME.accent,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "4px 0",
    textAlign: "left",
    ...style,
  }) as HTMLButtonElement;
  b.textContent = label;
  b.addEventListener("mouseenter", () => (b.style.color = THEME.text));
  b.addEventListener("mouseleave", () => (b.style.color = style.color ?? THEME.accent));
  b.addEventListener("click", onClick);
  return b;
}

export interface Modal {
  backdrop: HTMLDivElement;
  panel: HTMLDivElement;
  close: () => void;
}

/** A centered dark panel over a dimmed backdrop - the same visual shape TutorialScene/PauseScene/
 * OptionsScene use in the 2D game, rebuilt in DOM. Appends itself to `root` and returns handles
 * plus a close() that removes both elements. */
export function createModal(root: HTMLElement, width: number, title: string): Modal {
  const backdrop = el("div", {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,0.7)",
    zIndex: "1000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const panel = el("div", {
    width: `${width}px`,
    background: THEME.panelBg,
    border: `1px solid ${THEME.panelBorder}`,
    borderTop: `4px solid ${THEME.accent}`,
    borderRadius: "12px",
    padding: "20px 24px",
    fontFamily: "monospace",
    color: THEME.text,
    boxSizing: "border-box",
  });

  const heading = el("div", { fontSize: "20px", marginBottom: "14px", textAlign: "center" }, title);
  panel.appendChild(heading);

  backdrop.appendChild(panel);
  root.appendChild(backdrop);

  return {
    backdrop,
    panel,
    close: () => backdrop.remove(),
  };
}
