import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, MAZE_VIEW_WIDTH, SCENE_KEYS, SIDEBAR_WIDTH } from "../../config/constants";
import type { EquipmentSlot, ItemDef } from "../../game/data/types";
import type { KeyLabel } from "../../game/systems/Keyring";
import { InventoryPanel } from "../objects/InventoryPanel";
import { MinimapRenderer } from "../render/MinimapRenderer";
import type { GameScene } from "./GameScene";

const PANEL_MARGIN = 12;
const HUD_Y = PANEL_MARGIN;
const MINIMAP_Y = 76;
const MINIMAP_RESERVED_HEIGHT = 210;
const EQUIP_Y = MINIMAP_Y + MINIMAP_RESERVED_HEIGHT;
const KEYS_LABEL_Y = EQUIP_Y + 52;
const KEYS_ROW_Y = EQUIP_Y + 68;
const KEYS_PER_ROW = 4;
const KEY_COLUMN_WIDTH = 47;
const KEY_ROW_HEIGHT = 18;

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
  private equipText!: Phaser.GameObjects.Text;
  private keysContainer!: Phaser.GameObjects.Container;
  private lastKeysSignature = "";
  private inventoryPanel!: InventoryPanel;

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    const panelX = MAZE_VIEW_WIDTH;
    this.add.rectangle(panelX, 0, SIDEBAR_WIDTH, GAME_HEIGHT, 0x1a1a24, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(150);
    this.add.rectangle(panelX, 0, 2, GAME_HEIGHT, 0x4ea8ff, 0.5).setOrigin(0, 0).setScrollFactor(0).setDepth(151);

    const contentX = panelX + PANEL_MARGIN;
    const contentWidth = SIDEBAR_WIDTH - PANEL_MARGIN * 2;

    this.minimap = new MinimapRenderer(this, contentX, MINIMAP_Y, contentWidth);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      wordWrap: { width: contentWidth },
    };
    this.hpText = this.add.text(contentX, HUD_Y, "", textStyle).setScrollFactor(0).setDepth(200);
    this.equipText = this.add.text(contentX, EQUIP_Y, "", textStyle).setScrollFactor(0).setDepth(200);

    this.add.text(contentX, KEYS_LABEL_Y, "Keys:", { ...textStyle, color: "#9a9aa5" }).setScrollFactor(0).setDepth(200);
    this.keysContainer = this.add.container(contentX, KEYS_ROW_Y).setScrollFactor(0).setDepth(200);

    this.add
      .text(contentX, EQUIP_Y + 128, "I: equipment   ESC: menu", { ...textStyle, color: "#9a9aa5" })
      .setScrollFactor(0)
      .setDepth(200);

    const menuButton = this.add
      .text(contentX, EQUIP_Y + 148, "[ Menu ]", { ...textStyle, color: "#4ea8ff" })
      .setScrollFactor(0)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });
    menuButton.on("pointerover", () => menuButton.setColor("#ffffff"));
    menuButton.on("pointerout", () => menuButton.setColor("#4ea8ff"));
    menuButton.on("pointerdown", () => (this.scene.get(SCENE_KEYS.GAME) as GameScene).openPauseMenu());

    this.inventoryPanel = new InventoryPanel(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, (item) => this.handleEquip(item));
    this.input.keyboard?.on("keydown-I", () => this.toggleInventoryPanel());
  }

  private ownedEquippables(gameScene: GameScene): ItemDef[] {
    return gameScene.inventory.owned.filter((item) => item.slot !== undefined);
  }

  private equippedIds(gameScene: GameScene): Partial<Record<EquipmentSlot, string>> {
    const eq = gameScene.inventory.equipped;
    return { weapon: eq.weapon?.id, armor: eq.armor?.id, accessory: eq.accessory?.id };
  }

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
        this.add.text(0, 0, "none", { fontFamily: "monospace", fontSize: "12px", color: "#5a5a68" }),
      );
      return;
    }

    labels.forEach((label, i) => {
      const col = i % KEYS_PER_ROW;
      const row = Math.floor(i / KEYS_PER_ROW);
      const text = this.add.text(col * KEY_COLUMN_WIDTH, row * KEY_ROW_HEIGHT, label, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: KEY_COLOR_HEX[label],
      });
      this.keysContainer.add(text);
    });
  }

  update(): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    const { mazeGrid, fogOfWar, playerSprite, inventory } = gameScene;
    if (!mazeGrid || !fogOfWar || !playerSprite) return;

    this.minimap.redraw(mazeGrid, fogOfWar, playerSprite.tileX, playerSprite.tileY);

    const player = playerSprite.logic;
    this.hpText.setText(
      `Level: ${gameScene.levelNumber}\nHighest Level: ${gameScene.highestLevelReached}\nHP: ${player.hp}/${player.maxHp}\nGold: ${inventory.gold}`,
    );

    const eq = inventory.equipped;
    this.equipText.setText(
      [`Weapon: ${eq.weapon?.name ?? "-"}`, `Armor: ${eq.armor?.name ?? "-"}`, `Accessory: ${eq.accessory?.name ?? "-"}`].join(
        "\n",
      ),
    );

    this.refreshKeys(gameScene.heldKeyLabels());
  }
}
