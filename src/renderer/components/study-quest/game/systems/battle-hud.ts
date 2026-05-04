/**
 * Battle HUD — screen-anchored UI for the BattleScene.
 *
 * Three pieces:
 *   - HpBar:        thin labeled bar showing current/max HP
 *   - ActionMenu:   three numbered actions (Study Strike, Quick Attack, Defend)
 *   - QuestionModal: prompt + four numbered multiple-choice options
 *
 * Keyboard-driven (digits 1-3 / 1-4) so we don't have to wire pointer
 * input. Each panel exposes setActive() — only the active one consumes
 * keys, and the scene flips the flag based on its turn-state machine.
 */

import * as ex from 'excalibur';
import type { Question } from '../combat/questions';

const PANEL_BG = ex.Color.fromHex('#1e1830ee');
const PANEL_STROKE = ex.Color.fromHex('#dfa649');
const TEXT_PRIMARY = ex.Color.White;
const TEXT_DIM = ex.Color.fromHex('#dbd5e2');
const TEXT_HINT = ex.Color.fromHex('#8cbdb9');
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

// ─── ActionMenu ─────────────────────────────────────────────────────

const ACTION_KEYS = [ex.Keys.Digit1, ex.Keys.Digit2, ex.Keys.Digit3] as const;

export type BattleAction = 'study-strike' | 'quick-attack' | 'defend';

interface ActionEntry {
  action: BattleAction;
  label: string;
}

const ACTIONS: ActionEntry[] = [
  { action: 'study-strike', label: 'Study Strike' },
  { action: 'quick-attack', label: 'Quick Attack' },
  { action: 'defend', label: 'Defend' },
];

const MENU_WIDTH = 260;
const MENU_HEIGHT = 110;
const MENU_PADDING = 12;

export class ActionMenu extends ex.ScreenElement {
  isActive = false;
  onSelect?: (action: BattleAction) => void;

  private hintLabel: ex.Label;
  private actionLabels: ex.Label[] = [];

  constructor(x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      anchor: ex.vec(0, 0),
      width: MENU_WIDTH,
      height: MENU_HEIGHT,
      z: 1000,
    });

    this.graphics.use(
      new ex.Rectangle({
        width: MENU_WIDTH,
        height: MENU_HEIGHT,
        color: PANEL_BG,
        strokeColor: PANEL_STROKE,
        lineWidth: 2,
      }),
    );

    this.hintLabel = new ex.Label({
      pos: ex.vec(MENU_PADDING, MENU_PADDING),
      anchor: ex.vec(0, 0),
      text: 'Choose an action:',
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: 11,
        unit: ex.FontUnit.Px,
        color: TEXT_HINT,
        textAlign: ex.TextAlign.Left,
      }),
    });
    this.addChild(this.hintLabel);

    ACTIONS.forEach((entry, i) => {
      const label = new ex.Label({
        pos: ex.vec(MENU_PADDING, MENU_PADDING + 18 + i * 22),
        anchor: ex.vec(0, 0),
        text: `[${i + 1}] ${entry.label}`,
        font: new ex.Font({
          family: 'system-ui, sans-serif',
          size: 14,
          unit: ex.FontUnit.Px,
          color: TEXT_PRIMARY,
          textAlign: ex.TextAlign.Left,
        }),
      });
      this.actionLabels.push(label);
      this.addChild(label);
    });

    this.setVisible(false);
  }

  setActive(v: boolean): void {
    this.isActive = v;
    this.setVisible(v);
  }

  override onPostUpdate(engine: ex.Engine): void {
    if (!this.isActive) return;
    const kb = engine.input.keyboard;
    for (let i = 0; i < ACTIONS.length; i++) {
      if (kb.wasPressed(ACTION_KEYS[i])) {
        this.onSelect?.(ACTIONS[i].action);
        return;
      }
    }
  }

  private setVisible(v: boolean): void {
    this.graphics.isVisible = v;
    this.hintLabel.graphics.isVisible = v;
    for (const label of this.actionLabels) label.graphics.isVisible = v;
  }
}

// ─── QuestionModal ──────────────────────────────────────────────────

const ANSWER_KEYS = [ex.Keys.Digit1, ex.Keys.Digit2, ex.Keys.Digit3, ex.Keys.Digit4] as const;

const Q_WIDTH = 460;
const Q_HEIGHT = 200;
const Q_PADDING = 14;

export class QuestionModal extends ex.ScreenElement {
  isActive = false;
  onAnswer?: (correct: boolean) => void;

  private question?: Question;
  private promptLabel: ex.Label;
  private choiceLabels: ex.Label[] = [];

  constructor(x: number, y: number) {
    super({
      pos: ex.vec(x, y),
      anchor: ex.vec(0, 0),
      width: Q_WIDTH,
      height: Q_HEIGHT,
      z: 1100,
    });

    this.graphics.use(
      new ex.Rectangle({
        width: Q_WIDTH,
        height: Q_HEIGHT,
        color: PANEL_BG,
        strokeColor: PANEL_STROKE,
        lineWidth: 2,
      }),
    );

    this.promptLabel = new ex.Label({
      pos: ex.vec(Q_PADDING, Q_PADDING),
      anchor: ex.vec(0, 0),
      text: '',
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: 14,
        unit: ex.FontUnit.Px,
        color: TEXT_PRIMARY,
        textAlign: ex.TextAlign.Left,
      }),
    });
    this.addChild(this.promptLabel);

    for (let i = 0; i < 4; i++) {
      const label = new ex.Label({
        pos: ex.vec(Q_PADDING, Q_PADDING + 36 + i * 26),
        anchor: ex.vec(0, 0),
        text: '',
        font: new ex.Font({
          family: 'system-ui, sans-serif',
          size: 13,
          unit: ex.FontUnit.Px,
          color: TEXT_DIM,
          textAlign: ex.TextAlign.Left,
        }),
      });
      this.choiceLabels.push(label);
      this.addChild(label);
    }

    this.setVisible(false);
  }

  show(question: Question): void {
    this.question = question;
    this.promptLabel.text = question.prompt;
    for (let i = 0; i < 4; i++) {
      this.choiceLabels[i].text = `[${i + 1}] ${question.choices[i] ?? ''}`;
    }
    this.isActive = true;
    this.setVisible(true);
  }

  hide(): void {
    this.isActive = false;
    this.question = undefined;
    this.setVisible(false);
  }

  override onPostUpdate(engine: ex.Engine): void {
    if (!this.isActive || !this.question) return;
    const kb = engine.input.keyboard;
    for (let i = 0; i < 4; i++) {
      if (kb.wasPressed(ANSWER_KEYS[i])) {
        const correct = i === this.question.answerIndex;
        const cb = this.onAnswer;
        this.hide();
        cb?.(correct);
        return;
      }
    }
  }

  private setVisible(v: boolean): void {
    this.graphics.isVisible = v;
    this.promptLabel.graphics.isVisible = v;
    for (const label of this.choiceLabels) label.graphics.isVisible = v;
  }
}

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
