import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, MAZE_VIEW_WIDTH, SCENE_KEYS, SIDEBAR_WIDTH } from "../../config/constants";
import { IS_TOUCH_DEVICE } from "../../config/device";
import { getRarityConfig } from "../../game/data/rarity";
import type { EquipmentSlot, ItemDef } from "../../game/data/types";
import type { KeyLabel } from "../../game/systems/Keyring";
import { totalAtk, totalDef } from "../../game/systems/PlayerProgression";
import { InventoryPanel } from "../objects/InventoryPanel";
import { MinimapRenderer } from "../render/MinimapRenderer";
import type { GameScene } from "./GameScene";

// The touch design resolution (see constants.ts) is much shorter than desktop's (GAME_HEIGHT 380
// vs 600), so every vertical offset below is tightened to match rather than just inheriting the
// desktop numbers and overflowing off the bottom of a mobile canvas. MINIMAP_RESERVED_HEIGHT in
// particular is sized for the largest maze LevelConfig ever generates (30x24 at
// MinimapRenderer's 4px/tile cap = 120x96px), not a hardcoded guess.
const PANEL_MARGIN = IS_TOUCH_DEVICE ? 8 : 12;
const HUD_Y = PANEL_MARGIN;
const MINIMAP_Y = IS_TOUCH_DEVICE ? 84 : 92; // clears hpText's 5 lines now that it includes an ATK/DEF row
const MINIMAP_RESERVED_HEIGHT = IS_TOUCH_DEVICE ? 115 : 210;
const EQUIP_Y = MINIMAP_Y + MINIMAP_RESERVED_HEIGHT;
const EQUIP_LINE_HEIGHT = IS_TOUCH_DEVICE ? 14 : 17;
const UNEQUIPPED_COLOR = "#5a5a68";
const KEYS_LABEL_Y = EQUIP_Y + (IS_TOUCH_DEVICE ? 36 : 52);
const KEYS_ROW_Y = EQUIP_Y + (IS_TOUCH_DEVICE ? 48 : 68);
const KEYS_PER_ROW = 4;
const KEY_COLUMN_WIDTH = IS_TOUCH_DEVICE ? 42 : 47;
const KEY_ROW_HEIGHT = IS_TOUCH_DEVICE ? 15 : 18;
const CONTROLS_HINT_Y_OFFSET = 128; // desktop-only - see the "I: equipment" hint's own comment below
// [ Equip ] is a visible open trigger alongside the "I" key - the only trigger at all on touch,
// which has no physical I key. Shown on both platforms rather than only touch, same reasoning as
// [ Menu ] already coexisting with ESC: a visible, clickable affordance is good UX regardless of
// input method, not just a mobile-only necessity.
const EQUIP_BUTTON_Y_OFFSET = IS_TOUCH_DEVICE ? 100 : 148;
const MENU_BUTTON_Y_OFFSET = IS_TOUCH_DEVICE ? 122 : 170;
const MAIN_FONT_SIZE = IS_TOUCH_DEVICE ? "12px" : "13px";
const SMALL_FONT_SIZE = IS_TOUCH_DEVICE ? "11px" : "12px";

