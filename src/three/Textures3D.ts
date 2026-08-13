import * as THREE from "three";
import { MONSTER_ART_FILENAMES } from "../game/data/monsterArt";

const TILES_MEDIUM = "assets/tilesets/Assets/Tiles_Medium";
const DOOR_ASSET = "assets/tilesets/Assets/Decor/Door.png";
const MONSTER_PACK = "assets/sprites/negative-monster-pack";

export interface Textures3D {
  floor: THREE.Texture;
  wall: THREE.Texture;
  door: THREE.Texture;
  /** Keyed by MonsterDef.spriteKey - see MONSTER_ART_FILENAMES. */
  monsters: Record<string, THREE.Texture>;
}

let cached: Promise<Textures3D> | null = null;

/**
 * Loads the same real hand-painted assets the 2D game uses (see RealArtTextures.ts) rather than
 * sourcing anything new, so both clients share one art style and one set of licensing terms (see
 * CREDITS.md). The 2D game's floor autotile system picks between 6 tile shapes per neighbor
 * configuration purely to fake a brick border around adjacent walls - that trick doesn't apply
 * here, since 3D walls are real geometry that reads as a wall on its own. A single floor texture
 * and a single wall texture (the tileset's fully-bordered piece, Tile18 - the one with the most
 * brick coverage, so it reads best as a repeating wall surface rather than "mostly floor with a
 * sliver of border") are enough. The door art is real too (the same asset the 2D exit door
 * uses) - lock-door colors come from tinting it via each mesh's own material.color rather than
 * needing ten separate door images (see WorldObjectFactory.buildDoorMesh).
 *
 * Monster art is the same per-creature pack images the 2D game uses, applied as a camera-facing
 * billboard rather than baked onto 3D geometry (see MonsterController3D) - a single painted
 * illustration doesn't have back/side views to wrap onto a solid shape.
 *
 * Cached after the first call (module-level, keyed by nothing since there's only ever one set)
 * since the same textures are reused across every level rebuild for the life of the page.
 */
export function loadTextures3D(): Promise<Textures3D> {
  if (!cached) {
    const loader = new THREE.TextureLoader();
    const load = (url: string): Promise<THREE.Texture> => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

    const monsterKeys = Object.keys(MONSTER_ART_FILENAMES);
    cached = Promise.all([
      load(`${TILES_MEDIUM}/Tile01_Floor.png`),
      load(`${TILES_MEDIUM}/Tile18_Wall.png`),
      load(DOOR_ASSET),
      Promise.all(monsterKeys.map((key) => load(`${MONSTER_PACK}/${MONSTER_ART_FILENAMES[key]}`))),
    ]).then(([floor, wall, door, monsterTextures]) => {
      const monsters: Record<string, THREE.Texture> = {};
      monsterKeys.forEach((key, i) => (monsters[key] = monsterTextures[i]));

      for (const tex of [floor, wall, door, ...monsterTextures]) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
      }
      // Monster art is painted illustrations on a transparent background, unlike the tile/door
      // textures - keep it crisp at a distance without the mip chain muddying the cutout edges.
      for (const tex of monsterTextures) {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
      }

      return { floor, wall, door, monsters };
    });
  }
  return cached;
}
