import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src/tool',
  publicDir: '../public',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  server: {
    port: 5000,
    allowedHosts: ['*'],
    host: true
  }
})