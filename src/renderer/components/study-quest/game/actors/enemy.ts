/**
 * Enemy — Phase 2 placeholder. Stationary colored square with a name label.
 *
 * Phase 3 wires this into the combat system: stepping onto the enemy
 * (or pressing Space adjacent) triggers a battle scene. For now it just
 * exists as a visual cue so dungeon rooms feel populated.
 */

import * as ex from 'excalibur';
import { TILE_SIZE } from '../world/tiles';

const ENEMY_SIZE = TILE_SIZE - 6;

export interface EnemyOptions {
  name: string;
  pos: ex.Vector;
  color?: ex.Color;
}

export class Enemy extends ex.Actor {
  readonly displayName: string;

  constructor(options: EnemyOptions) {
    super({
      name: `enemy:${options.name}`,
      pos: options.pos,
      width: ENEMY_SIZE,
      height: ENEMY_SIZE,
      // Passive so the player can walk *onto* the enemy tile — the dungeon
      // scene listens for that overlap to trigger the battle. Fixed would
      // block the player one tile short and the trigger would never fire.
      collisionType: ex.CollisionType.Passive,
    });
    this.displayName = options.name;

    this.graphics.use(
      new ex.Rectangle({
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        color: options.color ?? ex.Color.fromHex('#c14545'),
      }),
    );
  }

  override onInitialize(): void {
    const label = new ex.Label({
      text: this.displayName,
      pos: ex.vec(0, -ENEMY_SIZE),
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: 9,
        unit: ex.FontUnit.Px,
        color: ex.Color.fromHex('#f7d0d0'),
        textAlign: ex.TextAlign.Center,
      }),
    });
    this.addChild(label);
  }
}
