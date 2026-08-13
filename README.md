# Dungeon Crawler

A browser-based dungeon crawler: procedurally generated mazes, melee/ranged combat, loot with
rarity tiers, and a persistent stat-point progression system across a 30-level run. It ships with
**two interchangeable clients built on the same game logic** — a 2D top-down renderer (Phaser 3)
and a first-person 3D renderer (Three.js) — switchable from the main menu, sharing the same save
data either direction.

This is a hobby project built with no budget for art, so the visuals lean on free/no-cost
sources: procedurally generated shapes for UI and some placeholder art, plus a couple of
hand-painted itch.io asset packs for tiles, doors, monsters, and the player character. See
[CREDITS.md](CREDITS.md) for exactly what's used and its licensing terms (some of it needs a
small payment before this could ever ship commercially — see that file for details).

## Getting started

Requires [Node.js](https://nodejs.org/) (any reasonably recent LTS version).

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`). The 2D client loads first;
use the **"Play in 3D (beta)"** button on the main menu to switch to the 3D client, and its own
menu has a **"Back to 2D"** button to switch back.

### Other scripts

```bash
npm run build     # type-check and produce a production build in dist/
npm run preview   # serve the production build locally
npm test          # run the test suite (vitest)
```

On Windows, `run-dev.cmd` is a double-click shortcut that does the same as `npm run dev`.

## Controls

### 2D (top-down)

| Action | Key |
| --- | --- |
| Move | Arrow keys or WASD |
| Attack | Space (aims at your last move direction) |
| Equipment menu | I |
| Pause menu | Esc |

### 3D (first-person)

Movement is tank-style rather than free-look: turning and walking are separate actions, matching
the maze's grid (every wall is axis-aligned, so facing is always one of 4 directions).

| Action | Key |
| --- | --- |
| Turn 90° left / right | A/D or Left/Right arrows |
| Step forward / backward | W/Up or S/Down |
| Attack | Space (aims wherever you're currently facing) |
| Equipment menu | I |
| Pause menu | Esc |

Turning mid-step is buffered rather than ignored — you can commit to a turn slightly before
you're centered on the tile, and it applies cleanly the moment you land there instead of needing
frame-perfect timing.

Both clients share the same core loop: explore a maze, fight or avoid monsters, unlock colored
doors with keys found elsewhere in the level, find the boss for the exit key, and reach the exit.
Every completed level earns a stat point to spend on ATK, DEF, or HP from the pause menu.

## How it's built

The game logic (`src/game/`) — maze generation, combat math, loot tables, inventory,
progression, save data — has **no dependency on either renderer**. It's plain TypeScript,
covered by the test suite, and both `src/phaser/` (2D) and `src/three/` (3D) are just different
presentation layers reading and driving that same logic. This is why a fix or feature in the
shared layer (monster stats, loot rules, maze generation, difficulty scaling) automatically
applies to both clients at once.

```
src/
  game/       Pure game logic - maze generation, combat, loot, inventory, progression, saves.
              No Phaser or Three.js imports; safe to unit test in isolation.
  phaser/     The 2D client: scenes, sprites, procedural + real-art textures.
  three/      The 3D client: the Game3D orchestrator, entity controllers, DOM-based UI overlays.
  config/     Shared tunable constants (both clients import from here).
test/         Vitest unit tests for the game/ logic layer.
public/       Static assets - see CREDITS.md for the licensed art in here.
```

### Difficulty & monster tiers

Regular monsters are organized into 6 tiers that unlock progressively across the 30-level curve
(tier 1 from level 1, tier 6 from level 25) - see `src/game/data/monsters.ts`. A tier's monsters
stay in the spawn pool once unlocked rather than being replaced, so the mix keeps growing and
visibly shifts toward tougher creatures as you go deeper, on top of the continuous per-level
HP/damage scaling in `src/game/systems/LevelConfig.ts`.

## Tests

```bash
npm test
```

Covers the engine-agnostic logic in `src/game/` and `src/three/collision3d.ts` (maze generation
and solvability, combat math, loot rolling, inventory/auto-equip rules, save/load, and the 3D
client's hand-rolled wall/circle collision).
