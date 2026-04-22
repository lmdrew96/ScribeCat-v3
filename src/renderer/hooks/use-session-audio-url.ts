/**
 * useSessionAudioUrl — returns a single playable audio URL for a session,
 * regardless of whether its audio is stored as a single legacy `audioStorageId`
 * or as a multi-part `audioStorageIds` array (progressive-upload sessions).
 *
 * For multi-part sessions, fetches all chunk URLs, downloads each chunk as a
 * Blob, concatenates into one Blob, and returns an object URL. WebM clusters
 * concatenated in order produce a valid, playable file because the first
 * chunk carries the EBML header and subsequent chunks are cluster continuations.
 */

import { useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../../convex/_generated/api';

export interface SessionAudioInput {
  audioStorageId?: string;
  audioStorageIds?: string[];
}

/**
 * Returns:
 *   - `undefined` while loading (Convex query pending OR blob fetch pending)
 *   - `null` if the session has no audio
 *   - a string URL ready to pass to `audio.src` when available
 */
export function useSessionAudioUrl(session: SessionAudioInput | null | undefined) {
  const storageIds = session?.audioStorageIds;
  const legacyStorageId = session?.audioStorageId;

  // Prefer the multi-part array when it has entries; fall back to the
  // legacy single-file field for sessions recorded before progressive upload.
  const useMultiPart = !!storageIds && storageIds.length > 0;

  const singleUrl = useQuery(
    api.audioStorage.getAudioUrl,
    !useMultiPart && legacyStorageId ? { storageId: legacyStorageId } : 'skip',
  );

  const multiUrls = useQuery(
    api.audioStorage.getAudioUrls,
    useMultiPart ? { storageIds: storageIds as string[] } : 'skip',
  );

  const [combinedUrl, setCombinedUrl] = useState<string | null | undefined>(undefined);
  const activeObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Clear previous object URL when inputs change
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }

    // No audio at all
    if (!useMultiPart && !legacyStorageId) {
      setCombinedUrl(null);
      return;
    }

    // Legacy single-file: use Convex URL directly (streams)
    if (!useMultiPart) {
      if (singleUrl === undefined) {
        setCombinedUrl(undefined);
      } else {
        setCombinedUrl(singleUrl ?? null);
      }
      return;
    }

    // Multi-part: wait for all URLs, fetch all blobs, concatenate
    if (!multiUrls) {
      setCombinedUrl(undefined);
      return;
    }

    let cancelled = false;
    setCombinedUrl(undefined);

    (async () => {
      try {
        const resolved = multiUrls.filter((u): u is string => !!u);
        if (resolved.length === 0) {
          if (!cancelled) setCombinedUrl(null);
          return;
        }
        const blobs = await Promise.all(
          resolved.map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to fetch audio chunk: ${res.status}`);
            return res.blob();
          }),
        );
        if (cancelled) return;
        const combined = new Blob(blobs, { type: 'audio/webm' });
        const objectUrl = URL.createObjectURL(combined);
        activeObjectUrlRef.current = objectUrl;
        setCombinedUrl(objectUrl);
      } catch (err) {
        console.error('Failed to assemble multi-part audio:', err);
        if (!cancelled) setCombinedUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useMultiPart, legacyStorageId, singleUrl, multiUrls]);

  // Final cleanup of any lingering object URL on unmount
  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  return combinedUrl;
}
