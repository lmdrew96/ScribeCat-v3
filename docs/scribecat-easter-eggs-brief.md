# ScribeCat v3 — Easter Eggs (Full Port)

**ChaosPatch:** `revisit easter eggs from ScribeCat v2` (in_progress)
**Repo:** `lmdrew96/scribecat-v3`
**Source repo (reference):** `lmdrew96/ScribeCat-v2`

---

## Scope

Five easter eggs. Mix of v2 ports and one new feature using existing v3 infrastructure.

| # | Trigger | Effect | Type |
|---|---|---|---|
| 1 | Type "nyan" | Super Rainbow Mode (~30s) | Port from v2 |
| 2 | Konami code (↑↑↓↓←→←→BA) | Cat Party — 200 falling cats | Port from v2 (no sound) |
| 3 | Triple-click app title | Study Buddy — user's cat companion follows cursor | New feature using existing assets |
| 4 | Open dev tools | Console ASCII cat + welcome message | Port from v2 |
| 5 | Theme picker | Two new "Nyan Cat" themes (dark + light) | New themes added to existing system |

---

## What v3 already has (don't rebuild this stuff)

- **Theme system:** `src/renderer/components/theme-provider.tsx`. Theme strings: `default | soft-focus | blackout | chaos-cat | high-contrast-dark | high-contrast-light`. Stored as `localStorage['scribecat-theme']`, applied via `<html data-theme="…">`. CSS lives in `src/renderer/styles/globals.css` keyed off `[data-theme="…"]` selectors.
- **Theme picker UI:** `src/renderer/components/settings-modal.tsx` — `themes` array (line ~67) defines `{ id, name, colors: [4 hex strings] }` for each theme.
- **Cat companion system:** Convex schema has `catCompanion` table. API in `convex/studyQuest.ts` exposes `getCatState`, `adoptCat`, `changeVariant`, `renameCat`. Each cat has `{ userId, name, variant, totalXp, level, mood, ... }`. Default name is `"Nugget"`, default variant is `"grey"`.
- **Cat sprite assets:** `public/cats/{variant}/{state}.png` — 11 variants (`bengal`, `black`, `demon`, `egypt`, `grey`, `siamese`, `tricolor`, `vampire`, `white`, `wizard`, `xmas`) × 8 states (`idle`, `idle2`, `run`, `attack`, `hurt`, `jump`, `sitting`, `sleep`).
- **Toast system:** Sonner is mounted in `App.tsx` with `<Toaster position="top-right" richColors closeButton />`. Use `import { toast } from 'sonner'`.
- **Auth:** Clerk via `@clerk/clerk-react`. User must be signed in to query their cat — Study Buddy needs to handle the unauthenticated/no-cat-yet case gracefully.

---

## v2 reference files (read for logic, do NOT copy verbatim)

