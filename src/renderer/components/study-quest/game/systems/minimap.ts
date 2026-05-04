/**
 * Minimap — top-right HUD overlay showing the dungeon floor layout.
 *
 * Shows every room as a small colored cell (color = RoomType), with the
 * current room outlined in amber. Phase 2 keeps it simple: all rooms
 * visible from the start, no fog-of-war. (Add visited-set tracking later.)
 *
 * Cells are rebuilt every time the floor or current room changes — cheap
 * because dungeons are tiny graphs (≤10 rooms).
 */

import * as ex from 'excalibur';
import { type Floor, type RoomType } from '../world/dungeon-types';

const CELL_SIZE = 10;
const CELL_GAP = 2;
const PADDING = 6;
const PANEL_BG = ex.Color.fromHex('#1e1830cc');
const PANEL_STROKE = ex.Color.fromHex('#dfa649');
const HIGHLIGHT = ex.Color.fromHex('#dfa649');

const TYPE_COLOR: Record<RoomType['kind'], string> = {
  start: '#88c2a8',
  enemy: '#5a3030',
  treasure: '#a08840',
  rest: '#406858',
  boss: '#a01818',
  exit: '#88739e',
};

export class Minimap extends ex.ScreenElement {
  private floor?: Floor;
  private currentRoomId?: string;
  private cells: ex.Actor[] = [];
  private viewportWidth: number;

  constructor(viewportWidth: number) {
    super({
      pos: ex.vec(viewportWidth - 12, 12),
      anchor: ex.vec(0, 0),
      width: 100,
      height: 100,
      z: 1000,
    });
    this.viewportWidth = viewportWidth;
  }

  setFloor(floor: Floor, currentRoomId: string): void {
    this.floor = floor;
    this.currentRoomId = currentRoomId;
    this.rebuild();
  }

  setCurrentRoom(roomId: string): void {
    this.currentRoomId = roomId;
    this.rebuild();
  }

  private clearCells(): void {
    for (const cell of this.cells) {
      this.removeChild(cell);
      cell.kill();
    }
    this.cells = [];
  }

  private rebuild(): void {
    if (!this.floor) return;
    this.clearCells();

    const rooms = Object.values(this.floor.rooms);
    const gxs = rooms.map((r) => r.gx);
    const gys = rooms.map((r) => r.gy);
    const minGx = Math.min(...gxs);
    const minGy = Math.min(...gys);
    const maxGx = Math.max(...gxs);
    const maxGy = Math.max(...gys);

    const cols = maxGx - minGx + 1;
    const rows = maxGy - minGy + 1;
    const panelWidth = cols * (CELL_SIZE + CELL_GAP) - CELL_GAP + PADDING * 2;
    const panelHeight = rows * (CELL_SIZE + CELL_GAP) - CELL_GAP + PADDING * 2;

    // Reposition + resize the panel so its right edge sits 12px from the
    // viewport's right edge. Anchor is (0,0) so pos = top-left corner.
    this.pos = ex.vec(this.viewportWidth - 12 - panelWidth, 12);
    this.graphics.use(
      new ex.Rectangle({
        width: panelWidth,
        height: panelHeight,
        color: PANEL_BG,
        strokeColor: PANEL_STROKE,
        lineWidth: 1,
      }),
    );

    for (const room of rooms) {
      const dx = (room.gx - minGx) * (CELL_SIZE + CELL_GAP);
      const dy = (room.gy - minGy) * (CELL_SIZE + CELL_GAP);
      const cellX = PADDING + dx;
      const cellY = PADDING + dy;
      const isCurrent = room.id === this.currentRoomId;
      const cell = new ex.Actor({
        pos: ex.vec(cellX, cellY),
        width: CELL_SIZE,
        height: CELL_SIZE,
        anchor: ex.vec(0, 0),
      });
      cell.graphics.use(
        new ex.Rectangle({
          width: CELL_SIZE,
          height: CELL_SIZE,
          color: ex.Color.fromHex(TYPE_COLOR[room.type.kind]),
          strokeColor: isCurrent ? HIGHLIGHT : ex.Color.Transparent,
          lineWidth: isCurrent ? 2 : 0,
        }),
      );
      this.addChild(cell);
      this.cells.push(cell);
    }
  }
}
