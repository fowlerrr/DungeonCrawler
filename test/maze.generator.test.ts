import { describe, expect, it } from "vitest";
import { braidMaze } from "../src/game/maze/braiding";
import { buildOpenAdjacency, findBridges, type MazeGraph } from "../src/game/maze/graph";
import { generateBaseMaze } from "../src/game/maze/generator";
import { Rng } from "../src/game/maze/rng";
import { cellKey } from "../src/game/maze/types";

function countReachableCells(graph: MazeGraph, start = { x: 0, y: 0 }): number {
  const adjacency = buildOpenAdjacency(graph);
  const visited = new Set<string>([cellKey(start)]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const { other } of adjacency.get(cellKey(current)) ?? []) {
      const k = cellKey(other);
      if (!visited.has(k)) {
        visited.add(k);
        queue.push(other);
      }
    }
  }
  return visited.size;
}

describe("generateBaseMaze", () => {
  it("produces a fully connected maze reaching every cell", () => {
    for (const seed of [1, 2, 3, 42, 12345]) {
      const graph = generateBaseMaze(10, 8, new Rng(seed));
      expect(countReachableCells(graph)).toBe(10 * 8);
    }
  });

  it("carves exactly cols*rows - 1 open edges (a spanning tree)", () => {
    const graph = generateBaseMaze(6, 5, new Rng(7));
    const openCount = graph.edges.filter((e) => e.open).length;
    expect(openCount).toBe(6 * 5 - 1);
  });
});

describe("braidMaze", () => {
  it("only adds edges, never removes them, and stays fully connected", () => {
    const graph = generateBaseMaze(10, 8, new Rng(99));
    const openBefore = graph.edges.filter((e) => e.open).length;
    braidMaze(graph, 0.4, new Rng(100));
    const openAfter = graph.edges.filter((e) => e.open).length;

    expect(openAfter).toBeGreaterThanOrEqual(openBefore);
    expect(countReachableCells(graph)).toBe(10 * 8);
  });

  it("with braidFactor 1, opens every edge", () => {
    const graph = generateBaseMaze(5, 5, new Rng(3));
    braidMaze(graph, 1, new Rng(4));
    expect(graph.edges.every((e) => e.open)).toBe(true);
  });
});

describe("findBridges", () => {
  it("finds no bridges once braiding creates a loop covering every edge", () => {
    const graph = generateBaseMaze(5, 5, new Rng(3));
    braidMaze(graph, 1, new Rng(4));
    const bridges = findBridges(graph, { x: 0, y: 0 });
    expect(bridges.size).toBe(0);
  });

  it("treats every edge of an unbraided perfect maze as a bridge", () => {
    const graph = generateBaseMaze(6, 6, new Rng(11));
    const bridges = findBridges(graph, { x: 0, y: 0 });
    const openEdges = graph.edges.filter((e) => e.open);
    expect(bridges.size).toBe(openEdges.length);
  });

  it("identifies a hand-built single connecting edge as the sole bridge", () => {
    // Two 2x2 fully-looped blocks joined by exactly one edge in the middle.
    const graph: MazeGraph = {
      cols: 4,
      rows: 2,
      edges: [
        { a: { x: 0, y: 0 }, b: { x: 1, y: 0 }, open: true },
        { a: { x: 0, y: 1 }, b: { x: 1, y: 1 }, open: true },
        { a: { x: 0, y: 0 }, b: { x: 0, y: 1 }, open: true },
        { a: { x: 1, y: 0 }, b: { x: 1, y: 1 }, open: true },

        { a: { x: 2, y: 0 }, b: { x: 3, y: 0 }, open: true },
        { a: { x: 2, y: 1 }, b: { x: 3, y: 1 }, open: true },
        { a: { x: 2, y: 0 }, b: { x: 2, y: 1 }, open: true },
        { a: { x: 3, y: 0 }, b: { x: 3, y: 1 }, open: true },

        { a: { x: 1, y: 0 }, b: { x: 2, y: 0 }, open: true }, // the single connector
      ],
    };
    const bridges = findBridges(graph, { x: 0, y: 0 });
    expect(bridges.size).toBe(1);
    expect(bridges.has("1,0|2,0")).toBe(true);
  });
});
