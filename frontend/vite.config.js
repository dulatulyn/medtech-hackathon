import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend dev server runs on :8010 (8000 is taken locally). Override with VITE_API_TARGET.
const target = process.env.VITE_API_TARGET || 'http://localhost:8010'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4321,
    host: true,
    strictPort: false,
    proxy: {
      '/api': { target, changeOrigin: true },
    },
  },
})
