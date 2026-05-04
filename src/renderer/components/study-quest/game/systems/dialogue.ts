/**
 * DialogueOverlay — a screen-anchored text box for NPC conversations.
 *
 * Lives in the scene full-time; toggled via show/advance/close. Sits above
 * world actors (z=1000). The scene checks `active` to suppress player movement
 * and routes Space presses to `advance()`.
 */

import * as ex from 'excalibur';

const MARGIN = 20;
const BOX_HEIGHT = 100;
const PADDING = 12;
const SPEAKER_FONT_SIZE = 12;
const BODY_FONT_SIZE = 14;
const HINT_FONT_SIZE = 10;

export class DialogueOverlay extends ex.ScreenElement {
  isOpen = false;

  private speakerLabel: ex.Label;
  private bodyLabel: ex.Label;
  private hintLabel: ex.Label;

  private speakerName = '';
  private lines: string[] = [];
  private currentLine = 0;

  constructor(viewportWidth: number, viewportHeight: number) {
    const boxWidth = viewportWidth - MARGIN * 2;
    super({
      pos: ex.vec(MARGIN, viewportHeight - BOX_HEIGHT - MARGIN),
      anchor: ex.vec(0, 0),
      width: boxWidth,
      height: BOX_HEIGHT,
      z: 1000,
    });

    this.graphics.use(
      new ex.Rectangle({
        width: boxWidth,
        height: BOX_HEIGHT,
        color: ex.Color.fromHex('#1e1830ee'),
        strokeColor: ex.Color.fromHex('#dfa649'),
        lineWidth: 2,
      }),
    );

    this.speakerLabel = new ex.Label({
      pos: ex.vec(PADDING, PADDING),
      anchor: ex.vec(0, 0),
      text: '',
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: SPEAKER_FONT_SIZE,
        unit: ex.FontUnit.Px,
        color: ex.Color.fromHex('#dfa649'),
        textAlign: ex.TextAlign.Left,
      }),
    });
    this.bodyLabel = new ex.Label({
      pos: ex.vec(PADDING, PADDING + SPEAKER_FONT_SIZE + 8),
      anchor: ex.vec(0, 0),
      text: '',
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: BODY_FONT_SIZE,
        unit: ex.FontUnit.Px,
        color: ex.Color.White,
        textAlign: ex.TextAlign.Left,
      }),
    });
    this.hintLabel = new ex.Label({
      pos: ex.vec(boxWidth - PADDING, BOX_HEIGHT - PADDING - HINT_FONT_SIZE),
      anchor: ex.vec(1, 0),
      text: '',
      font: new ex.Font({
        family: 'system-ui, sans-serif',
        size: HINT_FONT_SIZE,
        unit: ex.FontUnit.Px,
        color: ex.Color.fromHex('#8cbdb9'),
        textAlign: ex.TextAlign.Right,
      }),
    });

    this.addChild(this.speakerLabel);
    this.addChild(this.bodyLabel);
    this.addChild(this.hintLabel);
    this.setVisible(false);
  }

  show(speaker: string, lines: string[]): void {
    if (lines.length === 0) return;
    this.speakerName = speaker;
    this.lines = lines;
    this.currentLine = 0;
    this.isOpen = true;
    this.refresh();
    this.setVisible(true);
  }

  advance(): void {
    if (!this.isOpen) return;
    if (this.currentLine < this.lines.length - 1) {
      this.currentLine++;
      this.refresh();
    } else {
      this.close();
    }
  }

  close(): void {
    this.isOpen = false;
    this.lines = [];
    this.currentLine = 0;
    this.setVisible(false);
  }

  private refresh(): void {
    this.speakerLabel.text = this.speakerName;
    this.bodyLabel.text = this.lines[this.currentLine] ?? '';
    const isLast = this.currentLine >= this.lines.length - 1;
    this.hintLabel.text = isLast ? '[SPACE] close' : '[SPACE] continue';
  }

  private setVisible(v: boolean): void {
    this.graphics.isVisible = v;
    this.speakerLabel.graphics.isVisible = v;
    this.bodyLabel.graphics.isVisible = v;
    this.hintLabel.graphics.isVisible = v;
  }
}
