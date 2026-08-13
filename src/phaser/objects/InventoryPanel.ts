import Phaser from "phaser";
import { IS_TOUCH_DEVICE } from "../../config/device";
import { getRarityConfig, RARITY_TIERS } from "../../game/data/rarity";
import type { EquipmentSlot, ItemDef, ItemStats } from "../../game/data/types";

const RARITY_ORDER = new Map(RARITY_TIERS.map((tier, index) => [tier.tier, index]));

// At the desktop sizing, this 3-column layout is 852px wide - already wider than the touch
// design resolution's entire GAME_WIDTH (670, see constants.ts), let alone leaving any margin.
// Shrinking column width/gaps/padding (and the font + truncate length so text still roughly
// fits its narrower column) keeps the same 3-column layout rather than redesigning the
// interaction model, just resized to actually fit the canvas it has to render inside.
const COLUMN_WIDTH = IS_TOUCH_DEVICE ? 205 : 260;
const COLUMN_GAP = IS_TOUCH_DEVICE ? 10 : 20;
const ROW_HEIGHT = 22;
const VISIBLE_ROWS = 7;
const HEADER_HEIGHT = 20;
const ARROW_HEIGHT = 16;
const TITLE_HEIGHT = 36;
const PANEL_PADDING = IS_TOUCH_DEVICE ? 10 : 16;
const ROW_FONT_SIZE = IS_TOUCH_DEVICE ? "11px" : "12px";
const ROW_TRUNCATE_CHARS = IS_TOUCH_DEVICE ? 27 : 34;

const SLOT_ORDER: EquipmentSlot[] = ["weapon", "armor", "accessory"];
const SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: "Weapon", armor: "Armor", accessory: "Accessory" };

const PANEL_WIDTH = PANEL_PADDING * 2 + COLUMN_WIDTH * 3 + COLUMN_GAP * 2;
const COLUMN_CONTENT_HEIGHT = HEADER_HEIGHT + ARROW_HEIGHT + VISIBLE_ROWS * ROW_HEIGHT + ARROW_HEIGHT;
const PANEL_HEIGHT = TITLE_HEIGHT + PANEL_PADDING * 2 + COLUMN_CONTENT_HEIGHT;

/** Centered modal listing every owned weapon/armor/accessory in its own column, colored by
 * rarity, with the equipped item in each slot marked - click a row to equip it. Each column
 * scrolls independently (mouse wheel over it, or its ▲/▼ buttons) once it has more than
 * VISIBLE_ROWS items. Toggled by UIScene, which also owns pausing GameScene while this is open;
 * this class only renders and reports clicks via onSelect. Closable by the "I" key (UIScene),
 * the ✕ button, or tapping the backdrop - the first is desktop-only, so the other two exist
 * specifically so a touch device (no physical I key) always has a way out. */
export class InventoryPanel {
  private readonly scene: Phaser.Scene;
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly onSelect: (item: ItemDef) => void;
  private readonly onClose: () => void;
  private backdrop: Phaser.GameObjects.Rectangle;
  private container: Phaser.GameObjects.Container;
  private open = false;

  private lastItems: readonly ItemDef[] = [];
  private lastEquipped: Partial<Record<EquipmentSlot, string>> = {};
  private scrollOffset: Record<EquipmentSlot, number> = { weapon: 0, armor: 0, accessory: 0 };

