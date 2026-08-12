import * as THREE from "three";
import {
  BOSS_GOLD_DROP,
  HEALTH_PICKUP_HEAL,
  MONSTER_CONTACT_DAMAGE_COOLDOWN_MS,
  MONSTER_GOLD_DROP,
  MONSTER_OCCUPANCY_RADIUS,
  PLAYER_ATTACK_COOLDOWN_MS,
  PLAYER_ATTACK_CONE_HALF_ANGLE_DEG,
  PLAYER_ATTACK_RANGE,
  PLAYER_BASE_HP,
  TILE_SIZE,
  VISION_RADIUS_TILES,
} from "../config/constants";
import { ALL_ITEMS } from "../game/data/items";
import { BOSS, MONSTERS } from "../game/data/monsters";
import type { ItemDef } from "../game/data/types";
import { applyDamage, canAttack, canBeHit, heal, mitigateDamage, selectAttackTargets, selectNearestTarget } from "../game/entities/Combat";
import { findBlockingDoorAt, type BlockingDoor } from "../game/entities/doors";
import { isTileOccupiedByMonster } from "../game/entities/occupancy";
import { Player } from "../game/entities/Player";
import { generateLevel } from "../game/maze/level";
import { hasLineOfSight } from "../game/maze/lineOfSight";
import { isTilePassable as checkTilePassable } from "../game/maze/passability";
import { pickRandomCells } from "../game/maze/placement";
import { Rng } from "../game/maze/rng";
import { cellCenterPx, cellToTile, edgeConnectorTile, tileCenterPx } from "../game/maze/raster";
import { cellKey, type TileGrid } from "../game/maze/types";
import { FogOfWar } from "../game/systems/FogOfWar";
import { Inventory } from "../game/systems/Inventory";
import { Keyring, type KeyLabel } from "../game/systems/Keyring";
import { getLevelConfig, type LevelConfig } from "../game/systems/LevelConfig";
import { boostForVault, rollLoot } from "../game/systems/LootTable";
import {
  allocatePoint,
  bonusesFromAllocation,
  EMPTY_ALLOCATION,
  HP_PER_POINT,
  totalAtk,
  totalDef,
  type StatAllocation,
} from "../game/systems/PlayerProgression";
import { applyProfile, buildProfile, LocalStorageSaveManager, type SaveManager } from "../game/systems/SaveManager";
import { isAutoEquipEnabled } from "../game/systems/Settings";
import { DIRECTION_VECTORS } from "../game/util/direction";

import { AttackVisuals3D } from "./combat/AttackVisuals3D";
import { resolveCircleCollision } from "./collision3d";
import { CAMERA_BACK_OFFSET, CAMERA_HEIGHT, CAMERA_LERP, PALETTE } from "./constants3d";
import { pxToWorld } from "./coords";
import { MonsterController3D } from "./entities/MonsterController3D";
import { PlayerController3D } from "./entities/PlayerController3D";
import { InputController3D } from "./input/InputController3D";
import { MazeMesh } from "./MazeMesh";
import { Hud3D, SIDEBAR_WIDTH } from "./ui/Hud3D";
import { InventoryPanel3D } from "./ui/InventoryPanel3D";
import { PauseMenu3D, showGameOver3D, showOptions3D, showTutorial3D } from "./ui/Overlays3D";
import { buildChestMesh, buildDoorMesh, buildExitDoorMesh, buildHealthPickupMesh, buildKeyMesh } from "./WorldObjectFactory";

const EXIT_KEY_ID = "exit";
const PLAYER_OCCUPANCY_RADIUS = TILE_SIZE * 0.35;
const DOOR_OBSTACLE_RADIUS = TILE_SIZE * 0.5;
const PICKUP_RADIUS = TILE_SIZE * 0.55;

interface Door3D extends BlockingDoor {
  color: string;
  mesh: THREE.Object3D;
  /** Pixel-space position (same convention as Player/Monster) - kept alongside the tile
   * coordinates so pickup-radius and monster-collision checks can use it directly without
   * round-tripping through world units. */
  px: number;
  py: number;
}

interface KeyPickup3D {
  doorId: string;
  color: KeyLabel;
  x: number;
  y: number;
  mesh: THREE.Object3D;
  collected: boolean;
}

interface ChestPickup3D {
  x: number;
  y: number;
  isVault: boolean;
  mesh: THREE.Object3D;
  collected: boolean;
}

interface HealthPickup3D {
  x: number;
  y: number;
  mesh: THREE.Object3D;
  collected: boolean;
}

