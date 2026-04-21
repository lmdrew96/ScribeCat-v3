const CAT_EMOJIS = ['🐱', '😸', '😺', '😻', '🐈', '😹', '😼', '😽', '🙀', '😿', '😾', '🐈‍⬛'];
const CAT_COUNT = 200;
const SPAWN_INTERVAL_MS = 50;

function createFallingCat(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'falling-cat';
  el.textContent = CAT_EMOJIS[Math.floor(Math.random() * CAT_EMOJIS.length)];

  const left = Math.random() * 100;
  const rotation = Math.floor(Math.random() * 360);
  const duration = 3 + Math.random() * 2;

  el.style.left = `${left}%`;
  el.style.setProperty('--rotation', `${rotation}deg`);
  el.style.animationDuration = `${duration}s`;

  el.addEventListener(
    'animationend',
    () => {
      el.remove();
    },
    { once: true },
  );

  return el;
}

/**
 * Spawns 200 falling cat emojis, staggered every 50ms, that clean themselves
 * up after their fall animation ends. Imperative DOM — avoids churning React state.
 */
export function triggerCatParty(): void {
  // Respect reduced motion — the CSS hides `.falling-cat` already, but we can
  // also skip spawning to avoid DOM bloat.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (let i = 0; i < CAT_COUNT; i++) {
    window.setTimeout(() => {
      document.body.appendChild(createFallingCat());
    }, i * SPAWN_INTERVAL_MS);
  }
}
