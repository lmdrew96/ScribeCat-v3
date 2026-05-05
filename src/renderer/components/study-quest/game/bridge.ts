/**
 * Bridge — typed channel between Excalibur scenes and React/Convex.
 *
 * Two channels:
 *   - events  — game → React (XP gained, battle won, etc.)
 *   - state   — React → game (current mood, etc.) read by scenes/actors
 *
 * Excalibur owns rendering + game logic. Convex owns persistence. React is the glue.
 * Don't import Convex from inside scenes.
 */

import type { CatMood } from '../cat-sprites';
import type { BattleAction } from './systems/battle-hud';
import type { Question } from './combat/questions';

export type GameEvent =
  | { type: 'xp-gained'; amount: number; source: string }
  | { type: 'battle-won'; enemyId: string }
  | { type: 'battle-lost'; enemyId: string }
  | { type: 'mood-change'; mood: CatMood }
  | { type: 'item-found'; itemId: string }
  | { type: 'quest-complete'; questId: string }
  // Battle UI is rendered as React overlay over the canvas (Excalibur's
  // ScreenElement rendering wedged in our setup; HTML is more accessible
  // and easier to style anyway). The scene emits the *prompt* events when
  // it needs the player to pick something; the React overlay emits the
  // *resolved* events when the player has chosen.
  | { type: 'battle-action-prompt' }
  | { type: 'battle-action-resolved'; action: BattleAction }
  | { type: 'battle-question-prompt'; question: Question }
  | { type: 'battle-question-resolved'; correct: boolean }
  | { type: 'battle-overlay-clear' };

export type GameEventType = GameEvent['type'];

type EventOfType<T extends GameEventType> = Extract<GameEvent, { type: T }>;
type Listener<T extends GameEventType> = (event: EventOfType<T>) => void;

export interface GameState {
  mood: CatMood;
  /** Player HP — survives across battles, resets on dungeon entry. */
  playerHp: number;
  playerMaxHp: number;
  /** Equipment-derived combat bonuses, synced from Convex by React. */
  playerAttackBonus: number;
  playerDefenseBonus: number;
}

export const PLAYER_MAX_HP = 100;

class GameBridge {
  private listeners = new Map<GameEventType, Set<(event: GameEvent) => void>>();
  readonly state: GameState = {
    mood: 'idle',
    playerHp: PLAYER_MAX_HP,
    playerMaxHp: PLAYER_MAX_HP,
    playerAttackBonus: 0,
    playerDefenseBonus: 0,
  };

  on<T extends GameEventType>(type: T, listener: Listener<T>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    const wrapped = listener as (event: GameEvent) => void;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }

  emit(event: GameEvent): void {
    const set = this.listeners.get(event.type);
    if (!set) return;
    for (const listener of set) listener(event);
  }

  setState(patch: Partial<GameState>): void {
    Object.assign(this.state, patch);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameBridge = new GameBridge();
