/**
 * BattleScene — turn-based combat between the cat and a single enemy.
 *
 * Activation data: `{ enemyId, roomId }` from DungeonScene. On exit:
 *   - victory  → goToScene('dungeon', { from: 'battle', won: true,  roomId })
 *   - defeat   → goToScene('town',    { from: 'battle-defeat' })
 *
 * State machine (see Phase typedef):
 *   INTRO → PLAYER_TURN → (AWAITING_ANSWER for Study Strike) → EXECUTING
 *         → ENEMY_TURN → EXECUTING → PLAYER_TURN ... → VICTORY | DEFEAT
 *
 * Player HP lives in `gameBridge.state.playerHp` (read at activate, written
 * back on every tick that changes it). Enemy HP is local to the scene.
 */

import * as ex from 'excalibur';
import { type CatVariant, SPRITE_CONFIG } from '../../cat-sprites';
import { gameBridge, PLAYER_MAX_HP } from '../bridge';
import { applyDamage, isDead } from '../combat/hp';
import { type EnemyTemplate, getEnemyTemplate } from '../combat/enemies';
import { pickQuestion } from '../combat/questions';
import { getCatResources } from '../resources';
import {
  ActionMenu,
  type BattleAction,
  HpBar,
  MessageBanner,
  QuestionModal,
} from '../systems/battle-hud';

export interface BattleSceneActivationData {
  enemyId: string;
  roomId: string;
}

export interface BattleSceneOptions {
  variant: CatVariant;
}

type Phase =
  | 'intro'
  | 'player-turn'
  | 'awaiting-answer'
  | 'executing-player'
  | 'enemy-turn'
  | 'executing-enemy'
  | 'victory'
  | 'defeat';

const STUDY_STRIKE_DAMAGE = 18;
const QUICK_ATTACK_DAMAGE = 8;
const DEFEND_REDUCTION = 0.5;

const ACTION_DELAY_FRAMES = 45;
const VICTORY_DELAY_FRAMES = 90;
const INTRO_DELAY_FRAMES = 60;

// Layout — 640×480 canvas
const CAT_POS = ex.vec(160, 240);
const ENEMY_POS = ex.vec(480, 240);
const PLAYER_HP_POS = { x: 16, y: 12 };
const ENEMY_HP_POS = { x: 640 - 220 - 16, y: 12 };
const BANNER_POS = { x: 90, y: 60 };
const MENU_POS = { x: 16, y: 360 };
const QUESTION_POS = { x: 90, y: 140 };

export class BattleScene extends ex.Scene {
  private variant: CatVariant;
  private enemyId?: string;
  private roomId?: string;
  private template?: EnemyTemplate;

  private phase: Phase = 'intro';
  private waitFrames = 0;
  private defendingNextHit = false;

  private enemyHp = 0;
  private enemyMaxHp = 1;

  private catActor?: ex.Actor;
  private enemyActor?: ex.Actor;
  private playerHpBar?: HpBar;
  private enemyHpBar?: HpBar;
  private banner?: MessageBanner;
  private actionMenu?: ActionMenu;
  private questionModal?: QuestionModal;

  constructor(options: BattleSceneOptions) {
    super();
    this.variant = options.variant;
  }

  override onInitialize(engine: ex.Engine): void {
    this.backgroundColor = ex.Color.fromHex('#1a1230');
    // Center the camera on the canvas — battle layout uses world coords
    // so (320, 240) is the visual middle of a 640×480 viewport.
    this.camera.pos = ex.vec(engine.halfDrawWidth, engine.halfDrawHeight);

    this.playerHpBar = new HpBar('You', PLAYER_HP_POS.x, PLAYER_HP_POS.y);
    this.enemyHpBar = new HpBar('Enemy', ENEMY_HP_POS.x, ENEMY_HP_POS.y);
    this.banner = new MessageBanner(BANNER_POS.x, BANNER_POS.y);
    this.actionMenu = new ActionMenu(MENU_POS.x, MENU_POS.y);
    this.questionModal = new QuestionModal(QUESTION_POS.x, QUESTION_POS.y);

    this.add(this.playerHpBar);
    this.add(this.enemyHpBar);
    this.add(this.banner);
    this.add(this.actionMenu);
    this.add(this.questionModal);

    this.actionMenu.onSelect = (action) => this.handleActionSelected(action);
    this.questionModal.onAnswer = (correct) => this.handleAnswered(correct);
  }

