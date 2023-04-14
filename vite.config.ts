import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: [
    '**/*.epub',
  ],
  plugins: [react()],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
    },
  },
})
