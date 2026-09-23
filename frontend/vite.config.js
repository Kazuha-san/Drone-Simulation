import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In `npm run dev`, proxy API calls to the local FastAPI server
    // (`python3 run_app.py` or `uvicorn server:app`) so no VITE_API_BASE
    // env var is needed for local development.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