/**
 * Everything GameScene.ts + UIScene.ts + PauseScene.ts + friends do together, in one class -
 * the same shape as those (one big orchestrator owning the whole level), just driving a Three.js
 * scene and a requestAnimationFrame loop instead of a Phaser Scene tree. All game *rules* are the
 * same imported functions the 2D game uses; this class is purely "read that state, drive a
 * different renderer/input/UI from it."
 */
export class Game3D {
  private readonly container: HTMLElement;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly levelGroup = new THREE.Group();
  private readonly input = new InputController3D();
  private readonly hud: Hud3D;
  private readonly inventoryPanel: InventoryPanel3D;
  private readonly pauseMenu: PauseMenu3D;
  private attackVisuals!: AttackVisuals3D;

  private inventory!: Inventory;
  private saveManager!: SaveManager;
  private levelNumber = 1;
  private highestLevelReached = 1;
  private statAllocation: StatAllocation = EMPTY_ALLOCATION;
  private keyring!: Keyring;
  private mazeGrid: TileGrid | null = null;
  private mazeMesh: MazeMesh | null = null;
  private fogOfWar: FogOfWar | null = null;
  private levelConfig!: LevelConfig;
  private dropRng!: Rng;
  private player: PlayerController3D | null = null;
  private monsters: MonsterController3D[] = [];
  private doors: Door3D[] = [];
  private exitDoor: Door3D | null = null;
  private keyPickups: KeyPickup3D[] = [];
  private chestPickups: ChestPickup3D[] = [];
  private healthPickups: HealthPickup3D[] = [];

  private paused = false;
  private pendingLevelComplete = false;
  private gameOverShown = false;
  private lastTimeMs = 0;
  private rafHandle = 0;
  private running = false;
  private cameraPos = new THREE.Vector3(0, CAMERA_HEIGHT, CAMERA_BACK_OFFSET);

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.scene.background = new THREE.Color(PALETTE.fog);
    this.scene.fog = new THREE.Fog(PALETTE.fog, 6, 16);
    this.scene.add(this.levelGroup);

    const ambient = new THREE.AmbientLight(PALETTE.ambient, 0.9);
    const hemi = new THREE.HemisphereLight(0x445577, 0x0a0a10, 0.5);
    this.scene.add(ambient, hemi);

    this.hud = new Hud3D(container);
    this.hud.onOpenInventory = () => this.toggleInventoryPanel();
    this.hud.onOpenMenu = () => this.openPauseMenu();
    this.inventoryPanel = new InventoryPanel3D(container, (item) => this.handleEquip(item));
    this.pauseMenu = new PauseMenu3D(container, {
      getData: () => ({
        statAllocation: this.statAllocation,
        weaponDamage: this.inventory.equipped.weapon?.stats.damage,
        armorDefense: this.inventory.equipped.armor?.stats.defense,
        accessoryDefense: this.inventory.equipped.accessory?.stats.defense,
        maxHp: this.player?.logic.maxHp ?? 0,
        highestLevelReached: this.highestLevelReached,
      }),
      onSpend: (stat) => this.allocateStatPoint(stat),
      onResume: () => this.closePauseMenu(),
      onTutorial: () => showTutorial3D(this.container),
      onQuit: () => this.quitToMenu(),
    });

    this.input.onPress("Escape", () => this.togglePauseMenu());
    this.input.onPress("KeyI", () => this.toggleInventoryPanel());

