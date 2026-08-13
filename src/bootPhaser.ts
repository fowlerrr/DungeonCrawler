import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config/constants";
import { BootScene } from "./phaser/scenes/BootScene";
import { PreloadScene } from "./phaser/scenes/PreloadScene";
import { MenuScene } from "./phaser/scenes/MenuScene";
import { GameScene } from "./phaser/scenes/GameScene";
import { GameOverScene } from "./phaser/scenes/GameOverScene";
import { UIScene } from "./phaser/scenes/UIScene";
import { PauseScene } from "./phaser/scenes/PauseScene";
import { TutorialScene } from "./phaser/scenes/TutorialScene";
import { OptionsScene } from "./phaser/scenes/OptionsScene";
import { CreditsScene } from "./phaser/scenes/CreditsScene";

let current: Phaser.Game | null = null;

/** Boots (or reboots, after a 3D->2D switch) the 2D Phaser game into #app - pulled out of
 * main.ts into its own leaf module so MenuScene's "Play in 3D" button can dynamically import it
 * for the return trip without creating a circular import (main.ts -> MenuScene -> this module ->
 * MenuScene would otherwise be a cycle, since MenuScene itself is one of the listed scenes). */
export function bootPhaser(): Phaser.Game {
  current = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    // FIT scales the fixed GAME_WIDTH x GAME_HEIGHT canvas down (preserving aspect ratio,
    // letterboxed) to whatever viewport it's actually running in - without this, the canvas
    // stays literally 1020x600 CSS pixels and just overflows/scrolls on a phone screen. Doesn't
    // reflow the sidebar HUD or menu layout for a narrow screen, just makes the existing
    // desktop-shaped layout fit rather than overflow; a phone in portrait still ends up with
    // thick letterboxing top/bottom since 1020x600 is a wide landscape shape.
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    backgroundColor: "#111111",
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [BootScene, PreloadScene, MenuScene, GameScene, UIScene, GameOverScene, PauseScene, TutorialScene, OptionsScene, CreditsScene],
  });

  if (import.meta.env.DEV) {
    (window as unknown as { game: Phaser.Game }).game = current;
  }
  return current;
}

/** Tears down the running Phaser game (canvas, scenes, input listeners) before switching to the
 * 3D client, which takes over the same #app container. */
export function destroyPhaser(): void {
  if (!current) return;
  const canvas = current.canvas;
  current.destroy(true);
  current = null;
  // Game.destroy(true) is documented to remove the canvas, but doesn't do so synchronously (it
  // appears to depend on a game-loop tick that never comes if the tab isn't actively rendering
  // frames right at that moment) - removing it directly here guarantees #app is actually empty
  // before the 3D client takes it over, regardless of Phaser's internal shutdown timing.
  canvas?.parentElement?.removeChild(canvas);
}
