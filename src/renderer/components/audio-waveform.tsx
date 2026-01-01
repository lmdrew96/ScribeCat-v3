import { useEffect, useState } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
}

export function AudioWaveform({ isActive }: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>(Array(48).fill(0.3));

  useEffect(() => {
    if (!isActive) {
      setBars(Array(48).fill(0.3));
      return;
    }

    const interval = setInterval(() => {
      setBars(
        Array(48)
          .fill(0)
          .map(() => Math.random() * 0.7 + 0.3),
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex h-10 items-center justify-center gap-px rounded-lg bg-[var(--transcript-bg)] px-2">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-[var(--waveform)] transition-all duration-100"
          style={{
            height: `${height * 100}%`,
            opacity: isActive ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}
