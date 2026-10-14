import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Port 5174 is the origin the backend's CORS_ORIGINS allows. strictPort fails loudly instead of
// silently moving to another port that the API would then reject.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true },
  preview: { port: 5174, strictPort: true },
})
