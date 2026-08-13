import Phaser from "phaser";
import {
  BOSS_GOLD_DROP,
  GAME_HEIGHT,
  HEALTH_PICKUP_HEAL,
  MAZE_VIEW_WIDTH,
  MONSTER_CONTACT_DAMAGE_COOLDOWN_MS,
  MONSTER_GOLD_DROP,
  MONSTER_OCCUPANCY_RADIUS,
  PLAYER_ATTACK_COOLDOWN_MS,
  PLAYER_ATTACK_CONE_HALF_ANGLE_DEG,
  PLAYER_ATTACK_RANGE,
  PLAYER_BASE_HP,
  SCENE_KEYS,
  TILE_SIZE,
  VISION_RADIUS_TILES,
} from "../../config/constants";
import { IS_TOUCH_DEVICE } from "../../config/device";
import { ALL_ITEMS } from "../../game/data/items";
import { BOSS, getSpawnableMonsters } from "../../game/data/monsters";
import type { ItemDef } from "../../game/data/types";
import {
  applyDamage,
  canAttack,
  canBeHit,
  heal,
  mitigateDamage,
  selectAttackTargets,
  selectNearestTarget,
} from "../../game/entities/Combat";
import { findBlockingDoorAt } from "../../game/entities/doors";
import { isTileOccupiedByMonster } from "../../game/entities/occupancy";
import { Player } from "../../game/entities/Player";
import { generateLevel } from "../../game/maze/level";
import { hasLineOfSight, raycastDistance } from "../../game/maze/lineOfSight";
import { isTilePassable } from "../../game/maze/passability";
import { pickRandomCells } from "../../game/maze/placement";
import { Rng } from "../../game/maze/rng";
import { cellCenterPx, cellToTile, edgeConnectorTile, pxToTile, tileCenterPx } from "../../game/maze/raster";
import { cellKey, type TileGrid } from "../../game/maze/types";
import { FogOfWar } from "../../game/systems/FogOfWar";
import { Inventory } from "../../game/systems/Inventory";
import { Keyring, type KeyLabel } from "../../game/systems/Keyring";
import { getLevelConfig, type LevelConfig } from "../../game/systems/LevelConfig";
import { boostForVault, rollLoot } from "../../game/systems/LootTable";
import {
  allocatePoint,
  bonusesFromAllocation,
  EMPTY_ALLOCATION,
  HP_PER_POINT,
  totalAtk,
  totalDef,
  type StatAllocation,
} from "../../game/systems/PlayerProgression";
import { applyProfile, buildProfile, LocalStorageSaveManager, type SaveManager } from "../../game/systems/SaveManager";
import { isAutoEquipEnabled } from "../../game/systems/Settings";
import { DIRECTION_VECTORS } from "../../game/util/direction";
import { InputController } from "../input/InputController";
import { TouchControls } from "../input/TouchControls";
import { spawnAttackSwipe } from "../objects/AttackSwipe";
import { ChestSprite } from "../objects/ChestSprite";
import { DoorSprite } from "../objects/DoorSprite";
import { HealthPickupSprite } from "../objects/HealthPickupSprite";
import { KeyPickupSprite } from "../objects/KeyPickupSprite";
import { spawnLootPopup } from "../objects/LootPopup";
import { MonsterSprite } from "../objects/MonsterSprite";
import { PlayerSprite } from "../objects/PlayerSprite";
import { spawnProjectile } from "../objects/Projectile";
import { FogOfWarRenderer } from "../render/FogOfWarRenderer";
import { renderMaze } from "../render/MazeRenderer";

const EXIT_KEY_ID = "exit";

/** The main gameplay scene - owns the maze, player, monsters, loot, and level lifecycle for the
 * 2D client. UIScene runs alongside it (reading this scene's public fields each frame) rather
 * than being merged into it, so the always-on sidebar HUD can't be accidentally paused along
 * with gameplay. */
