# StudyQuest v3 — Game Spec

**Engine:** Excalibur.js (TypeScript-native)
**Stack integration:** Vite + React + Convex + Clerk
**Entry points:** Widget (existing, bottom-left overlay) + dedicated `/study-quest` route

---

## Architecture Overview

### How Excalibur lives in React

Excalibur renders into a `<canvas>` element. The React integration pattern:

```
src/renderer/components/study-quest/
├── study-quest-widget.tsx      # Existing Tamagotchi widget (keep as-is)
├── study-quest-game.tsx        # NEW: Full Excalibur game wrapper
├── cat-display.tsx             # Existing CSS sprite display
├── cat-name-editor.tsx         # Existing
├── cat-sprites.ts              # Existing
├── xp-progress.tsx             # Existing
└── game/                       # NEW: All Excalibur code lives here
    ├── engine.ts               # Engine singleton, scene registry
    ├── scenes/
    │   ├── town.ts             # Town exploration scene
    │   ├── dungeon.ts          # Dungeon exploration scene
    │   ├── battle.ts           # Turn-based combat scene
    │   └── title.ts            # Title/menu screen
    ├── actors/
    │   ├── player.ts           # Player cat actor
    │   ├── npc.ts              # NPC base actor
    │   └── enemy.ts            # Enemy actor
    ├── systems/
    │   ├── dialogue.ts         # Dialogue/text box system
    │   ├── combat.ts           # Combat logic + study content integration
    │   ├── dungeon-gen.ts      # Procedural dungeon generator (port from v2)
    │   └── inventory.ts        # Items/equipment
    ├── resources/
    │   ├── sprites.ts          # Sprite sheet loader + definitions
    │   ├── maps.ts             # Tiled map loader
    │   └── sounds.ts           # Sound effect registry
    └── bridge.ts               # React ↔ Excalibur communication layer
```

### The Bridge Pattern

The critical architectural piece: `bridge.ts` connects Excalibur's game loop to React/Convex state.

```typescript
// bridge.ts — event-based communication
type GameEvent =
  | { type: 'xp-gained'; amount: number; source: string }
  | { type: 'battle-won'; enemyId: string }
  | { type: 'mood-change'; mood: CatMood }
  | { type: 'item-found'; itemId: string }
  | { type: 'quest-complete'; questId: string };

// React side subscribes to events → calls Convex mutations
// Convex state feeds back into game via React props → bridge.setGameState()
```

**Key rule:** Excalibur owns rendering + game logic. Convex owns persistence. React is the glue. No direct Convex calls from inside Excalibur scenes.

### Route Setup

```typescript
// router.tsx addition
{ path: '/study-quest', element: <StudyQuestPage /> }
```

The widget stays as-is (Tamagotchi quick-view). Clicking "Play" in the widget navigates to `/study-quest` where the full Excalibur game loads.

---

## Phase Plan

### Phase 0: Engine Foundation

**Goal:** Excalibur renders inside ScribeCat, cat walks around a test room.

**Tasks:**
1. `pnpm add excalibur`
2. Create `study-quest-game.tsx` — React component that mounts Excalibur via `useRef<HTMLCanvasElement>` + `useEffect` for engine lifecycle
3. Create `engine.ts` — engine singleton with scene registry
4. Create `player.ts` — cat actor with sprite animation + WASD/arrow key movement
5. Create `bridge.ts` — skeleton event emitter
6. Create `/study-quest` route with the game component
7. Add "Play" button to existing widget that navigates to the route
8. Verify: cat renders, moves, engine starts/stops cleanly on route mount/unmount

**Acceptance:** Cat sprite moves with keyboard input on a colored background. No crashes on navigation away.

**Assets needed:** Cat sprite sheet (can start with the existing CSS sprites converted to a proper sheet, or placeholder colored rectangles — art comes later).

---

### Phase 1: Town

**Goal:** Small explorable town with collision, NPCs, and key locations.

**Tasks:**
1. Create town tilemap in Tiled → export as JSON
2. Create `town.ts` scene — loads tilemap, sets up collision layers
3. Implement camera follow on player
4. Create `npc.ts` actor — static NPCs with interaction radius
5. Create `dialogue.ts` system — text box overlay for NPC conversations
6. Key locations (visual markers, no interiors yet):
   - **Home** — cat's house (save point)
   - **Library** — study-themed NPC with tips
   - **Dungeon Gate** — entrance to dungeon (locked until Phase 2)
   - **Shop** — placeholder for future item shop
7. Connect mood state: cat's walk animation changes based on Convex mood value

**Acceptance:** Cat walks around town, bumps into walls, talks to NPCs. Dialogue boxes display and dismiss. Dungeon gate exists but shows "Coming soon" dialogue.

**Tilemap scope:** 40×30 tiles max. Keep it small and cozy — this isn't an open world.

---

### Phase 2: Dungeon

**Goal:** Procedural dungeon exploration with room transitions and enemy encounters.

**Tasks:**
1. Port `DungeonGenerator` logic from ScribeCat v2 (the procedural gen algorithm was preserved — `DungeonGenerator.ts` and `TownLayout.ts` still exist in the old repo)
2. Create `dungeon.ts` scene — renders current room, handles door transitions
3. Create `dungeon-gen.ts` system — generates room graph with types:
   - **Start room** — entry point, always safe
   - **Enemy rooms** — contain 1-3 enemies
   - **Rest rooms** — heal point
   - **Treasure rooms** — item rewards
   - **Boss room** — end of dungeon floor
   - **Exit** — returns to town (MUST ACTUALLY WORK THIS TIME)
