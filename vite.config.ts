import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tauri expects a fixed port and ignores the vite HMR host override in prod.
const host = process.env.TAURI_DEV_HOST

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Single source of truth for the version shown in Settings -> About.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Tauri dev server config
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      // Don't watch the Rust side from Vite.
      ignored: ['**/src-tauri/**'],
    },
  },
  // Produce assets that work when served from the Tauri asset protocol.
  build: {
    target: 'es2021',
    minify: 'esbuild',
    sourcemap: false,
  },
})
