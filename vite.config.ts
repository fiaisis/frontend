import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config to build as a micro-frontend exposing `window.fia`.
// React and ReactDOM are treated as externals (provided by host or CDN),
// and filenames are stable (no hashes)
const bundleReact = process.env.BUNDLE_REACT === 'true';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
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
