/** Small seedable PRNG (mulberry32) so maze generation and loot rolls are reproducible given a
 * seed - useful for tests, and for "same seed on death" if we ever want that toggle. */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Random integer in [0, max). */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(items: readonly T[]): T {
    return items[this.nextInt(items.length)];
  }
}
