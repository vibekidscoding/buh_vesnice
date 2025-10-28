import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  // Use repository name for GitHub Pages, or './' for local development
  // Change 'buh_vesnice' to your GitHub repository name
  base: process.env.NODE_ENV === 'production' ? '/buh_vesnice/' : './',
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
    port: 3000,
    open: true
  }
})
