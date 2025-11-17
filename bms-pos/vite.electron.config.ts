import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Electron-specific Vite configuration with React 19 support
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main/main.js'),
        preload: path.resolve(__dirname, 'src/main/preload.js')
      },
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          // Vendor chunks for Electron with React 19
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast'
          ],
          'utils-vendor': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'zod'
          ],
          'form-vendor': [
            'react-hook-form',
            '@hookform/resolvers'
          ],
          'data-vendor': [
            'axios',
            'swr',
            'better-sqlite3',
            'sqlite3'
          ],
          'state-vendor': [
            'zustand'
          ],
          'icon-vendor': [
            'lucide-react'
          ],
          'toast-vendor': [
            'sonner'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    esbuildOptions: {
      target: 'node22',
    },
  },
})