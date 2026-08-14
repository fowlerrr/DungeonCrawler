import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import { IS_TOUCH_DEVICE } from "../../config/device";
import { LocalStorageSaveManager } from "../../game/systems/SaveManager";

// The touch design resolution's GAME_HEIGHT (380) is much shorter than desktop's (600, see
// constants.ts) - these offsets/spacing are tightened to match rather than inheriting the
// desktop numbers, which would push the last button (and the panel itself) below the bottom
// edge of a mobile canvas entirely.
const TITLE_Y = GAME_HEIGHT / 2 - (IS_TOUCH_DEVICE ? 130 : 150);
const BUTTON_START_Y = GAME_HEIGHT / 2 - (IS_TOUCH_DEVICE ? 75 : 50);
const BUTTON_SPACING = IS_TOUCH_DEVICE ? 32 : 46;
const BUTTON_COUNT = 6;
const PANEL_TOP_PADDING = IS_TOUCH_DEVICE ? 35 : 55;
const PANEL_BOTTOM_PADDING = IS_TOUCH_DEVICE ? 35 : 55;
const TITLE_FONT_SIZE = IS_TOUCH_DEVICE ? "26px" : "34px";
const BUTTON_FONT_SIZE = IS_TOUCH_DEVICE ? "16px" : "20px";
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
    const panelTop = TITLE_Y - PANEL_TOP_PADDING;
    const panelBottom = BUTTON_START_Y + BUTTON_SPACING * (BUTTON_COUNT - 1) + PANEL_BOTTOM_PADDING;
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
        fontSize: TITLE_FONT_SIZE,
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
    this.addModeSelector(BUTTON_START_Y + BUTTON_SPACING * 5);

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
        fontSize: BUTTON_FONT_SIZE,
        color: enabled ? "#ffffff" : "#5a5a68",
      })
      .setOrigin(0.5);

    if (!enabled) return;
    text.setInteractive({ useHandCursor: true });
    text.on("pointerover", () => text.setColor("#4ea8ff"));
    text.on("pointerout", () => text.setColor("#ffffff"));
    text.on("pointerdown", onClick);
  }

  /** Row of "2D / 3D" mode labels replacing the old single "Play in 3D" button - 2D is always the
   * active (bold/highlighted) side here since this scene only ever runs in 2D mode; clicking 3D
   * switches into it via playIn3D(). MenuScreen3D.ts renders the mirror image of this (3D bold,
   * 2D clickable) so either menu always shows which mode you're in and lets you flip to the
   * other one. */
  private addModeSelector(y: number): void {
    const activeColor = "#4ea8ff";
    const inactiveColor = "#ffffff";
    const dimColor = "#5a5a68";

    const label2D = this.add
      .text(0, y, "2D", { fontFamily: "monospace", fontSize: BUTTON_FONT_SIZE, fontStyle: "bold", color: activeColor })
      .setOrigin(0.5);
    const sep = this.add
      .text(0, y, " / ", { fontFamily: "monospace", fontSize: BUTTON_FONT_SIZE, color: dimColor })
      .setOrigin(0.5);
    const label3D = this.add
      .text(0, y, "3D", { fontFamily: "monospace", fontSize: BUTTON_FONT_SIZE, color: inactiveColor })
      .setOrigin(0.5);

    const totalWidth = label2D.width + sep.width + label3D.width;
    let x = GAME_WIDTH / 2 - totalWidth / 2;
    label2D.setX(x + label2D.width / 2);
    x += label2D.width;
    sep.setX(x + sep.width / 2);
    x += sep.width;
    label3D.setX(x + label3D.width / 2);

    label3D.setInteractive({ useHandCursor: true });
    label3D.on("pointerover", () => label3D.setColor(activeColor));
    label3D.on("pointerout", () => label3D.setColor(inactiveColor));
    label3D.on("pointerdown", () => this.playIn3D());
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