    this.handleResize();
    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = (): void => {
    const width = Math.max(1, window.innerWidth - SIDEBAR_WIDTH);
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /** `fresh: true` mirrors GameScene.create({fresh:true}) - wipes any save and starts clean;
   * false resumes whatever LocalStorageSaveManager has. */
  start(fresh: boolean): void {
    this.inventory = new Inventory();
    this.saveManager = new LocalStorageSaveManager();
    this.levelNumber = 1;
    this.highestLevelReached = 1;
    this.statAllocation = EMPTY_ALLOCATION;

    if (fresh) {
      this.saveManager.clear();
    } else {
      const saved = this.saveManager.load();
      if (saved) {
        applyProfile(this.inventory, saved);
        this.levelNumber = saved.levelNumber;
        this.highestLevelReached = saved.highestLevelReached ?? saved.levelNumber;
        this.statAllocation = saved.statAllocation ?? EMPTY_ALLOCATION;
      }
    }

    this.gameOverShown = false;
    this.buildLevel(Date.now());

    if (!this.running) {
      this.running = true;
      this.lastTimeMs = performance.now();
      this.rafHandle = requestAnimationFrame(this.animate);
    }
  }

  private buildLevel(seed: number): void {
    this.levelGroup.clear();
    this.mazeMesh?.dispose();
    this.keyring = new Keyring();
    this.monsters = [];
    this.doors = [];
    this.exitDoor = null;
    this.keyPickups = [];
    this.chestPickups = [];
    this.healthPickups = [];
    this.pendingLevelComplete = false;

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
    this.mazeMesh = new MazeMesh(level.grid);
    this.levelGroup.add(this.mazeMesh.group);

    const entranceTile = cellToTile(level.entrance);
    const player = new Player(PLAYER_BASE_HP + bonusesFromAllocation(this.statAllocation).bonusHp);
    this.player = new PlayerController3D(entranceTile.tx, entranceTile.ty, player);
    this.levelGroup.add(this.player.mesh);
    this.attackVisuals = new AttackVisuals3D(this.levelGroup);

    const pointLight = new THREE.PointLight(PALETTE.torchLight, 1.4, 8, 2);
    pointLight.position.set(0, 1.6, 0);
    this.player.mesh.add(pointLight);

    for (const door of level.doors) {
      const { tx, ty } = edgeConnectorTile(door.a, door.b);
      const { x, y } = tileCenterPx(tx, ty);
      const mesh = buildDoorMesh(door.color);
      const { x: wx, z: wz } = pxToWorld(x, y);
      mesh.position.x += wx;
      mesh.position.z += wz;
      this.levelGroup.add(mesh);
      this.doors.push({ doorId: door.id, tileX: tx, tileY: ty, active: true, color: door.color, mesh, px: x, py: y });
    }

    for (const key of level.keys) {
      const { x, y } = cellCenterPx(key.cell);
      const mesh = buildKeyMesh(key.color);
      const { x: wx, z: wz } = pxToWorld(x, y);
      mesh.position.x += wx;
      mesh.position.z += wz;
      this.levelGroup.add(mesh);
      this.keyPickups.push({ doorId: key.doorId, color: key.color, x, y, mesh, collected: false });
    }

    const excludedCells = new Set<string>([cellKey(level.entrance), cellKey(level.exit), cellKey(level.bossCell)]);
    for (const key of level.keys) excludedCells.add(cellKey(key.cell));
    for (const vault of level.vaults) for (const cell of vault.cells) excludedCells.add(cellKey(cell));

    const monsterRng = new Rng(seed + 777);
    const monsterCells = pickRandomCells(config.mazeCols, config.mazeRows, config.monsterCount, monsterRng, excludedCells);
    for (const cell of monsterCells) excludedCells.add(cellKey(cell));
    for (const cell of monsterCells) {
      const def = monsterRng.pick(MONSTERS);
      const { x, y } = cellCenterPx(cell);
      const monster = new MonsterController3D(x, y, def, config.monsterHpMult, config.monsterDamageMult);
      this.monsters.push(monster);
      this.levelGroup.add(monster.mesh);
    }

    const bossSpawn = cellCenterPx(level.bossCell);
    const boss = new MonsterController3D(bossSpawn.x, bossSpawn.y, BOSS, config.bossHpMult, config.bossDamageMult);
    this.monsters.push(boss);
    this.levelGroup.add(boss.mesh);

    const chestRng = new Rng(seed + 1337);
    const chestCells = pickRandomCells(config.mazeCols, config.mazeRows, config.chestCount, chestRng, excludedCells);
    for (const cell of chestCells) {
      const { x, y } = cellCenterPx(cell);
      const mesh = buildChestMesh(false);
      const { x: wx, z: wz } = pxToWorld(x, y);
      mesh.position.x += wx;
      mesh.position.z += wz;
      this.levelGroup.add(mesh);
      this.chestPickups.push({ x, y, isVault: false, mesh, collected: false });
    }
    for (const vault of level.vaults) {
      const { x, y } = cellCenterPx(vault.cells[0]);
      const mesh = buildChestMesh(true);
      const { x: wx, z: wz } = pxToWorld(x, y);
      mesh.position.x += wx;
      mesh.position.z += wz;
      this.levelGroup.add(mesh);
      this.chestPickups.push({ x, y, isVault: true, mesh, collected: false });
    }
    // Stash the RNG so spawnHealthPickup (called later, on monster death) keeps drawing from the
    // same deterministic stream as the rest of this level's random rolls.
    this.chestRngRef = chestRng;

    const exitSpawn = cellCenterPx(level.exit);
    const exitTile = cellToTile(level.exit);
    const exitMesh = buildExitDoorMesh();
    const { x: exitWx, z: exitWz } = pxToWorld(exitSpawn.x, exitSpawn.y);
    exitMesh.position.x += exitWx;
    exitMesh.position.z += exitWz;
    this.levelGroup.add(exitMesh);
    this.exitDoor = {
      doorId: EXIT_KEY_ID,
      tileX: exitTile.tx,
      tileY: exitTile.ty,
      active: true,
      color: "exit",
      mesh: exitMesh,
      px: exitSpawn.x,
      py: exitSpawn.y,
    };

    this.fogOfWar = new FogOfWar(level.grid[0].length, level.grid.length);
    this.onPlayerArriveTile();
  }

  private chestRngRef!: Rng;

  private onPlayerArriveTile(): void {
    if (!this.player || !this.fogOfWar || !this.mazeMesh) return;
    this.fogOfWar.update(this.player.tileX, this.player.tileY, VISION_RADIUS_TILES);
    this.mazeMesh.updateFog(this.fogOfWar);
  }

  private isTilePassable(tx: number, ty: number): boolean {
    if (!this.mazeGrid) return false;
    const blockingDoor = findBlockingDoorAt(this.doors, tx, ty);
    if (blockingDoor && this.keyring.has(blockingDoor.doorId)) {
      this.keyring.consume(blockingDoor.doorId);
      this.openDoor(blockingDoor as Door3D);
    }
    const blockedTiles = new Set(this.doors.filter((d) => d.active).map((d) => `${d.tileX},${d.tileY}`));
    if (!checkTilePassable(this.mazeGrid, tx, ty, blockedTiles)) return false;
    const { x, y } = tileCenterPx(tx, ty);
    return !isTileOccupiedByMonster(x, y, this.monsters, MONSTER_OCCUPANCY_RADIUS);
  }

  private openDoor(door: Door3D): void {
    door.active = false;
    door.mesh.removeFromParent();
  }

  private animate = (nowMs: number): void => {
    const deltaMs = Math.min(100, nowMs - this.lastTimeMs);
    this.lastTimeMs = nowMs;
    this.update(deltaMs, nowMs);
    this.renderer.render(this.scene, this.camera);
    this.rafHandle = requestAnimationFrame(this.animate);
  };

  private update(deltaMs: number, nowMs: number): void {
    if (this.paused) return;
    if (this.pendingLevelComplete) {
      this.pendingLevelComplete = false;
      this.completeLevel();
      return;
    }
    if (!this.player || !this.fogOfWar || !this.mazeGrid) return;

    if (this.player.logic.hp <= 0 && !this.gameOverShown) {
      this.gameOverShown = true;
      showGameOver3D(this.container, this.levelNumber, () => {
        this.gameOverShown = false;
        this.restartAfterDeath();
      });
      return;
    }
    if (this.gameOverShown) return;

    const direction = this.input.getDiscreteDirection();
    if (direction) {
      const speedMultiplier = this.inventory.equipped.accessory?.stats.speedMult ?? 1;
      this.player.tryStep(DIRECTION_VECTORS[direction], (tx, ty) => this.isTilePassable(tx, ty), speedMultiplier, () =>
        this.onPlayerArriveTile(),
      );
    }
    this.player.update(deltaMs);

    for (const monster of this.monsters) {
      if (!monster.active || monster.logic.isDead) continue;
      monster.step(this.player.logic.x, this.player.logic.y, deltaMs, this.mazeGrid, {
        x: this.player.logic.x,
        y: this.player.logic.y,
        radius: PLAYER_OCCUPANCY_RADIUS,
      });
      for (const door of [...this.doors.filter((d) => d.active), this.exitDoor].filter((d): d is Door3D => d !== null)) {
        const resolved = resolveCircleCollision(monster.logic.x, monster.logic.y, MONSTER_OCCUPANCY_RADIUS, door.px, door.py, DOOR_OBSTACLE_RADIUS);
        monster.logic.x = resolved.x;
        monster.logic.y = resolved.y;
      }
      monster.setFogVisible(this.fogOfWar);
      monster.updateFlash(nowMs);
    }
    this.monsters = this.monsters.filter((m) => m.active);

    this.handleContactDamage(nowMs);
    this.handlePickups();

    if (this.input.isAttackDown()) this.tryPlayerAttack(nowMs);

    this.attackVisuals.update(deltaMs);
    this.updateCamera();
    this.refreshHud();
  }

  private handleContactDamage(nowMs: number): void {
    if (!this.player) return;
    const player = this.player.logic;
    for (const monster of this.monsters) {
      if (monster.logic.isDead) continue;
      const dist = Math.hypot(monster.logic.x - player.x, monster.logic.y - player.y);
      if (dist >= MONSTER_OCCUPANCY_RADIUS + PLAYER_OCCUPANCY_RADIUS) continue;
      if (!canBeHit(player, nowMs, MONSTER_CONTACT_DAMAGE_COOLDOWN_MS)) continue;
      player.lastHitAt = nowMs;
      const defense = totalDef(this.inventory.equipped.armor?.stats.defense, this.inventory.equipped.accessory?.stats.defense, this.statAllocation);
      applyDamage(player, mitigateDamage(monster.logic.damage, defense));
    }
  }

  private handlePickups(): void {
    if (!this.player) return;
    const px = this.player.logic.x;
    const py = this.player.logic.y;
    const near = (x: number, y: number) => Math.hypot(x - px, y - py) < PICKUP_RADIUS;

    for (const key of this.keyPickups) {
      if (key.collected || !near(key.x, key.y)) continue;
      key.collected = true;
      key.mesh.removeFromParent();
      this.keyring.collect(key.doorId, key.color);
    }

    for (const chest of this.chestPickups) {
      if (chest.collected || !near(chest.x, chest.y)) continue;
      chest.collected = true;
      chest.mesh.removeFromParent();
      const weightBonus = chest.isVault ? boostForVault(this.levelConfig.rarityWeightBonus) : this.levelConfig.rarityWeightBonus;
      const item = rollLoot(this.chestRngRef, ALL_ITEMS, weightBonus);
      if (item.kind === "consumable") {
        heal(this.player.logic, item.stats.healAmount ?? 0);
      } else {
        this.inventory.addItem(item, isAutoEquipEnabled());
      }
      this.persist();
    }

    for (const pickup of this.healthPickups) {
      if (pickup.collected || !near(pickup.x, pickup.y)) continue;
      pickup.collected = true;
      pickup.mesh.removeFromParent();
      heal(this.player.logic, HEALTH_PICKUP_HEAL);
    }
    this.healthPickups = this.healthPickups.filter((p) => !p.collected);

    if (this.exitDoor?.active && near(this.exitDoor.px, this.exitDoor.py) && this.keyring.has(EXIT_KEY_ID)) {
      this.pendingLevelComplete = true;
    }
  }

  private tryPlayerAttack(nowMs: number): void {
    if (!this.player || !this.mazeGrid) return;
    const player = this.player.logic;
    const weapon = this.inventory.equipped.weapon;
    const cooldownMs = weapon?.stats.cooldownMs ?? PLAYER_ATTACK_COOLDOWN_MS;
    const range = weapon?.stats.range ?? PLAYER_ATTACK_RANGE;
    const damage = totalAtk(weapon?.stats.damage, this.statAllocation);

    if (!canAttack(player, nowMs, cooldownMs)) return;
    player.lastAttackAt = nowMs;

    const candidates = selectAttackTargets(this.player, this.player.facing, range, PLAYER_ATTACK_CONE_HALF_ANGLE_DEG, this.monsters).filter(
      (monster) => hasLineOfSight(this.mazeGrid!, this.player!.x, this.player!.y, monster.x, monster.y),
    );
    const nearest = selectNearestTarget(this.player, candidates);
    const targets = weapon?.stats.ranged ? (nearest ? [nearest] : []) : candidates;

    if (weapon?.stats.ranged) {
      const dest = nearest
        ? { x: nearest.x, y: nearest.y }
        : { x: this.player.x + this.player.facing.x * range, y: this.player.y + this.player.facing.y * range };
      this.attackVisuals.spawnProjectile({ x: this.player.x, y: this.player.y }, dest, weapon.stats.art);
    } else {
      this.attackVisuals.spawnSwipe({ x: this.player.x, y: this.player.y }, this.player.facing, weapon?.stats.art);
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
        monster.flashHit(nowMs);
      }
    }
  }

