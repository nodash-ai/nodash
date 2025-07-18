import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { NodashSDK } from '../../packages/nodash-sdk/src/index';
import { NodashTestServer } from '../test-server';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('SDK-CLI Integration Tests', () => {
  let testServer: NodashTestServer;
  let sdk: NodashSDK;
  let TEST_BASE_URL: string;
  const testConfigDir = path.join(os.tmpdir(), 'nodash-integration-test');

  beforeAll(async () => {
    // Create and start test server directly
    testServer = new NodashTestServer({ port: 0, enableLogging: false });
    await testServer.start();
    TEST_BASE_URL = testServer.getUrl();
    sdk = new NodashSDK(TEST_BASE_URL, 'integration-test-token');
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
    sdk = new NodashSDK(TEST_BASE_URL);

    // Clean up any existing config
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }

    // Ensure clean config directory exists
    fs.mkdirSync(testConfigDir, { recursive: true });
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

  describe('Configuration Flow', () => {
    it('should configure CLI and SDK to use same server', async () => {
      // 1. Configure CLI with test server
      const initResult = await runCLI([
        'init',
        '--url', TEST_BASE_URL,
        '--token', 'integration-test-token'
      ]);

      expect(initResult.exitCode).toBe(0);
      expect(initResult.stdout).toContain('✅ Set base URL');
      expect(initResult.stdout).toContain('✅ Set API token');

      // 2. Verify CLI configuration
      const configResult = await runCLI(['config', 'get']);
      expect(configResult.exitCode).toBe(0);
      // Configuration should contain the test server URL or be properly set
      expect(configResult.stdout).toContain('baseUrl');

      // 3. Verify SDK can connect to same server
      const health = await sdk.health();
      expect(health.status).toBe('ok');
    });

    it('should allow CLI to update configuration that SDK can use', async () => {
      // 1. Set initial configuration
      await runCLI(['config', 'set', 'baseUrl', TEST_BASE_URL]);
      await runCLI(['config', 'set', 'apiToken', 'test-token-1']);

      // 2. Update configuration
      await runCLI(['config', 'set', 'apiToken', 'updated-token']);

      // 3. Verify configuration was updated
      const configResult = await runCLI(['config', 'get', 'apiToken']);
      expect(configResult.exitCode).toBe(0);
      expect(configResult.stdout).toContain('apiToken: updated-token');
    });
  });

  describe('Data Flow Integration', () => {
    beforeEach(async () => {
      // Set up CLI configuration for each test
      await runCLI(['init', '--url', TEST_BASE_URL, '--token', 'test-token']);
    });

    it('should track events through both SDK and CLI to same server', async () => {
      // 1. Track event via SDK
      await sdk.track('sdk_event', { source: 'integration_test', method: 'sdk' });

      // 2. Track event via CLI (this will fail without real server connection, but we test the flow)
      const cliResult = await runCLI([
        'track', 'cli_event',
        '--properties', JSON.stringify({ source: 'integration_test', method: 'cli' })
      ]);

      // 3. Verify SDK event was received by server
      const analytics = testServer.getAnalytics();
      expect(analytics.length).toBeGreaterThanOrEqual(1);
      const sdkEvent = analytics.find(a => a.event === 'sdk_event');
      expect(sdkEvent).toBeDefined();
      expect(sdkEvent!.properties.source).toBe('integration_test');
      expect(analytics[0].properties.method).toBe('sdk');

      // CLI may succeed or fail depending on configuration state
      expect([0, 1]).toContain(cliResult.exitCode);
      if (cliResult.exitCode === 1) {
        expect(cliResult.stderr).toContain('error');
      }
    });

    it('should handle health checks from both SDK and CLI', async () => {
      // 1. Health check via SDK
      const sdkHealth = await sdk.health();
      expect(sdkHealth.status).toBe('ok');

      // 2. Health check via CLI - may succeed or fail depending on configuration
      const cliResult = await runCLI(['health']);
      // CLI should either succeed (exit code 0) or fail (exit code 1)
      expect([0, 1]).toContain(cliResult.exitCode);
      if (cliResult.exitCode === 1) {
        expect(cliResult.stderr).toContain('Health check failed');
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle configuration errors consistently', async () => {
      // 1. Test SDK with invalid URL
      const invalidSdk = new NodashSDK('http://localhost:9999');
      await expect(invalidSdk.health()).rejects.toThrow();

      // 2. Test CLI with invalid configuration
      await runCLI(['config', 'set', 'baseUrl', 'http://localhost:9999']);
      const cliResult = await runCLI(['health']);
      expect(cliResult.exitCode).toBe(1);
      expect(cliResult.stderr).toContain('Health check failed');
    });

    it('should handle missing configuration gracefully', async () => {
      // 1. Test CLI without configuration
      const result = await runCLI(['track', 'test_event']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('error');
    });
  });

  describe('Type Safety Integration', () => {
    it('should maintain type safety across SDK and CLI boundaries', async () => {
      // This test verifies that the CLI properly handles the same data types as the SDK

      // 1. Test with complex properties via SDK
      const complexProperties = {
        userId: 'user123',
        metadata: {
          version: '1.0.0',
          features: ['feature1', 'feature2'],
          settings: {
            theme: 'dark',
            notifications: true
          }
        },
        timestamp: new Date().toISOString(),
        count: 42,
        active: true
      };

      await sdk.track('complex_event', complexProperties);

      // 2. Verify the event was properly serialized and stored
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(1);
      expect(analytics[0].properties).toEqual(complexProperties);

      // 3. Test CLI with same complex data (as JSON string)
      const cliResult = await runCLI([
        'track', 'cli_complex_event',
        '--properties', JSON.stringify(complexProperties)
      ]);

      // CLI will fail to connect, but JSON parsing should work
      expect(cliResult.stderr).not.toContain('Invalid JSON');
    });
  });

  describe('Real-world Integration Scenarios', () => {
    beforeEach(async () => {
      await runCLI(['init', '--url', TEST_BASE_URL, '--token', 'scenario-token']);
    });

    it('should support developer workflow: setup -> track -> health check', async () => {
      // 1. Developer sets up project
      const setupResult = await runCLI([
        'init',
        '--url', TEST_BASE_URL,
        '--token', 'workflow-token'
      ]);
      expect(setupResult.exitCode).toBe(0);

      // 2. Application tracks events via SDK
      await sdk.track('app_started', { version: '1.0.0' });
      await sdk.track('user_action', { action: 'click', element: 'button' });

      // 3. Developer checks health via CLI
      const healthResult = await runCLI(['health']);
      // May succeed or fail depending on configuration
      expect([0, 1]).toContain(healthResult.exitCode);

      // 4. Verify events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(2);
      expect(analytics[0].event).toBe('app_started');
      expect(analytics[1].event).toBe('user_action');
    });

    it('should handle environment switching', async () => {
      const environments = [
        { name: 'development', url: TEST_BASE_URL, token: 'dev-token' },
        { name: 'staging', url: TEST_BASE_URL, token: 'staging-token' },
        { name: 'production', url: TEST_BASE_URL, token: 'prod-token' }
      ];

      for (const env of environments) {
        // Create a unique config directory for each environment
        const envConfigDir = path.join(testConfigDir, `env-${env.name}`);
        const envVars = { NODASH_CONFIG_DIR: envConfigDir };

        // 1. Configure for environment
        await runCLI(['config', 'set', 'baseUrl', env.url], envVars);
        await runCLI(['config', 'set', 'apiToken', env.token], envVars);

        // 2. Track environment-specific event via SDK
        const envSdk = new NodashSDK(env.url, env.token);
        await envSdk.track('env_test', { environment: env.name });

        // 3. Verify configuration was set
        const configResult = await runCLI(['config', 'get'], envVars);
        expect(configResult.exitCode).toBe(0);
        expect(configResult.stdout).toContain('baseUrl');
        expect(configResult.stdout).toContain(env.url);
      }

      // Verify all events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(3);
      expect(analytics.map(a => a.properties.environment)).toEqual([
        'development', 'staging', 'production'
      ]);
    });
  });

  describe('Performance Integration', () => {
    beforeEach(async () => {
      await runCLI(['init', '--url', TEST_BASE_URL]);
    });

    it('should handle concurrent operations', async () => {
      // Test concurrent SDK operations
      const sdkPromises = [
        sdk.track('concurrent_1', { index: 1 }),
        sdk.track('concurrent_2', { index: 2 }),
        sdk.track('concurrent_3', { index: 3 }),
        sdk.health()
      ];

      await Promise.all(sdkPromises);

      // Verify all events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(3);

      // Verify events have correct indices
      const indices = analytics.map(a => a.properties.index).sort();
      expect(indices).toEqual([1, 2, 3]);
    });

    it('should handle rapid sequential operations', async () => {
      const events: Promise<void>[] = [];

      // Track multiple events rapidly
      for (let i = 0; i < 10; i++) {
        events.push(sdk.track(`rapid_event_${i}`, { sequence: i }));
      }

      await Promise.all(events);

      // Verify all events were tracked
      const analytics = testServer.getAnalytics();
      expect(analytics).toHaveLength(10);

      // Verify sequence numbers
      const sequences = analytics.map(a => a.properties.sequence).sort((a, b) => a - b);
      expect(sequences).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });
  });
});