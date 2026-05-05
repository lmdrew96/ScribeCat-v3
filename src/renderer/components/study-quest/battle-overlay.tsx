/**
 * BattleOverlay — React layer over the Excalibur canvas for the battle UI.
 *
 * The action menu and question modal live here (not inside Excalibur)
 * because Excalibur's renderer wouldn't display child Actors of a
 * ScreenElement reliably in our setup. HTML is also better for text:
 * wrapping, accessibility, theming all just work.
 *
 * Communication happens via gameBridge:
 *   game → React: 'battle-action-prompt', 'battle-question-prompt',
 *                 'battle-overlay-clear'
 *   React → game: 'battle-action-resolved', 'battle-question-resolved'
 *
 * Keyboard shortcuts (1/2/3 for actions, 1-4 for answers) are handled
 * here too — they listen on window so they fire even when the canvas
 * has focus.
 */

import { useEffect, useState } from 'react';
import { gameBridge } from './game/bridge';
import type { Question } from './game/combat/questions';
import { BATTLE_ACTIONS } from './game/systems/battle-hud';

export function BattleOverlay() {
  const [actionPrompt, setActionPrompt] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    const offAction = gameBridge.on('battle-action-prompt', () => {
      setActionPrompt(true);
      setQuestion(null);
    });
    const offQuestion = gameBridge.on('battle-question-prompt', (event) => {
      setActionPrompt(false);
      setQuestion(event.question);
    });
    const offClear = gameBridge.on('battle-overlay-clear', () => {
      setActionPrompt(false);
      setQuestion(null);
    });
    return () => {
      offAction();
      offQuestion();
      offClear();
    };
  }, []);

  useEffect(() => {
    if (!actionPrompt && !question) return;
    const onKey = (event: KeyboardEvent) => {
      if (actionPrompt) {
        const idx = parseInt(event.key, 10) - 1;
        if (idx >= 0 && idx < BATTLE_ACTIONS.length) {
          event.preventDefault();
          pickAction(idx);
        }
      } else if (question) {
        const idx = parseInt(event.key, 10) - 1;
        if (idx >= 0 && idx < question.choices.length) {
          event.preventDefault();
          pickAnswer(idx);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actionPrompt, question]);

  const pickAction = (idx: number) => {
    const entry = BATTLE_ACTIONS[idx];
    if (!entry) return;
    setActionPrompt(false);
    gameBridge.emit({ type: 'battle-action-resolved', action: entry.action });
  };

  const pickAnswer = (idx: number) => {
    if (!question) return;
    const correct = idx === question.answerIndex;
    setQuestion(null);
    gameBridge.emit({ type: 'battle-question-resolved', correct });
  };

  if (!actionPrompt && !question) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-3">
      {actionPrompt && (
        <div className="pointer-events-auto rounded-md border border-[#dfa649] bg-[#1e1830ee] p-3 text-white shadow-lg">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-[#8cbdb9]">
            Choose an action
          </div>
          <div className="grid grid-cols-1 gap-1">
            {BATTLE_ACTIONS.map((entry, i) => (
              <button
                type="button"
                key={entry.action}
                onClick={() => pickAction(i)}
                className="flex items-center justify-between rounded border border-transparent px-2 py-1.5 text-left text-sm transition hover:border-[#dfa649] hover:bg-[#dfa64922] focus:outline-none focus:ring-1 focus:ring-[#dfa649]"
              >
                <span>
                  <span className="mr-2 inline-block w-5 text-center font-mono text-[#dfa649]">
                    {i + 1}
                  </span>
                  {entry.label}
                </span>
                <span className="ml-3 text-xs text-[#dbd5e2]/70">{entry.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {question && (
        <div className="pointer-events-auto rounded-md border border-[#dfa649] bg-[#1e1830ee] p-4 text-white shadow-lg">
          <div className="mb-3 text-sm font-medium">{question.prompt}</div>
          <div className="grid grid-cols-1 gap-1.5">
            {question.choices.map((choice, i) => (
              <button
                type="button"
                // biome-ignore lint/suspicious/noArrayIndexKey: choice index *is* the identity here
                key={i}
                onClick={() => pickAnswer(i)}
                className="flex items-center rounded border border-transparent px-2 py-1.5 text-left text-sm text-[#dbd5e2] transition hover:border-[#dfa649] hover:bg-[#dfa64922] focus:outline-none focus:ring-1 focus:ring-[#dfa649]"
              >
                <span className="mr-2 inline-block w-5 text-center font-mono text-[#dfa649]">
                  {i + 1}
                </span>
                {choice}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
