/**
 * Code-defined town map for Phase 1.
 *
 * 40×30 grid with bordered walls, four landmark buildings (Home, Library,
 * Shop, Dungeon Gate), and named landmark coords for NPC spawns + the
 * player start position. Tiled-editor JSON replaces this in a polish pass.
 */

import * as ex from 'excalibur';
import { TILE_SIZE, TileType } from './tiles';

export const TOWN_COLUMNS = 40;
export const TOWN_ROWS = 30;

export interface BuildingSpec {
  type: TileType;
  /** Top-left tile coord (col, row), inclusive */
  x: number;
  y: number;
  /** Footprint in tiles */
  width: number;
  height: number;
  /** NPC spawn point in tile coords — one tile away from the building */
  npcSpawn: { x: number; y: number };
}

export const BUILDINGS: Record<'home' | 'library' | 'shop' | 'dungeon', BuildingSpec> = {
  home: {
    type: TileType.HomeWall,
    x: 4,
    y: 4,
    width: 5,
    height: 4,
    npcSpawn: { x: 6, y: 9 },
  },
  library: {
    type: TileType.LibraryWall,
    x: 30,
    y: 4,
    width: 5,
    height: 4,
    npcSpawn: { x: 32, y: 9 },
  },
  shop: {
    type: TileType.ShopWall,
    x: 4,
    y: 21,
    width: 5,
    height: 4,
    npcSpawn: { x: 6, y: 20 },
  },
  dungeon: {
    type: TileType.DungeonGate,
    x: 30,
    y: 21,
    width: 5,
    height: 4,
    npcSpawn: { x: 32, y: 20 },
  },
};

export const PLAYER_SPAWN_TILE = { x: 20, y: 15 };

/** Convert a tile coord to a world-space pixel coord (tile center). */
export function tileToWorld(tx: number, ty: number): ex.Vector {
  return ex.vec(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
}

/** Build the 40×30 grid as a flat array indexed by `y * cols + x`. */
export function buildTownGrid(): TileType[] {
  const grid: TileType[] = new Array(TOWN_COLUMNS * TOWN_ROWS).fill(TileType.Grass);
  const set = (x: number, y: number, t: TileType) => {
    if (x < 0 || x >= TOWN_COLUMNS || y < 0 || y >= TOWN_ROWS) return;
    grid[y * TOWN_COLUMNS + x] = t;
  };

  // Outer wall border
  for (let x = 0; x < TOWN_COLUMNS; x++) {
    set(x, 0, TileType.Wall);
    set(x, TOWN_ROWS - 1, TileType.Wall);
  }
  for (let y = 0; y < TOWN_ROWS; y++) {
    set(0, y, TileType.Wall);
    set(TOWN_COLUMNS - 1, y, TileType.Wall);
  }

  // Cross paths
  const midRow = Math.floor(TOWN_ROWS / 2);
  const midCol = Math.floor(TOWN_COLUMNS / 2);
  for (let x = 1; x < TOWN_COLUMNS - 1; x++) set(x, midRow, TileType.Path);
  for (let y = 1; y < TOWN_ROWS - 1; y++) set(midCol, y, TileType.Path);

  // Buildings
  for (const building of Object.values(BUILDINGS)) {
    for (let dy = 0; dy < building.height; dy++) {
      for (let dx = 0; dx < building.width; dx++) {
        set(building.x + dx, building.y + dy, building.type);
      }
    }
  }

  return grid;
}
