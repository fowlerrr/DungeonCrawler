import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import { LocalStorageSaveManager } from "../../game/systems/SaveManager";

const TITLE_Y = GAME_HEIGHT / 2 - 150;
const BUTTON_START_Y = GAME_HEIGHT / 2 - 50;
const BUTTON_SPACING = 46;
const TUTORIAL_SEEN_KEY = "dungeoncrawler:tutorialSeen";

/** First scene the player actually sees, reached every time the page loads (PreloadScene starts
 * here, not GameScene). New Game and Continue both hand off to GameScene via scene data (`{
 * fresh }`) - GameScene's own create() decides what that means for the save, this scene doesn't
 * touch it directly except to check whether Continue has anything to resume. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0d14, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(0x4ea8ff, 0.07);
    bg.fillCircle(GAME_WIDTH / 2, TITLE_Y + 20, 240);

    const panelWidth = 360;
    const panelTop = TITLE_Y - 55;
    const panelBottom = BUTTON_START_Y + BUTTON_SPACING * 3 + 55;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a24, 0.92);
    panel.fillRoundedRect(GAME_WIDTH / 2 - panelWidth / 2, panelTop, panelWidth, panelBottom - panelTop, 14);
    panel.lineStyle(1, 0x33334a, 1);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - panelWidth / 2, panelTop, panelWidth, panelBottom - panelTop, 14);
    panel.fillStyle(0x4ea8ff, 1);
    panel.fillRoundedRect(GAME_WIDTH / 2 - panelWidth / 2, panelTop, panelWidth, 4, { tl: 14, tr: 14, bl: 0, br: 0 });

    this.add
      .text(GAME_WIDTH / 2, TITLE_Y, "Dungeon Crawler", {
        fontFamily: "monospace",
        fontSize: "34px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const hasSave = new LocalStorageSaveManager().load() !== null;

    this.addButton(BUTTON_START_Y, "New Game", () => this.scene.start(SCENE_KEYS.GAME, { fresh: true }));
    this.addButton(
      BUTTON_START_Y + BUTTON_SPACING,
      "Continue",
      () => this.scene.start(SCENE_KEYS.GAME, { fresh: false }),
      hasSave,
    );
    this.addButton(BUTTON_START_Y + BUTTON_SPACING * 2, "How to Play", () => this.scene.launch(SCENE_KEYS.TUTORIAL));
    this.addButton(BUTTON_START_Y + BUTTON_SPACING * 3, "Options", () => this.scene.launch(SCENE_KEYS.OPTIONS));

    if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
      this.scene.launch(SCENE_KEYS.TUTORIAL);
    }
  }

  private addButton(y: number, label: string, onClick: () => void, enabled = true): void {
    const text = this.add
      .text(GAME_WIDTH / 2, y, label, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: enabled ? "#ffffff" : "#5a5a68",
      })
      .setOrigin(0.5);

    if (!enabled) return;
    text.setInteractive({ useHandCursor: true });
    text.on("pointerover", () => text.setColor("#4ea8ff"));
    text.on("pointerout", () => text.setColor("#ffffff"));
    text.on("pointerdown", onClick);
  }
}
