import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  appendSegments,
  copySegments,
  deleteSegments,
  readSegments,
  replaceSegments,
} from '../convex/transcriptSegments';

/**
 * A stand-in for Convex's db covering exactly what the segment helpers use:
 * get/insert/patch/delete, and a by_session index query that can be ordered
 * and collected or reduced to its first row.
 *
 * These helpers move real transcripts between storage shapes, so the chunk
 * arithmetic is worth testing directly rather than only through types.
 */
function fakeCtx() {
  const sessions = new Map<string, Record<string, unknown>>();
  const chunks = new Map<string, Record<string, unknown>>();
  let nextId = 1;

  const db = {
    get: async (id: string) => sessions.get(id) ?? chunks.get(id) ?? null,
    insert: async (table: string, doc: Record<string, unknown>) => {
      const _id = `${table}-${nextId++}`;
      const row = { ...doc, _id };
      (table === 'sessions' ? sessions : chunks).set(_id, row);
      return _id;
    },
    patch: async (id: string, fields: Record<string, unknown>) => {
      const row = sessions.get(id) ?? chunks.get(id);
      if (!row) throw new Error(`no such row ${id}`);
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) delete row[key];
        else row[key] = value;
      }
    },
    delete: async (id: string) => {
      chunks.delete(id);
    },
    query: (_table: string) => ({
      withIndex: (_index: string, build: (q: unknown) => unknown) => {
        let sessionId = '';
        build({
          eq: (_field: string, value: string) => {
            sessionId = value;
            return { eq: () => ({}) };
          },
        });
        const rows = () =>
          [...chunks.values()]
            .filter((c) => c.sessionId === sessionId)
            .sort((a, b) => (a.chunkIndex as number) - (b.chunkIndex as number));
        const ordered = (dir: 'asc' | 'desc') => {
          const list = rows();
          return dir === 'asc' ? list : [...list].reverse();
        };
        return {
          order: (dir: 'asc' | 'desc') => ({
            collect: async () => ordered(dir),
            first: async () => ordered(dir)[0] ?? null,
          }),
          collect: async () => ordered('asc'),
          first: async () => ordered('asc')[0] ?? null,
        };
      },
    }),
  };

  const makeSession = (over: Record<string, unknown> = {}) => {
    const _id = `sessions-${nextId++}`;
    const row = { _id, userId: 'user-1', title: 'Lecture', ...over };
    sessions.set(_id, row);
    return row;
  };

  // biome-ignore lint/suspicious/noExplicitAny: a hand-rolled stand-in for Convex's ctx
  return { ctx: { db } as any, makeSession, chunks, sessions };
}

const seg = (i: number, isFinal = true) => ({
  text: `w${i}`,
  timestamp: i * 1000,
  isFinal,
});

describe('readSegments', () => {
  it('falls back to the legacy array until a session is migrated', async () => {
    const { ctx, makeSession } = fakeCtx();
    const session = makeSession({ transcriptSegments: [seg(0), seg(1)] });
    expect(await readSegments(ctx, session)).toHaveLength(2);
  });

  it('reads chunks in order once migrated', async () => {
    const { ctx, makeSession } = fakeCtx();
    const session = makeSession({ segmentCount: 0 });
    const all = Array.from({ length: CHUNK_SIZE * 2 + 5 }, (_, i) => seg(i));

    await replaceSegments(ctx, session, all);

    const read = await readSegments(ctx, await ctx.db.get(session._id));
    expect(read).toHaveLength(all.length);
    expect(read.map((s: { text: string }) => s.text)).toEqual(all.map((s) => s.text));
  });
});