const KEY_COLOR_HEX: Record<KeyLabel, string> = {
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

/** Runs in parallel with GameScene (launched, not switched to) for HUD/minimap - reads
 * GameScene's public render-relevant state each frame rather than owning any game logic.
 * Everything here lives in the right-side sidebar (x >= MAZE_VIEW_WIDTH), which GameScene's
 * camera viewport never renders into, so the HUD can never cover the maze. */
export class UIScene extends Phaser.Scene {
  private minimap!: MinimapRenderer;
  private hpText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private armorText!: Phaser.GameObjects.Text;
  private accessoryText!: Phaser.GameObjects.Text;
  private keysContainer!: Phaser.GameObjects.Container;
  private lastKeysSignature = "";
  private inventoryPanel!: InventoryPanel;

  constructor() {
    super(SCENE_KEYS.UI);
  }

  /** Builds the sidebar panel: minimap, HP/ATK/DEF/gold text, equipped-gear labels, key
   * display, and the equipment-panel toggle. */
  create(): void {
    const panelX = MAZE_VIEW_WIDTH;
    this.add.rectangle(panelX, 0, SIDEBAR_WIDTH, GAME_HEIGHT, 0x1a1a24, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(150);
    this.add.rectangle(panelX, 0, 2, GAME_HEIGHT, 0x4ea8ff, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(151);

    const contentX = panelX + PANEL_MARGIN;
    const contentWidth = SIDEBAR_WIDTH - PANEL_MARGIN * 2;

    this.minimap = new MinimapRenderer(this, contentX, MINIMAP_Y, contentWidth);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: MAIN_FONT_SIZE,
      color: "#ffffff",
      wordWrap: { width: contentWidth },
    };
    this.hpText = this.add.text(contentX, HUD_Y, "", textStyle).setScrollFactor(0).setDepth(200);
    this.weaponText = this.add.text(contentX, EQUIP_Y, "", textStyle).setScrollFactor(0).setDepth(200);
    this.armorText = this.add.text(contentX, EQUIP_Y + EQUIP_LINE_HEIGHT, "", textStyle).setScrollFactor(0).setDepth(200);
    this.accessoryText = this.add
      .text(contentX, EQUIP_Y + EQUIP_LINE_HEIGHT * 2, "", textStyle)
      .setScrollFactor(0)
      .setDepth(200);

    this.add.text(contentX, KEYS_LABEL_Y, "Keys:", { ...textStyle, color: "#9a9aa5" }).setScrollFactor(0).setDepth(200);
    this.keysContainer = this.add.container(contentX, KEYS_ROW_Y).setScrollFactor(0).setDepth(200);

    // Neither shortcut applies on touch (no physical I/ESC key) - [ Menu ] below is the
    // touch-friendly way to reach the same things on any device, so this line is skipped
    // entirely on mobile rather than just rendered smaller, freeing up the space it would have
    // used in an already-tight vertical budget (see the constants above).
    if (!IS_TOUCH_DEVICE) {
      this.add
        .text(contentX, EQUIP_Y + CONTROLS_HINT_Y_OFFSET, "I: equipment   ESC: menu", { ...textStyle, color: "#9a9aa5" })
        .setScrollFactor(0)
        .setDepth(200);
    }

    const equipButton = this.add
      .text(contentX, EQUIP_Y + EQUIP_BUTTON_Y_OFFSET, "[ Equip ]", { ...textStyle, color: "#4ea8ff" })
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });
    equipButton.on("pointerover", () => equipButton.setColor("#ffffff"));
    equipButton.on("pointerout", () => equipButton.setColor("#4ea8ff"));
    equipButton.on("pointerdown", () => this.toggleInventoryPanel());

    const menuButton = this.add
      .text(contentX, EQUIP_Y + MENU_BUTTON_Y_OFFSET, "[ Menu ]", { ...textStyle, color: "#4ea8ff" })
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });
    menuButton.on("pointerover", () => menuButton.setColor("#ffffff"));
    menuButton.on("pointerout", () => menuButton.setColor("#4ea8ff"));
    menuButton.on("pointerdown", () => (this.scene.get(SCENE_KEYS.GAME) as GameScene).openPauseMenu());

    this.inventoryPanel = new InventoryPanel(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      (item) => this.handleEquip(item),
      () => this.toggleInventoryPanel(),
    );
    this.input.keyboard?.on("keydown-I", () => this.toggleInventoryPanel());
  }

  /** Every owned item that can go in a slot - what InventoryPanel should list (consumables are
   * excluded since they have no slot). */
  private ownedEquippables(gameScene: GameScene): ItemDef[] {
    return gameScene.inventory.owned.filter((item) => item.slot !== undefined);
  }

  /** Currently-equipped item ids by slot, for InventoryPanel to mark the equipped row. */
  private equippedIds(gameScene: GameScene): Partial<Record<EquipmentSlot, string>> {
    const eq = gameScene.inventory.equipped;
    return { weapon: eq.weapon?.id, armor: eq.armor?.id, accessory: eq.accessory?.id };
  }

  /** Opens the equipment panel (pausing GameScene) if closed, or closes it (resuming) if open. */
  private toggleInventoryPanel(): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    if (this.inventoryPanel.isOpen()) {
      this.inventoryPanel.close();
      this.scene.resume(SCENE_KEYS.GAME);
    } else {
      this.inventoryPanel.show(this.ownedEquippables(gameScene), this.equippedIds(gameScene));
      this.scene.pause(SCENE_KEYS.GAME);
    }
  }

  /** Equips the clicked item and refreshes the panel to reflect the new equipped state. */
  private handleEquip(item: ItemDef): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    gameScene.equipItem(item);
    this.inventoryPanel.show(this.ownedEquippables(gameScene), this.equippedIds(gameScene));
  }

  /** Rebuilds the small grid of colored key labels - only when the held set actually changed
   * (tracked via a cheap joined-string signature), since recreating Text objects every frame
   * for something that changes rarely would be wasteful. */
  private refreshKeys(labels: readonly KeyLabel[]): void {
    const signature = labels.join(",");
    if (signature === this.lastKeysSignature) return;
    this.lastKeysSignature = signature;

    this.keysContainer.removeAll(true);
    if (labels.length === 0) {
      this.keysContainer.add(
        this.add.text(0, 0, "none", { fontFamily: "monospace", fontSize: SMALL_FONT_SIZE, color: "#5a5a68" }),
      );
      return;
    }

    labels.forEach((label, i) => {
      const col = i % KEYS_PER_ROW;
      const row = Math.floor(i / KEYS_PER_ROW);
      const text = this.add.text(col * KEY_COLUMN_WIDTH, row * KEY_ROW_HEIGHT, label, {
        fontFamily: "monospace",
        fontSize: SMALL_FONT_SIZE,
        color: KEY_COLOR_HEX[label],
      });
      this.keysContainer.add(text);
    });
  }

  /** Runs every frame: pulls fresh state from GameScene and repaints the minimap and HUD text. */
  update(): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    const { mazeGrid, fogOfWar, playerSprite, inventory } = gameScene;
    if (!mazeGrid || !fogOfWar || !playerSprite) return;

    this.minimap.redraw(mazeGrid, fogOfWar, playerSprite.tileX, playerSprite.tileY, gameScene.activeLockedDoors());

    const player = playerSprite.logic;
    const eq = inventory.equipped;
    const atk = totalAtk(eq.weapon?.stats.damage, gameScene.statAllocation);
    const def = totalDef(eq.armor?.stats.defense, eq.accessory?.stats.defense, gameScene.statAllocation);
    this.hpText.setText(
      `Level: ${gameScene.levelNumber}\nHighest Level: ${gameScene.highestLevelReached}\nHP: ${player.hp}/${player.maxHp}\nATK: ${atk}  DEF: ${def}\nGold: ${inventory.gold}`,
    );

    this.weaponText.setText(`Weapon: ${eq.weapon?.name ?? "-"}`).setColor(eq.weapon ? getRarityConfig(eq.weapon.rarity).color : UNEQUIPPED_COLOR);
    this.armorText.setText(`Armor: ${eq.armor?.name ?? "-"}`).setColor(eq.armor ? getRarityConfig(eq.armor.rarity).color : UNEQUIPPED_COLOR);
    this.accessoryText
      .setText(`Accessory: ${eq.accessory?.name ?? "-"}`)
      .setColor(eq.accessory ? getRarityConfig(eq.accessory.rarity).color : UNEQUIPPED_COLOR);

    this.refreshKeys(gameScene.heldKeyLabels());
  }
}
