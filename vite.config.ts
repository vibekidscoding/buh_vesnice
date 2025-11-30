import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Use relative paths for maximum compatibility
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  },
  server: {
    port: 3005,
    open: false,
    host: '0.0.0.0'
  }
})
