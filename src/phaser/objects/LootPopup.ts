import Phaser from "phaser";
import { getRarityConfig } from "../../game/data/rarity";
import type { ItemDef } from "../../game/data/types";

const POPUP_RISE_PX = 40;
const POPUP_DURATION_MS = 1400;
const POPUP_Y_OFFSET = -20;

/** Short-lived floating label naming what a chest dropped, colored by rarity - otherwise a
 * chest opening gives no feedback beyond the item silently entering the inventory. */
export function spawnLootPopup(scene: Phaser.Scene, x: number, y: number, item: ItemDef): void {
  const text = scene.add
    .text(x, y + POPUP_Y_OFFSET, item.name, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: getRarityConfig(item.rarity).color,
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5)
    .setDepth(200);

  scene.tweens.add({
    targets: text,
    y: text.y - POPUP_RISE_PX,
    alpha: 0,
    duration: POPUP_DURATION_MS,
    ease: Phaser.Math.Easing.Cubic.Out,
    onComplete: () => text.destroy(),
  });
}
