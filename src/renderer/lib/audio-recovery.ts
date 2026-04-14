/**
 * Audio recovery via IndexedDB — saves audio chunks during recording
 * so they can be recovered after a crash/tab close.
 *
 * Uses localStorage to track the "active" recovery session ID.
 * IndexedDB stores the actual audio blobs keyed by session + index.
 */

const DB_NAME = 'scribecat-audio-recovery';
const DB_VERSION = 1;
const STORE_NAME = 'audioChunks';
const ACTIVE_SESSION_KEY = 'scribecat-recovery-session';

interface AudioChunkRecord {
  sessionId: string;
  chunk: Blob;
  index: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { autoIncrement: true });
        store.createIndex('by_session', 'sessionId', { unique: false });
      }
    };
  });
}

/** Save a single audio chunk to IndexedDB. Fire-and-forget safe. */
export async function saveAudioChunk(sessionId: string, chunk: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Get current count for this session to determine index
    const index = store.index('by_session');
    const countRequest = index.count(IDBKeyRange.only(sessionId));

    const currentCount = await new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => reject(countRequest.error);
    });

    const record: AudioChunkRecord = {
      sessionId,
      chunk,
      index: currentCount,
    };

    const addRequest = store.add(record);
    await new Promise<void>((resolve, reject) => {
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    });

    db.close();
  } catch (error) {
    // Quota errors, etc. — log but never crash the recording
    console.warn('Failed to save audio chunk to IndexedDB:', error);
  }
}

/**
 * Check if there's orphaned recovery data from a previous session.
 * Returns the session ID if found, null otherwise.
 */
export function getRecoverySessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

/**
 * Reassemble all audio chunks for a session into a single Blob.
 * Returns null if no chunks are found.
 */
export async function recoverAudio(sessionId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_session');
    const request = index.getAll(IDBKeyRange.only(sessionId));

    const records = await new Promise<AudioChunkRecord[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as AudioChunkRecord[]);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (records.length === 0) return null;

    // Sort by index to ensure correct order
    records.sort((a, b) => a.index - b.index);
    const chunks = records.map((r) => r.chunk);

    return new Blob(chunks, { type: 'audio/webm' });
  } catch (error) {
    console.error('Failed to recover audio from IndexedDB:', error);
    return null;
  }
}

/** Delete all audio chunks for a session and clear the active session marker. */
export async function clearRecoveryData(sessionId: string): Promise<void> {
  try {
    // Clear localStorage marker
    const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (stored === sessionId) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_session');
    const request = index.getAllKeys(IDBKeyRange.only(sessionId));

    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    for (const key of keys) {
      store.delete(key);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.warn('Failed to clear recovery data from IndexedDB:', error);
  }
}

/**
 * Mark a session as the active recovery session.
 * Clears any previous recovery data first.
 */
export async function startRecoverySession(sessionId: string): Promise<void> {
  try {
    // Clear previous recovery data if any
    const previousId = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (previousId && previousId !== sessionId) {
      await clearRecoveryData(previousId);
    }

    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch (error) {
    console.warn('Failed to start recovery session:', error);
  }
}
