import Phaser from "phaser";
import {
  BOSS_GOLD_DROP,
  HEALTH_PICKUP_HEAL,
  MAZE_VIEW_WIDTH,
  MONSTER_CONTACT_DAMAGE_COOLDOWN_MS,
  MONSTER_GOLD_DROP,
  MONSTER_OCCUPANCY_RADIUS,
  PLAYER_ATTACK_COOLDOWN_MS,
  PLAYER_ATTACK_CONE_HALF_ANGLE_DEG,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_RANGE,
  PLAYER_BASE_HP,
  SCENE_KEYS,
  VISION_RADIUS_TILES,
} from "../../config/constants";
import { ALL_ITEMS } from "../../game/data/items";
import { BOSS, MONSTERS } from "../../game/data/monsters";
import { applyDamage, canAttack, canBeHit, heal, selectAttackTargets } from "../../game/entities/Combat";
import { isTileOccupiedByMonster } from "../../game/entities/occupancy";
import { Player } from "../../game/entities/Player";
import { generateLevel } from "../../game/maze/level";
import { isTilePassable } from "../../game/maze/passability";
import { pickRandomCells } from "../../game/maze/placement";
import { Rng } from "../../game/maze/rng";
import { cellCenterPx, cellToTile, edgeConnectorTile, tileCenterPx } from "../../game/maze/raster";
import { cellKey, type TileGrid } from "../../game/maze/types";
import { FogOfWar } from "../../game/systems/FogOfWar";
import { Inventory } from "../../game/systems/Inventory";
import { Keyring } from "../../game/systems/Keyring";
import { getLevelConfig } from "../../game/systems/LevelConfig";
import { rollLoot } from "../../game/systems/LootTable";
import { applyProfile, buildProfile, LocalStorageSaveManager, type SaveManager } from "../../game/systems/SaveManager";
import { DIRECTION_VECTORS } from "../../game/util/direction";
import { InputController } from "../input/InputController";
import { spawnAttackSwipe } from "../objects/AttackSwipe";
import { ChestSprite } from "../objects/ChestSprite";
import { DoorSprite } from "../objects/DoorSprite";
import { HealthPickupSprite } from "../objects/HealthPickupSprite";
import { KeyPickupSprite } from "../objects/KeyPickupSprite";
import { MonsterSprite } from "../objects/MonsterSprite";
import { PlayerSprite } from "../objects/PlayerSprite";
import { FogOfWarRenderer } from "../render/FogOfWarRenderer";
import { renderMaze } from "../render/MazeRenderer";

