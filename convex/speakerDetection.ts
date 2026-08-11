/**
 * Speaker detection — post-recording diarization via AssemblyAI's async API.
 *
 * The streaming v3 API doesn't support speaker_labels, so this is a second-pass
 * job: client triggers `submit`, server uploads/links the audio, AssemblyAI
 * processes asynchronously, and we self-reschedule a poll until the job
 * completes. Status is mirrored on the session so the UI can react.
 */

import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalAction, internalMutation, internalQuery } from './_generated/server';
import { requireAuth } from './authHelpers';
import { r2 } from './r2';

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com';
const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_ATTEMPTS = 90; // 90 × 30s = 45 min ceiling

interface AssemblyTranscriptResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  text?: string;
  error?: string;
  utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
}

// ─── Internal queries ───────────────────────────────────────

/** Look up a session and verify ownership for an action context. */
export const getSessionForDetection = internalQuery({
  args: { sessionId: v.id('sessions'), userId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== args.userId) return null;
    return {
      _id: session._id,
      audioStorageId: session.audioStorageId,
      audioStorageIds: session.audioStorageIds,
      audioDeletedAt: session.audioDeletedAt,
      speakerLabelsStatus: session.speakerLabelsStatus,
    };
  },
});

// ─── Internal mutations ─────────────────────────────────────

export const setSpeakerStatus = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    status: v.union(v.literal('processing'), v.literal('labeled'), v.literal('failed')),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      speakerLabelsStatus: args.status,
      speakerLabelsError: args.error,
      updatedAt: Date.now(),
    });
  },
});

export const writeSpeakerResult = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    transcript: v.string(),
    segments: v.array(
      v.object({
        text: v.string(),
        timestamp: v.number(),
        isFinal: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcript: args.transcript,
      transcriptSegments: args.segments,
      speakerLabelsStatus: 'labeled',
      speakerLabelsError: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ─── Helpers ────────────────────────────────────────────────

async function buildAudioUrlForAssembly(
  apiKey: string,
  audioStorageId: string | undefined,
  audioStorageIds: string[] | undefined,
): Promise<string> {
  // Single-file path — R2 signed URL is directly fetchable by AssemblyAI.
  // Give it a generous expiry since AssemblyAI's fetch may be queued.
  if (audioStorageId && (!audioStorageIds || audioStorageIds.length === 0)) {
    const url = await r2.getUrl(audioStorageId, { expiresIn: 3600 });
    if (!url) throw new Error('Audio file is unavailable');
    return url;
  }

  // Multi-part path — fetch each chunk, concatenate, upload to AssemblyAI.
  // WebM clusters concatenated in order produce a valid file because the first
  // chunk carries the EBML header.
  const ids = audioStorageIds ?? [];
  if (ids.length === 0) throw new Error('Session has no audio');

  const chunkUrls = await Promise.all(ids.map((id) => r2.getUrl(id)));
  const buffers = await Promise.all(
    chunkUrls.map(async (url) => {
      if (!url) throw new Error('Audio chunk URL unavailable');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch audio chunk: ${res.status}`);
      return await res.arrayBuffer();
    }),
  );

  const totalSize = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  for (const buf of buffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  const uploadRes = await fetch(`${ASSEMBLYAI_BASE}/v2/upload`, {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: combined,
  });
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`AssemblyAI upload failed: ${uploadRes.status} ${text}`);
  }
  const { upload_url } = (await uploadRes.json()) as { upload_url: string };
  return upload_url;
}

// ─── Public action — kick off detection ─────────────────────

export const submit = action({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args): Promise<{ ok: true } | { ok: false; error: string }> => {
    const userId = await requireAuth(ctx);

    const session = await ctx.runQuery(internal.speakerDetection.getSessionForDetection, {
      sessionId: args.sessionId,
      userId,
    });
    if (!session) return { ok: false, error: 'Session not found' };
    if (session.audioDeletedAt) return { ok: false, error: 'Audio has been deleted' };

    const hasAudio = !!session.audioStorageId || (session.audioStorageIds?.length ?? 0) > 0;
    if (!hasAudio) return { ok: false, error: 'Session has no audio' };

    if (session.speakerLabelsStatus === 'processing') {
      return { ok: false, error: 'Detection already in progress' };
    }

    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) return { ok: false, error: 'AssemblyAI API key not configured' };

    await ctx.runMutation(internal.speakerDetection.setSpeakerStatus, {
      sessionId: args.sessionId,
      status: 'processing',
    });

    let transcriptId: string;
    try {
      const audioUrl = await buildAudioUrlForAssembly(
        apiKey,
        session.audioStorageId,
        session.audioStorageIds,
      );

      const submitRes = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript`, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_url: audioUrl, speaker_labels: true }),
      });
      if (!submitRes.ok) {
        const text = await submitRes.text();
        throw new Error(`AssemblyAI submit failed: ${submitRes.status} ${text}`);
      }
      const result = (await submitRes.json()) as { id: string };
      transcriptId = result.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error submitting job';
      await ctx.runMutation(internal.speakerDetection.setSpeakerStatus, {
        sessionId: args.sessionId,
        status: 'failed',
        error: message,
      });
      return { ok: false, error: message };
    }

    await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.speakerDetection.pollAndAdvance, {
      sessionId: args.sessionId,
      transcriptId,
      attempt: 1,
    });

    return { ok: true };
  },
});

