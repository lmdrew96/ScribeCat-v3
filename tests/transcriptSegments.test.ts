import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  appendSegments,
  copySegments,
  deleteSegments,
  deleteTranscript,
  readSegments,
  readTranscript,
  replaceSegments,
  writeTranscript,
} from '../convex/transcriptSegments';

/**
 * A stand-in for Convex's db covering exactly what the transcript helpers use:
 * get/insert/patch/delete, and a by_session index query that can be ordered
 * and collected, reduced to its first row, or read as a unique row.
 *
 * These helpers move real transcripts between storage shapes, so the chunk
 * arithmetic is worth testing directly rather than only through types.
 */
function fakeCtx() {
  const tables = new Map<string, Map<string, Record<string, unknown>>>();
  const table = (name: string) => {
    let rows = tables.get(name);
    if (!rows) {
      rows = new Map();
      tables.set(name, rows);
    }
    return rows;
  };
  const sessions = table('sessions');
  const chunks = table('transcriptChunks');
  const transcripts = table('sessionTranscripts');
  const findRow = (id: string) => {
    for (const rows of tables.values()) {
      const row = rows.get(id);
      if (row) return { rows, row };
    }
    return null;
  };
  /** Every patch aimed at a session row — the writes that invalidate session lists. */
  const sessionPatches: string[] = [];
  let nextId = 1;

  const db = {
    get: async (id: string) => findRow(id)?.row ?? null,
    insert: async (name: string, doc: Record<string, unknown>) => {
      const _id = `${name}-${nextId++}`;
      table(name).set(_id, { ...doc, _id });
      return _id;
    },
    patch: async (id: string, fields: Record<string, unknown>) => {
      const found = findRow(id);
      if (!found) throw new Error(`no such row ${id}`);
      if (found.rows === sessions) sessionPatches.push(id);
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined) delete found.row[key];
        else found.row[key] = value;
      }
    },
    delete: async (id: string) => {
      findRow(id)?.rows.delete(id);
    },
    query: (name: string) => ({
      withIndex: (_index: string, build: (q: unknown) => unknown) => {
        let sessionId = '';
        build({
          eq: (_field: string, value: string) => {
            sessionId = value;
            return { eq: () => ({}) };
          },
        });
        const rows = () =>
          [...table(name).values()]
            .filter((c) => c.sessionId === sessionId)
            .sort((a, b) => ((a.chunkIndex as number) ?? 0) - ((b.chunkIndex as number) ?? 0));
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
          unique: async () => {
            const list = rows();
            if (list.length > 1) throw new Error('unique() matched more than one row');
            return list[0] ?? null;
          },
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
  return { ctx: { db } as any, makeSession, chunks, sessions, transcripts, sessionPatches };
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
    const session = makeSession();
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
    let session = makeSession();

    const first = Array.from({ length: 10 }, (_, i) => seg(i));
    expect(await appendSegments(ctx, session, first)).toBe(10);
    session = await ctx.db.get(session._id);

    // The next save resends everything so far plus 5 new ones.
    const second = [...first, ...Array.from({ length: 5 }, (_, i) => seg(10 + i))];
    expect(await appendSegments(ctx, session, second)).toBe(15);
    session = await ctx.db.get(session._id);

    expect(chunks.size).toBe(1);
    const read = await readSegments(ctx, session);
    expect(read.map((s: { text: string }) => s.text)).toEqual(second.map((s) => s.text));
  });

  it('ignores the in-progress partial segment', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession();

    expect(await appendSegments(ctx, session, [seg(0), seg(1), seg(2, false)])).toBe(2);
    session = await ctx.db.get(session._id);
    // ...and the partial is stored once it finalizes.
    expect(await appendSegments(ctx, session, [seg(0), seg(1), seg(2)])).toBe(3);
  });

  it('fills the last chunk before opening a new one', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    let session = makeSession();

    await appendSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE - 2 }, (_, i) => seg(i)),
    );
    session = await ctx.db.get(session._id);
    expect(chunks.size).toBe(1);

    const total = await appendSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE + 3 }, (_, i) => seg(i)),
    );
    session = await ctx.db.get(session._id);

    expect(total).toBe(CHUNK_SIZE + 3);
    expect(chunks.size).toBe(2);
    const sizes = [...chunks.values()].map((c) => (c.segments as unknown[]).length);
    expect(sizes[0]).toBe(CHUNK_SIZE);
    expect(await readSegments(ctx, session)).toHaveLength(CHUNK_SIZE + 3);
  });

  it('is a no-op when nothing new arrived', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession();
    const all = [seg(0), seg(1)];

    await appendSegments(ctx, session, all);
    session = await ctx.db.get(session._id);
    expect(await appendSegments(ctx, session, all)).toBe(2);
    session = await ctx.db.get(session._id);

    expect(await readSegments(ctx, session)).toHaveLength(2);
  });

  it('migrates a legacy session on its first write', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession({ transcriptSegments: [seg(0), seg(1)] });

    expect(await appendSegments(ctx, session, [seg(0), seg(1), seg(2)])).toBe(3);
    session = await ctx.db.get(session._id);

    expect(session.transcriptSegments).toBeUndefined();
    expect(await readSegments(ctx, session)).toHaveLength(3);
  });

  it('never writes the session row once a session is migrated', async () => {
    const { ctx, makeSession, sessionPatches } = fakeCtx();
    let session = makeSession();

    for (let n = 1; n <= CHUNK_SIZE + 10; n += 37) {
      await appendSegments(
        ctx,
        session,
        Array.from({ length: n }, (_, i) => seg(i)),
      );
      session = await ctx.db.get(session._id);
    }

    expect(sessionPatches).toHaveLength(0);
  });
});

