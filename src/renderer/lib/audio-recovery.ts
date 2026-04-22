/**
 * Audio recovery via IndexedDB — saves audio chunks during recording
 * so they can be recovered after a crash/tab close.
 *
 * Uses localStorage to track the "active" recovery session ID.
 * IndexedDB stores the actual audio blobs keyed by session + explicit
 * monotonic index (assigned by the recorder per-chunk).
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

/**
 * Save a single audio chunk to IndexedDB with an explicit monotonic index.
 * Fire-and-forget safe. The index is supplied by the recorder so ordering
 * is preserved even after chunks below a threshold have been cleared.
 */
export async function saveAudioChunk(sessionId: string, chunk: Blob, index: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: AudioChunkRecord = {
      sessionId,
      chunk,
      index,
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
 * Reassemble all audio chunks for a session into a single Blob,
 * ordered by their explicit index (ascending).
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

    // Sort by explicit index to ensure correct order
    records.sort((a, b) => a.index - b.index);
    const chunks = records.map((r) => r.chunk);

    return new Blob(chunks, { type: 'audio/webm' });
  } catch (error) {
    console.error('Failed to recover audio from IndexedDB:', error);
    return null;
  }
}

/**
 * Delete IndexedDB chunks for a session whose index is below `upToExclusive`.
 * Used by the progressive uploader after a successful periodic upload,
 * so the IDB buffer only holds chunks that haven't been persisted to Convex yet.
 */
export async function clearChunksUpTo(sessionId: string, upToExclusive: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_session');
    const cursorRequest = index.openCursor(IDBKeyRange.only(sessionId));

    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        const record = cursor.value as AudioChunkRecord;
        if (record.index < upToExclusive) {
          cursor.delete();
        }
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (error) {
    console.warn('Failed to clear uploaded chunks from IndexedDB:', error);
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
