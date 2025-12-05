import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config to build as a micro-frontend exposing `window.fia`.
// React and ReactDOM are treated as externals (provided by host or CDN),
// and filenames are stable (no hashes)
const bundleReact = process.env.BUNDLE_REACT === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Handle CSS imports with exact matches
      { find: '@h5web/shared/styles.css', replacement: path.resolve(__dirname, 'src/h5web/packages/shared/src/styles.css') },
      { find: '@h5web/lib/styles.css', replacement: path.resolve(__dirname, 'src/h5web/packages/lib/src/global-styles.css') },
      { find: '@h5web/lib/global-styles.css', replacement: path.resolve(__dirname, 'src/h5web/packages/lib/src/global-styles.css') },
      { find: '@h5web/app/styles.css', replacement: path.resolve(__dirname, 'src/h5web/packages/app/src/global-styles.css') },
      // Handle @h5web/shared subpath imports with regex to ensure proper matching
      { find: /^@h5web\/shared\/(.+)$/, replacement: path.resolve(__dirname, 'src/h5web/packages/shared/src/$1') },
      { find: /^@h5web\/shared$/, replacement: path.resolve(__dirname, 'src/h5web/packages/shared/src/index.ts') },
      // Handle @h5web/lib subpath imports
      { find: /^@h5web\/lib\/(.+)$/, replacement: path.resolve(__dirname, 'src/h5web/packages/lib/src/$1') },
      { find: /^@h5web\/lib$/, replacement: path.resolve(__dirname, 'src/h5web/packages/lib/src/index.ts') },
      // Handle @h5web/app subpath imports
      { find: /^@h5web\/app\/(.+)$/, replacement: path.resolve(__dirname, 'src/h5web/packages/app/src/$1') },
      { find: /^@h5web\/app$/, replacement: path.resolve(__dirname, 'src/h5web/packages/app/src/index.ts') },
    ],
  },
  server: {
    port: 3000,
  },
  css: {
    // Ensure CSS is processed
    devSourcemap: true,
  },
  build: {
    cssCodeSplit: true,
    outDir: 'build',
    sourcemap: false,
    emptyOutDir: false,
    lib: {
      entry: 'src/index.tsx',
      name: 'fia',
      formats: ['iife'],
    },
    rollupOptions: {
      external: bundleReact ? [] : ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        entryFileNames: 'main.js',
        chunkFileNames: '[name].js',
        assetFileNames: 'images/[name][extname]',
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {},
  },
});
