export function normalize(x: number, y: number): { x: number; y: number } {
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}
