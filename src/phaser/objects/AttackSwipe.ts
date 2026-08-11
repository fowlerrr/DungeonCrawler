import Phaser from "phaser";
import { TILE_SIZE } from "../../config/constants";

const SWIPE_OFFSET = TILE_SIZE * 0.55;
const SWIPE_DURATION_MS = 160;

/** Short-lived directional visual so an attack clearly reads as happening and shows which
 * way it's aimed - a stand-in for a real swing animation once there's art. */
export function spawnAttackSwipe(scene: Phaser.Scene, originX: number, originY: number, facing: { x: number; y: number }): void {
  const x = originX + facing.x * SWIPE_OFFSET;
  const y = originY + facing.y * SWIPE_OFFSET;
  const swipe = scene.add.image(x, y, "attack_swipe");
  swipe.setRotation(Math.atan2(facing.y, facing.x));
  swipe.setDepth(50);
  swipe.setScale(0.8);

  scene.tweens.add({
    targets: swipe,
    alpha: 0,
    scale: 1.3,
    duration: SWIPE_DURATION_MS,
    onComplete: () => swipe.destroy(),
  });
}
