import Phaser from "phaser";
import { SCENE_KEYS } from "../../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  preload(): void {
    // Placeholder for the tiny loading-bar asset set (added once we have real assets to preload).
  }

  create(): void {
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
