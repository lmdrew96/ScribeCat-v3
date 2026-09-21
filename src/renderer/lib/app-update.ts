import { registerSW } from 'virtual:pwa-register';

/**
 * Stale-tab update detection.
 *
 * The service worker runs in `prompt` mode: a new build installs in the
 * background and waits until the user chooses to apply it. We never reload on
 * our own — the app can be holding a live lecture recording.
 *
 * DETECTION is decoupled from the service worker. Workbox only reaches the
 * `waiting` state that fires `onNeedRefresh` after it has precached the entire
 * changed manifest — 15 MB of it here — so a tab could sit on a stale build for
 * as long as that took. Instead we fetch a small `version.json` written at build
 * time and compare it against this bundle's own stamp, which answers in one
 * round trip. `onNeedRefresh` stays wired as a backstop for when that fetch is
 * unavailable.
 *
 * APPLICATION is NOT decoupled, and must not be. While the old worker still
 * controls the page, a plain reload is served the old build straight back out
 * of its precache — so the toast's Refresh has to go through the worker, and
 * wait for one to be `waiting` if the install is still in flight.
 *
 * State lives at module level (not in a hook) so registration happens once at
 * startup for every visitor, while the toast that reads it only mounts inside
 * the authenticated layout, where recording state is known.
 */

const UPDATE_CHECK_MS = 2 * 60_000;
/** Build stamp written to the deployed output — see `emitVersionJson` in vite.config.ts. */
const VERSION_URL = '/version.json';
/** How long Refresh waits for the new worker to finish installing before giving up. */
const ACTIVATION_TIMEOUT_MS = 10_000;
/** focus and visibilitychange both fire for one window switch — collapse the pair. */
const MIN_CHECK_GAP_MS = 5_000;
const DISMISS_KEY = 'update-toast-dismissed';
const CHUNK_RELOAD_KEY = 'chunk-reload-attempted-at';
/** A second chunk failure within this window means the build itself is broken — don't loop. */
const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

let updateReady = false;
/** Set while a lecture is recording or saving — nothing may reload the page. */
let reloadBlocked = false;
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
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

/**
 * Resolves once a new worker is parked in `waiting`, or false if none arrives.
 *
 * The toast can now appear before the install has finished, so Refresh may be
 * clicked while the new build is still downloading. Reloading at that point
 * would serve the OLD build back out of the precache.
 */
const waitForWaitingWorker = (
  registration: ServiceWorkerRegistration,
  timeoutMs: number,
): Promise<boolean> =>
  new Promise((resolve) => {
    if (registration.waiting) {
      resolve(true);
      return;
    }

    let settled = false;
    const finish = (found: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      registration.removeEventListener('updatefound', onUpdateFound);
      resolve(found);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    function onUpdateFound(): void {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && registration.waiting) finish(true);
        else if (installing.state === 'redundant') finish(false);
      });
    }

    registration.addEventListener('updatefound', onUpdateFound);
    // An install may already have been kicked off by the version check.
    if (registration.installing) onUpdateFound();
    void registration.update().catch(() => {
      // Offline — the timeout takes it from here.
    });
  });

/** Activates the waiting service worker; it reloads the page once it takes control. */
export const applyAppUpdate = (): void => {
  void (async () => {
    if (!applyUpdate || !swRegistration) {
      window.location.reload();
      return;
    }

    if (swRegistration.waiting) {
      void applyUpdate(true);
      return;
    }

    // Detected by version.json but the worker hasn't finished installing yet.
    if (await waitForWaitingWorker(swRegistration, ACTIVATION_TIMEOUT_MS)) {
      void applyUpdate(true);
      return;
    }

    // Nothing to activate. A reload may land on the old build, but leaving the
    // click dead is worse — and the next check will offer it again.
    window.location.reload();
  })();
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

/**
 * The build stamp currently deployed, or null if it can't be read — offline, a
 * CDN hiccup, or a host that never served the file. Null is not "up to date";
 * callers fall back to asking the service worker.
 */
const fetchDeployedBuildId = async (): Promise<string | null> => {
  try {
    const response = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    const build = (payload as { build?: unknown }).build;
    return typeof build === 'string' ? build : null;
  } catch {
    return null;
  }
};

const registerServiceWorker = (): void => {
  applyUpdate = registerSW({
    // Backstop: only reached once the new worker has precached everything and
    // parked in `waiting`. The version check below usually gets there first.
    onNeedRefresh() {
      if (isDismissed()) return;
      setUpdateReady(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      swRegistration = registration;

      // Browsers only re-check the SW on navigation, and an SPA rarely
      // navigates — so poll, and check whenever the window comes back.
      let lastCheck = 0;
      const check = (): void => {
        // No navigator.onLine guard: it reports false spuriously on some VPN
        // and captive-network setups, and when it does the app stops checking
        // for updates entirely. Failed calls are already caught below.
        if (document.visibilityState !== 'visible') return;
        if (Date.now() - lastCheck < MIN_CHECK_GAP_MS) return;
        lastCheck = Date.now();

        void (async () => {
          const deployed = await fetchDeployedBuildId();

          // Kick the install either way: on a match it's the cheap way to stay
          // honest if version.json is wrong, and on a mismatch it means the new
          // worker is already downloading while the user reads the toast.
          registration.update().catch(() => {
            // Offline or CDN hiccup — try again next tick.
          });

          if (deployed && deployed !== __BUILD_ID__ && !isDismissed()) {
            setUpdateReady(true);
          }
        })();
      };
      check();
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener('visibilitychange', check);
      // visibilitychange does NOT fire when another app takes focus over a
      // still-visible window — the "deployed from the terminal, clicked back"
      // case, which is most of them. Window focus does.
      window.addEventListener('focus', check);
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
