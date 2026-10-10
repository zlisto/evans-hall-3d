import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // relative paths so it works on GitHub Pages and locally
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:8000' } }, // FastAPI backend in backend/
})
