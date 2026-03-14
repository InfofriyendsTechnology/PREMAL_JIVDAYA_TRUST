import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-round.svg', 'logo.jpg'],
      manifest: {
        name: 'Premal Jivdaya Trust Poster Maker',
        short_name: 'Poster Maker',
        description: 'Create beautiful personalized posters with Premal Jivdaya Trust',
        theme_color: '#4B1A6E',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo.jpg',
            sizes: '192x192 512x512',
            type: 'image/jpeg',
            purpose: 'any maskable',
          },
        ],
        screenshots: [
          {
            src: '/logo.jpg',
            sizes: '540x720',
            type: 'image/jpeg',
            form_factor: 'narrow',
          },
        ],
        categories: ['productivity', 'utilities'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
        globIgnores: ['**/template.png'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 2000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});
