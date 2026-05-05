/**
 * Battle HUD — canvas-rendered pieces for the BattleScene.
 *
 * What lives here:
 *   - HpBar:        thin labeled bar showing current/max HP
 *   - MessageBanner: one-line status message at the top
 *   - BATTLE_ACTIONS / BattleAction: shared action types used by both the
 *     scene state machine and the React BattleOverlay
 *
 * Action menu and question modal used to live here as ScreenElements but
 * Excalibur's renderer wouldn't display child Actors of a ScreenElement
 * reliably in our setup. They've been moved to a React overlay
 * (`battle-overlay.tsx`) that subscribes to bridge events.
 */

import * as ex from 'excalibur';

const PANEL_BG = ex.Color.fromHex('#1e1830ee');
const PANEL_STROKE = ex.Color.fromHex('#dfa649');
const TEXT_PRIMARY = ex.Color.White;
const BAR_FILL = ex.Color.fromHex('#97d181');
const BAR_LOW = ex.Color.fromHex('#c14545');
const BAR_BG = ex.Color.fromHex('#2a2038');

// ─── HpBar ──────────────────────────────────────────────────────────

const BAR_WIDTH = 220;
const BAR_HEIGHT = 14;
const BAR_LABEL_HEIGHT = 14;
const HP_BAR_HEIGHT = BAR_HEIGHT + BAR_LABEL_HEIGHT + 6;

export class HpBar extends ex.ScreenElement {
  private label: ex.Label;
  private bgRect: ex.Actor;
  private fillRect: ex.Actor;
  private displayName: string;
  private current = 0;
  private max = 1;

  constructor(displayName: string, x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      anchor: ex.vec(0, 0),
      width: BAR_WIDTH,
      height: HP_BAR_HEIGHT,
      z: 1000,
    });
    this.displayName = displayName;

    this.label = new ex.Label({
      pos: ex.vec(0, 0),
      anchor: ex.vec(0, 0),
      text: displayName,
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: 12,
        unit: ex.FontUnit.Px,
        color: TEXT_PRIMARY,
        textAlign: ex.TextAlign.Left,
      }),
    });

    this.bgRect = new ex.Actor({
      pos: ex.vec(0, BAR_LABEL_HEIGHT + 2),
      anchor: ex.vec(0, 0),
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
    });
    this.bgRect.graphics.use(
      new ex.Rectangle({
        width: BAR_WIDTH,
        height: BAR_HEIGHT,
        color: BAR_BG,
        strokeColor: PANEL_STROKE,
        lineWidth: 1,
      }),
    );

    this.fillRect = new ex.Actor({
      pos: ex.vec(1, BAR_LABEL_HEIGHT + 3),
      anchor: ex.vec(0, 0),
      width: BAR_WIDTH - 2,
      height: BAR_HEIGHT - 2,
    });
    this.fillRect.graphics.use(
      new ex.Rectangle({ width: BAR_WIDTH - 2, height: BAR_HEIGHT - 2, color: BAR_FILL }),
    );

    this.addChild(this.label);
    this.addChild(this.bgRect);
    this.addChild(this.fillRect);
  }

  set(current: number, max: number): void {
    this.current = Math.max(0, current);
    this.max = Math.max(1, max);
    const ratio = this.current / this.max;
    const fillWidth = Math.max(0, Math.round((BAR_WIDTH - 2) * ratio));
    const color = ratio < 0.3 ? BAR_LOW : BAR_FILL;
    this.fillRect.graphics.use(
      new ex.Rectangle({ width: fillWidth, height: BAR_HEIGHT - 2, color }),
    );
    this.label.text = `${this.displayName}  ${this.current}/${this.max}`;
  }
}

// ─── BattleAction shared types ──────────────────────────────────────

export type BattleAction = 'study-strike' | 'quick-attack' | 'defend' | 'item';

interface ActionEntry {
  action: BattleAction;
  label: string;
  hint: string;
}

export const BATTLE_ACTIONS: readonly ActionEntry[] = [
  {
    action: 'study-strike',
    label: 'Study Strike',
    hint: 'Answer a question correctly to deal heavy damage.',
  },
  { action: 'quick-attack', label: 'Quick Attack', hint: 'Reliable, light damage. No question.' },
  { action: 'defend', label: 'Defend', hint: 'Halve the enemy’s next attack.' },
  { action: 'item', label: 'Item', hint: 'Use a healing potion from your bag.' },
] as const;

// ─── MessageBanner ──────────────────────────────────────────────────

const BANNER_WIDTH = 460;
const BANNER_HEIGHT = 44;

/** One-line status message at the top of the battle screen. */
export class MessageBanner extends ex.ScreenElement {
  private label: ex.Label;

  constructor(x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      anchor: ex.vec(0, 0),
      width: BANNER_WIDTH,
      height: BANNER_HEIGHT,
      z: 1000,
    });

    this.graphics.use(
      new ex.Rectangle({
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        color: PANEL_BG,
        strokeColor: PANEL_STROKE,
        lineWidth: 1,
      }),
    );

    this.label = new ex.Label({
      pos: ex.vec(BANNER_WIDTH / 2, BANNER_HEIGHT / 2),
      anchor: ex.vec(0.5, 0.5),
      text: '',
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: 13,
        unit: ex.FontUnit.Px,
        color: TEXT_PRIMARY,
        textAlign: ex.TextAlign.Center,
      }),
    });
    this.addChild(this.label);
  }

  set(text: string): void {
    this.label.text = text;
  }
}
