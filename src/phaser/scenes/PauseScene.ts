import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import { IS_TOUCH_DEVICE } from "../../config/device";
import {
  bonusesFromAllocation,
  totalAtk,
  totalDef,
  totalStatPoints,
  unspentPoints,
  type StatAllocation,
} from "../../game/systems/PlayerProgression";
import type { GameScene } from "./GameScene";

const PANEL_WIDTH = 380;
// PANEL_HEIGHT (420) alone would already exceed the touch design resolution's GAME_HEIGHT (380,
// see constants.ts) - these are tightened to fit within it with room to spare, rather than
// inheriting the desktop numbers and pushing the bottom row of buttons off-canvas.
const PANEL_HEIGHT = IS_TOUCH_DEVICE ? 300 : 420;
const PANEL_TOP = GAME_HEIGHT / 2 - PANEL_HEIGHT / 2;
const ROW_HEIGHT = IS_TOUCH_DEVICE ? 22 : 26;
const MENU_BUTTON_SPACING = IS_TOUCH_DEVICE ? 26 : 32;

/**
 * Reached via ESC (or the sidebar's Menu button) - pauses GameScene and shows totals for ATK/DEF
 * plus whatever's still unspent from PlayerProgression's stat points, with +buttons to allocate
 * them right here rather than the old auto-applied bonuses. This is also where the always-on
 * sidebar HUD's "Bonus" line moved to, to keep that HUD from getting cluttered.
 */
export class PauseScene extends Phaser.Scene {
  private pointsText!: Phaser.GameObjects.Text;
  private atkText!: Phaser.GameObjects.Text;
  private defText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private statButtons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super(SCENE_KEYS.PAUSE);
  }

  /** Builds the pause panel: stat totals, spend buttons, and the Resume/Tutorial/Quit menu. */
  create(): void {
    // This Scene instance is reused across repeated opens (Phaser calls create() again on the
    // same object rather than constructing a new one), but field initializers only run once -
    // without resetting this here, stale Text refs from a previous open pile up and crash
    // refresh() the next time it tries to style one of them.
    this.statButtons = [];

    const centerX = GAME_WIDTH / 2;
    const left = centerX - PANEL_WIDTH / 2;

    this.add.rectangle(centerX, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a24, 0.96);
    panel.fillRoundedRect(left, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 12);
    panel.lineStyle(1, 0x4a4a5a, 1);
    panel.strokeRoundedRect(left, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, 12);
    panel.fillStyle(0x4ea8ff, 1);
    panel.fillRoundedRect(left, PANEL_TOP, PANEL_WIDTH, 4, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .text(centerX, PANEL_TOP + 26, "Paused", { fontFamily: "monospace", fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5);

    const rowStyle: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: "monospace", fontSize: "15px", color: "#ffffff" };
    const rowX = left + 24;
    let rowY = PANEL_TOP + (IS_TOUCH_DEVICE ? 50 : 70);

    this.add.text(rowX, rowY, "Stats", { fontFamily: "monospace", fontSize: "13px", color: "#9a9aa5" });
    rowY += IS_TOUCH_DEVICE ? 18 : 22;

    this.atkText = this.add.text(rowX, rowY, "", rowStyle);
    this.statButtons.push(this.addStatButton(left + PANEL_WIDTH - 24, rowY, () => this.spend("atk")));
    rowY += ROW_HEIGHT;

    this.defText = this.add.text(rowX, rowY, "", rowStyle);
    this.statButtons.push(this.addStatButton(left + PANEL_WIDTH - 24, rowY, () => this.spend("def")));
    rowY += ROW_HEIGHT;

    this.hpText = this.add.text(rowX, rowY, "", rowStyle);
    this.statButtons.push(this.addStatButton(left + PANEL_WIDTH - 24, rowY, () => this.spend("hp")));
    rowY += ROW_HEIGHT + (IS_TOUCH_DEVICE ? 4 : 6);

    this.pointsText = this.add.text(rowX, rowY, "", { fontFamily: "monospace", fontSize: "13px", color: "#9a9aa5" });

    this.refresh();

    const buttonY = PANEL_TOP + PANEL_HEIGHT - (IS_TOUCH_DEVICE ? 70 : 76);
    this.addMenuButton(buttonY, "Resume", () => this.resume());
    this.addMenuButton(buttonY + MENU_BUTTON_SPACING, "How to Play", () => this.scene.launch(SCENE_KEYS.TUTORIAL));
    this.addMenuButton(buttonY + MENU_BUTTON_SPACING * 2, "Quit to Menu", () => this.quitToMenu());

    this.input.keyboard?.on("keydown-ESC", () => this.resume());
  }

  /** A small clickable "[ + ]" that runs `onClick` then refreshes the displayed totals. */
  private addStatButton(x: number, y: number, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, "[ + ]", { fontFamily: "monospace", fontSize: "14px", color: "#4ea8ff" })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => {
      onClick();
      this.refresh();
    });
    return button;
  }

  /** A centered, hover-highlighted text button in the panel's bottom menu row. */
  private addMenuButton(y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(GAME_WIDTH / 2, y, label, { fontFamily: "monospace", fontSize: "16px", color: "#ffffff" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    text.on("pointerover", () => text.setColor("#4ea8ff"));
    text.on("pointerout", () => text.setColor("#ffffff"));
    text.on("pointerdown", onClick);
  }

  /** Looks up the running GameScene instance - PauseScene never owns game state itself, only
   * reads/mutates it through GameScene's public API. */
  private gameScene(): GameScene {
    return this.scene.get(SCENE_KEYS.GAME) as GameScene;
  }

  /** Allocates one earned point to the given stat, if any are unspent. */
  private spend(stat: keyof StatAllocation): void {
    this.gameScene().allocateStatPoint(stat);
  }

  /** Redraws the ATK/DEF/HP totals and unspent-points count from current game state. */
  private refresh(): void {
    const gameScene = this.gameScene();
    const allocation = gameScene.statAllocation;
    const bonuses = bonusesFromAllocation(allocation);
    const eq = gameScene.inventory.equipped;

    this.atkText.setText(`ATK: ${totalAtk(eq.weapon?.stats.damage, allocation)}  (+${allocation.atk} from points)`);
    this.defText.setText(
      `DEF: ${totalDef(eq.armor?.stats.defense, eq.accessory?.stats.defense, allocation)}  (+${allocation.def} from points)`,
    );
    this.hpText.setText(`Max HP: ${gameScene.playerSprite?.logic.maxHp ?? "-"}  (+${bonuses.bonusHp} from points)`);

    const remaining = unspentPoints(gameScene.highestLevelReached, allocation);
    this.pointsText.setText(`Unspent points: ${remaining} of ${totalStatPoints(gameScene.highestLevelReached)} earned`);

    for (const button of this.statButtons) {
      button.setColor(remaining > 0 ? "#4ea8ff" : "#3a3a44");
    }
  }

  /** Closes the pause menu and lets GameScene keep running. */
  private resume(): void {
    this.scene.stop();
    this.scene.resume(SCENE_KEYS.GAME);
  }

  /** Saves progress, tears down the run, and returns to the main menu. */
  private quitToMenu(): void {
    this.gameScene().persistNow();
    this.scene.stop(SCENE_KEYS.GAME);
    this.scene.stop(SCENE_KEYS.UI);
    this.scene.start(SCENE_KEYS.MENU);
  }
}
