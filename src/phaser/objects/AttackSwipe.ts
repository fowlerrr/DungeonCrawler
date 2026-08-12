import Phaser from "phaser";
import { PLAYER_ATTACK_CONE_HALF_ANGLE_DEG, TILE_SIZE } from "../../config/constants";
import type { WeaponArt } from "../../game/data/types";

const SWIPE_OFFSET = TILE_SIZE * 0.4;
const SWIPE_DURATION_MS = 160;
const SWEEP_HALF_ANGLE_RAD = (PLAYER_ATTACK_CONE_HALF_ANGLE_DEG * Math.PI) / 180;
const DEFAULT_ART: WeaponArt = "sword";

/** Short-lived directional visual so a melee attack reads as an actual slash: the blade image
 * pivots near its hilt end and sweeps across the same cone the hit-detection uses (see
 * PLAYER_ATTACK_CONE_HALF_ANGLE_DEG), rather than just flashing in place. `art` picks which
 * weapon silhouette to show (see the `attack_swipe_*` texture keys in TextureFactory.ts) -
 * defaults to a plain sword for unarmed attacks or any non-melee art value passed in error. */
export function spawnAttackSwipe(
  scene: Phaser.Scene,
  originX: number,
  originY: number,
  facing: { x: number; y: number },
  art: WeaponArt = DEFAULT_ART,
): void {
  const x = originX + facing.x * SWIPE_OFFSET;
  const y = originY + facing.y * SWIPE_OFFSET;
  const facingAngle = Math.atan2(facing.y, facing.x);

  const textureKey = scene.textures.exists(`attack_swipe_${art}`) ? `attack_swipe_${art}` : `attack_swipe_${DEFAULT_ART}`;
  const swipe = scene.add.image(x, y, textureKey);
  swipe.setOrigin(0.15, 0.5); // pivot near the hilt end so the sweep reads as a swing, not a spin
  swipe.setRotation(facingAngle - SWEEP_HALF_ANGLE_RAD);
  swipe.setDepth(50);
  swipe.setScale(0.9);

  scene.tweens.add({
    targets: swipe,
    rotation: facingAngle + SWEEP_HALF_ANGLE_RAD,
    alpha: 0,
    scale: 1.25,
    duration: SWIPE_DURATION_MS,
    ease: Phaser.Math.Easing.Cubic.Out,
    onComplete: () => swipe.destroy(),
  });
}
