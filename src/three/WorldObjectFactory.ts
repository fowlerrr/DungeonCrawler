import * as THREE from "three";
import { DOOR_COLOR_HEX, KEY_COLOR_HEX, PALETTE } from "./constants3d";

/** Low-poly primitives for every non-actor world object (doors, keys, chests, health pickups) -
 * same "procedural first" approach as the player/monster meshes, no external assets, except for
 * doors, which use the same real door art the 2D exit door uses (see Textures3D.ts). There's
 * only the one door image, not one per lock color, so lock-color variety comes from tinting it
 * via each mesh's own material.color (final render color = texture * material.color) rather than
 * needing ten separate door images. */

/** A lock-colored door panel, tinting the shared door texture to the given lock color. */
export function buildDoorMesh(color: string, doorTexture: THREE.Texture): THREE.Mesh {
  const hex = DOOR_COLOR_HEX[color] ?? 0x555555;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.3, 0.15),
    new THREE.MeshLambertMaterial({ map: doorTexture, color: hex }),
  );
  mesh.position.y = 0.65;
  return mesh;
}

/** Renders `text` onto a small canvas and wraps it in a THREE.Sprite - sprites always face the
 * camera automatically (unlike a plain plane), so this needs no per-frame billboarding logic the
 * way MonsterController3D's flat art does. */
function buildTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 40px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#1a1a24";
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.8, 0.2, 1);
  return sprite;
}

/**
 * The level-exit door - a plain color tint alone reads as just another lock door at a glance
 * (worse still since every door, lock or exit, shares the same underlying image - see the module
 * doc), especially since PALETTE.exitDoor's gold sits close to the yellow lock door's hue under
 * warm torchlight. Self-illuminated (emissive) so it doesn't depend on nearby light to read as
 * "lit up", plus an attached point light so it's visible as a beacon from a short distance down a
 * corridor, plus a floating "EXIT" label - three independent, unmistakable cues instead of one
 * subtle one.
 */
export function buildExitDoorMesh(doorTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.4, 0.15),
    new THREE.MeshLambertMaterial({
      map: doorTexture,
      color: PALETTE.exitDoor,
      emissive: new THREE.Color(PALETTE.exitDoor).multiplyScalar(0.35),
    }),
  );
  panel.position.y = 0.7;
  group.add(panel);

  const beacon = new THREE.PointLight(PALETTE.exitDoor, 8, 5, 1.8);
  beacon.position.y = 1.1;
  group.add(beacon);

  const label = buildTextSprite("EXIT", "#f5d76e");
  label.position.y = 1.55;
  group.add(label);

  return group;
}

/** A small ring-and-shaft key silhouette, colored to match its door. */
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

/** A base+lid chest, colored gold instead of brown for a vault chest so it reads as the better
 * reward at a glance (see LootTable's boostForVault). */
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

/** A small glowing octahedron marking a health pickup. */
export function buildHealthPickupMesh(): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.MeshLambertMaterial({ color: PALETTE.health, emissive: new THREE.Color(PALETTE.health).multiplyScalar(0.3) }),
  );
}
