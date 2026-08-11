export interface BlockingDoor {
  tileX: number;
  tileY: number;
  doorId: string;
  active: boolean;
}

/** The still-locked door occupying (tx, ty), if any. Tile-stepping treats a locked door's tile
 * as impassable (see isTilePassable's blockedTiles), so the player's body can never reach far
 * enough to trigger a physics overlap with the door sprite - unlocking has to be decided as
 * part of the movement attempt itself, before passability is checked. */
export function findBlockingDoorAt<T extends BlockingDoor>(doors: readonly T[], tx: number, ty: number): T | undefined {
  return doors.find((door) => door.active && door.tileX === tx && door.tileY === ty);
}
