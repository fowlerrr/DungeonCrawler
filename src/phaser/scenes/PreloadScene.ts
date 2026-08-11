import Phaser from "phaser";
import { SCENE_KEYS } from "../../config/constants";
import { generatePlaceholderTextures } from "../render/TextureFactory";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload(): void {
    // Real art (e.g. a Kenney.nl tileset) gets loaded here later via this.load.image/spritesheet,
    // using the same texture keys generatePlaceholderTextures defines - nothing else has to change.
  }

  create(): void {
    generatePlaceholderTextures(this);
    this.scene.start(SCENE_KEYS.MENU);
  }
}
