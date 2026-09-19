import { registerSW } from 'virtual:pwa-register';

/**
 * Stale-tab update detection.
 *
 * The service worker runs in `prompt` mode: a new build installs in the
 * background and waits until the user chooses to apply it. We never reload on
 * our own — the app can be holding a live lecture recording.
 *
 * State lives at module level (not in a hook) so registration happens once at
 * startup for every visitor, while the toast that reads it only mounts inside
 * the authenticated layout, where recording state is known.
 */

const UPDATE_CHECK_MS = 5 * 60_000;
const DISMISS_KEY = 'update-toast-dismissed';
const CHUNK_RELOAD_KEY = 'chunk-reload-attempted-at';
/** A second chunk failure within this window means the build itself is broken — don't loop. */
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

let updateReady = false;
/** Set while a lecture is recording or saving — nothing may reload the page. */
let reloadBlocked = false;
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

const setUpdateReady = (value: boolean): void => {
  updateReady = value;
  for (const listener of listeners) listener();
};

const isDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) !== null;
  } catch {
    return false;
  }
};

export const setAppReloadBlocked = (blocked: boolean): void => {
  reloadBlocked = blocked;
};

export const subscribeToAppUpdate = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAppUpdateReady = (): boolean => updateReady;

/** Activates the waiting service worker; it reloads the page once it takes control. */
export const applyAppUpdate = (): void => {
  if (applyUpdate) {
    void applyUpdate(true);
  } else {
    window.location.reload();
  }
};

/** "Not now" — hides the toast for the rest of this tab's session. */
export const dismissAppUpdate = (): void => {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // Storage blocked — dismissal just won't outlive this page load.
  }
  setUpdateReady(false);
};

const registerServiceWorker = (): void => {
  applyUpdate = registerSW({
    onNeedRefresh() {
      if (isDismissed()) return;
      setUpdateReady(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // Browsers only re-check the SW on navigation, and an SPA rarely
      // navigates — so poll, and check immediately when a tab is refocused.
      const check = (): void => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return;
        registration.update().catch(() => {
          // Offline or CDN hiccup — try again next tick.
        });
      };
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', check);
    },
    onRegisterError(error: unknown) {
      console.error('Service worker registration failed:', error);
    },
  });
};

/**
 * A lazy chunk from a previous deploy can vanish before the toast is acted on.
 * Vite fires `vite:preloadError` when a dynamic import fails; recover with one
 * reload, guarded by a cooldown so a genuinely broken build can't loop.
 */
const registerChunkErrorRecovery = (): void => {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadBlocked) return; // Let the error surface; losing a recording is worse.
    let lastAttempt = 0;
    try {
      lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    } catch {
      return; // Can't guard against a loop, so don't reload at all.
    }
    if (Date.now() - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS) return;

    event.preventDefault();
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  });
};

export const initAppUpdate = (): void => {
  if (import.meta.env.DEV) return;
  registerServiceWorker();
  registerChunkErrorRecovery();
};
