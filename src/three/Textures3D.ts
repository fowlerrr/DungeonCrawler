import * as THREE from "three";

const TILES_MEDIUM = "assets/tilesets/Assets/Tiles_Medium";
const DOOR_ASSET = "assets/tilesets/Assets/Decor/Door.png";

export interface Textures3D {
  floor: THREE.Texture;
  wall: THREE.Texture;
  door: THREE.Texture;
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
 * Cached after the first call (module-level, keyed by nothing since there's only ever one set)
 * since the same textures are reused across every level rebuild for the life of the page.
 */
export function loadTextures3D(): Promise<Textures3D> {
  if (!cached) {
    const loader = new THREE.TextureLoader();
    const load = (url: string): Promise<THREE.Texture> => new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

    cached = Promise.all([load(`${TILES_MEDIUM}/Tile01_Floor.png`), load(`${TILES_MEDIUM}/Tile18_Wall.png`), load(DOOR_ASSET)]).then(
      ([floor, wall, door]) => {
        for (const tex of [floor, wall, door]) {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
        }
        return { floor, wall, door };
      },
    );
  }
  return cached;
}
