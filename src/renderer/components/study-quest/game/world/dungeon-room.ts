/**
 * Single-room renderer for dungeon scenes.
 *
 * Each room is a 15×11 tile grid: walls around the perimeter (colored by
 * RoomType), floor in the interior, and a "door" tile centered on each wall
 * edge for every direction listed in `room.doors`.
 *
 * Doors are walkable; the scene listens for the player stepping onto one and
 * triggers a transition (after a 1-frame debounce — see DungeonScene).
 */

import * as ex from 'excalibur';
import { type DoorDir, type Room, ROOM_VISUALS } from './dungeon-types';
import { TILE_SIZE } from './tiles';

export const ROOM_COLS = 15;
export const ROOM_ROWS = 11;

const DOOR_COLOR = ex.Color.fromHex('#dfa649');

/** Center tile of each wall edge — where the door opens. */
const DOOR_TILES: Record<DoorDir, { x: number; y: number }> = {
  north: { x: Math.floor(ROOM_COLS / 2), y: 0 },
  south: { x: Math.floor(ROOM_COLS / 2), y: ROOM_ROWS - 1 },
  east: { x: ROOM_COLS - 1, y: Math.floor(ROOM_ROWS / 2) },
  west: { x: 0, y: Math.floor(ROOM_ROWS / 2) },
};

export function doorTile(dir: DoorDir): { x: number; y: number } {
  return DOOR_TILES[dir];
}

/** Tile one step inside the door — the safe spawn point when entering. */
export function entrySpawnTile(dir: DoorDir): { x: number; y: number } {
  const door = DOOR_TILES[dir];
  switch (dir) {
    case 'north':
      return { x: door.x, y: door.y + 1 };
    case 'south':
      return { x: door.x, y: door.y - 1 };
    case 'east':
      return { x: door.x - 1, y: door.y };
    case 'west':
      return { x: door.x + 1, y: door.y };
  }
}

export function tileToRoomWorld(tx: number, ty: number): ex.Vector {
  return ex.vec(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
}

interface RoomTiles {
  tilemap: ex.TileMap;
  /** Door tile coords keyed by direction, only for doors that exist on this room. */
  doors: Partial<Record<DoorDir, { x: number; y: number }>>;
}

export function buildRoomTilemap(room: Room): RoomTiles {
  const visuals = ROOM_VISUALS[room.type.kind];
  const wallColor = ex.Color.fromHex(visuals.wallColor);
  const floorColor = ex.Color.fromHex(visuals.floorColor);

  const tilemap = new ex.TileMap({
    pos: ex.vec(0, 0),
    rows: ROOM_ROWS,
    columns: ROOM_COLS,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  });

  const wallRect = new ex.Rectangle({ width: TILE_SIZE, height: TILE_SIZE, color: wallColor });
  const floorRect = new ex.Rectangle({ width: TILE_SIZE, height: TILE_SIZE, color: floorColor });
  const doorRect = new ex.Rectangle({ width: TILE_SIZE, height: TILE_SIZE, color: DOOR_COLOR });

  const doors: Partial<Record<DoorDir, { x: number; y: number }>> = {};
  for (const dir of Object.keys(room.doors) as DoorDir[]) {
    if (room.doors[dir]) doors[dir] = DOOR_TILES[dir];
  }

  for (let y = 0; y < ROOM_ROWS; y++) {
    for (let x = 0; x < ROOM_COLS; x++) {
      const tile = tilemap.getTile(x, y);
      if (!tile) continue;

      const isPerimeter = x === 0 || y === 0 || x === ROOM_COLS - 1 || y === ROOM_ROWS - 1;

      // Door tile? Walkable cutout in the wall.
      const matchedDoor =
        (Object.keys(doors) as DoorDir[]).find((d) => {
          const dt = doors[d];
          return dt && dt.x === x && dt.y === y;
        }) ?? null;

      if (matchedDoor) {
        tile.addGraphic(doorRect);
        tile.solid = false;
        continue;
      }

      if (isPerimeter) {
        tile.addGraphic(wallRect);
        tile.solid = true;
      } else {
        tile.addGraphic(floorRect);
        tile.solid = false;
      }
    }
  }

  return { tilemap, doors };
}

/** Pixel rect of the playable interior — handy for clamping the camera. */
export function roomBounds(): { width: number; height: number } {
  return { width: ROOM_COLS * TILE_SIZE, height: ROOM_ROWS * TILE_SIZE };
}
