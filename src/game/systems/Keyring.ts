import type { DoorColor } from "../maze/locks";

/** The exit key isn't part of DOOR_COLORS (it's not a maze lock) but still needs a label for
 * the HUD's held-keys display. */
export type KeyLabel = DoorColor | "exit";

/** Level-scoped, single-use maze keys - distinct from the permanent equipment Inventory.
 * Reset fresh every level (and on death-restart); never persisted. */
export class Keyring {
  private held = new Map<string, KeyLabel>();

  collect(doorId: string, label: KeyLabel): void {
    this.held.set(doorId, label);
  }

  has(doorId: string): boolean {
    return this.held.has(doorId);
  }

  /** Single-use: opening a door consumes its key. */
  consume(doorId: string): void {
    this.held.delete(doorId);
  }

  /** Every key currently held, for the HUD - order matches collection order. */
  heldLabels(): KeyLabel[] {
    return [...this.held.values()];
  }
}
