import type { StatAllocation } from "../../game/systems/PlayerProgression";
import { bonusesFromAllocation, totalAtk, totalDef, totalStatPoints, unspentPoints } from "../../game/systems/PlayerProgression";
import { isAutoEquipEnabled, setAutoEquipEnabled } from "../../game/systems/Settings";
import { button, createModal, el, THEME, type Modal } from "./domHelpers";

/** DOM port of OptionsScene.ts - same single auto-equip toggle, same Settings.ts storage, so a
 * change made from either the 2D or 3D options screen applies to both (it's a page-level
 * preference, not per-save). */
export function showOptions3D(root: HTMLElement): Modal {
  const modal = createModal(root, 420, "Options");

  const row = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" });
  const label = el("div", {}, "Auto-equip better gear");
  const toggle = button("", () => {
    setAutoEquipEnabled(!isAutoEquipEnabled());
    refresh();
  });
  row.append(label, toggle);
  modal.panel.appendChild(row);
  modal.panel.appendChild(
    el("div", { fontSize: "12px", color: THEME.dim, marginBottom: "16px" }, "Weapons and armor only - never accessories."),
  );
  modal.panel.appendChild(button("Back", () => modal.close(), { textAlign: "center", width: "100%" }));

  function refresh(): void {
    const enabled = isAutoEquipEnabled();
    toggle.textContent = enabled ? "ON" : "OFF";
    toggle.style.color = enabled ? "#4cd964" : THEME.faint;
  }
  refresh();

  return modal;
}

export interface PauseData {
  statAllocation: StatAllocation;
  weaponDamage: number | undefined;
  armorDefense: number | undefined;
  accessoryDefense: number | undefined;
  maxHp: number;
  highestLevelReached: number;
}

export interface PauseCallbacks {
  getData: () => PauseData;
  onSpend: (stat: keyof StatAllocation) => void;
  onResume: () => void;
  onTutorial: () => void;
  onQuit: () => void;
}

/** Pause menu, DOM port of PauseScene.ts - same ATK/DEF/HP totals (via the same totalAtk/totalDef
 * helpers the HUD and combat math use, so nothing here can drift out of sync with 2D), same
 * per-stat +buttons spending PlayerProgression's earned points. */
export class PauseMenu3D {
  private modal: Modal | null = null;
  private atkLine!: HTMLDivElement;
  private defLine!: HTMLDivElement;
  private hpLine!: HTMLDivElement;
  private pointsLine!: HTMLDivElement;
  private statButtons: HTMLButtonElement[] = [];

  private readonly root: HTMLElement;
  private readonly callbacks: PauseCallbacks;

  constructor(root: HTMLElement, callbacks: PauseCallbacks) {
    this.root = root;
    this.callbacks = callbacks;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  show(): void {
    this.close();
    this.modal = createModal(this.root, 380, "Paused");
    this.statButtons = [];

    const statRow = (label: string, stat: keyof StatAllocation): HTMLDivElement => {
      const row = el("div", { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" });
      const line = el("div", {}, label);
      const btn = button("[ + ]", () => {
        this.callbacks.onSpend(stat);
        this.refresh();
      });
      this.statButtons.push(btn);
      row.append(line, btn);
      this.modal!.panel.appendChild(row);
      return line;
    };

    this.modal.panel.appendChild(el("div", { color: THEME.dim, marginBottom: "6px" }, "Stats"));
    this.atkLine = statRow("", "atk");
    this.defLine = statRow("", "def");
    this.hpLine = statRow("", "hp");
    this.pointsLine = el("div", { color: THEME.dim, marginBottom: "16px" });
    this.modal.panel.appendChild(this.pointsLine);

    const actions = el("div", { display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" });
    actions.append(
      button("Resume", () => this.callbacks.onResume(), { textAlign: "center", color: THEME.text }),
      button("How to Play", () => this.callbacks.onTutorial(), { textAlign: "center", color: THEME.text }),
      button("Quit to Menu", () => this.callbacks.onQuit(), { textAlign: "center", color: THEME.text }),
    );
    this.modal.panel.appendChild(actions);

    this.refresh();
  }

  refresh(): void {
    if (!this.modal) return;
    const data = this.callbacks.getData();
    const bonuses = bonusesFromAllocation(data.statAllocation);

    this.atkLine.textContent = `ATK: ${totalAtk(data.weaponDamage, data.statAllocation)}  (+${data.statAllocation.atk} from points)`;
    this.defLine.textContent = `DEF: ${totalDef(data.armorDefense, data.accessoryDefense, data.statAllocation)}  (+${data.statAllocation.def} from points)`;
    this.hpLine.textContent = `Max HP: ${data.maxHp}  (+${bonuses.bonusHp} from points)`;

    const remaining = unspentPoints(data.highestLevelReached, data.statAllocation);
    this.pointsLine.textContent = `Unspent points: ${remaining} of ${totalStatPoints(data.highestLevelReached)} earned`;
    for (const btn of this.statButtons) btn.style.color = remaining > 0 ? THEME.accent : "#3a3a44";
  }

  close(): void {
    this.modal?.close();
    this.modal = null;
  }
}

const TUTORIAL_LINES = [
  "Move: Arrow keys or WASD",
  "Attack: Space (aims at your last move direction)",
  "Equipment: I - pick a weapon, armor, and accessory",
  "Pause / this menu: ESC",
  "",
  "Colored doors need their matching key, dropped somewhere",
  "else on the level - step into a locked door while holding",
  "its key to open it.",
  "",
  "Some locked doors guard a small vault with a bonus chest -",
  "worth the detour for the better odds at rare loot.",
  "",
  "Defeat the boss guarding the exit for its key, then carry",
  "it to the exit door to finish the level.",
  "",
  "Finishing a level earns one stat point - spend it on ATK,",
  "DEF, or HP from the pause menu whenever you like.",
  "",
  "Dying sends you back to level 1 at full health, but your",
  "gear, gold, and stat points are never lost.",
].join("\n");

/** DOM port of TutorialScene.ts - same copy, same "Got it" dismissal. */
export function showTutorial3D(root: HTMLElement): Modal {
  const modal = createModal(root, 460, "How to Play");
  modal.panel.appendChild(el("div", { whiteSpace: "pre-line", fontSize: "13px", color: "#d0d0da", marginBottom: "16px" }, TUTORIAL_LINES));
  modal.panel.appendChild(button("Got it", () => modal.close(), { textAlign: "center", width: "100%" }));
  return modal;
}

/** DOM port of GameOverScene.ts - same "died on level N, press Space to try again" flow. */
export function showGameOver3D(root: HTMLElement, levelNumber: number, onContinue: () => void): Modal {
  const modal = createModal(root, 420, "");
  modal.panel.style.borderTopColor = "#ff6b6b";
  modal.panel.appendChild(el("div", { fontSize: "24px", color: "#ff6b6b", textAlign: "center", marginBottom: "12px" }, `You died on level ${levelNumber}`));
  modal.panel.appendChild(el("div", { fontSize: "14px", color: THEME.text, textAlign: "center" }, "Press SPACE to try again"));

  const onKey = (e: KeyboardEvent) => {
    if (e.code !== "Space") return;
    window.removeEventListener("keydown", onKey);
    modal.close();
    onContinue();
  };
  window.addEventListener("keydown", onKey);
  return modal;
}
