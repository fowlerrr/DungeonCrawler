import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import { IS_TOUCH_DEVICE } from "../../config/device";

const PANEL_MIN_WIDTH = 420;
const TEXT_PADDING_X = 24;
// Tightened for touch: the desktop numbers (plus the desktop-length LINES below) would measure
// out to a panel taller than the touch design resolution's entire GAME_HEIGHT (380, see
// constants.ts) - there's no scrolling here, so anything past that would just render off the
// bottom of the canvas, invisible rather than merely cramped.
const TITLE_HEIGHT = IS_TOUCH_DEVICE ? 45 : 60;
const BUTTON_AREA_HEIGHT = IS_TOUCH_DEVICE ? 45 : 60;
const BODY_FONT_SIZE = IS_TOUCH_DEVICE ? "11px" : "13px";
const BODY_LINE_SPACING = IS_TOUCH_DEVICE ? 3 : 6;

// Also swapped for touch rather than just shrunk: the desktop copy calls out physical keys
// (Space/I/ESC/WASD) that don't exist on a touchscreen, and there's no touch equivalent for the
// equipment panel yet, so that line is dropped entirely rather than describing a control that
// doesn't work.
const LINES = IS_TOUCH_DEVICE
  ? [
      "Move: on-screen d-pad (bottom-left)",
      "Attack: on-screen sword button (bottom-right)",
      "Pause / this menu: tap [ Menu ] in the sidebar",
      "",
      "Colored doors need their matching key, dropped somewhere",
      "else on the level - walk into a locked door while holding",
      "its key to open it.",
      "",
      "Some locked doors guard a small vault with a bonus chest -",
      "worth the detour for the better odds at rare loot.",
      "",
      "Defeat the boss guarding the exit for its key, then carry",
      "it to the exit door to finish the level.",
      "",
      "Finishing a level earns one stat point - spend it on ATK,",
      "DEF, or HP from the pause menu whenever you like.",
      "",
      "Dying sends you back to level 1 at full health, but your",
      "gear, gold, and stat points are never lost.",
    ]
  : [
      "Move: Arrow keys or WASD",
      "Attack: Space (aims at your last move direction)",
      "Equipment: I - pick a weapon, armor, and accessory",
      "Pause / this menu: ESC",
      "",
      "Colored doors need their matching key, dropped somewhere",
      "else on the level - step into a locked door while holding",
      "its key to open it.",
      "",
      "Some locked doors guard a small vault with a bonus chest -",
      "worth the detour for the better odds at rare loot.",
      "",
      "Defeat the boss guarding the exit for its key, then carry",
      "it to the exit door to finish the level.",
      "",
      "Finishing a level earns one stat point - spend it on ATK,",
      "DEF, or HP from the pause menu whenever you like.",
      "",
      "Dying sends you back to level 1 at full health, but your",
      "gear, gold, and stat points are never lost.",
    ];

/**
 * A launched (not started) overlay - stacks on top of whatever's already showing (MenuScene or
 * PauseScene) and just stops itself on close, so it never needs to know how to get back to
 * either. Shown automatically once on a player's very first visit to MenuScene (see
 * MenuScene's TUTORIAL_SEEN_KEY check); reachable afterward from Menu or Pause any time.
 *
 * The panel is sized around the actual measured text height rather than a hardcoded constant -
 * LINES has grown before and will again, and a fixed panel height silently overlapping the
 * close button (as happened previously) isn't something you'd notice just editing the array.
 */
export class TutorialScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.TUTORIAL);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Measure the body text before laying anything else out - Text width/height are available
    // synchronously right after construction, no need to wait a frame.
    const bodyText = this.add.text(0, 0, LINES.join("\n"), {
      fontFamily: "monospace",
      fontSize: BODY_FONT_SIZE,
      color: "#d0d0da",
      lineSpacing: BODY_LINE_SPACING,
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
      .text(centerX, top + 26, "How to Play", { fontFamily: "monospace", fontSize: "20px", color: "#ffffff" })
      .setOrigin(0.5);

    bodyText.setPosition(left + TEXT_PADDING_X, top + TITLE_HEIGHT);

    const closeButton = this.add
      .text(centerX, top + panelHeight - BUTTON_AREA_HEIGHT / 2, "Got it", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#4ea8ff",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeButton.on("pointerover", () => closeButton.setColor("#ffffff"));
    closeButton.on("pointerout", () => closeButton.setColor("#4ea8ff"));
    closeButton.on("pointerdown", () => this.scene.stop());
    // Deliberately no ESC-to-close here: this overlay can be launched on top of PauseScene,
    // which already binds ESC to resume the game - sharing the key would fire both at once.

    // Explicit depths so stacking order can't depend on creation order (bodyText, in
    // particular, is created before the panel background purely so it can be measured first).
    backdrop.setDepth(0);
    panel.setDepth(1);
    title.setDepth(2);
    bodyText.setDepth(2);
    closeButton.setDepth(2);
  }
}
