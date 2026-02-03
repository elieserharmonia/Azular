
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Fundamental para caminhos relativos em PWA e Android
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Mantido para depuração via logcat se necessário
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
})
