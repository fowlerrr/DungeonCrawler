import Phaser from "phaser";
import { SCENE_KEYS } from "../../config/constants";
import { applyRealArt, preloadRealArt } from "../render/RealArtTextures";
import { generatePlaceholderTextures } from "../render/TextureFactory";

/** Loads all game textures before anything else runs - placeholder shapes generated in-engine
 * plus the real art pack layered on top - then hands off to the menu. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  /** Queues the real-art image files for loading. */
  preload(): void {
    preloadRealArt(this);
  }

  /** Generates placeholder textures, overlays the loaded real art on top, then starts the menu. */
  create(): void {
    // Placeholders first, so anything the real-art pass doesn't cover (colored lock doors,
    // keys, player, items, UI icons) still has a texture - applyRealArt then overwrites just
    // the keys it actually has replacement art for.
    generatePlaceholderTextures(this);
    applyRealArt(this);
    this.scene.start(SCENE_KEYS.MENU);
  }
}
