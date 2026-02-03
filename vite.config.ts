
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'esnext', // WebView moderna suporta esnext, se for antiga usar 'es2015'
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Mantemos consoles no mobile para depuração via logcat
      }
    }
  }
})
