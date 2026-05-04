/**
 * DungeonScene — single scene that re-renders itself per room.
 *
 * One DungeonScene instance handles every room on a floor. Walking onto a
 * door tile clears the room's entities and rebuilds the next one in-place.
 * Crossing onto the exit room's center portal returns to TownScene.
 *
 * Phase 2 scope: navigation only — the Enemy/Boss actors are placeholders.
 * Battle integration arrives in Phase 3; the comment-hook below marks the
 * spot where per-floor state will get persisted across re-entries.
 */

import * as ex from 'excalibur';
import { type CatVariant } from '../../cat-sprites';
import { Enemy } from '../actors/enemy';
import { Player } from '../actors/player';
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
  from?: 'town';
}

export interface DungeonSceneOptions {
  variant: CatVariant;
}

const DOOR_DEBOUNCE_FRAMES = 2;
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
  private doorDebounceFrames = 0;
  private minimap?: Minimap;

  // Phase 3 hook: persist `{ floor, roomId, playerPos }` here so a return
  // visit from town drops the player back where they left off.
  // private persistedFloor: { floor: Floor; roomId: string } | null = null;

  constructor(options: DungeonSceneOptions) {
    super();
    this.variant = options.variant;
  }

  override onInitialize(engine: ex.Engine): void {
    this.backgroundColor = ex.Color.fromHex('#0e0a18');
    this.minimap = new Minimap(engine.drawWidth);
    this.add(this.minimap);
  }

  override onActivate(_ctx: ex.SceneActivationContext<DungeonSceneActivationData>): void {
    // Phase 2: always start with a fresh floor (Phase 3 will check persisted state).
    this.floor = generateFloor();
    this.buildRoom(this.floor.startRoomId);
    if (this.minimap) this.minimap.setFloor(this.floor, this.floor.startRoomId);
  }

  override onDeactivate(): void {
    this.clearRoom();
    if (this.player) {
      this.player.kill();
      this.player = undefined;
    }
    this.floor = undefined;
    this.currentRoomId = undefined;
  }

  override onPostUpdate(engine: ex.Engine): void {
    if (!this.player || !this.floor || !this.currentRoomId) return;

    if (this.doorDebounceFrames > 0) {
      this.doorDebounceFrames--;
      return;
    }

    const room = this.floor.rooms[this.currentRoomId];
    if (!room) return;

    const playerTile = this.worldToTile(this.player.pos);

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

  private clearRoom(): void {
    for (const entity of this.roomEntities) {
      entity.kill();
    }
    this.roomEntities = [];
    this.dungeonDoors = {};
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

    if (this.minimap) this.minimap.setCurrentRoom(roomId);

    // Ignore door triggers for a couple frames so the entry tile we *just*
    // came from doesn't immediately re-fire (extra defense beyond the
    // one-tile-inside spawn offset).
    this.doorDebounceFrames = DOOR_DEBOUNCE_FRAMES;
  }

  private spawnRoomFeatures(room: Room): void {
    switch (room.type.kind) {
      case 'start':
        return;
      case 'enemy': {
        const enemy = new Enemy({
          name: room.type.enemyId,
          pos: tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
        });
        this.add(enemy);
        this.roomEntities.push(enemy);
        return;
      }
      case 'boss': {
        const boss = new Enemy({
          name: 'BOSS',
          pos: tileToRoomWorld(ROOM_CENTER.x, ROOM_CENTER.y),
          color: ex.Color.fromHex('#a01818'),
        });
        this.add(boss);
        this.roomEntities.push(boss);
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
