import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import monaco from 'vite-plugin-monaco-editor';

const isPluginBuild = process.env.BUILD_AS_PLUGIN === 'true';

export default defineConfig({
  // Use relative asset URLs so the bundle works no matter what path SciGateway serves it from
  base: isPluginBuild ? '' : '/',

  plugins: [
    react(),
    tsconfigPaths(),
    svgr(),
    monaco({ languageWorkers: ['editorWorkerService', 'json', 'typescript', 'css', 'html'] }),
  ],

  envPrefix: ['VITE_', 'REACT_APP_'],

  build: isPluginBuild
    ? {
        outDir: 'dist',
        sourcemap: true,
        // Build a single-spa SystemJS module
        lib: {
          entry: 'src/root.tsx',
          name: 'fia',
          formats: ['system'],
          fileName: () => 'fia.js',
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'single-spa', 'single-spa-react'],
          output: {
            entryFileNames: 'fia.js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      }
    : {
        sourcemap: true, // Normal app build
      },
});
