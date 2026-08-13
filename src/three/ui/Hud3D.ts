import { IS_TOUCH_DEVICE } from "../../config/device";
import { getRarityConfig } from "../../game/data/rarity";
import type { ItemDef } from "../../game/data/types";
import type { FogOfWar } from "../../game/systems/FogOfWar";
import { TileType, type TileGrid } from "../../game/maze/types";
import { computeMinimapTileSize } from "../../game/util/math";
import type { KeyLabel } from "../../game/systems/Keyring";
import { el, THEME } from "./domHelpers";

// Narrower on touch so it leaves more of a phone-sized viewport for the actual 3D view - unlike
// the 2D game's canvas, this sidebar is plain DOM flow (already has overflowY: auto and no fixed
// per-element positions), so it doesn't need the fuller responsive rework 2D's UIScene did; it
// just reflows naturally at a different width.
const SIDEBAR_WIDTH = IS_TOUCH_DEVICE ? 190 : 240;
const MAX_MINIMAP_TILE_PX = 4;
export const KEY_COLOR_HEX: Record<KeyLabel, string> = {
  red: "#ff5555",
  blue: "#5588ff",
  green: "#55dd77",
  yellow: "#ffdd55",
  purple: "#aa66ff",
  orange: "#ff9944",
  cyan: "#44eeff",
  pink: "#ff77bb",
  teal: "#55ddcc",
  brown: "#a87d55",
  exit: "#f5d76e",
};

export interface HudDoor {
  tileX: number;
  tileY: number;
  color: string;
}

export interface HudState {
  levelNumber: number;
  highestLevelReached: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  gold: number;
  weapon?: ItemDef;
  armor?: ItemDef;
  accessory?: ItemDef;
  keys: KeyLabel[];
  grid: TileGrid;
  fog: FogOfWar;
  playerTx: number;
  playerTy: number;
  doors: readonly HudDoor[];
}

/** The always-on right-side sidebar, DOM equivalent of UIScene.ts - same information, same
 * rarity-colored equipment lines and ATK/DEF total, same minimap, just HTML/CSS/canvas instead
 * of Phaser Text/Graphics objects. */
export class Hud3D {
  readonly root: HTMLDivElement;
  private statsText: HTMLDivElement;
  private weaponLine: HTMLDivElement;
  private armorLine: HTMLDivElement;
  private accessoryLine: HTMLDivElement;
  private keysLine: HTMLDivElement;
  private minimapCanvas: HTMLCanvasElement;

  onOpenInventory: () => void = () => {};
  onOpenMenu: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.root = el("div", {
      position: "fixed",
      top: "0",
      right: "0",
      width: `${SIDEBAR_WIDTH}px`,
      height: "100%",
      background: THEME.panelBg,
      borderLeft: `2px solid ${THEME.accent}`,
      boxSizing: "border-box",
      padding: "12px",
      fontFamily: "monospace",
      fontSize: "13px",
      color: THEME.text,
      zIndex: "50",
      overflowY: "auto",
    });

    this.statsText = el("div", { whiteSpace: "pre-line", marginBottom: "10px" });
    this.minimapCanvas = el("canvas", { display: "block", marginBottom: "10px", borderRadius: "4px" });
    this.weaponLine = el("div");
    this.armorLine = el("div");
    this.accessoryLine = el("div", { marginBottom: "10px" });

    const equipHeading = el("div", { color: THEME.dim, marginBottom: "4px" }, "Equipment (I):");
    this.keysLine = el("div", { whiteSpace: "pre-line", marginBottom: "12px" });
    const keysHeading = el("div", { color: THEME.dim, marginBottom: "4px" }, "Keys:");

    const elements: HTMLElement[] = [this.statsText, this.minimapCanvas, equipHeading, this.weaponLine, this.armorLine, this.accessoryLine, keysHeading, this.keysLine];

    // Neither shortcut applies on touch (no physical I/ESC key) - the [ Equip ]/[ Menu ] buttons
    // below are the touch-friendly way to reach the same things on any device, so this hint is
    // skipped entirely on mobile rather than just left inaccurate, same as UIScene.ts's version.
    if (!IS_TOUCH_DEVICE) {
      elements.push(el("div", { color: THEME.dim, marginBottom: "8px" }, "I: equipment   ESC: menu"));
    }

