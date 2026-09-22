import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkgVersion = (JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string;
}).version;

/** The commit this build came from, or null outside a git checkout. */
const gitSha = (): string | null => {
  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf-8' }).trim() || null;
  } catch {
    return null;
  }
};

/**
 * Identifies this specific build. The commit SHA rather than the package
 * version, so it changes on every deploy even when the version wasn't bumped —
 * the update check compares this against /version.json and a stamp that can
 * repeat would leave a tab thinking it is current.
 *
 * Each CI provider names this differently and neither sets the other's, so both
 * are read: WORKERS_CI_COMMIT_SHA on Cloudflare Workers Builds,
 * VERCEL_GIT_COMMIT_SHA while Vercel is still standing as the rollback path.
 * Asking git directly covers local builds, where falling through to pkgVersion
 * would produce a stamp that repeats between two builds of the same version and
 * quietly disable update detection.
 */
const buildId =
  process.env.WORKERS_CI_COMMIT_SHA?.slice(0, 7) ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  gitSha() ??
  pkgVersion ??
  'dev';

/**
 * Public values the browser bundle cannot start without. All three ship inside
 * the bundle already — the Convex deployment URL, the Clerk *publishable* key
 * and the public R2 bucket URL are visible in every request the app makes, so
 * there is nothing secret to protect by leaving them out.
 *
 * They are fallbacks, not overrides: a value supplied by the environment always
 * wins, and these only fill in when one is missing. Baked in because a build
 * host that silently fails to surface a build-time variable produces a *green*
 * build containing an app with no backend — which is exactly how the
 * ControlledChaos migration lost three builds to a variable the dashboard
 * insisted was set.
 */
const PRODUCTION_FALLBACKS = {
  VITE_CONVEX_URL: 'https://spotted-vulture-584.convex.cloud',
  VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_c3dlZXBpbmctamFja2FsLTEwLmNsZXJrLmFjY291bnRzLmRldiQ',
  VITE_R2_PUBLIC_URL: 'https://pub-b767cae4f7244d33b04ab00365cc9148.r2.dev',
} as const;

/**
 * Writes the build stamp to dist/version.json so a running tab can detect a new
 * deploy with one small fetch, instead of waiting for the service worker to
 * finish precaching before it reports one.
 *
 * Note `workbox.globPatterns` below deliberately omits json — if this file were
 * precached the fetch would be answered from the old cache and never change.
 */
const emitVersionJson = () => ({
  name: 'scribecat-version-json',
  generateBundle(this: { emitFile: (file: Record<string, string>) => void }) {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: `${JSON.stringify({ build: buildId, version: pkgVersion })}\n`,
    });
  },
});

export default defineConfig(({ mode }) => {
  // The .env files are not loaded into process.env while this config runs, so
  // they have to be read explicitly to be compared against the fallbacks below.
  // loadEnv gives real environment variables priority over the files, which is
  // what keeps a build host's own values authoritative.
  const env = loadEnv(mode, __dirname, 'VITE_');
  const publicEnv = Object.fromEntries(
    Object.entries(PRODUCTION_FALLBACKS).map(([key, fallback]) => [
      `import.meta.env.${key}`,
      JSON.stringify(env[key] || fallback),
    ]),
  );

  return {
    // Bug reports quote this, so it has to track package.json automatically —
    // a hardcoded string silently misattributes every report to an old build.
    define: {
      __APP_VERSION__: JSON.stringify(pkgVersion),
      __BUILD_ID__: JSON.stringify(buildId),
      ...publicEnv,
    },
    plugins: [
      react(),
      emitVersionJson(),
      VitePWA({
        // 'prompt', not 'autoUpdate': a new build waits for the user to apply it via
        // the update toast. Auto-activating could reload or strand a tab mid-lecture.
        registerType: 'prompt',
        includeAssets: ['trippy-nuggy-baby-boy.PNG', 'nuggy-baby-boy.png', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
        manifest: {
          name: 'ScribeCat',
          short_name: 'ScribeCat',
          description: 'ADHD-friendly lecture companion — Record, transcribe, and study smarter',
          theme_color: '#244952',
          background_color: '#1A3338',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'trippy-nuggy-baby-boy.PNG',
              sizes: 'any',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB (allow large preview images)
          globPatterns: ['**/*.{js,css,html,ico,png,PNG,svg,woff2,webp}'],
          runtimeCaching: [
            {
              // Convex backend — never cache (real-time data)
              urlPattern: /convex\.(cloud|site)/,
              handler: 'NetworkOnly',
            },
            {
              // AssemblyAI transcription — never cache
              urlPattern: /assemblyai\.com/,
              handler: 'NetworkOnly',
            },
            {
              // Clerk auth — never cache
              urlPattern: /clerk\.(accounts\.dev|com)/,
              handler: 'NetworkOnly',
            },
            {
              // Google Fonts stylesheets
              urlPattern: /fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              // Google Fonts files — cache aggressively
              urlPattern: /fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
      }),
    ],
    root: 'src/renderer',
    base: '/',
    publicDir: '../../public',
    envDir: '../../', // Load .env files from project root
    build: {
      outDir: '../../dist',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
    },
    css: {
      postcss: './postcss.config.cjs',
    },
  };
});