describe('replaceSegments', () => {
  it('drops the legacy array so the session row shrinks', async () => {
    const { ctx, makeSession } = fakeCtx();
    let session = makeSession({ transcriptSegments: [seg(0), seg(1), seg(2)] });

    await replaceSegments(ctx, session, [seg(0), seg(1), seg(2)]);
    session = await ctx.db.get(session._id);

    expect(session.transcriptSegments).toBeUndefined();
    expect(await readSegments(ctx, session)).toHaveLength(3);
  });

  it('leaves no stale chunks when the new transcript is shorter', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    let session = makeSession();

    await replaceSegments(
      ctx,
      session,
      Array.from({ length: CHUNK_SIZE * 3 }, (_, i) => seg(i)),
    );
    session = await ctx.db.get(session._id);
    await replaceSegments(ctx, session, [seg(0)]);
    session = await ctx.db.get(session._id);

    expect(chunks.size).toBe(1);
    expect(await readSegments(ctx, session)).toHaveLength(1);
  });
});

describe('deleteSegments and copySegments', () => {
  it('removes every chunk for the session', async () => {
    const { ctx, makeSession, chunks } = fakeCtx();
    const session = makeSession();
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
    const source = makeSession({ transcriptSegments: [seg(0), seg(1)], transcript: 'w0 w1' });
    let target = makeSession();

    await copySegments(ctx, source, target);
    target = await ctx.db.get(target._id);

    expect(await readSegments(ctx, target)).toHaveLength(2);
    expect(await readTranscript(ctx, target)).toBe('w0 w1');
    expect((await ctx.db.get(source._id)).transcriptSegments).toHaveLength(2);
  });
});

describe('transcript text', () => {
  it('falls back to the legacy field until the text has its own row', async () => {
    const { ctx, makeSession } = fakeCtx();
    const session = makeSession({ transcript: 'legacy text' });
    expect(await readTranscript(ctx, session)).toBe('legacy text');
    expect(await readTranscript(ctx, makeSession())).toBeUndefined();
  });

  it('moves the text off the session row on the first write, and only then', async () => {
    const { ctx, makeSession, transcripts, sessionPatches } = fakeCtx();
    let session = makeSession({ transcript: 'old' });

    await writeTranscript(ctx, session, 'first');
    session = await ctx.db.get(session._id);
    expect(session.transcript).toBeUndefined();
    expect(sessionPatches).toHaveLength(1);

    await writeTranscript(ctx, session, 'second');
    await writeTranscript(ctx, session, 'second');
    expect(sessionPatches).toHaveLength(1);
    expect(transcripts.size).toBe(1);
    expect(await readTranscript(ctx, session)).toBe('second');
  });

  it('is removed with the session', async () => {
    const { ctx, makeSession, transcripts } = fakeCtx();
    const session = makeSession();
    await writeTranscript(ctx, session, 'text');
    await deleteTranscript(ctx, session._id);
    expect(transcripts.size).toBe(0);
  });
});