const EXIT_KEY_ID = "exit";

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

  private inputController!: InputController;
  private fogRenderer!: FogOfWarRenderer;
  private keyring!: Keyring;
  private saveManager!: SaveManager;
  private monsterSprites: MonsterSprite[] = [];
  /** Maze lock doors only (never the exit door, which never blocks movement) - consulted by
   * isTilePassable so grid movement can't step through a still-locked door. */
  private blockingDoors: DoorSprite[] = [];
  private healthPickupsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private uiLaunched = false;
  private pendingLevelComplete = false;

  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create(): void {
    this.inputController = new InputController(this);
    this.inventory = new Inventory();
    this.saveManager = new LocalStorageSaveManager();
    this.levelNumber = 1;
    this.cameras.main.setViewport(0, 0, MAZE_VIEW_WIDTH, this.scale.height);

    const savedProfile = this.saveManager.load();
    if (savedProfile) {
      applyProfile(this.inventory, savedProfile);
      this.levelNumber = savedProfile.levelNumber;
      // Older saves predate this field - fall back to the saved level so it's not lost.
      this.highestLevelReached = savedProfile.highestLevelReached ?? savedProfile.levelNumber;
    }

    this.buildLevel(Date.now());

    if (!this.uiLaunched) {
      this.scene.launch(SCENE_KEYS.UI);
      this.uiLaunched = true;
    }

    // Debug: press R to regenerate with a fresh seed, to sanity-check maze variety.
    this.input.keyboard?.on("keydown-R", () => {
      this.buildLevel(Date.now());
    });
  }

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
    }
    this.monsterSprites = this.monsterSprites.filter((m) => m.active);

    if (this.inputController.isAttackDown()) {
      this.tryPlayerAttack();
    }
  }

  private isTilePassable(tx: number, ty: number): boolean {
    if (!this.mazeGrid) return false;
    const blockedTiles = new Set(
      this.blockingDoors.filter((door) => door.active).map((door) => `${door.tileX},${door.tileY}`),
    );
    if (!isTilePassable(this.mazeGrid, tx, ty, blockedTiles)) return false;

    const { x, y } = tileCenterPx(tx, ty);
    return !isTileOccupiedByMonster(x, y, this.monsterSprites, MONSTER_OCCUPANCY_RADIUS);
  }

  private onPlayerArriveTile(): void {
    this.fogOfWar!.update(this.playerSprite!.tileX, this.playerSprite!.tileY, VISION_RADIUS_TILES);
    this.fogRenderer.redraw(this.fogOfWar!);
  }

  private tryPlayerAttack(): void {
    const playerSprite = this.playerSprite!;
    const player = playerSprite.logic;
    const weapon = this.inventory.equipped.weapon;
    const cooldownMs = weapon?.stats.cooldownMs ?? PLAYER_ATTACK_COOLDOWN_MS;
    const damage = weapon?.stats.damage ?? PLAYER_ATTACK_DAMAGE;

    const now = this.time.now;
    if (!canAttack(player, now, cooldownMs)) return;
    player.lastAttackAt = now;

    spawnAttackSwipe(this, playerSprite.x, playerSprite.y, playerSprite.facing);

    const targets = selectAttackTargets(
      playerSprite,
      playerSprite.facing,
      PLAYER_ATTACK_RANGE,
      PLAYER_ATTACK_CONE_HALF_ANGLE_DEG,
      this.monsterSprites,
    );
    for (const monster of targets) {
      applyDamage(monster.logic, damage);
      if (monster.logic.isDead) {
        if (monster.def.isBoss) {
          this.inventory.gold += BOSS_GOLD_DROP;
          this.spawnExitKey(monster.x, monster.y);
        } else {
          this.inventory.gold += MONSTER_GOLD_DROP;
          this.spawnHealthPickup(monster.x, monster.y);
        }
        monster.die();
      } else {
        monster.flashHit();
      }
    }
  }

  private persist(): void {
    this.saveManager.save(buildProfile(this.inventory, this.levelNumber, this.highestLevelReached));
  }

  private spawnHealthPickup(x: number, y: number): void {
    const pickup = new HealthPickupSprite(this, x, y, HEALTH_PICKUP_HEAL);
    this.healthPickupsGroup.add(pickup);
  }

  private spawnExitKey(x: number, y: number): void {
    const keySprite = new KeyPickupSprite(this, x, y, EXIT_KEY_ID, "key_exit");
    this.physics.add.overlap(this.playerSprite!, keySprite, () => {
      this.keyring.collect(EXIT_KEY_ID);
      keySprite.destroy();
    });
  }

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

  private buildLevel(seed: number): void {
    this.children.removeAll(true);
    this.keyring = new Keyring();
    this.monsterSprites = [];
    this.blockingDoors = [];

    const config = getLevelConfig(this.levelNumber);
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
    const player = new Player(PLAYER_BASE_HP);
    this.playerSprite = new PlayerSprite(this, entranceTile.tx, entranceTile.ty, player);

    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);

    const doorsGroup = this.physics.add.staticGroup();
    for (const door of level.doors) {
      const { tx, ty } = edgeConnectorTile(door.a, door.b);
      const { x, y } = tileCenterPx(tx, ty);
      const doorSprite = new DoorSprite(this, x, y, tx, ty, door.id, `door_${door.color}`);
      doorsGroup.add(doorSprite);
      this.blockingDoors.push(doorSprite);
    }

    const keysGroup = this.physics.add.staticGroup();
    for (const key of level.keys) {
      const { x, y } = cellCenterPx(key.cell);
      const keySprite = new KeyPickupSprite(this, x, y, key.doorId, `key_${key.color}`);
      keysGroup.add(keySprite);
    }

    this.physics.add.overlap(this.playerSprite, doorsGroup, (_player, doorObj) => {
      const door = doorObj as DoorSprite;
      if (this.keyring.has(door.doorId)) {
        this.keyring.consume(door.doorId);
        door.open();
      }
    });
    this.physics.add.overlap(this.playerSprite, keysGroup, (_player, keyObj) => {
      const key = keyObj as KeyPickupSprite;
      this.keyring.collect(key.doorId);
      key.destroy();
    });

    this.healthPickupsGroup = this.physics.add.staticGroup();
    this.physics.add.overlap(this.playerSprite, this.healthPickupsGroup, (_player, pickupObj) => {
      const pickup = pickupObj as HealthPickupSprite;
      heal(this.playerSprite!.logic, pickup.healAmount);
      pickup.destroy();
    });

    const excludedCells = new Set<string>([cellKey(level.entrance), cellKey(level.exit)]);
    for (const key of level.keys) excludedCells.add(cellKey(key.cell));

    const monsterRng = new Rng(seed + 777);
    const monsterCells = pickRandomCells(config.mazeCols, config.mazeRows, config.monsterCount, monsterRng, excludedCells);
    for (const cell of monsterCells) excludedCells.add(cellKey(cell));
    const monsterGroup = this.physics.add.group();
    for (const cell of monsterCells) {
      const def = monsterRng.pick(MONSTERS);
      const { x, y } = cellCenterPx(cell);
      const monster = new MonsterSprite(this, x, y, def, config.monsterHpMult, config.monsterDamageMult);
      this.monsterSprites.push(monster);
      monsterGroup.add(monster);
    }

    const bossSpawn = cellCenterPx(level.exit);
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
      applyDamage(player, monster.logic.damage);
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
    this.physics.add.overlap(this.playerSprite, chestGroup, (_player, chestObj) => {
      const chest = chestObj as ChestSprite;
      const item = rollLoot(chestRng, ALL_ITEMS, config.rarityWeightBonus);
      if (item.kind === "consumable") {
        heal(this.playerSprite!.logic, item.stats.healAmount ?? 0);
      } else {
        this.inventory.addItem(item);
      }
      chest.destroy();
      this.persist();
    });

    // The exit door sits right where the boss stood - purely a trigger (never blocks
    // movement, since the boss fight already happens on this cell) that ends the level once
    // the player holds the exit key the boss drops. Deliberately not added to
    // blockingDoors, and not colliding with monsters either.
    const exitTile = cellToTile(level.exit);
    const exitDoor = new DoorSprite(this, bossSpawn.x, bossSpawn.y, exitTile.tx, exitTile.ty, EXIT_KEY_ID, "door_exit");
    this.physics.add.overlap(this.playerSprite, exitDoor, () => {
      if (this.keyring.has(EXIT_KEY_ID)) {
        // Defer to next update() rather than tearing the scene down mid physics-step.
        this.pendingLevelComplete = true;
      }
    });

    this.fogOfWar = new FogOfWar(level.grid[0].length, level.grid.length);
    this.fogRenderer = new FogOfWarRenderer(this);
    this.onPlayerArriveTile();
  }
}
