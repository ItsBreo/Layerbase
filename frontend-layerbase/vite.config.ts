/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: true,
    port: 5173,
    // En local apunta al backend en localhost:8000; dentro de Docker se
    // sobreescribe con VITE_PROXY_TARGET=http://nginx:80.
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
      // Archivos públicos de componentes (source/readme/preview) servidos por
      // nginx vía el symlink /storage. Sin esto, las URLs relativas de descarga
      // caerían en el dev server de Vite (404).
      '/storage': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    // Necesario para que HMR funcione con volúmenes montados en Docker.
    watch: {
      usePolling: true,
    },
  }
})