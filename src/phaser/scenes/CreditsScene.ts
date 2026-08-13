import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";

const PANEL_MIN_WIDTH = 420;
const TEXT_PADDING_X = 24;
const TITLE_HEIGHT = 60;
const BUTTON_AREA_HEIGHT = 60;

const LINES = [
  "Dungeon tiles & door",
  "16x16 DungeonTileset II by 0x72",
  "CC0 1.0 Universal - 0x72.itch.io/dungeontileset-ii",
  "",
  "Monster & player art",
  "Ever Growing Monster Pack by Negative Inspiration",
  "CC BY-SA 4.0 - negative-inspiration.itch.io/negatives-ever-growing-monster-pack",
  "",
  "Built with Phaser & Three.js",
];

/**
 * A launched (not started) overlay, same pattern as TutorialScene/OptionsScene - fulfills the
 * attribution requirement both real-art packs carry (see CREDITS.md for the full detail this
 * summarizes). The panel is sized around the actual measured text, same reasoning as
 * TutorialScene: this list will grow if more art gets added later, and a fixed size would
 * silently start clipping it.
 */
export class CreditsScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.CREDITS);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    const bodyText = this.add.text(0, 0, LINES.join("\n"), {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#d0d0da",
      lineSpacing: 6,
    });

    const panelWidth = Math.max(PANEL_MIN_WIDTH, bodyText.width + TEXT_PADDING_X * 2);
    const panelHeight = TITLE_HEIGHT + bodyText.height + BUTTON_AREA_HEIGHT;
    const left = centerX - panelWidth / 2;
    const top = centerY - panelHeight / 2;

    const backdrop = this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a24, 0.97);
    panel.fillRoundedRect(left, top, panelWidth, panelHeight, 12);
    panel.lineStyle(1, 0x4a4a5a, 1);
    panel.strokeRoundedRect(left, top, panelWidth, panelHeight, 12);
    panel.fillStyle(0x4ea8ff, 1);
    panel.fillRoundedRect(left, top, panelWidth, 4, { tl: 12, tr: 12, bl: 0, br: 0 });

    const title = this.add
      .text(centerX, top + 26, "Credits", { fontFamily: "monospace", fontSize: "20px", color: "#ffffff" })
      .setOrigin(0.5);

    bodyText.setPosition(left + TEXT_PADDING_X, top + TITLE_HEIGHT);

    const closeButton = this.add
      .text(centerX, top + panelHeight - BUTTON_AREA_HEIGHT / 2, "Close", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#4ea8ff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeButton.on("pointerover", () => closeButton.setColor("#ffffff"));
    closeButton.on("pointerout", () => closeButton.setColor("#4ea8ff"));
    closeButton.on("pointerdown", () => this.scene.stop());

    backdrop.setDepth(0);
    panel.setDepth(1);
    title.setDepth(2);
    bodyText.setDepth(2);
    closeButton.setDepth(2);
  }
}
