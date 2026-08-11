/** Level-scoped, single-use maze keys - distinct from the permanent equipment Inventory.
 * Reset fresh every level (and on death-restart); never persisted. */
export class Keyring {
  private held = new Set<string>();

  collect(doorId: string): void {
    this.held.add(doorId);
  }

  has(doorId: string): boolean {
    return this.held.has(doorId);
  }

  /** Single-use: opening a door consumes its key. */
  consume(doorId: string): void {
    this.held.delete(doorId);
  }
}
