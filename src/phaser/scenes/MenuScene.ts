import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import { LocalStorageSaveManager } from "../../game/systems/SaveManager";

const TITLE_Y = GAME_HEIGHT / 2 - 150;
const BUTTON_START_Y = GAME_HEIGHT / 2 - 50;
const BUTTON_SPACING = 46;
const BUTTON_COUNT = 6;
const TUTORIAL_SEEN_KEY = "dungeoncrawler:tutorialSeen";

/** First scene the player actually sees, reached every time the page loads (PreloadScene starts
 * here, not GameScene). New Game and Continue both hand off to GameScene via scene data (`{
 * fresh }`) - GameScene's own create() decides what that means for the save, this scene doesn't
 * touch it directly except to check whether Continue has anything to resume. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MENU);
  }

  /** Builds the title panel and its New Game/Continue/How to Play/Options/Credits/3D buttons,
   * and auto-launches the tutorial on a player's very first visit. */
  create(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0d14, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.fillStyle(0x4ea8ff, 0.07);
    bg.fillCircle(GAME_WIDTH / 2, TITLE_Y + 20, 240);

    const panelWidth = 360;
    const panelTop = TITLE_Y - 55;
    const panelBottom = BUTTON_START_Y + BUTTON_SPACING * (BUTTON_COUNT - 1) + 55;
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
    this.addButton(BUTTON_START_Y + BUTTON_SPACING * 4, "Credits", () => this.scene.launch(SCENE_KEYS.CREDITS));
    this.addButton(BUTTON_START_Y + BUTTON_SPACING * 5, "Play in 3D (beta)", () => this.playIn3D());

    if (!localStorage.getItem(TUTORIAL_SEEN_KEY)) {
      localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
      this.scene.launch(SCENE_KEYS.TUTORIAL);
    }
  }

  /** A centered menu button - greyed out and non-interactive when `enabled` is false (used for
   * Continue when there's no save to resume). */
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

  /** Tears down this Phaser game entirely and hands the #app container to the Three.js client -
   * dynamically imported so neither this scene nor bootPhaser.ts (which lists MenuScene as one
   * of its scenes) ends up in a circular static import with the 3D side or with each other. */
  private async playIn3D(): Promise<void> {
    const [{ destroyPhaser }, { launch3D }] = await Promise.all([import("../../bootPhaser"), import("../../three/launch3D")]);
    destroyPhaser();
    const container = document.getElementById("app")!;
    // Belt-and-suspenders on top of destroyPhaser's own canvas removal - a stray tutorial/
    // options modal (each just a div appended straight to #app, not owned by any single
    // disposable object) left open at the moment of switching modes would otherwise leak into
    // whichever side loads next.
    container.innerHTML = "";
    launch3D(container, () => {
      container.innerHTML = "";
      import("../../bootPhaser").then(({ bootPhaser }) => bootPhaser());
    });
  }
}