  override onActivate(ctx: ex.SceneActivationContext<BattleSceneActivationData>): void {
    const data = ctx.data;
    if (!data) {
      // Should never happen — bail back to dungeon defensively.
      void ctx.engine.goToScene('dungeon', { sceneActivationData: { from: 'battle', won: false } });
      return;
    }
    this.enemyId = data.enemyId;
    this.roomId = data.roomId;
    this.template = getEnemyTemplate(data.enemyId);
    this.enemyMaxHp = this.template.hp;
    this.enemyHp = this.template.hp;
    this.defendingNextHit = false;
    this.phase = 'intro';
    this.waitFrames = INTRO_DELAY_FRAMES;

    this.spawnCat();
    this.spawnEnemy(this.template);

    this.playerHpBar?.set(gameBridge.state.playerHp, gameBridge.state.playerMaxHp);
    this.enemyHpBar?.set(this.enemyHp, this.enemyMaxHp);
    this.banner?.set(`A ${this.template.displayName} blocks your path!`);
    this.actionMenu?.setActive(false);
    this.questionModal?.hide();
  }

  override onDeactivate(): void {
    if (this.catActor) {
      this.catActor.kill();
      this.catActor = undefined;
    }
    if (this.enemyActor) {
      this.enemyActor.kill();
      this.enemyActor = undefined;
    }
  }

  override onPostUpdate(engine: ex.Engine): void {
    switch (this.phase) {
      case 'intro':
        if (this.waitFrames > 0) {
          this.waitFrames--;
          return;
        }
        this.beginPlayerTurn();
        return;

      case 'player-turn':
      case 'awaiting-answer':
        // Sub-elements (ActionMenu / QuestionModal) consume input.
        return;

      case 'executing-player':
      case 'executing-enemy':
        if (this.waitFrames > 0) {
          this.waitFrames--;
          return;
        }
        this.advanceAfterExecution();
        return;

      case 'victory':
        if (this.waitFrames > 0) {
          this.waitFrames--;
          return;
        }
        void engine.goToScene('dungeon', {
          sceneActivationData: { from: 'battle', won: true, roomId: this.roomId },
        });
        return;

      case 'defeat':
        if (this.waitFrames > 0) {
          this.waitFrames--;
          return;
        }
        void engine.goToScene('town', { sceneActivationData: { from: 'dungeon' } });
        return;
    }
  }

  // ─── Phase transitions ─────────────────────────────────────

  private beginPlayerTurn(): void {
    this.phase = 'player-turn';
    this.banner?.set('Your turn — pick an action.');
    this.actionMenu?.setActive(true);
  }

  private handleActionSelected(action: BattleAction): void {
    if (this.phase !== 'player-turn') return;
    this.actionMenu?.setActive(false);

    switch (action) {
      case 'study-strike': {
        const tier = this.template?.tier ?? 'easy';
        const question = pickQuestion(tier);
        this.phase = 'awaiting-answer';
        this.banner?.set('Study Strike — answer correctly to land it.');
        this.questionModal?.show(question);
        return;
      }
      case 'quick-attack':
        this.banner?.set(`You jab for ${QUICK_ATTACK_DAMAGE} damage.`);
        this.dealEnemyDamage(QUICK_ATTACK_DAMAGE);
        this.beginExecution('player');
        return;
      case 'defend':
        this.defendingNextHit = true;
        this.banner?.set('You brace for the next hit.');
        this.beginExecution('player');
        return;
    }
  }

  private handleAnswered(correct: boolean): void {
    if (this.phase !== 'awaiting-answer') return;
    if (correct) {
      this.banner?.set(`Correct! You strike for ${STUDY_STRIKE_DAMAGE} damage.`);
      this.dealEnemyDamage(STUDY_STRIKE_DAMAGE);
    } else {
      // Pure miss per spec — no self-damage, just lose the turn.
      this.banner?.set('Wrong — your strike misses.');
    }
    this.beginExecution('player');
  }

  private beginExecution(side: 'player' | 'enemy'): void {
    this.phase = side === 'player' ? 'executing-player' : 'executing-enemy';
    this.waitFrames = ACTION_DELAY_FRAMES;
  }

  private advanceAfterExecution(): void {
    // Check end-of-battle conditions first.
    if (this.enemyHp <= 0) {
      this.handleVictory();
      return;
    }
    if (gameBridge.state.playerHp <= 0) {
      this.handleDefeat();
      return;
    }

    // If we just executed the player's action, it's now the enemy's turn.
    if (this.phase === 'executing-player') {
      this.runEnemyTurn();
      return;
    }
    // Otherwise enemy just moved — back to the player.
    this.beginPlayerTurn();
  }

