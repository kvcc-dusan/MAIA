import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Tauri CLI sets TAURI_ENV_* — desktop build serves from root and must not
// register a service worker (stale-cache hell inside the webview)
const isTauri = !!process.env.TAURI_ENV_PLATFORM

// https://vite.dev/config/
export default defineConfig({
  // Git worktrees that tools create under .claude hold full copies of the repo; don't run their tests.
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: isTauri,
      registerType: 'autoUpdate',
      includeAssets: ['maia-logo.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
      },
      manifest: {
        name: 'Maia',
        short_name: 'Maia',
        description: 'Maia Operating System',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/MAIA/',
        scope: '/MAIA/',
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
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5183,
    strictPort: true,
  },
  base: isTauri ? '/' : '/MAIA/',
  build: {
    rollupOptions: {
      output: {
        // Ensure unique hashes on every build for proper cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
