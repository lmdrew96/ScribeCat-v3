import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel?: number; // 0-1, from audio analyzer
}

export function AudioWaveform({ isActive, audioLevel = 0 }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const dataArrayRef = useRef<number[]>(Array(64).fill(0));

  // Mirror props into refs so the rAF loop reads the latest values without
  // tearing down and rebuilding the effect on every render.
  const isActiveRef = useRef(isActive);
  const audioLevelRef = useRef(audioLevel);
  isActiveRef.current = isActive;
  audioLevelRef.current = audioLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const barWidth = width / dataArrayRef.current.length;
    const barGap = 1;

    // Build gradients once — they're static per state and creating them per
    // frame was a real cost.
    const activeGradient = ctx.createLinearGradient(0, 0, 0, height);
    activeGradient.addColorStop(0, 'hsl(262.1, 83.3%, 57.8%)');
    activeGradient.addColorStop(1, 'hsl(262.1, 83.3%, 57.8%, 0.6)');

    const idleGradient = ctx.createLinearGradient(0, 0, 0, height);
    idleGradient.addColorStop(0, 'rgba(100, 116, 139, 0.3)');
    idleGradient.addColorStop(1, 'rgba(100, 116, 139, 0.1)');

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (isActiveRef.current) {
        dataArrayRef.current.shift();
        dataArrayRef.current.push(audioLevelRef.current);
      } else {
        // Decay to zero when inactive
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          dataArrayRef.current[i] *= 0.9;
        }
      }

      ctx.fillStyle = isActiveRef.current ? activeGradient : idleGradient;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const value = dataArrayRef.current[i];
        const barHeight = Math.max(height * value, 2);
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - barGap, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    const start = () => {
      if (animationFrameRef.current === undefined) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    const stop = () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stop();
    };
  }, []);

  return (
    <div className="flex h-[4.5rem] items-center justify-center rounded-xl glass-light px-4">
      <canvas
        ref={canvasRef}
        width={480}
        height={64}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}