  private runEnemyTurn(): void {
    if (!this.template) return;
    const baseDamage = this.template.attack;
    const finalDamage = this.defendingNextHit
      ? Math.round(baseDamage * DEFEND_REDUCTION)
      : baseDamage;
    this.banner?.set(
      this.defendingNextHit
        ? `${this.template.displayName} hits — your guard absorbs some (${finalDamage}).`
        : `${this.template.displayName} attacks for ${finalDamage}.`,
    );
    // Already applied Defend's modifier above — pass ignoreDefend so
    // dealPlayerDamage doesn't halve a second time.
    this.dealPlayerDamage(finalDamage, /* ignoreDefend */ true);
    this.defendingNextHit = false;
    this.beginExecution('enemy');
  }

  private handleVictory(): void {
    if (!this.template || !this.enemyId) return;
    this.phase = 'victory';
    this.waitFrames = VICTORY_DELAY_FRAMES;
    this.banner?.set(`Victory! +${this.template.xpReward} XP`);
    gameBridge.emit({ type: 'battle-won', enemyId: this.enemyId });
    gameBridge.emit({
      type: 'xp-gained',
      amount: this.template.xpReward,
      source: this.template.tier === 'boss' ? 'boss-victory' : 'battle-victory',
    });
  }

  private handleDefeat(): void {
    if (!this.enemyId) return;
    this.phase = 'defeat';
    this.waitFrames = VICTORY_DELAY_FRAMES;
    this.banner?.set('Defeated. Returning to town to recover...');
    gameBridge.emit({ type: 'battle-lost', enemyId: this.enemyId });
    // Reset HP so re-entering the dungeon starts fresh.
    gameBridge.setState({ playerHp: PLAYER_MAX_HP, playerMaxHp: PLAYER_MAX_HP });
  }

  // ─── HP application ───────────────────────────────────────

  private dealEnemyDamage(amount: number): void {
    this.enemyHp = applyDamage(this.enemyHp, this.enemyMaxHp, amount);
    this.enemyHpBar?.set(this.enemyHp, this.enemyMaxHp);
    if (isDead(this.enemyHp) && this.enemyActor) {
      this.enemyActor.graphics.opacity = 0.4;
    }
  }

  private dealPlayerDamage(amount: number, ignoreDefend = false): void {
    const reduced =
      !ignoreDefend && this.defendingNextHit ? Math.round(amount * DEFEND_REDUCTION) : amount;
    const next = applyDamage(gameBridge.state.playerHp, gameBridge.state.playerMaxHp, reduced);
    gameBridge.setState({ playerHp: next });
    this.playerHpBar?.set(next, gameBridge.state.playerMaxHp);
  }

  // ─── Sprites ──────────────────────────────────────────────

  private spawnCat(): void {
    if (this.catActor) {
      this.catActor.kill();
      this.catActor = undefined;
    }
    const resources = getCatResources(this.variant);
    const sheet = ex.SpriteSheet.fromImageSource({
      image: resources.idle,
      grid: {
        rows: 1,
        columns: SPRITE_CONFIG.idle.frameCount,
        spriteWidth: SPRITE_CONFIG.idle.frameSize,
        spriteHeight: SPRITE_CONFIG.idle.frameSize,
      },
    });
    const anim = ex.Animation.fromSpriteSheet(
      sheet,
      ex.range(0, SPRITE_CONFIG.idle.frameCount - 1),
      SPRITE_CONFIG.idle.frameDuration,
      ex.AnimationStrategy.Loop,
    );
    const actor = new ex.Actor({
      pos: CAT_POS,
      width: SPRITE_CONFIG.idle.frameSize * 2,
      height: SPRITE_CONFIG.idle.frameSize * 2,
      anchor: ex.vec(0.5, 0.5),
    });
    // Scale the cat 2× in the battle screen so it reads at distance.
    actor.graphics.use(anim);
    actor.scale = ex.vec(2, 2);
    this.add(actor);
    this.catActor = actor;
  }

  private spawnEnemy(template: EnemyTemplate): void {
    if (this.enemyActor) {
      this.enemyActor.kill();
      this.enemyActor = undefined;
    }
    const size = template.tier === 'boss' ? 96 : 72;
    const actor = new ex.Actor({
      pos: ENEMY_POS,
      width: size,
      height: size,
      anchor: ex.vec(0.5, 0.5),
    });
    actor.graphics.use(
      new ex.Rectangle({ width: size, height: size, color: ex.Color.fromHex(template.color) }),
    );
    this.add(actor);
    this.enemyActor = actor;
  }
}
