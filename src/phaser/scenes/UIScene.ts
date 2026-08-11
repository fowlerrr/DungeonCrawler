import Phaser from "phaser";
import { SCENE_KEYS } from "../../config/constants";
import { pxToTile } from "../../game/maze/raster";
import { MinimapRenderer } from "../render/MinimapRenderer";
import type { GameScene } from "./GameScene";

const HUD_X = 12;
const HUD_Y = 110;

/** Runs in parallel with GameScene (launched, not switched to) for HUD/minimap - reads
 * GameScene's public render-relevant state each frame rather than owning any game logic. */
export class UIScene extends Phaser.Scene {
  private minimap!: MinimapRenderer;
  private hpText!: Phaser.GameObjects.Text;
  private equipText!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.UI);
  }

  create(): void {
    this.minimap = new MinimapRenderer(this);

    const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffffff",
      backgroundColor: "#00000088",
      padding: { x: 6, y: 4 },
    };
    this.hpText = this.add.text(HUD_X, HUD_Y, "", textStyle).setScrollFactor(0).setDepth(200);
    this.equipText = this.add
      .text(HUD_X, HUD_Y + 28, "", textStyle)
      .setScrollFactor(0)
      .setDepth(200);
  }

  update(): void {
    const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
    const { mazeGrid, fogOfWar, playerSprite, inventory } = gameScene;
    if (!mazeGrid || !fogOfWar || !playerSprite) return;

    const { tx, ty } = pxToTile(playerSprite.x, playerSprite.y);
    this.minimap.redraw(mazeGrid, fogOfWar, tx, ty);

    const player = playerSprite.logic;
    this.hpText.setText(`Level: ${gameScene.levelNumber}   HP: ${player.hp}/${player.maxHp}   Gold: ${inventory.gold}`);

    const eq = inventory.equipped;
    this.equipText.setText(
      [`Weapon: ${eq.weapon?.name ?? "-"}`, `Armor: ${eq.armor?.name ?? "-"}`, `Accessory: ${eq.accessory?.name ?? "-"}`].join(
        "\n",
      ),
    );
  }
}
