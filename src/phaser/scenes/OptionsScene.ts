import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import { isAutoEquipEnabled, setAutoEquipEnabled } from "../../game/systems/Settings";

const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 200;
const TITLE_HEIGHT = 60;

/**
 * A launched (not started) overlay, same pattern as TutorialScene - stacks on top of MenuScene
 * and just stops itself on close. Global page-level preferences only (see Settings.ts); nothing
 * here is per-save, so it works the same whether reached before or during a run.
 */
export class OptionsScene extends Phaser.Scene {
  private autoEquipToggle!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENE_KEYS.OPTIONS);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const left = centerX - PANEL_WIDTH / 2;
    const top = centerY - PANEL_HEIGHT / 2;

    const backdrop = this.add.rectangle(centerX, centerY, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(0);

    const panel = this.add.graphics().setDepth(1);
    panel.fillStyle(0x1a1a24, 0.97);
    panel.fillRoundedRect(left, top, PANEL_WIDTH, PANEL_HEIGHT, 12);
    panel.lineStyle(1, 0x4a4a5a, 1);
    panel.strokeRoundedRect(left, top, PANEL_WIDTH, PANEL_HEIGHT, 12);
    panel.fillStyle(0x4ea8ff, 1);
    panel.fillRoundedRect(left, top, PANEL_WIDTH, 4, { tl: 12, tr: 12, bl: 0, br: 0 });

    this.add
      .text(centerX, top + 26, "Options", { fontFamily: "monospace", fontSize: "20px", color: "#ffffff" })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(left + 24, top + TITLE_HEIGHT + 6, "Auto-equip better gear", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#d0d0da",
      })
      .setDepth(2);
    this.add
      .text(left + 24, top + TITLE_HEIGHT + 26, "Weapons and armor only - never accessories.", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#7a7a88",
      })
      .setDepth(2);

    this.autoEquipToggle = this.add
      .text(left + PANEL_WIDTH - 24, top + TITLE_HEIGHT + 6, "", { fontFamily: "monospace", fontSize: "14px" })
      .setOrigin(1, 0)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    this.autoEquipToggle.on("pointerdown", () => {
      setAutoEquipEnabled(!isAutoEquipEnabled());
      this.refreshToggle();
    });
    this.refreshToggle();

    const closeButton = this.add
      .text(centerX, top + PANEL_HEIGHT - 30, "Back", { fontFamily: "monospace", fontSize: "16px", color: "#4ea8ff" })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    closeButton.on("pointerover", () => closeButton.setColor("#ffffff"));
    closeButton.on("pointerout", () => closeButton.setColor("#4ea8ff"));
    closeButton.on("pointerdown", () => this.scene.stop());

    backdrop.setInteractive();
  }

  private refreshToggle(): void {
    const enabled = isAutoEquipEnabled();
    this.autoEquipToggle.setText(enabled ? "ON" : "OFF");
    this.autoEquipToggle.setColor(enabled ? "#4cd964" : "#5a5a68");
  }
}
