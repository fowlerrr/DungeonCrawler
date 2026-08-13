import Phaser from "phaser";
import { SCENE_KEYS } from "../../config/constants";

/** First scene to run - reserved for engine-level setup that has to happen before the loading
 * screen itself can be drawn (e.g. the future loading-bar asset). Currently just a pass-through
 * to PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  preload(): void {
    // Placeholder for the tiny loading-bar asset set (added once we have real assets to preload).
  }

  /** Immediately hands off to PreloadScene, which loads the real game assets. */
  create(): void {
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
