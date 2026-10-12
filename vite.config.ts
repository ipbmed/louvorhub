import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const APP_NAME = 'LouvorHub';
const APP_DESCRIPTION =
  'Hinário, cifras, playlists, eventos e equipe de louvor da sua igreja — no celular, tablet ou telão.';
const THEME_COLOR = '#4f46e5';
const BACKGROUND_COLOR = '#f6f5fb';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          id: '/',
          name: `${APP_NAME} — Gestão e Caderno de Louvor`,
          short_name: APP_NAME,
          description: APP_DESCRIPTION,
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'any',
          theme_color: THEME_COLOR,
          background_color: BACKGROUND_COLOR,
          categories: ['music', 'productivity', 'lifestyle'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Catálogo de músicas',
              short_name: 'Catálogo',
              description: 'Buscar hinos e cânticos',
              url: '/?view=public',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Minhas playlists',
              short_name: 'Playlists',
              description: 'Abrir playlists pessoais',
              url: '/?view=setlist',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Minha igreja',
              short_name: 'Igreja',
              description: 'Eventos, membros e bandas',
              url: '/?view=workspace',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          // SPA: qualquer rota desconhecida cai no index.html (inclusive offline).
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/supabase\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            {
              // Google Fonts (CSS)
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // Google Fonts (arquivos)
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Avatares e arquivos públicos do Supabase Storage
              urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'supabase-storage',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Leituras do PostgREST (GET): rede primeiro, cache como fallback offline.
              // Permite consultar o catálogo de músicas em locais com sinal fraco.
              urlPattern: ({ url, request }) =>
                request.method === 'GET' &&
                /^https:\/\/[a-z0-9-]+\.supabase\.co\/rest\/v1\//i.test(url.href),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
