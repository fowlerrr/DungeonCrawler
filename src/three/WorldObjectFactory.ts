import * as THREE from "three";
import { DOOR_COLOR_HEX, KEY_COLOR_HEX, PALETTE } from "./constants3d";

/** Low-poly primitives for every non-actor world object (doors, keys, chests, health pickups) -
 * same "procedural first" approach as the player/monster meshes, no external assets, except for
 * doors, which use the same real door art the 2D exit door uses (see Textures3D.ts). There's
 * only the one door image, not one per lock color, so lock-color variety comes from tinting it
 * via each mesh's own material.color (final render color = texture * material.color) rather than
 * needing ten separate door images. */

export function buildDoorMesh(color: string, doorTexture: THREE.Texture): THREE.Mesh {
  const hex = DOOR_COLOR_HEX[color] ?? 0x555555;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.3, 0.15),
    new THREE.MeshLambertMaterial({ map: doorTexture, color: hex }),
  );
  mesh.position.y = 0.65;
  return mesh;
}

export function buildExitDoorMesh(doorTexture: THREE.Texture): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.4, 0.15),
    new THREE.MeshLambertMaterial({ map: doorTexture, color: PALETTE.exitDoor }),
  );
  mesh.position.y = 0.7;
  return mesh;
}

export function buildKeyMesh(color: string): THREE.Group {
  const hex = KEY_COLOR_HEX[color] ?? 0xf5d76e;
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), new THREE.MeshLambertMaterial({ color: hex }));
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), new THREE.MeshLambertMaterial({ color: hex }));
  shaft.position.x = 0.14;
  group.add(ring, shaft);
  group.position.y = 0.35;
  group.rotation.x = Math.PI / 2;
  return group;
}

export function buildChestMesh(isVault: boolean): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.35, 0.4),
    new THREE.MeshLambertMaterial({ color: isVault ? 0xd79a3c : PALETTE.chest }),
  );
  base.position.y = 0.18;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.12, 0.42),
    new THREE.MeshLambertMaterial({ color: isVault ? 0xf5d76e : 0x8f5a1e }),
  );
  lid.position.y = 0.41;
  group.add(base, lid);
  return group;
}

export function buildHealthPickupMesh(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.MeshLambertMaterial({ color: PALETTE.health, emissive: new THREE.Color(PALETTE.health).multiplyScalar(0.3) }),
  );
}
