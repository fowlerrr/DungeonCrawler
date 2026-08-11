import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from "../../config/constants";
import type { GameScene } from "./GameScene";

interface GameOverData {
  levelNumber: number;
}

/** Shown on player death - restarts back at level 1 (new seed, full health) once the player
 * continues; equipment/gold carry over since GameScene's Inventory is untouched, and
 * highestLevelReached ("Best") is never reset. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME_OVER);
  }

  create(data: GameOverData): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);

    const panelWidth = 400;
    const panelHeight = 130;
    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a24, 0.95);
    panel.fillRoundedRect(GAME_WIDTH / 2 - panelWidth / 2, GAME_HEIGHT / 2 - panelHeight / 2, panelWidth, panelHeight, 12);
    panel.lineStyle(1, 0xff6b6b, 0.6);
    panel.strokeRoundedRect(GAME_WIDTH / 2 - panelWidth / 2, GAME_HEIGHT / 2 - panelHeight / 2, panelWidth, panelHeight, 12);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, `You died on level ${data.levelNumber}`, {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#ff6b6b",
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 24, "Press SPACE to try again", {
        fontFamily: "monospace",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.once("down", () => {
      const gameScene = this.scene.get(SCENE_KEYS.GAME) as GameScene;
      this.scene.stop();
      this.scene.resume(SCENE_KEYS.GAME);
      gameScene.restartAfterDeath();
    });
  }
}
