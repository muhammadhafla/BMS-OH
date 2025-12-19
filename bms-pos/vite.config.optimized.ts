import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Performance monitoring plugin
function performanceMonitor() {
  return {
    name: 'performance-monitor',
    generateBundle() {
      console.log('🚀 Performance monitoring: Bundle generation started');
    },
    writeBundle() {
      console.log('✅ Performance monitoring: Bundle generation completed');
    }
  };
}

// https://vitejs.dev/config/ with React 19 support and advanced optimizations
export default defineConfig({
  plugins: [
    react({
      // React 19 optimizations
      jsxRuntime: 'automatic',
    }),
    // PWA plugin with enhanced caching
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,vue,txt,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'BMS POS - Point of Sale',
        short_name: 'BMS POS',
        description: 'BMS POS - Point of Sale Progressive Web Application',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    // Performance monitoring
    performanceMonitor()
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    // Performance budgets
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Advanced manual chunks for optimal loading
        manualChunks: {
          // Core React ecosystem
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI Libraries
          'ui-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast'
          ],
          
          // Form handling
          'form-vendor': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // State management
          'state-vendor': ['zustand'],
          
          // Data fetching & networking
          'data-vendor': [
            'axios',
            'swr'
          ],
          
          // WebSocket & real-time
          'websocket-vendor': ['socket.io-client'],
          
          // Utilities
          'utils-vendor': [
            'clsx',
            'class-variance-authority',
            'tailwind-merge',
            'lodash'
          ],
          
          // Icons & media
          'icon-vendor': ['lucide-react'],
          
          // Toast notifications
          'toast-vendor': ['sonner'],
          
          // Date handling
          'date-vendor': ['date-fns', 'dayjs'],
          
          // Validation
          'validation-vendor': ['joi', 'yup'],
          
          // Charts & analytics
          'charts-vendor': ['recharts', 'chart.js', 'd3']
        },
        
        // Optimize chunk file names for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        // Optimize for modern browsers
        format: 'es',
        
        // Enable sourcemaps for debugging (disable in production for smaller bundles)
        sourcemap: process.env.NODE_ENV === 'development'
      },
      
      // External dependencies that shouldn't be bundled
      external: [],
      
      // Tree shaking optimization
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    },
    
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
        pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.info'] : []
      },
      mangle: {
        safari10: true
      },
      format: {
        safari10: true,
        comments: false
      }
    },
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    
    // Advanced optimizations
    reportCompressedSize: true,
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Target modern browsers for smaller bundles
    target: ['es2020', 'chrome80', 'firefox78', 'safari14']
  },
  
  server: {
    port: 5173,
    strictPort: true,
    // Performance optimizations for development
    hmr: {
      overlay: false
    }
  },
  
  preview: {
    port: 4173,
    strictPort: true
  },
  
  define: {
    global: 'globalThis',
    // Enable React fast refresh in development
    __DEV__: process.env.NODE_ENV === 'development'
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    },
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'react-router-dom',
      'socket.io-client'
    ],
    esbuildOptions: {
      target: 'node22',
      // Enable tree shaking for dependencies
      treeShaking: true
    }
  },
  
  // Performance configuration
  esbuild: {
    // Drop console in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Target modern JavaScript
    target: 'es2020',
    // Enable tree shaking
    treeShaking: true
  },
  
  // Experimental features for performance
  experimental: {
    renderBuiltUrl(filename: string) {
      return { relative: true }
    }
  }
})