export class GameScene extends Phaser.Scene {
  // Read by UIScene each frame - deliberately public, this scene owns the data, UIScene just renders it.
  mazeGrid: TileGrid | undefined;
  fogOfWar: FogOfWar | undefined;
  playerSprite: PlayerSprite | undefined;
  /** Permanent across levels (unlike keyring/monsters/etc, never reset in buildLevel). */
  inventory!: Inventory;
  levelNumber = 1;
  /** Persists across level resets (death) unlike levelNumber - only ever increases. */
  highestLevelReached = 1;
  /** How the player has spent their earned stat points (one per level completed) - see
   * PlayerProgression. Persists across deaths and level resets, same as highestLevelReached. */
  statAllocation: StatAllocation = EMPTY_ALLOCATION;

  private inputController!: InputController;
  private fogRenderer!: FogOfWarRenderer;
  private keyring!: Keyring;
  private saveManager!: SaveManager;
  private levelConfig!: LevelConfig;
  /** Seeded per level (see buildLevel) so health-drop rolls stay reproducible for a given seed,
   * same as the monster/chest placement RNGs. */
  private dropRng!: Rng;
  private monsterSprites: MonsterSprite[] = [];
  /** Maze lock doors only (never the exit door, which never blocks movement) - consulted by
   * isTilePassable so grid movement can't step through a still-locked door. */
  private blockingDoors: DoorSprite[] = [];
  private healthPickupsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private pendingLevelComplete = false;
  /** A full-viewport red overlay, briefly flashed on taking damage (see flashDamage) - a sprite
   * tint alone can be easy to miss since the player is a small icon that's often partly obscured
   * by nearby monsters; a full-screen flash reads unmistakably regardless of where on screen the
   * hit actually happened. */
  private damageFlash!: Phaser.GameObjects.Rectangle;
  /** On-screen d-pad + attack button, only created on touch devices (see IS_TOUCH_DEVICE) - null
   * on desktop, where keyboard already covers everything. Recreated each time create() runs
   * (see create()) since it's bound to that specific run's InputController instance. */
  private touchControls: TouchControls | null = null;
  /** Stable bound references (not inline arrow functions) so create() can `.off()` the exact
   * listener it previously added before re-adding it - see create()'s comment for why that
   * matters. Declared as fields rather than methods so `this` is already bound. */
  private readonly hideTouchControls = () => this.touchControls?.hide();
  private readonly showTouchControls = () => this.touchControls?.show();

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  /** `fresh: true` (from MenuScene's New Game button) wipes any existing save and starts
   * clean; omitted or false (Continue, or GameScene started with no data at all) resumes it. */
  create(data: { fresh?: boolean } = {}): void {
    this.inputController = new InputController(this);
    // Rebuilt from scratch alongside inputController rather than reused, since its button
    // handlers close over that specific instance - a stale TouchControls left over from an
    // earlier create() run (e.g. a prior "New Game" this page load) would feed touches into an
    // InputController this scene no longer reads from.
    this.touchControls?.destroy();
    this.touchControls = IS_TOUCH_DEVICE ? new TouchControls(document.body, this.inputController) : null;
    // `this.events` doesn't exist yet at constructor time (Phaser wires up scene systems after
    // construction), so this has to live here instead - and since create() reruns every "New
    // Game"/"Continue" over the life of the page (this Scene instance is reused, not
    // reconstructed), off() before on() keeps exactly one of each listener registered rather
    // than piling up a duplicate on every replay.
    this.events.off(Phaser.Scenes.Events.PAUSE, this.hideTouchControls).on(Phaser.Scenes.Events.PAUSE, this.hideTouchControls);
    this.events.off(Phaser.Scenes.Events.RESUME, this.showTouchControls).on(Phaser.Scenes.Events.RESUME, this.showTouchControls);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.hideTouchControls).on(Phaser.Scenes.Events.SHUTDOWN, this.hideTouchControls);

    this.inventory = new Inventory();
    this.saveManager = new LocalStorageSaveManager();
    this.levelNumber = 1;
    this.highestLevelReached = 1;
    this.statAllocation = EMPTY_ALLOCATION;
    this.cameras.main.setViewport(0, 0, MAZE_VIEW_WIDTH, this.scale.height);

