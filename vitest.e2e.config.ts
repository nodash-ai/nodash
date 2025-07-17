import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 15000,
    teardownTimeout: 15000,
    globalSetup: './tests/e2e/setup.ts',
    env: {
      NODE_ENV: 'test'
    },
    // Run E2E tests sequentially to avoid port conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    // Performance optimizations for E2E
    cache: {
      dir: 'node_modules/.vitest/e2e'
    },
    // Retry failed tests once in E2E
    retry: 1,
    // Bail on first failure in E2E to save time
    bail: 1
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