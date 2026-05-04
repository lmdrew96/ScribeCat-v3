/**
 * DungeonScene — single scene that re-renders itself per room.
 *
 * One DungeonScene instance handles every room on a floor. Walking onto a
 * door tile clears the room's entities and rebuilds the next one in-place.
 * Crossing onto the exit room's center portal returns to TownScene.
 *
 * State preservation across battle: `onDeactivate` is intentionally a no-op
 * so a battle round-trip (`goToScene('battle') → goToScene('dungeon')`)
 * keeps the floor + player intact. `onActivate` decides whether to reset:
 *   - data.from === 'battle' → keep floor, mark current room cleared if won
 *   - otherwise (town entry, undefined) → reset and generate a fresh floor.
 */

import * as ex from 'excalibur';
import { type CatVariant } from '../../cat-sprites';
import { Enemy } from '../actors/enemy';
import { Player } from '../actors/player';
import { gameBridge, PLAYER_MAX_HP } from '../bridge';
import { Minimap } from '../systems/minimap';
import { generateFloor } from '../world/dungeon-gen';
import {
  type DoorDir,
  type Floor,
  type Room,
  assertNever,
  oppositeDir,
} from '../world/dungeon-types';
import {
  ROOM_COLS,
  ROOM_ROWS,
  buildRoomTilemap,
  entrySpawnTile,
  tileToRoomWorld,
} from '../world/dungeon-room';
import { TILE_SIZE } from '../world/tiles';

export interface DungeonSceneActivationData {
  from?: 'town' | 'battle';
  /** Set when from === 'battle': did the player win the fight just played? */
  won?: boolean;
}

export interface DungeonSceneOptions {
  variant: CatVariant;
}

const TRANSITION_DEBOUNCE_FRAMES = 2;
const ROOM_CENTER = {
  x: Math.floor(ROOM_COLS / 2),
  y: Math.floor(ROOM_ROWS / 2),
};

export class DungeonScene extends ex.Scene {
  private variant: CatVariant;
  private floor?: Floor;
  private currentRoomId?: string;
  private player?: Player;
  /** Entities that belong to the current room and get cleared on transition. */
  private roomEntities: ex.Entity[] = [];
  private dungeonDoors: Partial<Record<DoorDir, { x: number; y: number }>> = {};
  private transitionDebounceFrames = 0;
  private minimap?: Minimap;
  /** Rooms whose enemy/boss has been defeated this floor. */
  private clearedRooms = new Set<string>();
  /** Tracks the active enemy actor (if any) so onPostUpdate can do tile checks. */
  private currentEnemyId?: string;

  constructor(options: DungeonSceneOptions) {
    super();
    this.variant = options.variant;
  }

  override onInitialize(engine: ex.Engine): void {
    this.backgroundColor = ex.Color.fromHex('#0e0a18');
    this.minimap = new Minimap(engine.drawWidth);
    this.add(this.minimap);
  }

  override onActivate(ctx: ex.SceneActivationContext<DungeonSceneActivationData>): void {
    const from = ctx.data?.from;

    if (from === 'battle' && this.floor && this.currentRoomId) {
      // Returning from a fight in the current room.
      if (ctx.data?.won) {
        this.clearedRooms.add(this.currentRoomId);
      }
      this.buildRoom(this.currentRoomId);
      if (this.minimap) this.minimap.setCurrentRoom(this.currentRoomId, this.clearedRooms);
      return;
    }

    // Fresh floor (entry from town, or first activation, or after defeat reset).
    this.resetForFreshFloor();
    this.floor = generateFloor();
    this.clearedRooms = new Set();
    gameBridge.setState({ playerHp: PLAYER_MAX_HP, playerMaxHp: PLAYER_MAX_HP });
    this.buildRoom(this.floor.startRoomId);
    if (this.minimap) {
      this.minimap.setFloor(this.floor, this.floor.startRoomId, this.clearedRooms);
    }
  }

  override onDeactivate(): void {
    // Intentional no-op — preserves floor + player so battle round-trips
    // can resume in place. Fresh-floor logic lives in onActivate.
  }

