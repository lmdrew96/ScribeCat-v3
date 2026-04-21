import { useEffect, useRef } from 'react';

const RESET_MS = 2000;

/**
 * Fires `onMatch` when the user types `target` anywhere outside an input,
 * textarea, or contentEditable element. Buffer resets after RESET_MS of
 * inactivity.
 */
export function useKeyboardSequence(target: string, onMatch: () => void): void {
  const bufferRef = useRef('');
  const timerRef = useRef<number | null>(null);
  const callbackRef = useRef(onMatch);

  useEffect(() => {
    callbackRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    const lowerTarget = target.toLowerCase();

    function handleKeydown(e: KeyboardEvent) {
      // Skip when typing in a text field
      const el = e.target;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (el instanceof HTMLElement && el.isContentEditable) return;

      // Only single printable characters advance the buffer
      if (e.key.length !== 1) return;

      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-lowerTarget.length);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        bufferRef.current = '';
        timerRef.current = null;
      }, RESET_MS);

      if (bufferRef.current === lowerTarget) {
        bufferRef.current = '';
        callbackRef.current();
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [target]);
}
