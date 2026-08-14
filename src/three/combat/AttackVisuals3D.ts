import * as THREE from "three";
import type { WeaponArt } from "../../game/data/types";
import { pxToWorld } from "../coords";
import { EYE_HEIGHT } from "../constants3d";

const SWIPE_DURATION_MS = 220;
const PROJECTILE_SPEED_UNITS_PER_MS = 0.7 / 32; // matches Projectile.ts's px/ms, converted to world units

/** Tints the (currently shared) slash/projectile meshes by weapon art category - a smaller
 * version of the 2D game's per-weapon-shape system (see AttackSwipe.ts/Projectile.ts), trading
 * shape variety for scope: one mesh per attack type, colored to at least hint at what's swinging
 * or flying. */
const ART_COLOR: Record<WeaponArt, number> = {
  sword: 0xe8eef5,
  axe: 0xb0b4c0,
  dagger: 0xd8d8e0,
  mace: 0x9096a0,
  spear: 0xc7cdd6,
  arrow: 0xd9b98a,
  stone: 0x8a8a8a,
  frost: 0x8fd6ff,
  fireball: 0xff6a3d,
  arcane: 0xb35eff,
};

interface TimedVisual {
  mesh: THREE.Object3D;
  elapsedMs: number;
  durationMs: number;
  update: (t: number, mesh: THREE.Object3D) => void;
}

/** Owns every in-flight slash/projectile mesh and advances them each frame - the 3D equivalent
 * of AttackSwipe.ts/Projectile.ts's scene.tweens.add(...).onComplete(destroy) pattern, just
 * hand-rolled since there's no Phaser tween manager here. */
export class AttackVisuals3D {
  private readonly group = new THREE.Group();
  private active: TimedVisual[] = [];

  constructor(parent: THREE.Object3D) {
    parent.add(this.group);
  }

  /** Spawns a brief cone-shaped melee slash near the origin, facing outward, that fades and
   * spins away over SWIPE_DURATION_MS. Sized and positioned to read clearly in first person -
   * the original version (smaller, lower, quicker) was reported as barely visible. */
  spawnSwipe(originPx: { x: number; y: number }, facing: { x: number; y: number }, art: WeaponArt = "sword"): void {
    const color = ART_COLOR[art] ?? ART_COLOR.sword;
    const mesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.9, 3),
      new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }),
    );
    const { x, z } = pxToWorld(originPx.x, originPx.y);
    const facingAngle = Math.atan2(facing.x, facing.y);
    // Held close to eye height (rather than the old 0.55, well below where the first-person
    // camera actually looks) and a bit further out, so it lands centered in view instead of
    // flashing near the bottom edge of the screen.
    mesh.position.set(x + Math.sin(facingAngle) * 0.55, EYE_HEIGHT - 0.1, z + Math.cos(facingAngle) * 0.55);
    mesh.rotation.x = Math.PI / 2;
    mesh.rotation.z = -facingAngle;
    mesh.scale.setScalar(1.2);
    this.group.add(mesh);

    this.active.push({
      mesh,
      elapsedMs: 0,
      durationMs: SWIPE_DURATION_MS,
      update: (t) => {
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - t * t;
        mesh.rotation.z -= 0.12;
        mesh.scale.setScalar(1.2 + t * 1.1);
      },
    });
  }

  /** Spawns a small sphere that travels from origin to destination at a fixed speed, then is
   * removed on arrival - duration is derived from distance so travel time always matches range. */
  spawnProjectile(originPx: { x: number; y: number }, destPx: { x: number; y: number }, art: WeaponArt = "arrow"): void {
    const color = ART_COLOR[art] ?? ART_COLOR.arrow;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color }));
    const from = pxToWorld(originPx.x, originPx.y);
    const to = pxToWorld(destPx.x, destPx.y);
    mesh.position.set(from.x, 0.55, from.z);
    this.group.add(mesh);

    const distance = Math.hypot(destPx.x - originPx.x, destPx.y - originPx.y);
    const durationMs = Math.max(1, distance / (32 * PROJECTILE_SPEED_UNITS_PER_MS));

    this.active.push({
      mesh,
      elapsedMs: 0,
      durationMs,
      update: (t) => {
        mesh.position.x = from.x + (to.x - from.x) * t;
        mesh.position.z = from.z + (to.z - from.z) * t;
      },
    });
  }

  /** Advances every active visual by one frame, disposing and dropping any that have finished. */
  update(deltaMs: number): void {
    this.active = this.active.filter((visual) => {
      visual.elapsedMs += deltaMs;
      const t = Math.min(1, visual.elapsedMs / visual.durationMs);
      visual.update(t, visual.mesh);
      if (t >= 1) {
        this.group.remove(visual.mesh);
        disposeObject(visual.mesh);
        return false;
      }
      return true;
    });
  }
}

/** Frees a mesh's GPU-side geometry/material buffers - Three.js doesn't garbage-collect these
 * automatically when an object is removed from the scene, so every short-lived visual has to
 * dispose them explicitly to avoid leaking memory. */
function disposeObject(obj: THREE.Object3D): void {
  const mesh = obj as THREE.Mesh;
  mesh.geometry?.dispose();
  const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
  if (Array.isArray(material)) material.forEach((m) => m.dispose());
  else material?.dispose();
}