  constructor(scene: Phaser.Scene, centerX: number, centerY: number, onSelect: (item: ItemDef) => void, onClose: () => void) {
    this.scene = scene;
    this.centerX = centerX;
    this.centerY = centerY;
    this.onSelect = onSelect;
    this.onClose = onClose;
    this.backdrop = scene.add
      .rectangle(centerX, centerY, 4000, 4000, 0x000000, 0.6)
      .setDepth(300)
      .setVisible(false)
      .setInteractive();
    // Closes on a tap/click anywhere outside the panel itself. Checks pointer position against
    // the panel's own bounds rather than relying on the row/arrow/close buttons stopping event
    // propagation - Phaser doesn't do that automatically between overlapping interactive
    // objects, so a click on a row would otherwise also reach this handler (sitting right
    // beneath it) and close the panel in the same tap used to equip something.
    this.backdrop.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const left = this.centerX - PANEL_WIDTH / 2;
      const top = this.centerY - PANEL_HEIGHT / 2;
      const insidePanel = pointer.x >= left && pointer.x <= left + PANEL_WIDTH && pointer.y >= top && pointer.y <= top + PANEL_HEIGHT;
      if (!insidePanel) this.onClose();
    });
    this.container = scene.add.container(0, 0).setDepth(301).setVisible(false);

    scene.input.on("wheel", (pointer: Phaser.Input.Pointer, _objs: unknown[], _dx: number, deltaY: number) => {
      if (!this.open) return;
      const slot = this.columnAt(pointer.x);
      if (slot) this.scroll(slot, deltaY > 0 ? 1 : -1);
    });
  }

  /** Whether the panel is currently shown. */
  isOpen(): boolean {
    return this.open;
  }

  /** Hides the panel without destroying it - show() reopens it later. */
  close(): void {
    this.open = false;
    this.backdrop.setVisible(false);
    this.container.setVisible(false);
  }

  /** `items` should be every owned equippable (weapon/armor/accessory) - consumables have no
   * slot and are dropped automatically. `equipped` maps slot -> equipped item id. */
  show(items: readonly ItemDef[], equipped: Partial<Record<EquipmentSlot, string>>): void {
    this.open = true;
    this.lastItems = items;
    this.lastEquipped = equipped;
    this.backdrop.setVisible(true);
    this.container.setVisible(true);
    this.rebuild();
  }

  /** X position of the left edge of the given column index (0 = weapon, 1 = armor, 2 = accessory). */
  private columnLeft(index: number): number {
    return this.centerX - PANEL_WIDTH / 2 + PANEL_PADDING + index * (COLUMN_WIDTH + COLUMN_GAP);
  }

  /** Which slot's column, if any, contains this screen x - used to route mouse-wheel scrolling
   * to the column the pointer is over. */
  private columnAt(pointerX: number): EquipmentSlot | undefined {
    const index = SLOT_ORDER.findIndex((_, i) => pointerX >= this.columnLeft(i) && pointerX <= this.columnLeft(i) + COLUMN_WIDTH);
    return index >= 0 ? SLOT_ORDER[index] : undefined;
  }

  /** Rarity first (legendary -> normal, i.e. best items at the top), then alphabetically by
   * name within a tier - so the list stays in a stable, predictable order as items are found
   * rather than just pickup order. */
  private itemsBySlot(slot: EquipmentSlot): ItemDef[] {
    return this.lastItems
      .filter((item) => item.slot === slot)
      .sort((a, b) => {
        const rarityDiff = (RARITY_ORDER.get(b.rarity) ?? 0) - (RARITY_ORDER.get(a.rarity) ?? 0);
        return rarityDiff !== 0 ? rarityDiff : a.name.localeCompare(b.name);
      });
  }

  /** Moves a column's scroll offset by 3 rows in `direction`, clamped to the valid range, and
   * redraws if it actually changed. */
  private scroll(slot: EquipmentSlot, direction: number): void {
    const maxOffset = Math.max(0, this.itemsBySlot(slot).length - VISIBLE_ROWS);
    const next = Phaser.Math.Clamp(this.scrollOffset[slot] + direction * 3, 0, maxOffset);
    if (next === this.scrollOffset[slot]) return;
    this.scrollOffset[slot] = next;
    this.rebuild();
  }

  /** Tears down and redraws the entire panel contents - simplest way to keep the three columns
   * in sync with current scroll offsets and item lists, and cheap enough given how rarely this
   * panel's contents change (only on open, scroll, or an item pickup/equip). */
  private rebuild(): void {
    this.container.removeAll(true);

    const top = this.centerY - PANEL_HEIGHT / 2;
    const left = this.centerX - PANEL_WIDTH / 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a24, 1);
    bg.fillRoundedRect(left, top, PANEL_WIDTH, PANEL_HEIGHT, 10);
    bg.lineStyle(1, 0x4a4a5a, 1);
    bg.strokeRoundedRect(left, top, PANEL_WIDTH, PANEL_HEIGHT, 10);
    bg.fillStyle(0x4ea8ff, 1);
    bg.fillRoundedRect(left, top, PANEL_WIDTH, 4, { tl: 10, tr: 10, bl: 0, br: 0 });

    const title = this.scene.add.text(left + PANEL_PADDING, top + PANEL_PADDING, "Equipment", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
    });

    // A visible close affordance rather than relying on the "I" key (desktop-only) or knowing
    // to tap outside the panel - both of those still work, this is just the discoverable one.
    const closeButton = this.scene.add
      .text(left + PANEL_WIDTH - PANEL_PADDING, top + PANEL_PADDING, "✕", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#9a9aa5",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeButton.on("pointerover", () => closeButton.setColor("#ffffff"));
    closeButton.on("pointerout", () => closeButton.setColor("#9a9aa5"));
    closeButton.on("pointerdown", () => this.onClose());

    this.container.add([bg, title, closeButton]);

    const contentTop = top + TITLE_HEIGHT;
    SLOT_ORDER.forEach((slot, index) => this.renderColumn(slot, this.columnLeft(index), contentTop));
  }

  /** Draws one slot's column: header, scroll arrows, and the current page of item rows
   * (equipped item marked with a leading `>`), clicking a row equips it via onSelect. */
  private renderColumn(slot: EquipmentSlot, left: number, top: number): void {
    const items = this.itemsBySlot(slot);
    const maxOffset = Math.max(0, items.length - VISIBLE_ROWS);
    this.scrollOffset[slot] = Phaser.Math.Clamp(this.scrollOffset[slot], 0, maxOffset);
    const offset = this.scrollOffset[slot];

    this.container.add(
      this.scene.add.text(left, top, SLOT_LABELS[slot], { fontFamily: "monospace", fontSize: "13px", color: "#9a9aa5" }),
    );

    const upY = top + HEADER_HEIGHT;
    this.container.add(this.arrowButton(left, upY, "▲", offset > 0, () => this.scroll(slot, -1)));

    let rowY = upY + ARROW_HEIGHT;
    const visible = items.slice(offset, offset + VISIBLE_ROWS);
    if (items.length === 0) {
      this.container.add(
        this.scene.add.text(left + 6, rowY, "(none owned)", { fontFamily: "monospace", fontSize: "12px", color: "#5a5a68" }),
      );
    } else {
      for (const item of visible) {
        const marker = item.id === this.lastEquipped[slot] ? "> " : "  ";
        const row = this.scene.add
          .text(left, rowY, truncate(`${marker}${item.name}${describeStats(item.stats)}`, ROW_TRUNCATE_CHARS), {
            fontFamily: "monospace",
            fontSize: ROW_FONT_SIZE,
            color: getRarityConfig(item.rarity).color,
          })
          .setInteractive({ useHandCursor: true });
        row.on("pointerdown", () => this.onSelect(item));
        this.container.add(row);
        rowY += ROW_HEIGHT;
      }
    }

    const downY = top + HEADER_HEIGHT + ARROW_HEIGHT + VISIBLE_ROWS * ROW_HEIGHT;
    this.container.add(this.arrowButton(left, downY, "▼", offset + VISIBLE_ROWS < items.length, () => this.scroll(slot, 1)));
  }

  /** A ▲/▼ scroll button - only clickable (and full brightness) when `enabled`, so it's still
   * visible but visually inert once a column is scrolled all the way in that direction. */
  private arrowButton(x: number, y: number, glyph: string, enabled: boolean, onClick: () => void): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, glyph, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: enabled ? "#cbd5e1" : "#3a3a44",
    });
    if (enabled) {
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", onClick);
    }
    return text;
  }
}

/** Formats an item's notable stats (damage/cooldown/defense/speed) as a short trailing label,
 * e.g. "  dmg 8  cd 400ms" - omits any stat the item doesn't have. */
function describeStats(stats: ItemStats): string {
  const parts: string[] = [];
  if (stats.damage !== undefined) parts.push(`dmg ${stats.damage}`);
  if (stats.cooldownMs !== undefined) parts.push(`cd ${stats.cooldownMs}ms`);
  if (stats.defense !== undefined) parts.push(`def ${stats.defense}`);
  if (stats.speedMult !== undefined) parts.push(`spd x${stats.speedMult}`);
  return parts.length > 0 ? `  ${parts.join("  ")}` : "";
}

/** Cuts `text` to `maxChars`, ending with an ellipsis if it was cut, so a long item name plus
 * stats string can't overflow its column. */
function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
}
