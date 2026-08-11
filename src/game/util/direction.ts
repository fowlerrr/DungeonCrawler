export type Direction = "up" | "down" | "left" | "right";

export const DIRECTION_VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Picks the most-recently-pressed direction that's still held, given a press-order history and
 * a way to check current key state - so tapping a new direction while holding another
 * immediately changes course, without this logic needing to know anything about Phaser's Key
 * objects (that live in InputController).
 */
export function resolveDirection(heldOrder: readonly Direction[], isDown: (dir: Direction) => boolean): Direction | null {
  for (let i = heldOrder.length - 1; i >= 0; i--) {
    if (isDown(heldOrder[i])) return heldOrder[i];
  }
  return null;
}
