
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true, // Útil para debugar tela branca no mobile
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Mantemos logs para diagnóstico remoto
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
})