4. Create `enemy.ts` actor — visible enemies in rooms (not random encounters)
5. Room transitions: walk to door edge → fade → load next room
6. Minimap: small overlay showing explored rooms + current position
7. **Position persistence:** when entering battle and returning, player resumes at their pre-battle position (the v2 bug where this was defined-but-never-checked)
8. Dungeon state persists during session but resets on exit to town (roguelike model)

**Acceptance:** Player enters dungeon from town, explores procedurally generated rooms, sees enemies, can navigate between rooms, can exit back to town. Position is maintained after battle return.

---

### Phase 3: Combat

**Goal:** Turn-based battle system where study content powers attacks.

**Tasks:**
1. Create `battle.ts` scene — JRPG-style battle screen (cat on left, enemy on right)
2. Create `combat.ts` system — turn-based logic:
   - **Attack options:**
     - **Study Strike** — answer a question from your session content → hit on correct, miss on wrong
     - **Quick Attack** — weaker hit, no question required (safety valve so combat isn't blocked by hard questions)
     - **Defend** — reduce damage next turn
     - **Item** — use consumable
   - **Enemy AI:** simple pattern-based (attack, sometimes buff/debuff)
3. **Study content integration:** pull questions from existing study tools data via the bridge:
   - Flashcard-style Q&A from `studyToolResults`
   - Weak spot topics get harder enemies
   - Correct answers → bonus XP
4. Battle rewards:
   - XP → flows through existing `xpUtils.ts` → Convex `studyQuest.ts`
   - Items (healing potions, stat boosts)
   - Boss drops (cosmetic unlocks for the cat)
5. Battle transitions: touching enemy in dungeon → screen wipe → battle scene → victory/defeat → return to dungeon at same position
6. Defeat handling: return to town, lose some gold (not XP — never punish studying)

**Acceptance:** Full battle loop works. Questions pull from actual study session data. XP updates reflect in widget. Defeat is forgiving.

---

### Phase 4: Polish & Progression

**Goal:** Make it feel good. Connect everything.

**Tasks:**
1. **Study → game hooks:**
   - Completing a recording session → cat mood boost + XP
   - Using study tools → unlock dungeon floors
   - Quiz scores → buff potions in inventory
   - Study streak → daily login bonus in game
2. **Equipment system:** simple weapon/armor that affects combat stats
3. **Cat evolution:** at certain levels, cat sprite gets visual upgrades (scarf at L5, crown at L10, wings at L20 — whatever fits)
4. **Sound design:** battle music, town ambiance, hit/miss SFX, level-up jingle (existing level-up sound can be reused)
5. **Save state:** Convex tables for dungeon progress, inventory, equipment
6. **NPC quests:** simple fetch quests ("study for 30 minutes" → reward)
7. **Boss variety:** each dungeon floor has a themed boss

**Acceptance:** Playing StudyQuest feels rewarding and directly connected to actual studying. The game loop reinforces the study loop.

---

## Convex Schema Additions

The existing `catCompanion` table handles name/variant/xp/level/mood. New tables needed:

```
gameInventory        — userId, items (array of {itemId, quantity})
gameEquipment        — userId, weapon, armor, accessory
gameDungeonProgress  — userId, highestFloor, currentFloor, currentRoom (nullable, session-only)
gameQuests           — userId, questId, status, progress
```

Keep it minimal. Don't over-schema before gameplay is proven.

---

## Asset Pipeline

**Sprites:** Start with placeholder colored rectangles → replace with pixel art later. The existing `cat-sprites.ts` CSS sprites can be converted to a proper sprite sheet PNG. Ashley can own the art pipeline once gameplay is solid.

**Tilemaps:** Tiled editor → JSON export → loaded via Excalibur's tilemap support. Store map JSONs in `assets/maps/`.

**Sounds:** Existing notification sounds in ScribeCat can be reused. New battle/town audio added to `assets/sounds/`.

**Recommendation for Ashley:** Set them up with Tiled + a sprite sheet tool (Free Texture Packer or ShoeBox). They design maps and organize sprites, you handle the engine code. Clean separation.

---

## What NOT to Build (Scope Guardrails)

- ❌ Multiplayer dungeons (was in v2, cut it)
- ❌ Quiz Battle / Jeopardy games (separate feature, not StudyQuest)
- ❌ Real-time combat (turn-based only)
- ❌ Multiple playable characters (cat only)
- ❌ Crafting systems
- ❌ Open world (small, contained town + dungeon floors)
- ❌ Cutscenes (dialogue boxes are enough)

---

## Implementation Order for Cody

When handing phases to Claude Code, each phase should be a separate branch:

1. `feat/studyquest-engine` — Phase 0
2. `feat/studyquest-town` — Phase 1
3. `feat/studyquest-dungeon` — Phase 2
4. `feat/studyquest-combat` — Phase 3
5. `feat/studyquest-polish` — Phase 4

Each phase merges to `main` before the next begins. No parallel phase work — that's how v2 got messy.

---

## Known Pitfalls from v2 (Don't Repeat These)

| v2 Bug | Root Cause | v3 Prevention |
|--------|-----------|---------------|
| Post-battle position reset | `returnFromBattle` flag defined but never checked | Bridge pattern: battle scene emits `battle-complete` event with saved position |
| Dungeon exit broken | No code handled `exit` room type | Room type enum with exhaustive switch — TypeScript will catch missing cases |
| NPCs as rectangles | No sprite component, just canvas primitives | Actor-based architecture — every entity is an Excalibur Actor with a sprite |
| Enemies as circles with "!" | Same as NPCs | Same fix — Actor + sprite from day one |
| Game state lost on navigation | No cleanup/restore on React unmount | Engine singleton with `pause()`/`resume()` on route changes, Convex for persistence |
