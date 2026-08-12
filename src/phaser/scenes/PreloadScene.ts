import Phaser from "phaser";
import { SCENE_KEYS } from "../../config/constants";
import { applyRealArt, preloadRealArt } from "../render/RealArtTextures";
import { generatePlaceholderTextures } from "../render/TextureFactory";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  preload(): void {
    preloadRealArt(this);
  }

  create(): void {
    // Placeholders first, so anything the real-art pass doesn't cover (colored lock doors,
    // keys, player, items, UI icons) still has a texture - applyRealArt then overwrites just
    // the keys it actually has replacement art for.
    generatePlaceholderTextures(this);
    applyRealArt(this);
    this.scene.start(SCENE_KEYS.MENU);
  }
}