  private spawnExitKey(x: number, y: number): void {
    const mesh = buildKeyMesh("exit");
    const { x: wx, z: wz } = pxToWorld(x, y);
    mesh.position.x += wx;
    mesh.position.z += wz;
    this.levelGroup.add(mesh);
    this.keyPickups.push({ doorId: EXIT_KEY_ID, color: "exit", x, y, mesh, collected: false });
  }

  private spawnHealthPickup(x: number, y: number): void {
    const mesh = buildHealthPickupMesh();
    const { x: wx, z: wz } = pxToWorld(x, y);
    mesh.position.set(wx, 0.3, wz);
    this.levelGroup.add(mesh);
    this.healthPickups.push({ x, y, mesh, collected: false });
  }

  private completeLevel(): void {
    this.levelNumber += 1;
    this.highestLevelReached = Math.max(this.highestLevelReached, this.levelNumber);
    this.persist();
    this.buildLevel(Date.now());
  }

  private restartAfterDeath(): void {
    this.levelNumber = 1;
    this.persist();
    this.buildLevel(Date.now());
  }

  private handleEquip(item: ItemDef): void {
    if (!item.slot) return;
    this.inventory.equip(item);
    this.persist();
    this.inventoryPanel.show(
      this.inventory.owned.filter((i) => i.slot !== undefined),
      { weapon: this.inventory.equipped.weapon?.id, armor: this.inventory.equipped.armor?.id, accessory: this.inventory.equipped.accessory?.id },
    );
  }

