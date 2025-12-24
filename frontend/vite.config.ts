import path from 'path';
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

const PORT = 3001;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({
      typescript: true,
      eslint: {
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: /^~(.+)/,
        replacement: path.join(process.cwd(), 'node_modules/$1'),
      },
      {
        find: /^src(.+)/,
        replacement: path.join(process.cwd(), 'src/$1'),
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
      {
        find: '@/lib',
        replacement: path.resolve(__dirname, './src/lib'),
      },
      {
        find: '@/lib/utils',
        replacement: path.resolve(__dirname, './src/lib/utils.ts'),
      },
    ],
  },
  optimizeDeps: {
    include: ['react-pdf-highlighter', 'pdfjs-dist', 'react-pdf'],
    force: true,
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          // React core vendor chunk
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          // PDF-related chunks
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdfjs';
          }
          if (id.includes('node_modules/react-pdf')) {
            return 'react-pdf';
          }
          if (id.includes('node_modules/react-pdf-highlighter')) {
            return 'pdf-highlighter';
          }
          // UI libraries chunk
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/sonner')) {
            return 'ui-toast';
          }
          // Framer Motion chunk
          if (id.includes('node_modules/framer-motion')) {
            return 'framer';
          }
          // Radix UI components chunk
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui';
          }
          // Settings/Account section chunks
          if (id.includes('/sections/accountdetails/account-settings/')) {
            return 'settings-core';
          }
          // Connectors section chunk
          if (id.includes('/sections/accountdetails/connectors/')) {
            return 'connectors';
          }
          // User management chunk
          if (id.includes('/sections/accountdetails/user-and-groups/')) {
            return 'user-management';
          }
          return undefined;
        },
        // Optimize chunk naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable CSS minification
    cssMinify: true,
    // Enable minification
    minify: 'esbuild',
  },
  server: {
    port: PORT,
    host: true,
    allowedHosts: [
      '7a8821519d16.ngrok-free.app',
      '.ngrok-free.app',
      'localhost',
      '127.0.0.1'
    ],
    proxy: {
      '/api/v1/kb': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  preview: { port: PORT, host: true },
});
