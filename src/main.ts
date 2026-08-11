import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./config/constants";
import { BootScene } from "./phaser/scenes/BootScene";
import { PreloadScene } from "./phaser/scenes/PreloadScene";
import { GameScene } from "./phaser/scenes/GameScene";
import { GameOverScene } from "./phaser/scenes/GameOverScene";
import { UIScene } from "./phaser/scenes/UIScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#111111",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, PreloadScene, GameScene, UIScene, GameOverScene],
});

// Handy for poking at game state from the browser console during development.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
