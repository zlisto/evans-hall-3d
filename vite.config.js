import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const HERE = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ mode }) => {
  // API_PORT (e.g. in a gitignored .env.local) says where the FastAPI backend in backend/ listens
  const { API_PORT = '8000' } = loadEnv(mode, HERE, '')
  return {
    base: './', // relative paths so it works on GitHub Pages and locally
    plugins: [react()],
    server: { port: 5173, proxy: { '/api': `http://localhost:${API_PORT}` } },
  }
})
