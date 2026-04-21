import { useEffect, useRef } from 'react';

const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
] as const;

/**
 * Fires `onMatch` when the user presses the Konami code sequence.
 * Uses `e.code` (physical key) so it works across keyboard layouts.
 * Resets on any mismatched key.
 */
export function useKonamiCode(onMatch: () => void): void {
  const indexRef = useRef(0);
  const callbackRef = useRef(onMatch);

  useEffect(() => {
    callbackRef.current = onMatch;
  }, [onMatch]);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const expected = KONAMI_SEQUENCE[indexRef.current];
      if (e.code === expected) {
        indexRef.current += 1;
        if (indexRef.current === KONAMI_SEQUENCE.length) {
          indexRef.current = 0;
          callbackRef.current();
        }
      } else {
        // Allow restart if the mismatched key happens to be the first in the sequence
        indexRef.current = e.code === KONAMI_SEQUENCE[0] ? 1 : 0;
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);
}
