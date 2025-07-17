import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    globalSetup: './tests/integration/setup.ts',
    env: {
      NODE_ENV: 'test'
    },
    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4
      }
    },
    // Faster test discovery
    cache: {
      dir: 'node_modules/.vitest/integration'
    },
    // Parallel execution
    fileParallelism: true
  },
  define: {
    global: 'globalThis'
  },
  resolve: {
    alias: {
      '@nodash/sdk': path.resolve(__dirname, './packages/nodash-sdk/src'),
      '@nodash/cli': path.resolve(__dirname, './packages/nodash-cli/src'),
      '@nodash/mcp': path.resolve(__dirname, './packages/nodash-mcp/src')
    }
  }
});