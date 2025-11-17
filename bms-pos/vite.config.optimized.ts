import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Optimized Vite configuration for React 19 with proper chunking
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'build',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Only create chunks for dependencies that are actually used
          if (id.includes('node_modules')) {
            // Core React dependencies
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            
            // UI component libraries
            if (id.includes('@radix-ui/')) {
              return 'ui-vendor';
            }
            
            // Utility libraries
            if (id.includes('clsx') || id.includes('class-variance-authority') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            
            // HTTP client
            if (id.includes('axios')) {
              return 'data-vendor';
            }
            
            // Icons
            if (id.includes('lucide-react')) {
              return 'icon-vendor';
            }
            
            // Toast notifications
            if (id.includes('sonner')) {
              return 'toast-vendor';
            }
            
            // Group other node_modules together (catch-all for remaining dependencies)
            return 'vendor';
          }
        },
      }
    },
    chunkSizeWarningLimit: 500,
    // Remove empty chunks to prevent empty file generation
    assetsInlineLimit: 4096,
    sourcemap: false, // Disable sourcemaps for production to reduce bundle size
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
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
    include: [
      'react', 
      'react-dom', 
      'axios',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu', 
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'lucide-react',
      'sonner'
    ],
    esbuildOptions: {
      target: 'node22',
    },
  },
})