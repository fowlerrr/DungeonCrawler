import { describe, expect, it } from "vitest";
import { braidMaze } from "../src/game/maze/braiding";
import { generateBaseMaze } from "../src/game/maze/generator";
import { placeLocks } from "../src/game/maze/locks";
import { Rng } from "../src/game/maze/rng";
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
      const { doors, keys } = placeLocks(graph, 4, rng, entrance, new Set([`${exit.x},${exit.y}`]));

      expect(validateSolvable(graph, doors, keys, entrance, exit)).toBe(true);
    }
  });

  it("places at most one key per door and never places a key on the entrance", () => {
    const rng = new Rng(77);
    const graph = generateBaseMaze(8, 8, rng);
    braidMaze(graph, 0.3, rng);
    const entrance = { x: 0, y: 0 };
    const { doors, keys } = placeLocks(graph, 5, rng, entrance);

    expect(keys.length).toBeLessThanOrEqual(doors.length);
    expect(keys.every((k) => !(k.cell.x === entrance.x && k.cell.y === entrance.y))).toBe(true);
    const doorIds = new Set(doors.map((d) => d.id));
    expect(keys.every((k) => doorIds.has(k.doorId))).toBe(true);
  });
});

describe("validateSolvable", () => {
  it("rejects a maze where a key is stranded behind its own lock with no alternate route", () => {
    // A simple 3-cell line: entrance -> mid -> exit, with the ONLY edge to the exit locked,
    // and that door's key placed at the exit itself - i.e. genuinely unreachable.
    const graph: MazeGraph = {
      cols: 3,
      rows: 1,
      edges: [
        { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, open: true },
        { a: { x: 1, y: 0 }, b: { x: 2, y: 0 }, open: true },
      ],
    };
    const doors = [{ id: "door_0", edgeKey: "1,0|2,0", color: "red" as const }];
    const keys = [{ doorId: "door_0", cell: { x: 2, y: 0 }, color: "red" as const }];

    const solvable = validateSolvable(graph, doors, keys, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(solvable).toBe(false);
  });

  it("accepts the same layout once the key is reachable before the lock", () => {
    const graph: MazeGraph = {
      cols: 3,
      rows: 1,
      edges: [
        { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, open: true },
        { a: { x: 1, y: 0 }, b: { x: 2, y: 0 }, open: true },
      ],
    };
    const doors = [{ id: "door_0", edgeKey: "1,0|2,0", color: "red" as const }];
    const keys = [{ doorId: "door_0", cell: { x: 1, y: 0 }, color: "red" as const }];

    const solvable = validateSolvable(graph, doors, keys, { x: 0, y: 0 }, { x: 2, y: 0 });
    expect(solvable).toBe(true);
  });
});