    // [ Equip ] was previously missing entirely - onOpenInventory existed as a callback with
    // nothing in the DOM ever calling it, so opening the equipment panel only ever worked via
    // the "I" key. Shown on both platforms rather than only touch, same reasoning as [ Menu ]
    // already coexisting with ESC: a visible, clickable affordance is good UX regardless of
    // input method, not just a mobile-only necessity.
    const equipButton = el("div", { color: THEME.accent, cursor: "pointer", marginBottom: "4px" }, "[ Equip ]");
    equipButton.addEventListener("click", () => this.onOpenInventory());
    equipButton.addEventListener("mouseenter", () => (equipButton.style.color = THEME.text));
    equipButton.addEventListener("mouseleave", () => (equipButton.style.color = THEME.accent));
    elements.push(equipButton);

    const menuButton = el("div", { color: THEME.accent, cursor: "pointer" }, "[ Menu ]");
    menuButton.addEventListener("click", () => this.onOpenMenu());
    menuButton.addEventListener("mouseenter", () => (menuButton.style.color = THEME.text));
    menuButton.addEventListener("mouseleave", () => (menuButton.style.color = THEME.accent));
    elements.push(menuButton);

    this.root.append(...elements);
    parent.appendChild(this.root);
  }

  /** Repaints every HUD element from the current game state - called once per frame. */
  update(state: HudState): void {
    this.statsText.textContent =
      `Level: ${state.levelNumber}\nHighest Level: ${state.highestLevelReached}\n` +
      `HP: ${state.hp}/${state.maxHp}\nATK: ${state.atk}  DEF: ${state.def}\nGold: ${state.gold}`;

    this.setEquipLine(this.weaponLine, "Weapon", state.weapon);
    this.setEquipLine(this.armorLine, "Armor", state.armor);
    this.setEquipLine(this.accessoryLine, "Accessory", state.accessory);

    this.keysLine.textContent = "";
    if (state.keys.length === 0) {
      this.keysLine.append(el("span", { color: THEME.faint }, "none"));
    } else {
      state.keys.forEach((label, i) => {
        const span = el("span", { color: KEY_COLOR_HEX[label] }, label);
        this.keysLine.appendChild(span);
        if (i < state.keys.length - 1) this.keysLine.appendChild(document.createTextNode(i % 4 === 3 ? "\n" : "  "));
      });
    }

    this.redrawMinimap(state.grid, state.fog, state.playerTx, state.playerTy, state.doors);
  }

  /** Sets an equipment line's text and colors it by the item's rarity, or faint/"-" if empty. */
  private setEquipLine(node: HTMLDivElement, label: string, item: ItemDef | undefined): void {
    node.textContent = `${label}: ${item?.name ?? "-"}`;
    node.style.color = item ? getRarityConfig(item.rarity).color : THEME.faint;
  }

  /** Repaints the minimap canvas: every visited tile shaded by whether it's a wall, a colored dot
   * for each still-locked door whose tile has been found, and the player's current tile marked
   * with a bright white ring so it never blends into the rest of the palette. */
  private redrawMinimap(grid: TileGrid, fog: FogOfWar, playerTx: number, playerTy: number, doors: readonly HudDoor[]): void {
    const maxWidth = SIDEBAR_WIDTH - 24;
    const tilePx = computeMinimapTileSize(grid[0].length, maxWidth, MAX_MINIMAP_TILE_PX);
    const w = grid[0].length * tilePx;
    const h = grid.length * tilePx;
    this.minimapCanvas.width = w;
    this.minimapCanvas.height = h;
    const ctx = this.minimapCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        if (!fog.isVisited(x, y)) continue;
        ctx.fillStyle = grid[y][x] === TileType.Wall ? "#333344" : "#8899aa";
        ctx.fillRect(x * tilePx, y * tilePx, tilePx, tilePx);
      }
    }

    for (const door of doors) {
      if (!fog.isVisited(door.tileX, door.tileY)) continue;
      ctx.fillStyle = KEY_COLOR_HEX[door.color as KeyLabel] ?? "#f5d76e";
      ctx.fillRect(door.tileX * tilePx, door.tileY * tilePx, tilePx, tilePx);
    }

    // A plain same-size tile fill (the old approach) reads as just another floor tile at this
    // scale - a white-cored dot stays visibly "the player" regardless of what color tile or door
    // marker happens to be underneath it.
    const playerCx = playerTx * tilePx + tilePx / 2;
    const playerCy = playerTy * tilePx + tilePx / 2;
    const playerRadius = tilePx * 0.9 + 1.5;
    ctx.fillStyle = "#14141c";
    ctx.beginPath();
    ctx.arc(playerCx, playerCy, playerRadius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(playerCx, playerCy, playerRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Removes the HUD from the DOM, e.g. on quitting to the menu. */
  dispose(): void {
    this.root.remove();
  }
}

export { SIDEBAR_WIDTH };
