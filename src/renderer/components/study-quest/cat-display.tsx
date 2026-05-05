import { useEffect, useState } from 'react';
import type { CatMood, CatVariant } from './cat-sprites';
import { MOOD_TO_SPRITE, SPRITE_CONFIG, getSpriteUrl } from './cat-sprites';
import { getEvolutionVisuals } from './cat-evolution';

interface CatDisplayProps {
  mood: CatMood;
  variant: CatVariant;
  size: 'xsmall' | 'small' | 'large';
  /** Cat level — drives evolution aura + accessory. Defaults to 1 (no evolution). */
  level?: number;
}

/** Display size in px for each size variant */
const DISPLAY_SIZE = { xsmall: 28, small: 40, large: 80 } as const;
/** Accessory glyph size relative to the display size */
const ACCESSORY_SCALE = { xsmall: 0.5, small: 0.5, large: 0.32 } as const;

export function CatDisplay({ mood, variant, size, level = 1 }: CatDisplayProps) {
  const [frame, setFrame] = useState(0);

  const animation = MOOD_TO_SPRITE[mood];
  const config = SPRITE_CONFIG[animation];
  const displaySize = DISPLAY_SIZE[size];
  const evolution = getEvolutionVisuals(level);
  const hasAura = evolution.tier > 0;

  // Reset frame and start animation loop when animation changes
  useEffect(() => {
    setFrame(0);
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % config.frameCount);
    }, config.frameDuration);
    return () => clearInterval(timer);
  }, [config.frameCount, config.frameDuration]);

  const spriteUrl = getSpriteUrl(variant, animation);
  const accessorySize = Math.round(displaySize * ACCESSORY_SCALE[size]);

  return (
    <div
      className="relative"
      style={{ width: displaySize, height: displaySize }}
      title={hasAura ? evolution.accessoryLabel : undefined}
    >
      {hasAura && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            // Soft radial glow centered on the cat
            background: `radial-gradient(circle, ${evolution.auraColor} 0%, transparent 70%)`,
            transform: 'scale(1.25)',
          }}
        />
      )}
      <div
        className="relative"
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
      {evolution.accessory && (
        <span
          aria-label={evolution.accessoryLabel}
          className="pointer-events-none absolute -top-1 -right-1 leading-none"
          style={{ fontSize: accessorySize }}
        >
          {evolution.accessory}
        </span>
      )}
    </div>
  );
}
