# Art credits

Third-party art used in `public/assets/`, shared by both the 2D (Phaser) and 3D (Three.js)
clients. Keep this file in sync if more assets from either pack (or a new pack) get used.

## Dungeon tiles & door — 0x72

- Source: https://0x72.itch.io/dungeontileset-ii
- Files used, all from `public/assets/tilesets/dungeon-tileset-ii/`:
  - `floor_1.png` - floor (baked into every one of the 2D game's autotile variant keys uniformly;
    see RealArtTextures.ts for why this pack doesn't need the old edge/corner autotile trick)
  - `wall_mid.png` - wall (2D wall cells and every 3D wall face)
  - `doors_leaf_closed.png` - the 2D exit door and every 3D door (lock-color variety comes from
    tinting this one image per-mesh rather than needing a separate image per color)
- License: CC0 1.0 Universal (public domain equivalent) - free to use for any purpose, including
  commercial, with no attribution required. Creator's own words: "you can use this tileset for
  whatever you like."
- No action needed - already fully cleared for use as-is.

(Previously used Penzilla's "Dungeon Crawler Map Pack" here, but its license only grants
real usage rights once purchased for at least the suggested price - a free/$0 download is
evaluation-only. Since this project doesn't pay for assets, it's been swapped out entirely; none
of those files remain in `public/assets/`.)

## Monster & player sprites — Negative Inspiration

- Source: https://negative-inspiration.itch.io/negatives-ever-growing-monster-pack
- Files used, all from `public/assets/sprites/negative-monster-pack/`:
  - `pirate_01.png` — player character
  - `mushroom_01.png` — Slime (tier 1)
  - `imp_01.png` — Goblin (tier 1)
  - `worm_01.png` — Giant Worm (tier 1)
  - `skeleton_01.png` — Skeleton (tier 2)
  - `spider_01.png` — Giant Spider (tier 2)
  - `snake_01.png` — Venomous Snake (tier 2)
  - `wolf_01.png` — Dire Wolf (tier 3)
  - `beastman_01.png` — Beastman (tier 3)
  - `crocodog_01.png` — Crocodog (tier 3)
  - `Bug_01.png` — Carapace Bug (tier 4)
  - `Dreg_01.png` — Dreg Fiend (tier 4)
  - `koboglins.png` — Koboglin Raider (tier 4)
  - `golem_armor.png` — Armored Golem (tier 5)
  - `golem_acid.png` — Acid Golem (tier 5)
  - `Float_Armour_01.png` — Haunted Armor (tier 5)
  - `succubus_01.png` — Succubus (tier 6)
  - `Necromaster_Thrall_01.png` — Necromaster Thrall (tier 6)
  - `golem_magma.png` — Magma Golem (tier 6)
  - `ogre_01.png` — the level boss (Dungeon Lord)
- License: CC BY-SA 4.0 — free to use indefinitely, credit required, no resale.
- Credited in-game via the "Credits" button on the main menu (2D: CreditsScene.ts, 3D:
  Overlays3D.ts's showCredits3D) - no further action needed.
