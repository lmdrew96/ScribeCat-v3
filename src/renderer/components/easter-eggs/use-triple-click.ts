import { useCallback, useRef } from 'react';

const WINDOW_MS = 500;

/**
 * Returns an onClick handler that fires `onTriple` when called three times
 * within WINDOW_MS of each other. Attach it to any element — e.g. the app title.
 */
export function useTripleClick(onTriple: () => void): () => void {
  const countRef = useRef(0);
  const lastClickRef = useRef(0);
  const callbackRef = useRef(onTriple);
  callbackRef.current = onTriple;

  return useCallback(() => {
    const now = Date.now();
    if (now - lastClickRef.current > WINDOW_MS) {
      countRef.current = 1;
    } else {
      countRef.current += 1;
    }
    lastClickRef.current = now;

    if (countRef.current >= 3) {
      countRef.current = 0;
      callbackRef.current();
    }
  }, []);
}
