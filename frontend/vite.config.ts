import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const analyze = process.env.ANALYZE === '1';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules') && id.includes('@stripe')) return 'stripe';
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    ...(analyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            open: false,
          }),
        ]
      : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'push-handler.js'],
      manifest: {
        name: 'TrapHouse Kitchen',
        short_name: 'TrapHouse',
        description: 'Order delicious food from TrapHouse Kitchen',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        importScripts: ['push-handler.js'],
        runtimeCaching: [
          {
            // Never cache API JSON — NetworkFirst previously could serve another
            // account's /coupons/my (and similar) when the network briefly failed.
            urlPattern: ({ url }) => {
              if (url.pathname.startsWith('/api')) return true;
              if (/^https:\/\/api\./i.test(url.href)) return true;
              // Render API hosts: traphousekitchen-api.onrender.com
              if (url.hostname.includes('-api.') && url.hostname.endsWith('onrender.com')) {
                return true;
              }
              return false;
            },
            handler: 'NetworkOnly',
          },
        ],
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