    if (data.fresh) {
      this.saveManager.clear();
    } else {
      const savedProfile = this.saveManager.load();
      if (savedProfile) {
        applyProfile(this.inventory, savedProfile);
        this.levelNumber = savedProfile.levelNumber;
        // Older saves predate these fields - fall back sensibly so nothing's lost or crashes.
        this.highestLevelReached = savedProfile.highestLevelReached ?? savedProfile.levelNumber;
        this.statAllocation = savedProfile.statAllocation ?? EMPTY_ALLOCATION;
      }
    }

    this.buildLevel(Date.now());

    // Checks actual scene-manager state rather than a separately-tracked flag - GameScene is a
    // persistent singleton reused across playthroughs in one page load (Phaser scenes aren't
    // reconstructed on scene.start), so a plain boolean here would go stale the moment something
    // like PauseScene's quit-to-menu explicitly stops UIScene: the flag would still say "already
    // launched" and the HUD would never come back on the next game.
    if (!this.scene.isActive(SCENE_KEYS.UI)) {
      this.scene.launch(SCENE_KEYS.UI);
    }

    // Debug: press R to regenerate with a fresh seed, to sanity-check maze variety.
    this.input.keyboard?.on("keydown-R", () => {
      this.buildLevel(Date.now());
    });

    this.input.keyboard?.on("keydown-ESC", () => this.openPauseMenu());
  }

  /** Opens the pause menu - called from the ESC key above and from UIScene's pause button.
   * Guarded against re-entry so ESC while the inventory panel (which already pauses GameScene)
   * or the pause menu itself is open doesn't stack pauses. */
  openPauseMenu(): void {
    if (this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.launch(SCENE_KEYS.PAUSE);
  }

  /** Called by PauseScene before quitting to the menu, so anything changed since the last
   * auto-save (e.g. gold from a kill with no chest opened since) isn't lost. */
  persistNow(): void {
    this.persist();
  }

  /** Called by PauseScene when the player spends a stat point - persists immediately, and for
   * HP specifically also grows the current run's max/current HP right away rather than waiting
   * for the next level rebuild to pick it up. */
  allocateStatPoint(stat: keyof StatAllocation): void {
    const next = allocatePoint(this.highestLevelReached, this.statAllocation, stat);
    if (next === this.statAllocation) return;
    this.statAllocation = next;
    if (stat === "hp" && this.playerSprite) {
      this.playerSprite.logic.maxHp += HP_PER_POINT;
      this.playerSprite.logic.hp += HP_PER_POINT;
    }
    this.persist();
  }

  /** Runs every frame: handles a pending level transition, checks for player death, reads
   * movement/attack input, and steps every monster. */
  update(_time: number, delta: number): void {
    if (this.pendingLevelComplete) {
      this.pendingLevelComplete = false;
      this.completeLevel();
      return;
    }
    if (!this.playerSprite || !this.fogOfWar) return;

    if (this.playerSprite.logic.hp <= 0) {
      this.scene.pause();
      this.scene.launch(SCENE_KEYS.GAME_OVER, { levelNumber: this.levelNumber });
      return;
    }

    const direction = this.inputController.getDiscreteDirection();
    if (direction) {
      const speedMultiplier = this.inventory.equipped.accessory?.stats.speedMult ?? 1;
      this.playerSprite.tryStep(DIRECTION_VECTORS[direction], (tx, ty) => this.isTilePassable(tx, ty), speedMultiplier, () =>
        this.onPlayerArriveTile(),
      );
    }

    for (const monster of this.monsterSprites) {
      monster.step(this.playerSprite.x, this.playerSprite.y, delta);
      const { tx, ty } = pxToTile(monster.x, monster.y);
      monster.setFogVisible(this.fogOfWar.isVisible(tx, ty));
    }
    this.monsterSprites = this.monsterSprites.filter((m) => m.active);

    if (this.inputController.isAttackDown()) {
      this.tryPlayerAttack();
    }
  }

  /** Whether the player can step onto this tile: opens (and consumes the key for) a locked door
   * they're holding the key to, then checks the tile itself is floor and not blocked by a still-
   * locked door or another monster standing on it. */
  private isTilePassable(tx: number, ty: number): boolean {
    if (!this.mazeGrid) return false;

    const blockingDoor = findBlockingDoorAt(this.blockingDoors, tx, ty);
    if (blockingDoor && this.keyring.has(blockingDoor.doorId)) {
      this.keyring.consume(blockingDoor.doorId);
      blockingDoor.open();
    }

    const blockedTiles = new Set(
      this.blockingDoors.filter((door) => door.active).map((door) => `${door.tileX},${door.tileY}`),
    );
    if (!isTilePassable(this.mazeGrid, tx, ty, blockedTiles)) return false;

    const { x, y } = tileCenterPx(tx, ty);
    return !isTileOccupiedByMonster(x, y, this.monsterSprites, MONSTER_OCCUPANCY_RADIUS);
  }

  /** Called once the player finishes stepping onto a new tile - recomputes fog-of-war vision
   * from their new position and repaints the fog overlay. */
  private onPlayerArriveTile(): void {
    this.fogOfWar!.update(this.playerSprite!.tileX, this.playerSprite!.tileY, VISION_RADIUS_TILES);
    this.fogRenderer.redraw(this.fogOfWar!);
  }

  /** Attempts a player attack this frame: enforces the weapon's cooldown, finds valid targets
   * (in range, in the facing cone, and with line of sight), plays the matching swing/projectile
   * visual, and applies damage - killing a monster drops its gold and, for the boss, the exit key. */
  private tryPlayerAttack(): void {
    const playerSprite = this.playerSprite!;
    const player = playerSprite.logic;
    const weapon = this.inventory.equipped.weapon;
    const cooldownMs = weapon?.stats.cooldownMs ?? PLAYER_ATTACK_COOLDOWN_MS;
    const range = weapon?.stats.range ?? PLAYER_ATTACK_RANGE;
    const damage = totalAtk(weapon?.stats.damage, this.statAllocation);

    const now = this.time.now;
    if (!canAttack(player, now, cooldownMs)) return;
    player.lastAttackAt = now;

    // Range alone isn't enough for a ranged weapon - a wall between attacker and target blocks
    // the hit exactly like it blocks movement, so a bow can't shoot through the maze.
    const candidates = selectAttackTargets(
      playerSprite,
      playerSprite.facing,
      range,
      PLAYER_ATTACK_CONE_HALF_ANGLE_DEG,
      this.monsterSprites,
    ).filter((monster) => hasLineOfSight(this.mazeGrid!, playerSprite.x, playerSprite.y, monster.x, monster.y));

    // A melee swing can hit everything in its cone, but a ranged weapon fires a single
    // projectile that stops at whatever it hits first - it shouldn't pierce through the nearest
    // monster to also damage whatever's standing behind it.
    const nearest = selectNearestTarget(playerSprite, candidates);
    const targets = weapon?.stats.ranged ? (nearest ? [nearest] : []) : candidates;

    if (weapon?.stats.ranged) {
      // Fires all the way to whatever it hit, or out to the weapon's full range along the facing
      // direction if nothing was there - but no further than the nearest wall in that direction
      // (raycastDistance), so a miss's projectile visibly stops at the wall it would actually hit
      // instead of flying straight through it out to the weapon's raw range.
      const missDistance = raycastDistance(this.mazeGrid!, playerSprite.x, playerSprite.y, playerSprite.facing.x, playerSprite.facing.y, range);
      const dest = nearest
        ? { x: nearest.x, y: nearest.y }
        : { x: playerSprite.x + playerSprite.facing.x * missDistance, y: playerSprite.y + playerSprite.facing.y * missDistance };
      spawnProjectile(this, playerSprite.x, playerSprite.y, dest, weapon.stats.art);
    } else {
      spawnAttackSwipe(this, playerSprite.x, playerSprite.y, playerSprite.facing, weapon?.stats.art);
    }

    for (const monster of targets) {
      applyDamage(monster.logic, damage);
      monster.updateHealthBar();
      if (monster.logic.isDead) {
        if (monster.def.isBoss) {
          this.inventory.gold += BOSS_GOLD_DROP;
          this.spawnExitKey(monster.x, monster.y);
        } else {
          this.inventory.gold += MONSTER_GOLD_DROP;
          if (this.dropRng.next() < this.levelConfig.healthDropChance) {
            this.spawnHealthPickup(monster.x, monster.y);
          }
        }
        monster.die();
      } else {
        monster.flashHit();
      }
    }
  }

  /** Writes the current inventory/level/stat-allocation state to localStorage. */
  private persist(): void {
    this.saveManager.save(buildProfile(this.inventory, this.levelNumber, this.highestLevelReached, this.statAllocation));
  }

  /** Called by UIScene's inventory panel - equips the given (already-owned) item and persists
   * immediately, same as any other equipment change. */
  equipItem(item: ItemDef): void {
    this.inventory.equip(item);
    this.persist();
  }

  /** Read by UIScene each frame to show which keys are currently held. */
  heldKeyLabels(): KeyLabel[] {
    return this.keyring.heldLabels();
  }

  /** Every still-locked door, for the minimap - opened doors drop out automatically since
   * `active` goes false the moment DoorSprite.open() destroys the sprite. */
  activeLockedDoors(): { tileX: number; tileY: number; color: string }[] {
    return this.blockingDoors.filter((door) => door.active).map((door) => ({ tileX: door.tileX, tileY: door.tileY, color: door.color }));
  }

  /** Drops a health pickup at a killed monster's position (see LevelConfig's healthDropChance). */
  private spawnHealthPickup(x: number, y: number): void {
    const pickup = new HealthPickupSprite(this, x, y, HEALTH_PICKUP_HEAL);
    this.healthPickupsGroup.add(pickup);
  }

  /** Drops the exit key at the boss's death position, and wires it up so touching it adds the
   * key to the keyring. */
  private spawnExitKey(x: number, y: number): void {
    const keySprite = new KeyPickupSprite(this, x, y, EXIT_KEY_ID, "exit", "key_exit");
    this.physics.add.overlap(this.playerSprite!, keySprite, () => {
      this.keyring.collect(EXIT_KEY_ID, "exit");
      keySprite.destroy();
    });
  }

  /** Advances to the next level: bumps the level counter (and highestLevelReached), saves, and
   * rebuilds the maze from a fresh seed. */
  private completeLevel(): void {
    this.levelNumber += 1;
    this.highestLevelReached = Math.max(this.highestLevelReached, this.levelNumber);
    this.persist();
    this.buildLevel(Date.now());
  }

  /** Called by GameOverScene once the player continues - drops back to level 1 with a fresh
   * (full-health) player. Equipment/gold carry over untouched since only buildLevel (level-scoped
   * state) reruns; highestLevelReached is deliberately not reset. */
  restartAfterDeath(): void {
    this.levelNumber = 1;
    this.persist();
    this.buildLevel(Date.now());
  }

  /** Tears down and rebuilds everything level-scoped from a seed: generates the maze, places the
   * player/doors/keys/monsters/chests/exit, and wires up all the physics overlaps/colliders
   * between them. Called for a brand new level, a death restart, and the debug "R" regenerate
   * key - all of which need the exact same rebuild, just with a different seed and/or
   * levelNumber already set beforehand. */
  private buildLevel(seed: number): void {
    this.children.removeAll(true);
    this.keyring = new Keyring();
    this.monsterSprites = [];
    this.blockingDoors = [];

    const config = getLevelConfig(this.levelNumber);
    this.levelConfig = config;
    this.dropRng = new Rng(seed + 2718);
    const level = generateLevel(seed, {
      cols: config.mazeCols,
      rows: config.mazeRows,
      braidFactor: config.braidFactor,
      lockCount: config.lockCount,
    });
    this.mazeGrid = level.grid;

    const maze = renderMaze(this, level.grid);

    this.cameras.main.setBounds(0, 0, maze.widthPx, maze.heightPx);
    this.physics.world.setBounds(0, 0, maze.widthPx, maze.heightPx);

    const entranceTile = cellToTile(level.entrance);
    const player = new Player(PLAYER_BASE_HP + bonusesFromAllocation(this.statAllocation).bonusHp);
    this.playerSprite = new PlayerSprite(this, entranceTile.tx, entranceTile.ty, player);

    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);

    const doorsGroup = this.physics.add.staticGroup();
    for (const door of level.doors) {
      const { tx, ty } = edgeConnectorTile(door.a, door.b);
      const { x, y } = tileCenterPx(tx, ty);
      const doorSprite = new DoorSprite(this, x, y, tx, ty, door.id, door.color, `door_${door.color}`);
      doorsGroup.add(doorSprite);
      this.blockingDoors.push(doorSprite);
    }

    const keysGroup = this.physics.add.staticGroup();
    for (const key of level.keys) {
      const { x, y } = cellCenterPx(key.cell);
      const keySprite = new KeyPickupSprite(this, x, y, key.doorId, key.color, `key_${key.color}`);
      keysGroup.add(keySprite);
    }

    // Door unlocking itself happens in isTilePassable (a locked door tile is only ever reached
    // via a tile-step attempt, never a physics overlap - see findBlockingDoorAt).
    this.physics.add.overlap(this.playerSprite, keysGroup, (_player, keyObj) => {
      const key = keyObj as KeyPickupSprite;
      this.keyring.collect(key.doorId, key.label);
      key.destroy();
    });

    this.healthPickupsGroup = this.physics.add.staticGroup();
    this.physics.add.overlap(this.playerSprite, this.healthPickupsGroup, (_player, pickupObj) => {
      const pickup = pickupObj as HealthPickupSprite;
      heal(this.playerSprite!.logic, pickup.healAmount);
      pickup.destroy();
    });

    const excludedCells = new Set<string>([cellKey(level.entrance), cellKey(level.exit), cellKey(level.bossCell)]);
    for (const key of level.keys) excludedCells.add(cellKey(key.cell));
    // Vault cells get their own dedicated chest below and stay monster-free - they're meant to
    // read as a small reward room behind the door, not part of the general spawn pool.
    for (const vault of level.vaults) for (const cell of vault.cells) excludedCells.add(cellKey(cell));

    const monsterRng = new Rng(seed + 777);
    const monsterCells = pickRandomCells(config.mazeCols, config.mazeRows, config.monsterCount, monsterRng, excludedCells);
    for (const cell of monsterCells) excludedCells.add(cellKey(cell));
    const spawnableMonsters = getSpawnableMonsters(this.levelNumber);
    const monsterGroup = this.physics.add.group();
    for (const cell of monsterCells) {
      const def = monsterRng.pick(spawnableMonsters);
      const { x, y } = cellCenterPx(cell);
      const monster = new MonsterSprite(this, x, y, def, config.monsterHpMult, config.monsterDamageMult);
      this.monsterSprites.push(monster);
      monsterGroup.add(monster);
    }

    const bossSpawn = cellCenterPx(level.bossCell);
    const boss = new MonsterSprite(this, bossSpawn.x, bossSpawn.y, BOSS, config.bossHpMult, config.bossDamageMult);
    this.monsterSprites.push(boss);
    monsterGroup.add(boss);

    // Overlap is registered BEFORE the collider below, so contact damage is detected against
    // the true overlap each step before the collider's separation (which happens the same
    // step) can resolve it away - otherwise a monster that fully overlaps the player in one
    // step would get pushed off before the damage check ever saw the contact.
    this.physics.add.overlap(this.playerSprite, monsterGroup, (_player, monsterObj) => {
      const monster = monsterObj as MonsterSprite;
      if (monster.logic.isDead) return;
      const player = this.playerSprite!.logic;
      if (!canBeHit(player, this.time.now, MONSTER_CONTACT_DAMAGE_COOLDOWN_MS)) return;
      player.lastHitAt = this.time.now;
      const defense = totalDef(this.inventory.equipped.armor?.stats.defense, this.inventory.equipped.accessory?.stats.defense, this.statAllocation);
      applyDamage(player, mitigateDamage(monster.logic.damage, defense));
      this.flashDamage();
    });
    // The player's body is non-pushable (see PlayerSprite), so this collider stops monsters
    // from walking onto/through the player without ever displacing the player themselves.
    this.physics.add.collider(this.playerSprite, monsterGroup);
    // Wall/door colliders are registered LAST (after the player-monster collider above), so
    // they get final say each step: if pushing a monster off the player would shove it into a
    // wall, this correction runs afterward, in the same step, and pulls it back out before
    // anything is rendered - otherwise a monster pinned against a wall could get shoved
    // straight through it, since the wall check would already be done for that frame.
    this.physics.add.collider(monsterGroup, maze.wallGroup);
    this.physics.add.collider(monsterGroup, doorsGroup);

    const chestRng = new Rng(seed + 1337);
    const chestCells = pickRandomCells(config.mazeCols, config.mazeRows, config.chestCount, chestRng, excludedCells);
    const chestGroup = this.physics.add.staticGroup();
    for (const cell of chestCells) {
      const { x, y } = cellCenterPx(cell);
      chestGroup.add(new ChestSprite(this, x, y));
    }
    for (const vault of level.vaults) {
      const { x, y } = cellCenterPx(vault.cells[0]);
      chestGroup.add(new ChestSprite(this, x, y, true));
    }
    this.physics.add.overlap(this.playerSprite, chestGroup, (_player, chestObj) => {
      const chest = chestObj as ChestSprite;
      const weightBonus = chest.isVault ? boostForVault(config.rarityWeightBonus) : config.rarityWeightBonus;
      const item = rollLoot(chestRng, ALL_ITEMS, weightBonus);
      if (item.kind === "consumable") {
        heal(this.playerSprite!.logic, item.stats.healAmount ?? 0);
      } else {
        this.inventory.addItem(item, isAutoEquipEnabled());
      }
      spawnLootPopup(this, chest.x, chest.y, item);
      chest.destroy();
      this.persist();
    });

    // The exit door sits one cell away from where the boss stood (see GeneratedLevel.bossCell)
    // - purely a trigger for the player (never blocks their movement) that ends the level once
    // they, having walked the key over from the boss, hold it here. Not added to blockingDoors
    // for that reason, but IS given a monster collider below - without one, the boss (which
    // chases the player with no other obstruction here) could wander onto this exact tile and
    // die there, dropping its key already overlapping the trigger and completing the level the
    // instant it's picked up instead of requiring an actual walk to the door.
    const exitSpawn = cellCenterPx(level.exit);
    const exitTile = cellToTile(level.exit);
    const exitDoor = new DoorSprite(this, exitSpawn.x, exitSpawn.y, exitTile.tx, exitTile.ty, EXIT_KEY_ID, "exit", "door_exit");
    this.physics.add.collider(monsterGroup, exitDoor);
    this.physics.add.overlap(this.playerSprite, exitDoor, () => {
      if (this.keyring.has(EXIT_KEY_ID)) {
        // Defer to next update() rather than tearing the scene down mid physics-step.
        this.pendingLevelComplete = true;
      }
    });

    // A plain colored door reads as just another lock door at a glance (worse still once real
    // art is loaded, since every door - lock or exit - uses the same door image). A floating,
    // gently pulsing label is the clearest way to make "this one's the exit" unmistakable
    // without needing a whole separate art asset.
    const exitLabel = this.add
      .text(exitSpawn.x, exitSpawn.y - TILE_SIZE * 0.85, "EXIT", {
        fontFamily: "monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#f5d76e",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(90);
    this.tweens.add({
      targets: exitLabel,
      alpha: { from: 1, to: 0.5 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: Phaser.Math.Easing.Sine.InOut,
    });

    this.fogOfWar = new FogOfWar(level.grid[0].length, level.grid.length);
    this.fogRenderer = new FogOfWarRenderer(this);
    this.damageFlash = this.add
      .rectangle(0, 0, MAZE_VIEW_WIDTH, GAME_HEIGHT, 0xff2222, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(150);
    this.onPlayerArriveTile();
  }

  /** Briefly tints the whole maze viewport red - called whenever the player takes damage.
   * Restarts cleanly even if triggered again mid-flash (contact damage's own cooldown makes that
   * unlikely, but killing any in-flight tween first avoids two competing alpha animations). */
  private flashDamage(): void {
    this.tweens.killTweensOf(this.damageFlash);
    this.damageFlash.setAlpha(0.35);
    this.tweens.add({
      targets: this.damageFlash,
      alpha: 0,
      duration: 220,
      ease: Phaser.Math.Easing.Cubic.Out,
    });
  }
}
