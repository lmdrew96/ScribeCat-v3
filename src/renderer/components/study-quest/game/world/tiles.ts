/**
 * Tile types for the town tilemap. Phase 1 uses flat colors as placeholders;
 * Ashley's pixel art swaps these to sprite tiles in a later polish pass.
 */

import * as ex from 'excalibur';

export const TILE_SIZE = 32;

export enum TileType {
  Grass = 0,
  Path = 1,
  Wall = 2,
  HomeWall = 3,
  LibraryWall = 4,
  ShopWall = 5,
  DungeonGate = 6,
}

interface TileSpec {
  color: ex.Color;
  solid: boolean;
}

export const TILE_SPECS: Record<TileType, TileSpec> = {
  [TileType.Grass]: { color: ex.Color.fromHex('#4a7848'), solid: false },
  [TileType.Path]: { color: ex.Color.fromHex('#a08856'), solid: false },
  [TileType.Wall]: { color: ex.Color.fromHex('#3a3a3a'), solid: true },
  [TileType.HomeWall]: { color: ex.Color.fromHex('#c9722e'), solid: true },
  [TileType.LibraryWall]: { color: ex.Color.fromHex('#7a5aa8'), solid: true },
  [TileType.ShopWall]: { color: ex.Color.fromHex('#c9b04e'), solid: true },
  [TileType.DungeonGate]: { color: ex.Color.fromHex('#7a2828'), solid: true },
};

export function tileGraphic(type: TileType): ex.Rectangle {
  const spec = TILE_SPECS[type];
  return new ex.Rectangle({ width: TILE_SIZE, height: TILE_SIZE, color: spec.color });
}

export function isSolid(type: TileType): boolean {
  return TILE_SPECS[type].solid;
}
