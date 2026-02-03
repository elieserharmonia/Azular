
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // CRÍTICO: Garante que assets usem caminhos relativos (./) 
  // para funcionar corretamente dentro do Capacitor (WebView)
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
})
