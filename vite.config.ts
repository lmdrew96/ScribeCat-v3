import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB (allow large preview images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
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
});
