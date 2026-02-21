import { useEffect, useState } from 'react';
import type { CatMood, CatVariant } from './cat-sprites';
import { MOOD_TO_SPRITE, SPRITE_CONFIG, getSpriteUrl } from './cat-sprites';

interface CatDisplayProps {
  mood: CatMood;
  variant: CatVariant;
  size: 'small' | 'large';
}

/** Display size in px for each size variant */
const DISPLAY_SIZE = { small: 48, large: 80 } as const;

export function CatDisplay({ mood, variant, size }: CatDisplayProps) {
  const [frame, setFrame] = useState(0);

  const animation = MOOD_TO_SPRITE[mood];
  const config = SPRITE_CONFIG[animation];
  const displaySize = DISPLAY_SIZE[size];

  // Reset frame and start animation loop when animation changes
  useEffect(() => {
    setFrame(0);
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % config.frameCount);
    }, config.frameDuration);
    return () => clearInterval(timer);
  }, [config.frameCount, config.frameDuration]);

  const spriteUrl = getSpriteUrl(variant, animation);

  return (
    <div
      style={{
        width: displaySize,
        height: displaySize,
        backgroundImage: `url(${spriteUrl})`,
        backgroundPosition: `${-frame * displaySize}px 0`,
        backgroundSize: `auto ${displaySize}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}
