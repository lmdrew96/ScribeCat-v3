import { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  audioLevel?: number; // 0-1, from audio analyzer
}

export function AudioWaveform({ isActive, audioLevel = 0 }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const dataArrayRef = useRef<number[]>(Array(64).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = width / dataArrayRef.current.length;
      const barGap = 1;

      // Shift array left and add new value
      if (isActive) {
        dataArrayRef.current.shift();
        dataArrayRef.current.push(audioLevel);
      } else {
        // Decay to zero when inactive
        dataArrayRef.current = dataArrayRef.current.map((v) => v * 0.9);
      }

      // Draw bars
      dataArrayRef.current.forEach((value, i) => {
        const barHeight = Math.max(height * value, 2); // Minimum 2px height
        const x = i * barWidth;
        const y = (height - barHeight) / 2;

        // Gradient based on activity
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        if (isActive) {
          gradient.addColorStop(0, 'hsl(262.1, 83.3%, 57.8%)');
          gradient.addColorStop(1, 'hsl(262.1, 83.3%, 57.8%, 0.6)');
        } else {
          gradient.addColorStop(0, 'rgba(100, 116, 139, 0.3)');
          gradient.addColorStop(1, 'rgba(100, 116, 139, 0.1)');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - barGap, barHeight);
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, audioLevel]);

  return (
    <div className="flex h-16 items-center justify-center rounded-lg bg-[var(--transcript-bg)] px-3">
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
