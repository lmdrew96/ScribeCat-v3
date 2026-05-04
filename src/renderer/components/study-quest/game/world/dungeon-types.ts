/**
 * Dungeon type definitions — kept separate so the procgen, room renderer,
 * and scene can all import without a circular ref.
 *
 * RoomType is a discriminated union so an exhaustive `switch` triggers
 * a TypeScript error if a future room kind is added without a handler.
 * That's the spec's anti-regression strategy from the v2 dungeon rewrite.
 */

import type { TileType } from './tiles';

/** Cardinal door direction. North = -y, South = +y in tile space. */
export type DoorDir = 'north' | 'south' | 'east' | 'west';

export const ALL_DIRS: readonly DoorDir[] = ['north', 'south', 'east', 'west'] as const;

export function oppositeDir(dir: DoorDir): DoorDir {
  switch (dir) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
  }
}

/** Discriminated union — every new room kind must add a `case` everywhere. */
export type RoomType =
  | { kind: 'start' }
  | { kind: 'enemy'; enemyId: string }
  | { kind: 'treasure'; itemId: string }
  | { kind: 'rest' }
  | { kind: 'boss'; bossId: string }
  | { kind: 'exit' };

/** Static node in the floor graph. Coords are graph-space, not tile-space. */
export interface Room {
  id: string;
  /** Graph coords used by procgen + minimap; not tile coords. */
  gx: number;
  gy: number;
  type: RoomType;
  /** Doors keyed by direction → neighbor room id. Missing dir = wall. */
  doors: Partial<Record<DoorDir, string>>;
}

export interface Floor {
  rooms: Record<string, Room>;
  startRoomId: string;
  bossRoomId: string;
  exitRoomId: string;
}

/** Each RoomType maps to a wall color for the placeholder room render. */
export interface RoomVisual {
  wallColor: string;
  floorColor: string;
}

export const ROOM_VISUALS: Record<RoomType['kind'], RoomVisual> = {
  start: { wallColor: '#5a4078', floorColor: '#2a2038' },
  enemy: { wallColor: '#704040', floorColor: '#382020' },
  treasure: { wallColor: '#a08840', floorColor: '#3a3020' },
  rest: { wallColor: '#406858', floorColor: '#1f3028' },
  boss: { wallColor: '#7a2828', floorColor: '#3a1818' },
  exit: { wallColor: '#88739e', floorColor: '#3a3048' },
};

/** Exhaustiveness helper — never returned, but the cast forces TS to check. */
export function assertNever(x: never): never {
  throw new Error(`Unexpected room type: ${JSON.stringify(x)}`);
}

/** Re-exported so dungeon-room.ts doesn't have to dual-import. */
export type { TileType };
