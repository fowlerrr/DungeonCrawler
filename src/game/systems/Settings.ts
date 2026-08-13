const AUTO_EQUIP_KEY = "dungeoncrawler:autoEquipEnabled";

/**
 * A global page-level preference, not per-save progress - stored under its own localStorage key
 * rather than folded into PlayerProfile/SaveManager, the same pattern MenuScene's tutorial-seen
 * flag already uses. Defaults on: auto-equipping a strict upgrade is the behavior most players
 * want without having to discover a toggle for it first.
 */
export function isAutoEquipEnabled(): boolean {
  return localStorage.getItem(AUTO_EQUIP_KEY) !== "0";
}

/** Persists the auto-equip preference for future sessions. */
export function setAutoEquipEnabled(enabled: boolean): void {
  localStorage.setItem(AUTO_EQUIP_KEY, enabled ? "1" : "0");
}
