import { describe, expect, it } from "vitest";
import { braidMaze } from "../src/game/maze/braiding";
import { generateBaseMaze } from "../src/game/maze/generator";
import { placeLocks } from "../src/game/maze/locks";
import { Rng } from "../src/game/maze/rng";
import { cellKey } from "../src/game/maze/types";
import { validateSolvable } from "../src/game/maze/validator";
import type { MazeGraph } from "../src/game/maze/graph";

describe("placeLocks + validateSolvable", () => {
  it("always produces a solvable maze across many seeds", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const rng = new Rng(seed);
      const graph = generateBaseMaze(10, 8, rng);
      braidMaze(graph, 0.35, rng);
      const entrance = { x: 0, y: 0 };
      const exit = { x: 9, y: 7 };
      const { doors, keys } = placeLocks(graph, 4, rng, entrance, exit);

      expect(validateSolvable(graph, doors, keys, entrance, exit)).toBe(true);
    }
  });

  it("never assigns the same color to two different doors in one level", () => {
    // A held key's color is the player's only cue for which door it opens - if two doors ever
    // share a color, a matching-colored key that isn't actually for that door reads as a bug.
    const rng = new Rng(42);
    const graph = generateBaseMaze(20, 20, rng);
    braidMaze(graph, 0.3, rng);
    const entrance = { x: 0, y: 0 };
    const exit = { x: 19, y: 19 };
    const { doors } = placeLocks(graph, 10, rng, entrance, exit);

    const colors = doors.map((d) => d.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("places at most one key per door and never places a key on the entrance", () => {
    const rng = new Rng(77);
    const graph = generateBaseMaze(8, 8, rng);
    braidMaze(graph, 0.3, rng);
    const entrance = { x: 0, y: 0 };
    const exit = { x: 7, y: 7 };
    const { doors, keys } = placeLocks(graph, 5, rng, entrance, exit);

    expect(keys.length).toBeLessThanOrEqual(doors.length);
    expect(keys.every((k) => !(k.cell.x === entrance.x && k.cell.y === entrance.y))).toBe(true);
    const doorIds = new Set(doors.map((d) => d.id));
    expect(keys.every((k) => doorIds.has(k.doorId))).toBe(true);
  });

  it("every door gates a vault of cells unreachable from the entrance without it", () => {
    const rng = new Rng(23);
    const graph = generateBaseMaze(12, 10, rng);
    braidMaze(graph, 0.3, rng);
    const entrance = { x: 0, y: 0 };
    const exit = { x: 11, y: 9 };
    const { doors, vaults } = placeLocks(graph, 6, rng, entrance, exit);

    expect(vaults.length).toBe(doors.length);
    for (const vault of vaults) {
      expect(vault.cells.length).toBeGreaterThan(0);
      expect(vault.cells.some((c) => c.x === exit.x && c.y === exit.y)).toBe(false);
      expect(vault.cells.some((c) => c.x === entrance.x && c.y === entrance.y)).toBe(false);
    }
  });

  it("never lets two vaults (or a vault and the exit) share a cell", () => {
    const rng = new Rng(555);
    const graph = generateBaseMaze(14, 12, rng);
    braidMaze(graph, 0.25, rng);
    const entrance = { x: 0, y: 0 };
    const exit = { x: 13, y: 11 };
    const { vaults } = placeLocks(graph, 8, rng, entrance, exit);

    const seen = new Set<string>();
    for (const vault of vaults) {
      for (const cell of vault.cells) {
        const key = cellKey(cell);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it("removing a door's edge really does disconnect its vault from the entrance", () => {
    const rng = new Rng(9001);
    const graph = generateBaseMaze(10, 10, rng);
    braidMaze(graph, 0.3, rng);
    const entrance = { x: 0, y: 0 };
    const exit = { x: 9, y: 9 };
    const { doors, vaults } = placeLocks(graph, 5, rng, entrance, exit);

    for (const door of doors) {
      const vault = vaults.find((v) => v.doorId === door.id)!;
      const withoutDoor: MazeGraph = {
        ...graph,
        edges: graph.edges.filter((e) => !(e.a === door.a && e.b === door.b)),
      };
      // Reachability from the entrance with the door's edge simply removed (not just locked)
      // should exclude every one of that vault's cells.
      const reachable = new Set<string>([cellKey(entrance)]);
      const queue = [entrance];
      const adjacency = new Map<string, { x: number; y: number }[]>();
      for (const e of withoutDoor.edges) {
        if (!e.open) continue;
        adjacency.set(cellKey(e.a), [...(adjacency.get(cellKey(e.a)) ?? []), e.b]);
        adjacency.set(cellKey(e.b), [...(adjacency.get(cellKey(e.b)) ?? []), e.a]);
      }
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const next of adjacency.get(cellKey(cur)) ?? []) {
          if (!reachable.has(cellKey(next))) {
            reachable.add(cellKey(next));
            queue.push(next);
          }
        }
      }
      for (const cell of vault.cells) {
        expect(reachable.has(cellKey(cell))).toBe(false);
      }
    }
  });
});
