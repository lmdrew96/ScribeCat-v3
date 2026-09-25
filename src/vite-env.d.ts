/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_ASSEMBLYAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by Vite from package.json — see `define` in vite.config.ts. */
declare const __APP_VERSION__: string;

/**
 * Identifies this build (the commit SHA — from Workers Builds in CI, from git locally).
 * Compared against /version.json to detect a new deploy — see lib/app-update.ts.
 */
declare const __BUILD_ID__: string;
