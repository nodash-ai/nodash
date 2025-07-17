import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { NodashSDK } from '../../packages/nodash-sdk/src/index';
import { NodashTestServer } from '../test-server';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('End-to-End Full Workflow Tests', () => {
  let TEST_BASE_URL: string;
  let testServer: NodashTestServer;
  const testConfigDir = path.join(os.tmpdir(), 'nodash-e2e-test');

  beforeAll(async () => {
    // Create and start test server directly
    testServer = new NodashTestServer({ port: 0, enableLogging: false });
    await testServer.start();
    TEST_BASE_URL = testServer.getUrl();
    console.log(`E2E tests using test server at ${TEST_BASE_URL} (port: ${testServer.getPort()})`);
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
    // Clean up test config directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    await testServer.reset();
    
    // Clean up any existing config
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  // Helper function to run CLI commands
  async function runCLI(args: string[], env: Record<string, string> = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    return new Promise((resolve) => {
      const cliPath = path.resolve(__dirname, '../../packages/nodash-cli/dist/cli.js');
      const child = spawn('node', [cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODASH_CONFIG_DIR: testConfigDir,
          ...env
        }
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1
        });
      });
    });
  }

  describe('Complete Developer Workflow', () => {
    it('should support full developer journey: SDK usage -> CLI verification', async () => {
      // 1. Setup CLI configuration
      const initResult = await runCLI(['init', '--url', TEST_BASE_URL, '--token', 'e2e-test-token']);
      expect(initResult.exitCode).toBe(0);

      // 2. Application uses SDK to track events
      const sdk = new NodashSDK(TEST_BASE_URL, 'e2e-test-token');
      
      // Track application startup
      await sdk.track('app_started', {
        version: '1.0.0',
        environment: 'e2e-test',
        timestamp: new Date().toISOString()
      });

      // Track user interactions
      await sdk.track('user_login', {
        userId: 'e2e-user-123',
        method: 'email',
        timestamp: new Date().toISOString()
      });

      await sdk.track('feature_used', {
        feature: 'dashboard',
        userId: 'e2e-user-123',
        duration: 45,
        timestamp: new Date().toISOString()
      });

      // 3. Verify events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(3);
      expect(analytics[0].event).toBe('app_started');
      expect(analytics[1].event).toBe('user_login');
      expect(analytics[2].event).toBe('feature_used');

      // 4. Developer uses CLI to check health
      const healthResult = await runCLI(['health']);
      expect(healthResult.exitCode).toBe(0);
      expect(healthResult.stdout).toContain('ok');

      // 5. Developer checks configuration
      const configResult = await runCLI(['config', 'get']);
      expect(configResult.exitCode).toBe(0);
    });

    it('should handle error recovery workflow', async () => {
      // 1. Try to use SDK with invalid server
      const invalidSdk = new NodashSDK('http://localhost:9999', 'test-token');
      await expect(invalidSdk.health()).rejects.toThrow();

      // 2. Use SDK with correct configuration
      const sdk = new NodashSDK(TEST_BASE_URL, 'recovery-token');
      await sdk.track('recovery_test', { scenario: 'error_recovery' });

      // 3. Verify recovery was successful
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(1);
      expect(analytics[0].event).toBe('recovery_test');
      expect(analytics[0].properties.scenario).toBe('error_recovery');
    });
  });

  describe('Multi-Environment Workflow', () => {
    it('should support environment switching across all components', async () => {
      const environments = [
        { name: 'development', url: TEST_BASE_URL, token: 'dev-token' },
        { name: 'staging', url: TEST_BASE_URL, token: 'staging-token' },
        { name: 'production', url: TEST_BASE_URL, token: 'prod-token' }
      ];

      for (const env of environments) {
        // 1. Setup CLI for environment
        const initResult = await runCLI(['init', '--url', env.url, '--token', env.token]);
        expect(initResult.exitCode).toBe(0);

        // 2. SDK tracks environment-specific events
        const sdk = new NodashSDK(env.url, env.token);
        await sdk.track('env_test', {
          environment: env.name,
          timestamp: new Date().toISOString()
        });

        // 3. Verify via CLI command
        const configResult = await runCLI(['config', 'get']);
        expect(configResult.exitCode).toBe(0);
      }

      // Verify all environment events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(3);
      
      const envNames = analytics.map(a => a.properties.environment);
      expect(envNames).toEqual(['development', 'staging', 'production']);
    });
  });

  describe('Real-time Analytics Workflow', () => {
    it('should handle high-volume real-time analytics', async () => {
      // 1. Setup analytics project
      const initResult = await runCLI(['init', '--url', TEST_BASE_URL, '--token', 'analytics-token']);
      expect(initResult.exitCode).toBe(0);

      // 2. Simulate high-volume analytics
      const sdk = new NodashSDK(TEST_BASE_URL, 'analytics-token');
      const events = [];

      // Track multiple event types rapidly
      for (let i = 0; i < 20; i++) {
        events.push(
          sdk.track('page_view', {
            page: `/page-${i}`,
            userId: `user-${i % 5}`,
            timestamp: new Date().toISOString(),
            sessionId: `session-${Math.floor(i / 5)}`
          })
        );

        if (i % 5 === 0) {
          events.push(
            sdk.track('user_action', {
              action: 'click',
              element: `button-${i}`,
              userId: `user-${i % 5}`,
              timestamp: new Date().toISOString()
            })
          );
        }
      }

      await Promise.all(events);

      // 3. Verify all events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics.length).toBeGreaterThan(20);

      // 4. Check analytics via CLI
      const healthResult = await runCLI(['health']);
      expect(healthResult.exitCode).toBe(0);

      // 5. Verify data integrity
      const pageViews = analytics.filter(a => a.event === 'page_view');
      const userActions = analytics.filter(a => a.event === 'user_action');
      
      expect(pageViews).toHaveLength(20);
      expect(userActions).toHaveLength(4); // Every 5th iteration
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations across all components', async () => {
      // 1. Setup project
      const initResult = await runCLI(['init', '--url', TEST_BASE_URL, '--token', 'performance-token']);
      expect(initResult.exitCode).toBe(0);

      // 2. Concurrent SDK operations
      const sdk = new NodashSDK(TEST_BASE_URL, 'performance-token');
      const sdkPromises = [];

      for (let i = 0; i < 10; i++) {
        sdkPromises.push(
          sdk.track(`concurrent_event_${i}`, {
            index: i,
            timestamp: new Date().toISOString(),
            batch: 'performance_test'
          })
        );
      }

      // 3. Execute all operations concurrently
      const sdkResults = await Promise.all(sdkPromises);

      // 4. Verify all operations completed successfully
      expect(sdkResults).toHaveLength(10);

      // 5. Verify all events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(10);

      const indices = analytics.map(a => a.properties.index).sort((a, b) => a - b);
      expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });
});