import Phaser from "phaser";
import { GAME_HEIGHT, MAZE_VIEW_WIDTH, SCENE_KEYS, SIDEBAR_WIDTH } from "../../config/constants";
import { MinimapRenderer } from "../render/MinimapRenderer";
import type { GameScene } from "./GameScene";

const PANEL_MARGIN = 12;
const HUD_Y = PANEL_MARGIN;
const MINIMAP_Y = 56;
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

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    const panelX = MAZE_VIEW_WIDTH;
    this.add.rectangle(panelX, 0, SIDEBAR_WIDTH, GAME_HEIGHT, 0x1a1a24, 1).setOrigin(0, 0).setScrollFactor(0).setDepth(150);

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
  }

  update(): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    const { mazeGrid, fogOfWar, playerSprite, inventory } = gameScene;
    if (!mazeGrid || !fogOfWar || !playerSprite) return;

    this.minimap.redraw(mazeGrid, fogOfWar, playerSprite.tileX, playerSprite.tileY);

    const player = playerSprite.logic;
    this.hpText.setText(`Level: ${gameScene.levelNumber}\nHP: ${player.hp}/${player.maxHp}\nGold: ${inventory.gold}`);

    const eq = inventory.equipped;
    this.equipText.setText(
      [`Weapon: ${eq.weapon?.name ?? "-"}`, `Armor: ${eq.armor?.name ?? "-"}`, `Accessory: ${eq.accessory?.name ?? "-"}`].join(
        "\n",
      ),
    );
  }
}
