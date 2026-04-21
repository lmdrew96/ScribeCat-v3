import { CatDisplay } from '@/components/study-quest/cat-display';
import { CAT_VARIANTS } from '@/components/study-quest/cat-sprites';
import type { CatMood, CatVariant } from '@/components/study-quest/cat-sprites';
import { useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../../../convex/_generated/api';
import { useTripleClick } from './use-triple-click';

const KNOWN_VARIANTS = new Set<string>(CAT_VARIANTS.map((v) => v.id));

const STORAGE_KEY = 'scribecat-study-buddy-active';
const TRIGGER_SELECTOR = '[data-easter-egg-trigger]';

const SPRITE_SIZE = 40; // matches CatDisplay size="small"
const LERP = 0.18;
const VIEWPORT_PADDING = 32;
const IDLE_THRESHOLD_MS = 800;
const FLIP_DEADZONE = 5;

/**
 * Cursor-following cat companion. Toggled on/off by triple-clicking the app
 * title. The cat that appears is the user's actual `catCompanion` (queried
 * from Convex), so variant and name match what they adopted in StudyQuest.
 */
export function StudyBuddy() {
  const catState = useQuery(api.studyQuest.getCatState);

  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });
  // Whether the user has moved the cursor since the cat became active —
  // controls idle vs running animation.
  const [isMoving, setIsMoving] = useState(false);
  const [facing, setFacing] = useState<'left' | 'right'>('right');

  const spriteRef = useRef<HTMLDivElement>(null);
  // Latest cursor position (target) and smoothed sprite position (current).
  const targetRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const posRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastMoveAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  // Tracks whether the active state change was a user toggle (show toast)
  // vs. a restore from localStorage on mount (no toast).
  const userToggledRef = useRef(false);
  // Keep the latest facing accessible inside the RAF loop without re-subscribing.
  const facingRef = useRef<'left' | 'right'>('right');
  useEffect(() => {
    facingRef.current = facing;
  }, [facing]);

  const handleTripleClick = useTripleClick(() => {
    setActive((prev) => {
      const next = !prev;
      userToggledRef.current = true;
      return next;
    });
    // Visual pulse on the trigger element.
    const trigger = document.querySelector<HTMLElement>(TRIGGER_SELECTOR);
    if (trigger) {
      trigger.classList.add('easter-egg-active');
      window.setTimeout(() => trigger.classList.remove('easter-egg-active'), 500);
    }
  });

  // Attach triple-click to any element marked with the trigger attribute.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(TRIGGER_SELECTOR)) return;
      handleTripleClick();
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleTripleClick]);

  // Persist on/off to localStorage.
  useEffect(() => {
    if (active) {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [active]);

  // Toast on user-initiated activation.
  useEffect(() => {
    if (!active || !userToggledRef.current) return;
    userToggledRef.current = false;
    const name = catState?.name ?? 'Nugget';
    toast(`✨ ${name} is here to help! ✨`);
  }, [active, catState?.name]);

  // Mouse tracking + animation loop — only runs while active.
  useEffect(() => {
    if (!active) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function handleMouseMove(e: MouseEvent) {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      lastMoveAtRef.current = Date.now();
    }
    window.addEventListener('mousemove', handleMouseMove);

    // Reset to center on activation; first mouse move will relocate.
    posRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    targetRef.current = { ...posRef.current };

    function tick() {
      const pos = posRef.current;
      const target = targetRef.current;

      if (reducedMotion) {
        // Snap instead of lerp.
        pos.x = target.x;
        pos.y = target.y;
      } else {
        pos.x += (target.x - pos.x) * LERP;
        pos.y += (target.y - pos.y) * LERP;
      }

      // Viewport clamp — keep the sprite fully on-screen with padding.
      const minX = VIEWPORT_PADDING;
      const minY = VIEWPORT_PADDING;
      const maxX = window.innerWidth - VIEWPORT_PADDING - SPRITE_SIZE;
      const maxY = window.innerHeight - VIEWPORT_PADDING - SPRITE_SIZE;
      pos.x = Math.max(minX, Math.min(maxX, pos.x));
      pos.y = Math.max(minY, Math.min(maxY, pos.y));

      // Moving if the cursor moved recently.
      const movingNow = Date.now() - lastMoveAtRef.current < IDLE_THRESHOLD_MS;
      setIsMoving((prev) => (prev === movingNow ? prev : movingNow));

      // Sprite flip — only switch when cursor is clearly past the deadzone.
      const dx = target.x - pos.x;
      if (dx > FLIP_DEADZONE) setFacing((prev) => (prev === 'right' ? prev : 'right'));
      else if (dx < -FLIP_DEADZONE) setFacing((prev) => (prev === 'left' ? prev : 'left'));

      // Write transform + mark ready.
      const el = spriteRef.current;
      if (el) {
        const flip = facingRef.current === 'left' ? -1 : 1;
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) scaleX(${flip})`;
        if (el.dataset.ready !== 'true') el.dataset.ready = 'true';
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const el = spriteRef.current;
      if (el) delete el.dataset.ready;
    };
  }, [active]);

  if (!active) return null;
  // While the query is loading, don't render the sprite yet.
  if (catState === undefined) return null;

  const rawVariant = catState?.variant;
  const variant: CatVariant =
    rawVariant && KNOWN_VARIANTS.has(rawVariant) ? (rawVariant as CatVariant) : 'grey';
  const mood: CatMood = isMoving ? 'excited' : 'idle';

  return (
    <div ref={spriteRef} className="study-buddy-sprite" aria-hidden="true">
      <CatDisplay mood={mood} variant={variant} size="small" />
    </div>
  );
}