| File | What to extract |
|---|---|
| `src/renderer/effects/nyan-effects.ts` | Canvas drawing logic, sparkle generation, rainbow trail tapering |
| `src/renderer/utils/easter-eggs.ts` | `KonamiCodeDetector`, `KeyboardSequenceDetector`, `triggerCatParty`, `createFallingCat`, `StudyBuddy` (the cursor-following pattern, but adapt to use v3's catCompanion) |
| `src/renderer/app-init/AppEasterEggs.ts` | Console ASCII art, orchestration pattern |
| `src/renderer/themes/easter-egg-themes.ts` | Color palettes for the two Nyan Cat themes |

Direct links:
- https://github.com/lmdrew96/ScribeCat-v2/blob/main/src/renderer/effects/nyan-effects.ts
- https://github.com/lmdrew96/ScribeCat-v2/blob/main/src/renderer/utils/easter-eggs.ts
- https://github.com/lmdrew96/ScribeCat-v2/blob/main/src/renderer/app-init/AppEasterEggs.ts
- https://github.com/lmdrew96/ScribeCat-v2/blob/main/src/renderer/themes/easter-egg-themes.ts

---

## Per-easter-egg specs

### 1. Super Rainbow Mode (type "nyan")

Type **n-y-a-n** anywhere outside an input/textarea:

- Canvas overlay (fixed, full viewport, `pointer-events: none`, `z-index: 50`)
- 6-stripe rainbow band follows the cursor — tapered (thin at tail, full width at cursor head), smoothed motion (lerp factor 0.15), rounded line caps
- Twinkling sparkles spawn along the trail and ambient — random colors, twinkle via `sin(life * 0.3)`, lifespan 30-50 frames
- Screen shake on activation: `gsap.to(document.body, { x: [-4, 4, -3, 3, -2, 2, 0], y: [-2, 2, -1, 1, 0], duration: 0.5, ease: 'power2.out' })`
- Rainbow wave pulse from screen center, expanding outward to viewport edge over ~1 second
- 50-particle explosion at center on activation
- Effects gradually fade out over 30 seconds (intensity from 1.0 → 0.0)
- Sonner toast: `toast('✨ NYAN! SUPER RAINBOW MODE! ✨')`

**Rainbow colors (6 stripes):** `#FF0000`, `#FF9900`, `#FFFF00`, `#33FF00`, `#0099FF`, `#6633FF`

**Detection:** Track typed lowercase chars in a buffer, reset after 2 seconds of inactivity. Skip when `e.target` is `HTMLInputElement` or `HTMLTextAreaElement`. Match against the literal string `'nyan'`.

### 2. Cat Party (Konami code)

Press **↑ ↑ ↓ ↓ ← → ← → B A** anywhere:

- 200 cat emojis spawn at the top of the viewport, fall to the bottom
- Cycles through 12 cat emojis: 🐱 😸 😺 😻 🐈 😹 😼 😽 🙀 😿 😾 🐈‍⬛
- Each cat: random `left: {0-100}%`, random rotation `0-360deg` via CSS variable, random fall duration 3-5s
- Spawn staggered every 50ms (cascade effect, not all-at-once)
- Each cat removes itself from the DOM after its animation ends (no leak)
- Sonner toast: `toast('🐈 CAT PARTY! 🎉')`
- **No sound** — cat-themed UI sounds are out of scope here. Keep it silent for this patch.

**Detection:** Track sequence of `e.code` values matching `['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']`. Reset on wrong key. Different shape from "nyan" detection (code-based, not character-based) — needs its own hook.

### 3. Study Buddy (triple-click app title)

Triple-click the app title (or top-bar logo — Cody's call on best target element) to toggle the cursor-following cat:

- **The cat that appears IS the user's `catCompanion`** — query `getCatState` from Convex via `useQuery(api.studyQuest.getCatState)`
- If cat exists, use its `variant` field to pick the sprite folder: `/cats/{variant}/idle.png`, `/cats/{variant}/idle2.png`, `/cats/{variant}/run.png`
- If `getCatState` returns null (user hasn't adopted yet), fall back to `'grey'` variant — same default as `adoptCat`
- **Animation states:**
  - **Idle (no recent mouse movement, >800ms since last move):** alternate between `idle.png` and `idle2.png` every ~500ms (breathing animation, very Stardew Valley)
  - **Running (mouse moved within last 800ms):** show `run.png`
- **Sprite flip:** if cursor is to the left of cat, `transform: scaleX(-1)`. If to the right, `transform: scaleX(1)`. Only flip when horizontal delta > 5px to avoid jitter.
- **Movement:** smooth easing follow with factor `0.18`. Keep within viewport bounds with 32px padding.
- **Toggle:** triple-click toggles ON/OFF. Persist active state to `localStorage['scribecat-study-buddy-active']` so it survives reloads.
- **Visual feedback on activation:** add `easter-egg-active` class to the title element for 500ms (Cody's call on what that animation is — could be a subtle pulse).
- Sonner toast on first activation: `toast(\`✨ \${cat.name} is here to help! ✨\`)` — uses the cat's actual name from the data.

**Sprite element:** `<img src={spriteUrl} className="study-buddy-sprite" />` mounted as `position: fixed`, `pointer-events: none`, `z-index: 60`, sized to ~32-48px. Use `image-rendering: pixelated` so the pixel art doesn't blur.

**Triple-click detection:** clicks within 500ms of each other count toward the streak. Three in a row toggles. Reset on timeout.

### 4. Console ASCII Cat (open dev tools)

Fire styled `console.log` calls when the app mounts:

```
     /\_/\
    ( o.o )
     > ^ <
    /|   |\
   (_|   |_)

Curious cat found you! 👀
ScribeCat v{version} - Brought to You by ADHD: Agentic Development of Human Designs 🧠⚡️
Found a bug? Meow at us on GitHub!
https://github.com/lmdrew96/scribecat-v3
```

Styled console.log pattern (`%c` + CSS string):
- ASCII cat: `color: #00ffff; font-family: monospace; font-size: 16px;`
- "Curious cat" line: `color: #ff69b4; font-weight: bold; font-size: 14px;`
- Version line: `color: #ffd700; font-size: 12px;`
- Bug report line: `color: #c0c0c0; font-size: 11px;`

Get version from `package.json` via Vite's `define` config (or just hardcode for now — version display is a different patch).

### 5. Nyan Cat themes (settings → appearance)

Add **two new themes** to the existing 6 in `settings-modal.tsx` `themes` array:

```typescript
{
  id: 'nyan-cat-dark',
  name: 'Nyan Cat 🌈',
  colors: ['#0a0a1a', '#12001f', '#ff00ff', '#00ffff'],
},
{
  id: 'nyan-cat-light',
  name: 'Nyan Cat Light 🌈',
  colors: ['#fff0ff', '#ffe0ff', '#ff00aa', '#330033'],
},
```

Update the `Theme` union in `theme-provider.tsx`:
```typescript
export type Theme =
  | 'default'
  | 'soft-focus'
  | 'blackout'
  | 'chaos-cat'
  | 'high-contrast-dark'
  | 'high-contrast-light'
  | 'nyan-cat-dark'      // new
  | 'nyan-cat-light';    // new
```

And the `isValidTheme` array.

Add CSS rules in `globals.css` for `[data-theme="nyan-cat-dark"]` and `[data-theme="nyan-cat-light"]` — use the existing theme block as a template for which CSS variables to set. Reference the v2 `easter-egg-themes.ts` palette for fuller color mappings (background tiers, accent, hover, text tiers, border, shadow).

**No "unlock" gating** — these themes appear in the picker like any other. Keeps the implementation simple and means people can find them by browsing settings, which is its own kind of delight.

---

## File structure

Drop into `src/renderer/components/easter-eggs/`:

```
easter-eggs/
├── easter-eggs.tsx              # Top-level component, mounted in App.tsx
├── nyan-mode.tsx                # The nyan canvas effect component
├── cat-party.ts                 # triggerCatParty function + createFallingCat helper
├── study-buddy.tsx              # Cursor-following cat companion sprite
├── console-art.ts               # printConsoleArt function
├── use-keyboard-sequence.ts     # Hook for typed-string detection (powers nyan)
├── use-konami-code.ts           # Hook for the Konami sequence
└── use-triple-click.ts          # Hook for triple-click detection
```

Update existing files:
- `src/renderer/components/theme-provider.tsx` — add new theme strings
- `src/renderer/components/settings-modal.tsx` — add to `themes` array
- `src/renderer/styles/globals.css` — add `[data-theme="nyan-cat-dark"]` and `[data-theme="nyan-cat-light"]` blocks; add `.falling-cat` and `.study-buddy-sprite` styles

Mount in `App.tsx` inside `AuthenticatedApp`:

```tsx
return (
  <>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
    <Toaster position="top-right" richColors closeButton />
    <EasterEggs />  {/* ← here */}
  </>
);
```

---

## Required globals.css additions

```css
/* Cat Party falling cats */
.falling-cat {
  position: fixed;
  top: -50px;
  font-size: 2rem;
  pointer-events: none;
  z-index: 60;
  animation: cat-fall linear forwards;
  transform: rotate(var(--rotation));
}

@keyframes cat-fall {
  to {
    transform: translateY(calc(100vh + 100px)) rotate(var(--rotation));
  }
}

/* Study Buddy cat sprite */
.study-buddy-sprite {
  position: fixed;
  pointer-events: none;
  z-index: 60;
  width: 48px;
  height: 48px;
  image-rendering: pixelated;
  transition: none; /* movement handled by JS positioning */
}

@media (prefers-reduced-motion: reduce) {
  .falling-cat { display: none; }
  /* Study Buddy still appears but skips smooth easing — snap to cursor */
}

/* Title pulse on Study Buddy activation */
.easter-egg-active {
  animation: easter-egg-pulse 500ms ease-out;
}

@keyframes easter-egg-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

---

## Adaptation notes (v2 → v3)

### DO
- Build everything as React components/hooks. Mount globally inside `App.tsx` after authentication so we have Convex auth context for the cat query.
- Use `useEffect` for global event listeners with proper cleanup.
- Use `useRef<HTMLCanvasElement>` for the nyan canvas. Render it in JSX, not via `document.createElement`.
- Use `requestAnimationFrame` for animation loops, store IDs in refs for cleanup.
- Use Sonner for all easter egg notifications.
- Use `useQuery(api.studyQuest.getCatState)` for the Study Buddy cat data.
- Add GSAP for the nyan screen shake: `pnpm add gsap` in the appropriate workspace.
- Extract reusable detection logic as hooks (`useKeyboardSequence`, `useKonamiCode`, `useTripleClick`).
- For Cat Party, use imperative `document.body.appendChild` for the falling cats — 200 short-lived elements don't need React state churn.
- Respect `prefers-reduced-motion: reduce` for nyan canvas + falling cats. Toasts and console art still fire. Study Buddy can still appear but should snap to cursor instead of smooth easing.

### DON'T
- Don't port the SoundManager. v3 already has `lib/notification-sounds.ts`. If we want cat-themed sounds, that's a separate patch on the existing system.
- Don't port the rainbow click counter (no 🌈 emoji in v3 UI).
- Don't import any v2 sprite assets — `public/cats/` already has everything.
- Don't gate themes behind an "unlock" mechanism. They're just themes.
- Don't put the nyan canvas above Sonner z-index. Canvas at 50, Sonner is higher by default.
- Don't use `localStorage` for "have they unlocked stuff" — these are always available once mounted.

---

## Acceptance criteria

### Nyan mode
- [ ] Typing `nyan` outside an input triggers Super Rainbow Mode
- [ ] Effects last ~30 seconds, fade gradually
- [ ] Cursor trail renders as 6-stripe rainbow with proper taper
- [ ] Sparkles spawn and twinkle
- [ ] Screen shake fires on activation
- [ ] Rainbow wave pulses from center
- [ ] Sonner toast announces activation

### Cat Party
- [ ] Konami code (↑↑↓↓←→←→BA) triggers Cat Party
- [ ] 200 cat emojis fall, staggered every 50ms
- [ ] Cats use 12 different emoji variants with random position + rotation
- [ ] Cats clean themselves from the DOM after animation
- [ ] Sonner toast announces activation
- [ ] Silent — no sounds

### Study Buddy
- [ ] Triple-clicking the app title toggles Study Buddy on/off
- [ ] The cat that appears matches the user's `catCompanion.variant` (queried from Convex)
- [ ] Falls back to `grey` variant if no cat adopted yet
- [ ] Idle animation alternates `idle.png` and `idle2.png` every ~500ms when stationary
- [ ] Switches to `run.png` when cursor moves
- [ ] Sprite flips horizontally based on cursor direction (with 5px deadzone to avoid jitter)
- [ ] Smooth easing follow with viewport boundary keeping
- [ ] Active state persists across page reloads via `localStorage`
- [ ] Sonner toast on first activation uses the cat's actual name
- [ ] `image-rendering: pixelated` keeps sprites crisp

### Console ASCII Cat
- [ ] On app load, dev tools console shows the styled ASCII cat
- [ ] All four message lines styled correctly (cyan, hot pink, gold, silver)
- [ ] Bug report URL points to v3 repo

### Nyan Cat Themes
- [ ] Two new theme cards appear in Settings → Appearance
- [ ] Selecting either applies the theme via `data-theme` attribute
- [ ] Theme persists to `localStorage` like all other themes
- [ ] CSS for both themes is defined in `globals.css`

### General
- [ ] All event listeners and animation frames clean up on unmount (no leaks, no zombie loops)
- [ ] `prefers-reduced-motion: reduce` skips canvas + falling cats but keeps toasts/console/Study Buddy (snap mode)
- [ ] No regressions: app loads, recording works, routing works, themes still switch normally
- [ ] `biome check` passes
- [ ] Manual smoke test: dev tools (ASCII cat) → type nyan (rainbow) → konami code (cat shower) → triple-click title (cat companion appears) → toggle Nyan Cat Light theme (everything goes pink)

---

## Out of scope

- **Cat-themed sound effects** (purr on actions, etc.) → separate patch using existing `notification-sounds.ts` infra
- **StudyQuest game port** → its own open ChaosPatch (`Cat Companion -> StudyQuest game`)
- **Theme system rebuild** → v3's existing system is fine; we're just adding to it
- **Trippy nuggy easter egg** → separate patch if we want a "secret nugget appearance" trigger (the asset is sitting in `public/` waiting for a moment)

---

## When done

1. Mark the ChaosPatch as done (`cp_complete_patch` with patch_id `b0fbfeec-8f20-4380-b233-109eab259be3`)
2. Tell Nae so she can:
   - Open dev tools → cat
   - Type `nyan` → rainbow chaos
   - ↑↑↓↓←→←→BA → cat shower
   - Triple-click title → her actual cat companion appears
   - Settings → switch to Nyan Cat Light → bonus mood lift
3. If Nae's still riding the delight train, suggest follow-ups:
   - Trippy Nuggy easter egg (asset already exists)
   - Cat-themed UI sound layer on top of `notification-sounds`
