import { useEffect, useRef } from 'react';

interface NyanModeProps {
  onComplete: () => void;
}

const RAINBOW = ['#FF0000', '#FF9900', '#FFFF00', '#33FF00', '#0099FF', '#6633FF'];
const STRIPE_WIDTH = 6;
const TRAIL_LENGTH = 48;
const LERP = 0.15;
const DURATION_MS = 30_000;
const SPARKLE_COLORS = ['#FFFFFF', '#FFD700', '#FF69B4', '#00FFFF', '#FF00FF', '#FFFF00'];

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface WavePulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startedAt: number;
}

/**
 * Full-viewport canvas overlay for Super Rainbow Mode. Follows the cursor
 * with a tapered 6-stripe rainbow trail, spawns twinkling sparkles, fires
 * a wave pulse + particle explosion on activation, and fades out over 30s.
 *
 * Skipped entirely when prefers-reduced-motion is set — toast still fires from
 * the parent, this component just calls onComplete immediately.
 */
export function NyanMode({ onComplete }: NyanModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      const timer = window.setTimeout(() => onCompleteRef.current(), 100);
      return () => window.clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      if (!canvas) return;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Smoothed "head" of the trail, initialized at viewport center
    let headX = width / 2;
    let headY = height / 2;
    let targetX = width / 2;
    let targetY = height / 2;

    // Trail is a history of head positions (newest first)
    const trail: { x: number; y: number }[] = [];
    const sparkles: Sparkle[] = [];
    const pulses: WavePulse[] = [];

    function handleMouseMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
    }
    window.addEventListener('mousemove', handleMouseMove);

    // Activation: wave pulse + particle explosion at center
    const cx = width / 2;
    const cy = height / 2;
    pulses.push({
      x: cx,
      y: cy,
      radius: 0,
      maxRadius: Math.hypot(width, height) / 2 + 50,
      startedAt: performance.now(),
    });
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2;
      const speed = 4 + Math.random() * 6;
      sparkles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
        size: 2 + Math.random() * 3,
      });
    }

    // Screen shake on activation via CSS class
    document.body.classList.add('nyan-screen-shake');
    const shakeTimer = window.setTimeout(() => {
      document.body.classList.remove('nyan-screen-shake');
    }, 500);

    const startedAt = performance.now();
    let rafId = 0;

    function frame(now: number) {
      if (!ctx) return;
      const elapsed = now - startedAt;
      const intensity = Math.max(0, 1 - elapsed / DURATION_MS);

      if (elapsed >= DURATION_MS) {
        onCompleteRef.current();
        return;
      }

      // Smooth cursor follow
      headX += (targetX - headX) * LERP;
      headY += (targetY - headY) * LERP;
      trail.unshift({ x: headX, y: headY });
      if (trail.length > TRAIL_LENGTH) trail.pop();

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = intensity;

      // Draw rainbow trail — 6 parallel tapered stripes
      if (trail.length >= 2) {
        for (let s = 0; s < RAINBOW.length; s++) {
          const stripeOffset = (s - (RAINBOW.length - 1) / 2) * STRIPE_WIDTH;
          ctx.strokeStyle = RAINBOW[s];
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          for (let i = 0; i < trail.length - 1; i++) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy) || 1;
            // Perpendicular unit vector
            const nx = -dy / dist;
            const ny = dx / dist;

            // Taper: full width near head (i=0), narrow toward tail
            const t = i / (trail.length - 1);
            const taper = (1 - t) ** 1.6;
            ctx.lineWidth = Math.max(0.5, STRIPE_WIDTH * taper);

            ctx.beginPath();
            ctx.moveTo(p1.x + nx * stripeOffset, p1.y + ny * stripeOffset);
            ctx.lineTo(p2.x + nx * stripeOffset, p2.y + ny * stripeOffset);
            ctx.stroke();
          }
        }
      }

      // Trail sparkles — spawn along the recent head path
      if (trail.length > 0 && Math.random() < 0.6 * intensity) {
        const p = trail[Math.floor(Math.random() * Math.min(6, trail.length))];
        sparkles.push({
          x: p.x + (Math.random() - 0.5) * 40,
          y: p.y + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          size: 1.5 + Math.random() * 2.5,
        });
      }

      // Ambient sparkles — scattered across the viewport
      if (Math.random() < 0.15 * intensity) {
        sparkles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0,
          vy: 0,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          size: 1 + Math.random() * 2,
        });
      }

      // Update + draw sparkles
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const sp = sparkles[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.96;
        sp.vy *= 0.96;
        sp.life += 1;
        if (sp.life >= sp.maxLife) {
          sparkles.splice(i, 1);
          continue;
        }
        const twinkle = 0.5 + 0.5 * Math.sin(sp.life * 0.3);
        const fade = 1 - sp.life / sp.maxLife;
        ctx.globalAlpha = intensity * fade * twinkle;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = intensity;

      // Draw wave pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        const pulseElapsed = now - pulse.startedAt;
        const pulseT = pulseElapsed / 1000;
        if (pulseT >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        pulse.radius = pulse.maxRadius * pulseT;
        const pulseAlpha = (1 - pulseT) * intensity;
        for (let s = 0; s < RAINBOW.length; s++) {
          ctx.strokeStyle = RAINBOW[s];
          ctx.lineWidth = 3;
          ctx.globalAlpha = pulseAlpha * 0.6;
          ctx.beginPath();
          ctx.arc(pulse.x, pulse.y, Math.max(0, pulse.radius - s * 8), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = intensity;
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
      window.clearTimeout(shakeTimer);
      document.body.classList.remove('nyan-screen-shake');
    };
  }, []);

  return <canvas ref={canvasRef} className="nyan-canvas" />;
}
