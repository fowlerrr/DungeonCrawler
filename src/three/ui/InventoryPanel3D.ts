import { getRarityConfig, rarityRank } from "../../game/data/rarity";
import type { EquipmentSlot, ItemDef, ItemStats } from "../../game/data/types";
import { createModal, el, THEME, type Modal } from "./domHelpers";

const SLOT_ORDER: EquipmentSlot[] = ["weapon", "armor", "accessory"];
const SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: "Weapon", armor: "Armor", accessory: "Accessory" };
const COLUMN_WIDTH = 260;
const COLUMN_HEIGHT = 240;

/** Centered modal listing every owned weapon/armor/accessory in its own scrollable column,
 * colored by rarity, with the equipped item in each slot marked - DOM port of the 2D game's
 * InventoryPanel.ts. Native overflow:auto scrolling replaces that version's hand-rolled arrow
 * buttons/offset tracking, since a real browser gives us that for free here. */
export class InventoryPanel3D {
  private modal: Modal | null = null;
  private readonly root: HTMLElement;
  private readonly onSelect: (item: ItemDef) => void;

  constructor(root: HTMLElement, onSelect: (item: ItemDef) => void) {
    this.root = root;
    this.onSelect = onSelect;
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
    this.modal = createModal(this.root, COLUMN_WIDTH * 3 + 60, "Equipment  (I to close)");

    const columns = el("div", { display: "flex", gap: "20px" });
    for (const slot of SLOT_ORDER) {
      columns.appendChild(this.renderColumn(slot, items, equipped));
    }
    this.modal.panel.appendChild(columns);
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
