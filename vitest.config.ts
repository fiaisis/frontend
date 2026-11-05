import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    define: {
      'process.env.NODE_ENV': JSON.stringify('test'),
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx,js,jsx}'],
      exclude: ['src/h5web/**', 'cypress/**', 'node_modules/**'],
      setupFiles: ['./src/setupTests.js'],
      // Fail a hung test instead of letting it block the whole run: without these, a test that never
      // settles (an await on a request that is never answered) stalls the suite indefinitely.
      testTimeout: 15000,
      hookTimeout: 15000,
      teardownTimeout: 10000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.{ts,tsx,js,jsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx,js,jsx}',
          'src/h5web/**',
          'src/index.tsx',
          'src/serviceWorker.ts',
          'src/setupTests.js',
          'src/setupTests.ts',
          'src/testbed/**/*',
        ],
      },
    },
  })
);
