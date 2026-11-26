import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { legacyCssPlugins } from './vite-legacy-css.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  css: {
    // Old Android tablets can't parse Tailwind v4's modern CSS; lower it on build.
    postcss: { plugins: command === 'build' ? legacyCssPlugins() : [] },
  },
  build: {
    // Shop-floor tablets run Chrome 101: lower JS syntax for it, and keep the CSS
    // minifier from re-modernizing the lowered CSS (e.g. min-width -> width>=).
    target: ['chrome101', 'safari15.4', 'firefox97'],
    cssTarget: ['chrome101', 'safari15.4', 'firefox97'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}))
