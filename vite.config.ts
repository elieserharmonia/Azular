
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Desativado em prod para reduzir tempo de build
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        // Separa bibliotecas grandes para cache mais eficiente no navegador
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('recharts')) return 'vendor-charts';
            return 'vendor';
          }
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove logs de debug no build final
        drop_debugger: true
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
})
