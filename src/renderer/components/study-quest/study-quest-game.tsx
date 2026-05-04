/**
 * StudyQuestGame — mounts the Excalibur engine into a canvas element.
 *
 * Engine is created once per mount and disposed on unmount. A ref guard
 * survives React 19 strict-mode double-effects without leaking engines.
 */

import { useEffect, useRef, useState } from 'react';
import type { CatMood, CatVariant } from './cat-sprites';
import { gameBridge } from './game/bridge';
import { createGameEngine, type GameHandle } from './game/engine';

interface StudyQuestGameProps {
  variant: CatVariant;
  mood: CatMood;
  width?: number;
  height?: number;
}

export function StudyQuestGame({ variant, mood, width = 640, height = 480 }: StudyQuestGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (handleRef.current) return;

    let cancelled = false;
    const handle = createGameEngine({ canvas, variant, width, height });
    handleRef.current = handle;

    handle.ready.catch((err) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Failed to start game');
    });

    return () => {
      cancelled = true;
      handle.dispose();
      handleRef.current = null;
    };
  }, [variant, width, height]);

  useEffect(() => {
    gameBridge.setState({ mood });
  }, [mood]);

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-[var(--glass-border)] bg-[#1e1830]"
        style={{ imageRendering: 'pixelated' }}
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
