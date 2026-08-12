import { TILE_SIZE } from "../config/constants";
import { TileType, type TileGrid } from "../game/maze/types";

/**
 * Resolves a moving circle (radius `radius`, in the game's native pixel space) against nearby
 * wall tiles in `grid`, returning a corrected position that no longer overlaps any wall - a
 * from-scratch equivalent of Arcade Physics' collider(monsterGroup, wallGroup) in the 2D game,
 * since nothing here has a physics engine backing it. Only checks the small neighborhood of
 * tiles the circle could actually be touching, not the whole grid - cheap enough to run for
 * every monster every frame.
 */
export function resolveWallCollision(grid: TileGrid, x: number, y: number, radius: number): { x: number; y: number } {
  let rx = x;
  let ry = y;

  const minTx = Math.floor((rx - radius) / TILE_SIZE);
  const maxTx = Math.floor((rx + radius) / TILE_SIZE);
  const minTy = Math.floor((ry - radius) / TILE_SIZE);
  const maxTy = Math.floor((ry + radius) / TILE_SIZE);

  for (let ty = minTy; ty <= maxTy; ty++) {
    const row = grid[ty];
    for (let tx = minTx; tx <= maxTx; tx++) {
      // Out-of-grid is treated as open rather than a wall - the maze's generated border is
      // always solid wall anyway, so in practice a circle never actually reaches this case.
      const tile = row?.[tx];
      if (tile === undefined || tile === TileType.Floor) continue;

      const boxLeft = tx * TILE_SIZE;
      const boxTop = ty * TILE_SIZE;
      const boxRight = boxLeft + TILE_SIZE;
      const boxBottom = boxTop + TILE_SIZE;

      const closestX = Math.max(boxLeft, Math.min(rx, boxRight));
      const closestY = Math.max(boxTop, Math.min(ry, boxBottom));
      const dx = rx - closestX;
      const dy = ry - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq >= radius * radius) continue;

      const dist = Math.sqrt(distSq);
      if (dist > 1e-6) {
        const push = radius - dist;
        rx += (dx / dist) * push;
        ry += (dy / dist) * push;
      } else {
        // Center sits exactly on the box edge/corner - push out along the smaller-overlap axis
        // instead of normalizing a zero-length vector.
        const overlapX = radius - Math.abs(rx - closestX);
        const overlapY = radius - Math.abs(ry - closestY);
        if (overlapX < overlapY) rx += rx < closestX ? -overlapX : overlapX;
        else ry += ry < closestY ? -overlapY : overlapY;
      }
    }
  }

  return { x: rx, y: ry };
}

/** Pushes circle `a` (the mover) out of circle `b` (a fixed obstacle, e.g. the player) if they
 * overlap - `b` never moves, mirroring the 2D game's immovable/non-pushable player body. */
export function resolveCircleCollision(
  ax: number,
  ay: number,
  aRadius: number,
  bx: number,
  by: number,
  bRadius: number,
): { x: number; y: number } {
  const dx = ax - bx;
  const dy = ay - by;
  const dist = Math.hypot(dx, dy);
  const minDist = aRadius + bRadius;
  if (dist >= minDist || dist < 1e-6) return { x: ax, y: ay };

  const push = minDist - dist;
  return { x: ax + (dx / dist) * push, y: ay + (dy / dist) * push };
}
