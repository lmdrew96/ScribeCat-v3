import { useEffect, useState } from 'react';
import { CAT_SPRITES, type CatMood, MOOD_FRAME_DURATION, pixelsToBoxShadow } from './cat-sprites';

interface CatDisplayProps {
  mood: CatMood;
  size: 'small' | 'large';
}

const SCALE = { small: 3, large: 5 } as const;
const GRID_SIZE = 16;

export function CatDisplay({ mood, size }: CatDisplayProps) {
  const [frame, setFrame] = useState(0);
  const scale = SCALE[size];

  useEffect(() => {
    setFrame(0);
    const interval = MOOD_FRAME_DURATION[mood];
    const timer = setInterval(() => setFrame((f) => (f + 1) % 2), interval);
    return () => clearInterval(timer);
  }, [mood]);

  const sprites = CAT_SPRITES[mood];
  const boxShadow = pixelsToBoxShadow(sprites[frame], scale);

  const moodClass =
    mood === 'excited'
      ? 'cat-mood-excited'
      : mood === 'sleepy'
        ? 'cat-mood-sleepy'
        : mood === 'studying'
          ? 'cat-mood-studying'
          : 'cat-mood-idle';

  return (
    <div
      className={moodClass}
      style={{
        width: GRID_SIZE * scale,
        height: GRID_SIZE * scale,
        position: 'relative',
      }}
    >
      <div
        className="cat-sprite"
        style={{
          width: scale,
          height: scale,
          boxShadow,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}
