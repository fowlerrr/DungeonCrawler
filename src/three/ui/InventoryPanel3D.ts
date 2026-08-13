import { IS_TOUCH_DEVICE } from "../../config/device";
import { getRarityConfig, rarityRank } from "../../game/data/rarity";
import type { EquipmentSlot, ItemDef, ItemStats } from "../../game/data/types";
import { createModal, el, THEME, type Modal } from "./domHelpers";

const SLOT_ORDER: EquipmentSlot[] = ["weapon", "armor", "accessory"];
const SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: "Weapon", armor: "Armor", accessory: "Accessory" };
// At the desktop sizing, 3 columns of 260px comes to an 840px-wide panel - wider than the touch
// design resolution's entire viewport on most phones, let alone leaving any margin. Narrower
// columns on touch keep the same 3-column layout rather than redesigning it, just resized to
// actually fit.
const COLUMN_WIDTH = IS_TOUCH_DEVICE ? 190 : 260;
const COLUMN_HEIGHT = 240;

/** Centered modal listing every owned weapon/armor/accessory in its own scrollable column,
 * colored by rarity, with the equipped item in each slot marked - DOM port of the 2D game's
 * InventoryPanel.ts. Native overflow:auto scrolling replaces that version's hand-rolled arrow
 * buttons/offset tracking, since a real browser gives us that for free here. Closable by the
 * "I" key (Game3D), the ✕ button, or tapping the backdrop - the first is desktop-only, so the
 * other two exist specifically so a touch device (no physical I key) always has a way out;
 * previously there was no close button or backdrop-tap at all, only the key. The ✕/backdrop
 * paths go through the same onClose callback Game3D wires up for the "I" key (toggling pause
 * and the on-screen touch controls back on) rather than calling this class's own close()
 * directly - close() alone only removes the modal, it was never responsible for un-pausing the
 * game, so a first version of this fix silently left both paused and the touch controls hidden
 * after closing via anything but the keyboard. */
export class InventoryPanel3D {
  private modal: Modal | null = null;
  private readonly root: HTMLElement;
  private readonly onSelect: (item: ItemDef) => void;
  private readonly onClose: () => void;

  constructor(root: HTMLElement, onSelect: (item: ItemDef) => void, onClose: () => void) {
    this.root = root;
    this.onSelect = onSelect;
    this.onClose = onClose;
  }

  /** Whether the panel is currently shown. */
  isOpen(): boolean {
    return this.modal !== null;
  }

  /** Removes the modal from the DOM, if open. */
  close(): void {
    this.modal?.close();
    this.modal = null;
  }

  /** Rebuilds and shows the modal with the given owned items and current equipped ids. */
  show(items: readonly ItemDef[], equipped: Partial<Record<EquipmentSlot, string>>): void {
    this.close();
    this.modal = createModal(this.root, COLUMN_WIDTH * 3 + 60, "Equipment");
    const modal = this.modal;

    // Only closes when the click lands directly on the backdrop itself, not a descendant - a
    // plain listener on the backdrop would also fire for clicks on the panel/rows/buttons
    // inside it, since DOM click events bubble up through ancestors by default.
    modal.backdrop.addEventListener("pointerdown", (e) => {
      if (e.target === modal.backdrop) this.onClose();
    });

    const closeButton = el("div", { position: "absolute", top: "14px", right: "18px", color: THEME.dim, cursor: "pointer", fontSize: "16px" }, "✕");
    closeButton.addEventListener("click", () => this.onClose());
    closeButton.addEventListener("mouseenter", () => (closeButton.style.color = THEME.text));
    closeButton.addEventListener("mouseleave", () => (closeButton.style.color = THEME.dim));
    modal.panel.style.position = "relative";
    modal.panel.appendChild(closeButton);

    const columns = el("div", { display: "flex", gap: "20px" });
    for (const slot of SLOT_ORDER) {
      columns.appendChild(this.renderColumn(slot, items, equipped));
    }
    modal.panel.appendChild(columns);
  }

  /** Builds one slot's scrollable column: label, then every owned item in that slot (rarity
   * first, then alphabetically), the equipped one marked with a leading `>`. */
  private renderColumn(slot: EquipmentSlot, items: readonly ItemDef[], equipped: Partial<Record<EquipmentSlot, string>>): HTMLDivElement {
    const column = el("div", { width: `${COLUMN_WIDTH}px` });
    column.appendChild(el("div", { color: THEME.dim, marginBottom: "6px" }, SLOT_LABELS[slot]));

    const list = el("div", {
      height: `${COLUMN_HEIGHT}px`,
      overflowY: "auto",
      border: `1px solid ${THEME.panelBorder}`,
      borderRadius: "6px",
      padding: "4px",
    });

    const slotItems = items
      .filter((item) => item.slot === slot)
      .sort((a, b) => {
        const rarityDiff = rarityRank(b.rarity) - rarityRank(a.rarity);
        return rarityDiff !== 0 ? rarityDiff : a.name.localeCompare(b.name);
      });

    if (slotItems.length === 0) {
      list.appendChild(el("div", { color: THEME.faint, fontSize: "12px", padding: "4px" }, "(none owned)"));
    } else {
      for (const item of slotItems) {
        const marker = item.id === equipped[slot] ? "> " : "  ";
        const row = el(
          "div",
          {
            fontSize: "12px",
            color: getRarityConfig(item.rarity).color,
            padding: "3px 4px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            // A long name + stats string previously had nothing stopping it from visually
            // spilling past the column's right edge into whatever's next to it - more likely to
            // actually happen now that touch columns are narrower. CSS ellipsis truncation
            // (rather than cutting the string itself, like the 2D game's InventoryPanel does)
            // clips it precisely regardless of exact character count.
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
          `${marker}${item.name}${describeStats(item.stats)}`,
        );
        row.addEventListener("click", () => this.onSelect(item));
        row.addEventListener("mouseenter", () => (row.style.background = "rgba(255,255,255,0.08)"));
        row.addEventListener("mouseleave", () => (row.style.background = "transparent"));
        list.appendChild(row);
      }
    }

    column.appendChild(list);
    return column;
  }
}

/** Formats an item's notable stats as a short trailing label, e.g. "  dmg 8  cd 400ms" - omits
 * any stat the item doesn't have. */
function describeStats(stats: ItemStats): string {
  const parts: string[] = [];
  if (stats.damage !== undefined) parts.push(`dmg ${stats.damage}`);
  if (stats.cooldownMs !== undefined) parts.push(`cd ${stats.cooldownMs}ms`);
  if (stats.defense !== undefined) parts.push(`def ${stats.defense}`);
  if (stats.speedMult !== undefined) parts.push(`spd x${stats.speedMult}`);
  return parts.length > 0 ? `  ${parts.join("  ")}` : "";
}