  private allocateStatPoint(stat: keyof StatAllocation): void {
    const next = allocatePoint(this.highestLevelReached, this.statAllocation, stat);
    if (next === this.statAllocation) return;
    this.statAllocation = next;
    if (stat === "hp" && this.player) {
      this.player.logic.maxHp += HP_PER_POINT;
      this.player.logic.hp += HP_PER_POINT;
    }
    this.persist();
  }

  private persist(): void {
    this.saveManager.save(buildProfile(this.inventory, this.levelNumber, this.highestLevelReached, this.statAllocation));
  }

  private toggleInventoryPanel(): void {
    if (this.inventoryPanel.isOpen()) {
      this.inventoryPanel.close();
      this.paused = false;
    } else {
      this.inventoryPanel.show(
        this.inventory.owned.filter((i) => i.slot !== undefined),
        { weapon: this.inventory.equipped.weapon?.id, armor: this.inventory.equipped.armor?.id, accessory: this.inventory.equipped.accessory?.id },
      );
      this.paused = true;
    }
  }

  private togglePauseMenu(): void {
    if (this.pauseMenu.isOpen()) this.closePauseMenu();
    else this.openPauseMenu();
  }

  private openPauseMenu(): void {
    if (this.paused) return;
    this.paused = true;
    this.pauseMenu.show();
  }

