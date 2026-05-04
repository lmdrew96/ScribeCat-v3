/**
 * NPC — a static townsperson with dialogue lines and an interaction radius.
 *
 * Renders as a colored square with the NPC name floating above. The scene
 * checks `isPlayerInRange()` each frame to decide which NPC (if any) is
 * the active interaction target.
 */

import * as ex from 'excalibur';
import { TILE_SIZE } from '../world/tiles';

const NPC_SIZE = TILE_SIZE - 4;

export interface NpcOptions {
  name: string;
  pos: ex.Vector;
  color: ex.Color;
  /** Lines shown sequentially when the player presses Space in range */
  lines: string[];
  /** Pixel distance for interaction (default ~one tile away) */
  interactionRadius?: number;
}

export class Npc extends ex.Actor {
  readonly displayName: string;
  readonly lines: string[];
  readonly interactionRadius: number;

  constructor(options: NpcOptions) {
    super({
      name: `npc:${options.name}`,
      pos: options.pos,
      width: NPC_SIZE,
      height: NPC_SIZE,
      collisionType: ex.CollisionType.Fixed,
    });
    this.displayName = options.name;
    this.lines = options.lines;
    this.interactionRadius = options.interactionRadius ?? TILE_SIZE * 1.5;

    this.graphics.use(
      new ex.Rectangle({
        width: NPC_SIZE,
        height: NPC_SIZE,
        color: options.color,
      }),
    );
  }

  override onInitialize(): void {
    const nameLabel = new ex.Label({
      text: this.displayName,
      pos: ex.vec(0, -NPC_SIZE),
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: 10,
        unit: ex.FontUnit.Px,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Center,
      }),
    });
    this.addChild(nameLabel);
  }

  isPlayerInRange(player: ex.Actor): boolean {
    return this.pos.distance(player.pos) <= this.interactionRadius;
  }
}
