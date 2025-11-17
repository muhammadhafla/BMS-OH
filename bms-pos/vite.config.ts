import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/ with React 19 support
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for React 19
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
  server: {
    port: 5173,
    strictPort: true,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand'],
    esbuildOptions: {
      target: 'node22',
    },
  },
})