import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Optimized Electron-specific Vite configuration with React 19 support
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
            
            // Group other node_modules together
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