  private closePauseMenu(): void {
    this.pauseMenu.close();
    this.paused = false;
  }

  onQuitToMenu: () => void = () => {};

  private quitToMenu(): void {
    this.persist();
    this.pauseMenu.close();
    this.paused = false;
    this.onQuitToMenu();
  }

  private updateCamera(): void {
    if (!this.player) return;
    const world = pxToWorld(this.player.x, this.player.y);
    const facingDir = new THREE.Vector3(this.player.facing.x, 0, this.player.facing.y);
    if (facingDir.lengthSq() === 0) facingDir.set(0, 0, 1);
    facingDir.normalize();

    const desired = new THREE.Vector3(world.x - facingDir.x * CAMERA_BACK_OFFSET, CAMERA_HEIGHT, world.z - facingDir.z * CAMERA_BACK_OFFSET);
    this.cameraPos.lerp(desired, CAMERA_LERP);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(world.x, 0.6, world.z);

    for (const monster of this.monsters) monster.faceCamera(this.camera.position);
  }

  private refreshHud(): void {
    if (!this.player || !this.fogOfWar || !this.mazeGrid) return;
    const eq = this.inventory.equipped;
    this.hud.update({
      levelNumber: this.levelNumber,
      highestLevelReached: this.highestLevelReached,
      hp: this.player.logic.hp,
      maxHp: this.player.logic.maxHp,
      atk: totalAtk(eq.weapon?.stats.damage, this.statAllocation),
      def: totalDef(eq.armor?.stats.defense, eq.accessory?.stats.defense, this.statAllocation),
      gold: this.inventory.gold,
      weapon: eq.weapon,
      armor: eq.armor,
      accessory: eq.accessory,
      keys: this.keyring.heldLabels(),
      grid: this.mazeGrid,
      fog: this.fogOfWar,
      playerTx: this.player.tileX,
      playerTy: this.player.tileY,
    });
  }

  showOptions(): void {
    showOptions3D(this.container);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
    window.removeEventListener("resize", this.handleResize);
    this.input.dispose();
    this.hud.dispose();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}
