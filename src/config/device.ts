/** Whether this device is primarily touch-driven - checked once at module load (not live-
 * updated, since a device doesn't usually gain or lose a touchscreen mid-session) rather than as
 * a function, so constants.ts can use it to pick a design resolution before any scene exists to
 * ask. `pointer: coarse` catches phones/tablets; `maxTouchPoints` is the fallback for browsers
 * that don't support the media query. The `typeof window` guard isn't for real browsers (which
 * always have one) - it's so this constant, which every scene ultimately depends on via
 * constants.ts, doesn't crash the test suite's plain-Node test files (no `window` global there)
 * the moment they import anything scene-related; falls back to "not touch" rather than throwing. */
export const IS_TOUCH_DEVICE =
  typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0);
