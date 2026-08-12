import Phaser from "phaser";
import type { WeaponArt } from "../../game/data/types";

const PROJECTILE_SPEED_PX_PER_MS = 0.7; // fast enough to feel snappy even at the longest bow range
const PROJECTILE_SCALE = 0.75;
const DEFAULT_ART: WeaponArt = "arrow";

/** Fires a small bolt from the origin to `dest` - either the target it hit, or the weapon's full
 * range along the attack direction if nothing was hit - and destroys it on arrival. A ranged
 * attack should visibly travel its range and disappear rather than landing instantly and
 * invisibly the way melee's point-blank swing can get away with. `art` picks which projectile
 * silhouette to show (see the `projectile_*` texture keys in TextureFactory.ts) - defaults to a
 * plain arrow for any non-ranged art value passed in error. */
export function spawnProjectile(
  scene: Phaser.Scene,
  originX: number,
  originY: number,
  dest: { x: number; y: number },
  art: WeaponArt = DEFAULT_ART,
): void {
  const dx = dest.x - originX;
  const dy = dest.y - originY;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;

  const textureKey = scene.textures.exists(`projectile_${art}`) ? `projectile_${art}` : `projectile_${DEFAULT_ART}`;
  const projectile = scene.add.image(originX, originY, textureKey);
  projectile.setRotation(Math.atan2(dy, dx));
  projectile.setDepth(50);
  projectile.setScale(PROJECTILE_SCALE);

  scene.tweens.add({
    targets: projectile,
    x: dest.x,
    y: dest.y,
    duration: distance / PROJECTILE_SPEED_PX_PER_MS,
    ease: "Linear",
    onComplete: () => projectile.destroy(),
  });
}
