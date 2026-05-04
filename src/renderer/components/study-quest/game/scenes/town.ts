/**
 * Town scene — the cozy starting hub.
 *
 * 40×30 tile grid built from `world/town-map.ts` with collision walls,
 * four landmark NPCs (Home Cat, Librarian, Shopkeeper, Dungeon Guard),
 * a screen-anchored dialogue overlay, and a camera locked to the player.
 *
 * Input flow:
 *   - Movement (WASD/arrows) handled inside the Player actor
 *   - Space (interact / advance dialogue) handled by this scene each tick
 */

import * as ex from 'excalibur';
import type { CatVariant } from '../../cat-sprites';
import { Npc } from '../actors/npc';
import { Player } from '../actors/player';
import { DialogueOverlay } from '../systems/dialogue';
import { BUILDINGS, PLAYER_SPAWN_TILE, TOWN_COLUMNS, TOWN_ROWS, buildTownGrid, tileToWorld } from '../world/town-map';
import { TILE_SIZE, isSolid, tileGraphic } from '../world/tiles';

export interface TownSceneOptions {
  variant: CatVariant;
}

export class TownScene extends ex.Scene {
  private variant: CatVariant;
  private player?: Player;
  private dialogue?: DialogueOverlay;
  private npcs: Npc[] = [];

  constructor(options: TownSceneOptions) {
    super();
    this.variant = options.variant;
  }

  override onInitialize(engine: ex.Engine): void {
    this.backgroundColor = ex.Color.fromHex('#2a3a48');

    this.buildTileMap();
    this.spawnNpcs();
    this.spawnPlayer();
    this.setupDialogue(engine);
    this.setupCamera();
  }

  override onPostUpdate(engine: ex.Engine): void {
    if (!this.player || !this.dialogue) return;
    const kb = engine.input.keyboard;

    if (kb.wasPressed(ex.Keys.Space)) {
      if (this.dialogue.isOpen) {
        this.dialogue.advance();
      } else {
        const nearest = this.nearestInRangeNpc(this.player);
        if (nearest) this.dialogue.show(nearest.displayName, nearest.lines);
      }
    }

    this.player.inputEnabled = !this.dialogue.isOpen;
  }

  // ─── Setup ─────────────────────────────────────────────────

  private buildTileMap(): void {
    const grid = buildTownGrid();
    const tilemap = new ex.TileMap({
      pos: ex.vec(0, 0),
      rows: TOWN_ROWS,
      columns: TOWN_COLUMNS,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    for (let y = 0; y < TOWN_ROWS; y++) {
      for (let x = 0; x < TOWN_COLUMNS; x++) {
        const type = grid[y * TOWN_COLUMNS + x];
        const tile = tilemap.getTile(x, y);
        if (!tile) continue;
        tile.addGraphic(tileGraphic(type));
        tile.solid = isSolid(type);
      }
    }
    this.add(tilemap);
  }

  private spawnPlayer(): void {
    this.player = new Player({
      variant: this.variant,
      spawn: tileToWorld(PLAYER_SPAWN_TILE.x, PLAYER_SPAWN_TILE.y),
    });
    this.add(this.player);
  }

  private spawnNpcs(): void {
    const homeNpc = new Npc({
      name: 'Home Cat',
      pos: tileToWorld(BUILDINGS.home.npcSpawn.x, BUILDINGS.home.npcSpawn.y),
      color: ex.Color.fromHex('#dfa649'),
      lines: [
        'Welcome home!',
        'This is your safe space — come back here to rest between dungeon runs.',
      ],
    });
    const librarian = new Npc({
      name: 'Librarian',
      pos: tileToWorld(BUILDINGS.library.npcSpawn.x, BUILDINGS.library.npcSpawn.y),
      color: ex.Color.fromHex('#dbd5e2'),
      lines: [
        'Hello, scholar!',
        'Every study session you finish makes your attacks stronger.',
        'Come back here when the dungeon opens — I\'ll have tips for you.',
      ],
    });
    const shopkeeper = new Npc({
      name: 'Shopkeeper',
      pos: tileToWorld(BUILDINGS.shop.npcSpawn.x, BUILDINGS.shop.npcSpawn.y),
      color: ex.Color.fromHex('#f7f5fa'),
      lines: [
        'Shop\'s not open yet, friend.',
        'Soon I\'ll have potions, gear, and accessories for your cat.',
      ],
    });
    const dungeonGuard = new Npc({
      name: 'Dungeon Guard',
      pos: tileToWorld(BUILDINGS.dungeon.npcSpawn.x, BUILDINGS.dungeon.npcSpawn.y),
      color: ex.Color.fromHex('#88739e'),
      lines: [
        'The dungeon gate is sealed for now.',
        'Coming soon — Phase 2 will open these doors.',
      ],
    });
    this.npcs = [homeNpc, librarian, shopkeeper, dungeonGuard];
    for (const npc of this.npcs) this.add(npc);
  }

  private setupDialogue(engine: ex.Engine): void {
    this.dialogue = new DialogueOverlay(engine.drawWidth, engine.drawHeight);
    this.add(this.dialogue);
  }

  private setupCamera(): void {
    if (!this.player) return;
    this.camera.strategy.lockToActor(this.player);
  }

  // ─── Helpers ───────────────────────────────────────────────

  private nearestInRangeNpc(player: Player): Npc | null {
    let best: { npc: Npc; dist: number } | null = null;
    for (const npc of this.npcs) {
      const d = npc.pos.distance(player.pos);
      if (d > npc.interactionRadius) continue;
      if (!best || d < best.dist) best = { npc, dist: d };
    }
    return best?.npc ?? null;
  }
}