describe('appendSegments', () => {
  it('stores only what is new on each save', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    let session = makeSession({ segmentCount: 0 });

    const first = Array.from({ length: 10 }, (_, i) => seg(i));
    await appendSegments(ctx, session, first);
    session = await ctx.db.get(session._id);
    expect(session.segmentCount).toBe(10);

    // The next save resends everything so far plus 5 new ones.
    const second = [...first, ...Array.from({ length: 5 }, (_, i) => seg(10 + i))];
    await appendSegments(ctx, session, second);
    session = await ctx.db.get(session._id);

    expect(session.segmentCount).toBe(15);
    expect(chunks.size).toBe(1);
    const read = await readSegments(ctx, session);
    expect(read.map((s: { text: string }) => s.text)).toEqual(second.map((s) => s.text));
  });

  it('ignores the in-progress partial segment', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession({ segmentCount: 0 });

    await appendSegments(ctx, session, [seg(0), seg(1), seg(2, false)]);
    session = await ctx.db.get(session._id);

    expect(session.segmentCount).toBe(2);
    // ...and the partial is stored once it finalizes.
    await appendSegments(ctx, session, [seg(0), seg(1), seg(2)]);
    session = await ctx.db.get(session._id);
    expect(session.segmentCount).toBe(3);
  });

  it('fills the last chunk before opening a new one', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    let session = makeSession({ segmentCount: 0 });

    await appendSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE - 2 }, (_, i) => seg(i)),
    );
    session = await ctx.db.get(session._id);
    expect(chunks.size).toBe(1);

    await appendSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE + 3 }, (_, i) => seg(i)),
    );
    session = await ctx.db.get(session._id);

    expect(session.segmentCount).toBe(CHUNK_SIZE + 3);
    expect(chunks.size).toBe(2);
    const sizes = [...chunks.values()].map((c) => (c.segments as unknown[]).length);
    expect(sizes[0]).toBe(CHUNK_SIZE);
    expect(await readSegments(ctx, session)).toHaveLength(CHUNK_SIZE + 3);
  });

  it('is a no-op when nothing new arrived', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession({ segmentCount: 0 });
    const all = [seg(0), seg(1)];

    await appendSegments(ctx, session, all);
    session = await ctx.db.get(session._id);
    await appendSegments(ctx, session, all);
    session = await ctx.db.get(session._id);

    expect(session.segmentCount).toBe(2);
    expect(await readSegments(ctx, session)).toHaveLength(2);
  });

  it('migrates a legacy session on its first write', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession({ transcriptSegments: [seg(0), seg(1)] });

    await appendSegments(ctx, session, [seg(0), seg(1), seg(2)]);
    session = await ctx.db.get(session._id);

    expect(session.segmentCount).toBe(3);
    expect(session.transcriptSegments).toBeUndefined();
    expect(await readSegments(ctx, session)).toHaveLength(3);
  });
});

describe('replaceSegments', () => {
  it('drops the legacy array so the session row shrinks', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession({ transcriptSegments: [seg(0), seg(1), seg(2)] });

    await replaceSegments(ctx, session, [seg(0), seg(1), seg(2)]);
    session = await ctx.db.get(session._id);

    expect(session.transcriptSegments).toBeUndefined();
    expect(session.segmentCount).toBe(3);
  });

  it('leaves no stale chunks when the new transcript is shorter', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    let session = makeSession({ segmentCount: 0 });

    await replaceSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE * 3 }, (_, i) => seg(i)),
    );
    session = await ctx.db.get(session._id);
    await replaceSegments(ctx, session, [seg(0)]);
    session = await ctx.db.get(session._id);

    expect(chunks.size).toBe(1);
    expect(session.segmentCount).toBe(1);
    expect(await readSegments(ctx, session)).toHaveLength(1);
  });
});

describe('deleteSegments and copySegments', () => {
  it('removes every chunk for the session', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    const session = makeSession({ segmentCount: 0 });
    await replaceSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE + 1 }, (_, i) => seg(i)),
    );

    await deleteSegments(ctx, session._id);
    expect(chunks.size).toBe(0);
  });

  it('copies a transcript onto another session without touching the source', async () => {
    const { ctx, makeSession } = fakeCtx();
    const source = makeSession({ transcriptSegments: [seg(0), seg(1)] });
    let target = makeSession({ segmentCount: 0 });

    await copySegments(ctx, source, target);
    target = await ctx.db.get(target._id);

    expect(await readSegments(ctx, target)).toHaveLength(2);
    expect((await ctx.db.get(source._id)).transcriptSegments).toHaveLength(2);
  });
});
