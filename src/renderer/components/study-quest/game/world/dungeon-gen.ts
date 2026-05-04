/**
 * Dungeon procgen — random-spanning-tree floor generator.
 *
 * Grows a tree of 6-10 rooms by random walk on a graph grid, then assigns
 * room types using BFS distances from Start:
 *   - Boss = room at max distance
 *   - Exit = leaf NOT on the Start→Boss path (regenerates if none exists)
 *   - Treasure / Rest fill remaining leaves
 *   - Enemy fills internal rooms
 *
 * Deterministic if you pass a seeded RNG; defaults to Math.random.
 */

import { type DoorDir, type Floor, type Room, type RoomType, oppositeDir } from './dungeon-types';

const MIN_ROOMS = 6;
const MAX_ROOMS = 10;
const MAX_REGEN_ATTEMPTS = 20;

const DIR_OFFSETS: Record<DoorDir, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

const DIR_FROM_OFFSET: Record<string, DoorDir> = {
  '0,-1': 'north',
  '0,1': 'south',
  '1,0': 'east',
  '-1,0': 'west',
};

type Rng = () => number;

function pick<T>(arr: T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function coordKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

interface GraphNode {
  id: string;
  gx: number;
  gy: number;
  doors: Partial<Record<DoorDir, string>>;
}

function buildSpanningTree(roomCount: number, rng: Rng): GraphNode[] {
  const nodes = new Map<string, GraphNode>();
  const startKey = coordKey(0, 0);
  nodes.set(startKey, { id: 'r0', gx: 0, gy: 0, doors: {} });

  let nextId = 1;
  while (nodes.size < roomCount) {
    const existing = Array.from(nodes.values());
    const parent = pick(existing, rng);

    const dirs = shuffle(Object.keys(DIR_OFFSETS) as DoorDir[], rng);
    let placed = false;
    for (const dir of dirs) {
      const off = DIR_OFFSETS[dir];
      const nx = parent.gx + off.dx;
      const ny = parent.gy + off.dy;
      const nKey = coordKey(nx, ny);
      if (nodes.has(nKey)) continue;

      const id = `r${nextId++}`;
      const child: GraphNode = { id, gx: nx, gy: ny, doors: {} };
      parent.doors[dir] = id;
      child.doors[oppositeDir(dir)] = parent.id;
      nodes.set(nKey, child);
      placed = true;
      break;
    }
    if (!placed) {
      // This parent has no open neighbors; loop picks another parent next iteration.
      // The loop terminates because at least one node always has a free neighbor
      // unless the tree fills a tight cluster — keep iterating until we hit roomCount.
      continue;
    }
  }

  return Array.from(nodes.values());
}

function bfsDistances(nodes: GraphNode[], startId: string): Map<string, number> {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const dist = new Map<string, number>();
  dist.set(startId, 0);
  const queue: string[] = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    const node = byId.get(id);
    if (!node) continue;
    const d = dist.get(id) ?? 0;
    for (const neighborId of Object.values(node.doors)) {
      if (neighborId === undefined) continue;
      if (dist.has(neighborId)) continue;
      dist.set(neighborId, d + 1);
      queue.push(neighborId);
    }
  }
  return dist;
}

function tracePath(
  nodes: GraphNode[],
  startId: string,
  endId: string,
): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const parent = new Map<string, string | null>();
  parent.set(startId, null);
  const queue: string[] = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    if (id === endId) break;
    const node = byId.get(id);
    if (!node) continue;
    for (const nid of Object.values(node.doors)) {
      if (nid === undefined) continue;
      if (parent.has(nid)) continue;
      parent.set(nid, id);
      queue.push(nid);
    }
  }

  const path = new Set<string>();
  let cur: string | null | undefined = endId;
  while (cur !== null && cur !== undefined) {
    path.add(cur);
    cur = parent.get(cur) ?? null;
  }
  return path;
}

function degree(node: GraphNode): number {
  return Object.values(node.doors).filter((v) => v !== undefined).length;
}

function tryGenerate(rng: Rng): Floor | null {
  const roomCount = MIN_ROOMS + Math.floor(rng() * (MAX_ROOMS - MIN_ROOMS + 1));
  const nodes = buildSpanningTree(roomCount, rng);
  if (nodes.length < MIN_ROOMS) return null;

  const startNode = nodes[0]; // spanning tree always starts at r0
  const distances = bfsDistances(nodes, startNode.id);

  // Boss = node with max distance from start.
  let bossNode = startNode;
  let bossDist = -1;
  for (const node of nodes) {
    const d = distances.get(node.id) ?? 0;
    if (d > bossDist) {
      bossDist = d;
      bossNode = node;
    }
  }
  if (bossNode.id === startNode.id) return null;

  const startToBoss = tracePath(nodes, startNode.id, bossNode.id);

  // Exit candidates: leaves NOT on the start→boss path.
  const leaves = nodes.filter((n) => degree(n) === 1 && n.id !== startNode.id);
  const exitCandidates = leaves.filter((n) => !startToBoss.has(n.id) && n.id !== bossNode.id);
  if (exitCandidates.length === 0) return null;

  // Pick the exit candidate furthest from start (more interesting routing).
  let exitNode = exitCandidates[0];
  let exitDist = -1;
  for (const n of exitCandidates) {
    const d = distances.get(n.id) ?? 0;
    if (d > exitDist) {
      exitDist = d;
      exitNode = n;
    }
  }

  // Assign types.
  const rooms: Record<string, Room> = {};
  let treasureBudget = Math.max(1, Math.floor(roomCount / 4));
  let restBudget = Math.max(1, Math.floor(roomCount / 5));

  for (const node of nodes) {
    let type: RoomType;
    if (node.id === startNode.id) {
      type = { kind: 'start' };
    } else if (node.id === bossNode.id) {
      type = { kind: 'boss', bossId: 'phase2-boss' };
    } else if (node.id === exitNode.id) {
      type = { kind: 'exit' };
    } else if (degree(node) === 1 && treasureBudget > 0) {
      treasureBudget--;
      type = { kind: 'treasure', itemId: `loot-${node.id}` };
    } else if (degree(node) === 1 && restBudget > 0) {
      restBudget--;
      type = { kind: 'rest' };
    } else {
      // Internal node — sprinkle Rest occasionally if budget remains.
      if (restBudget > 0 && rng() < 0.25) {
        restBudget--;
        type = { kind: 'rest' };
      } else {
        type = { kind: 'enemy', enemyId: `enemy-${node.id}` };
      }
    }
    rooms[node.id] = {
      id: node.id,
      gx: node.gx,
      gy: node.gy,
      type,
      doors: { ...node.doors },
    };
  }

  return {
    rooms,
    startRoomId: startNode.id,
    bossRoomId: bossNode.id,
    exitRoomId: exitNode.id,
  };
}

/** Build a fresh floor. Retries with a fresh tree if Exit has no valid leaf. */
export function generateFloor(rng: Rng = Math.random): Floor {
  for (let i = 0; i < MAX_REGEN_ATTEMPTS; i++) {
    const floor = tryGenerate(rng);
    if (floor) return floor;
  }
  throw new Error('Failed to generate dungeon floor after max attempts');
}

/** Re-export for the scene to avoid cross-file noise. */
export { DIR_OFFSETS, DIR_FROM_OFFSET };