  override onPostUpdate(engine: ex.Engine): void {
    if (!this.player || !this.floor || !this.currentRoomId) return;

    if (this.transitionDebounceFrames > 0) {
      this.transitionDebounceFrames--;
      return;
    }

    const room = this.floor.rooms[this.currentRoomId];
    if (!room) return;

    const playerTile = this.worldToTile(this.player.pos);

    // Enemy / Boss collision → start battle.
    if (
      (room.type.kind === 'enemy' || room.type.kind === 'boss') &&
      !this.clearedRooms.has(this.currentRoomId) &&
      playerTile.x === ROOM_CENTER.x &&
      playerTile.y === ROOM_CENTER.y &&
      this.currentEnemyId
    ) {
      void engine.goToScene('battle', {
        sceneActivationData: {
          enemyId: this.currentEnemyId,
          roomId: this.currentRoomId,
        },
      });
      return;
    }

    // Exit room: stepping on the center tile returns to town.
    if (room.type.kind === 'exit') {
      if (playerTile.x === ROOM_CENTER.x && playerTile.y === ROOM_CENTER.y) {
        void engine.goToScene('town', { sceneActivationData: { from: 'dungeon' } });
        return;
      }
    }

    // Otherwise, check door tiles for room transitions.
    for (const dir of Object.keys(this.dungeonDoors) as DoorDir[]) {
      const tile = this.dungeonDoors[dir];
      if (!tile) continue;
      if (playerTile.x !== tile.x || playerTile.y !== tile.y) continue;
      const neighborId = room.doors[dir];
      if (!neighborId) continue;
      this.buildRoom(neighborId, oppositeDir(dir));
      return;
    }
  }

  // ─── Setup ─────────────────────────────────────────────────

  private resetForFreshFloor(): void {
    this.clearRoom();
    if (this.player) {
      this.player.kill();
      this.player = undefined;
    }
    this.floor = undefined;
    this.currentRoomId = undefined;
    this.currentEnemyId = undefined;
  }

  private clearRoom(): void {
    for (const entity of this.roomEntities) {
      entity.kill();
    }
    this.roomEntities = [];
    this.dungeonDoors = {};
    this.currentEnemyId = undefined;
  }

  private buildRoom(roomId: string, fromDir?: DoorDir): void {
    if (!this.floor) return;
    const room = this.floor.rooms[roomId];
    if (!room) return;

    this.clearRoom();
    this.currentRoomId = roomId;

    const { tilemap, doors } = buildRoomTilemap(room);
    this.add(tilemap);
    this.roomEntities.push(tilemap);
    this.dungeonDoors = doors;

    // Spawn player one tile inside the entry door, or at room center on first entry.
    const spawnTile = fromDir ? entrySpawnTile(fromDir) : ROOM_CENTER;
    const spawnPos = tileToRoomWorld(spawnTile.x, spawnTile.y);

    if (!this.player) {
      this.player = new Player({ variant: this.variant, spawn: spawnPos });
      this.add(this.player);
      this.camera.strategy.lockToActor(this.player);
    } else {
      this.player.pos = spawnPos;
      this.player.vel = ex.vec(0, 0);
    }

    this.spawnRoomFeatures(room);

    if (this.minimap) this.minimap.setCurrentRoom(roomId, this.clearedRooms);

    // Ignore door triggers + battle re-trigger for a couple frames.
    this.transitionDebounceFrames = TRANSITION_DEBOUNCE_FRAMES;
  }

  private spawnRoomFeatures(room: Room): void {
    const cleared = this.clearedRooms.has(room.id);

    switch (room.type.kind) {
      case 'start':
        return;
      case 'enemy': {
        if (cleared) return;
        const enemy = new Enemy({
          name: room.type.enemyId,
          pos: tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
        });
        this.add(enemy);
        this.roomEntities.push(enemy);
        this.currentEnemyId = room.type.enemyId;
        return;
      }
      case 'boss': {
        if (cleared) return;
        const boss = new Enemy({
          name: 'BOSS',
          pos: tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
          color: ex.Color.fromHex('#a01818'),
        });
        this.add(boss);
        this.roomEntities.push(boss);
        this.currentEnemyId = room.type.bossId;
        return;
      }
      case 'treasure': {
        const chest = this.makeFeature(
          tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
          ex.Color.fromHex('#dfa649'),
          'chest',
        );
        this.add(chest);
        this.roomEntities.push(chest);
        return;
      }
      case 'rest': {
        const fire = this.makeFeature(
          tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
          ex.Color.fromHex('#f5a040'),
          'campfire',
        );
        this.add(fire);
        this.roomEntities.push(fire);
        // Rest tile auto-heals the player to full on entry.
        gameBridge.setState({ playerHp: gameBridge.state.playerMaxHp });
        return;
      }
      case 'exit': {
        const portal = this.makeFeature(
          tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
          ex.Color.fromHex('#88739e'),
          'portal',
          TILE_SIZE,
        );
        this.add(portal);
        this.roomEntities.push(portal);
        return;
      }
      default:
        assertNever(room.type);
    }
  }

  private makeFeature(
    pos: ex.Vector,
    color: ex.Color,
    name: string,
    size = TILE_SIZE - 8,
  ): ex.Actor {
    const actor = new ex.Actor({
      name: `feature:${name}`,
      pos,
      width: size,
      height: size,
      collisionType: ex.CollisionType.Passive,
    });
    actor.graphics.use(new ex.Rectangle({ width: size, height: size, color }));
    return actor;
  }

  private worldToTile(pos: ex.Vector): { x: number; y: number } {
    return {
      x: Math.floor(pos.x / TILE_SIZE),
      y: Math.floor(pos.y / TILE_SIZE),
    };
  }
}
