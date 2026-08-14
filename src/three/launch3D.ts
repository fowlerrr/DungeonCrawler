import { Game3D } from "./Game3D";
import { MenuScreen3D } from "./MenuScreen3D";

let game3D: Game3D | null = null;
let menu3D: MenuScreen3D | null = null;

/** Whether 3D mode currently owns the screen (menu or an in-progress game) - guards launch3D
 * against being entered twice. */
export function isThreeDActive(): boolean {
  return game3D !== null || menu3D !== null;
}

/** Entry point into 3D mode - shows MenuScreen3D first (mirroring the 2D game always landing on
 * MenuScene before any level exists), and only constructs Game3D once the player actually picks
 * New Game/Continue. `onBackTo2D` is called only from the menu's own "2D" mode-selector label -
 * the caller (MenuScene.ts, via a dynamic import so this module never has to import anything from
 * the Phaser side) is responsible for rebooting Phaser in response. Game3D's pause-menu "Quit to
 * Menu" returns to MenuScreen3D instead (see startGame below), staying in 3D mode rather than
 * bouncing back out to the 2D menu. */
export function launch3D(container: HTMLElement, onBackTo2D: () => void): void {
  if (isThreeDActive()) return;
  showMenu();

  function showMenu(): void {
    menu3D = new MenuScreen3D(container, {
      onStart: (fresh) => {
        menu3D?.dispose();
        menu3D = null;
        startGame(fresh);
      },
      onBackTo2D: () => {
        menu3D?.dispose();
        menu3D = null;
        onBackTo2D();
      },
    });
  }

  function startGame(fresh: boolean): void {
    game3D = new Game3D(container);
    game3D.onQuitToMenu = () => {
      game3D?.dispose();
      game3D = null;
      showMenu();
    };
    game3D.start(fresh);
    // Handy for poking at 3D game state from the browser console during development, mirroring
    // bootPhaser.ts's window.game for the 2D side.
    if (import.meta.env.DEV) {
      (window as unknown as { game3D: Game3D }).game3D = game3D;
    }
  }
}

/** Tears down whatever part of 3D mode is currently showing (menu or an in-progress game) -
 * used defensively so a stray re-entry into 3D mode never ends up with two instances running. */
export function disposeThreeD(): void {
  menu3D?.dispose();
  menu3D = null;
  game3D?.dispose();
  game3D = null;
}
