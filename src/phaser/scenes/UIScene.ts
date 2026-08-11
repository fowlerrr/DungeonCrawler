import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, MAZE_VIEW_WIDTH, SCENE_KEYS, SIDEBAR_WIDTH } from "../../config/constants";
import type { EquipmentSlot, ItemDef } from "../../game/data/types";
import { getPlayerProgression } from "../../game/systems/PlayerProgression";
import { InventoryPanel } from "../objects/InventoryPanel";
import { MinimapRenderer } from "../render/MinimapRenderer";
import type { GameScene } from "./GameScene";

const PANEL_MARGIN = 12;
const HUD_Y = PANEL_MARGIN;
const MINIMAP_Y = 96;
const MINIMAP_RESERVED_HEIGHT = 210;
const EQUIP_Y = MINIMAP_Y + MINIMAP_RESERVED_HEIGHT;

/** Runs in parallel with GameScene (launched, not switched to) for HUD/minimap - reads
 * GameScene's public render-relevant state each frame rather than owning any game logic.
 * Everything here lives in the right-side sidebar (x >= MAZE_VIEW_WIDTH), which GameScene's
 * camera viewport never renders into, so the HUD can never cover the maze. */
export class UIScene extends Phaser.Scene {
  private minimap!: MinimapRenderer;
  private hpText!: Phaser.GameObjects.Text;
  private equipText!: Phaser.GameObjects.Text;
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
    this.add
      .text(contentX, EQUIP_Y + 68, "Press I for equipment", { ...textStyle, color: "#9a9aa5" })
      .setScrollFactor(0)
      .setDepth(200);

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

  update(): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    const { mazeGrid, fogOfWar, playerSprite, inventory } = gameScene;
    if (!mazeGrid || !fogOfWar || !playerSprite) return;

    this.minimap.redraw(mazeGrid, fogOfWar, playerSprite.tileX, playerSprite.tileY);

    const player = playerSprite.logic;
    const progression = getPlayerProgression(gameScene.highestLevelReached);
    this.hpText.setText(
      `Level: ${gameScene.levelNumber}\nBest: ${gameScene.highestLevelReached}\nHP: ${player.hp}/${player.maxHp}\nGold: ${inventory.gold}\nBonus: +${progression.bonusDamage} ATK  +${progression.bonusDefense} DEF`,
    );

    const eq = inventory.equipped;
    this.equipText.setText(
      [`Weapon: ${eq.weapon?.name ?? "-"}`, `Armor: ${eq.armor?.name ?? "-"}`, `Accessory: ${eq.accessory?.name ?? "-"}`].join(
        "\n",
      ),
    );
  }
}