// ─── Internal action — self-rescheduling poller ─────────────

export const pollAndAdvance = internalAction({
  args: {
    sessionId: v.id('sessions'),
    transcriptId: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.speakerDetection.setSpeakerStatus, {
        sessionId: args.sessionId,
        status: 'failed',
        error: 'AssemblyAI API key not configured',
      });
      return;
    }

    if (args.attempt > MAX_POLL_ATTEMPTS) {
      await ctx.runMutation(internal.speakerDetection.setSpeakerStatus, {
        sessionId: args.sessionId,
        status: 'failed',
        error: 'Speaker detection timed out — try again',
      });
      return;
    }

    let result: AssemblyTranscriptResult;
    try {
      const res = await fetch(`${ASSEMBLYAI_BASE}/v2/transcript/${args.transcriptId}`, {
        headers: { Authorization: apiKey },
      });
      if (!res.ok) throw new Error(`Poll failed: ${res.status}`);
      result = (await res.json()) as AssemblyTranscriptResult;
    } catch (err) {
      // Transient errors: keep polling unless we're past the attempt ceiling.
      const message = err instanceof Error ? err.message : 'Poll failed';
      if (args.attempt >= MAX_POLL_ATTEMPTS) {
        await ctx.runMutation(internal.speakerDetection.setSpeakerStatus, {
          sessionId: args.sessionId,
          status: 'failed',
          error: message,
        });
        return;
      }
      await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.speakerDetection.pollAndAdvance, {
        sessionId: args.sessionId,
        transcriptId: args.transcriptId,
        attempt: args.attempt + 1,
      });
      return;
    }

    if (result.status === 'completed') {
      const utterances = result.utterances ?? [];
      const transcript =
        utterances.length > 0
          ? utterances.map((u) => `[Speaker ${u.speaker}]: ${u.text}`).join('\n\n')
          : (result.text ?? '');
      const segments = utterances.map((u) => ({
        text: `[Speaker ${u.speaker}]: ${u.text}`,
        timestamp: u.start,
        isFinal: true,
      }));

      await ctx.runMutation(internal.speakerDetection.writeSpeakerResult, {
        sessionId: args.sessionId,
        transcript,
        segments,
      });
      return;
    }

    if (result.status === 'error') {
      await ctx.runMutation(internal.speakerDetection.setSpeakerStatus, {
        sessionId: args.sessionId,
        status: 'failed',
        error: result.error ?? 'AssemblyAI returned an error',
      });
      return;
    }

    // queued | processing — reschedule
    await ctx.scheduler.runAfter(POLL_INTERVAL_MS, internal.speakerDetection.pollAndAdvance, {
      sessionId: args.sessionId,
      transcriptId: args.transcriptId,
      attempt: args.attempt + 1,
    });
  },
});
