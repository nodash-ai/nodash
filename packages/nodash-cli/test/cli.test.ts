import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { afterEach } from 'node:test';

// Helper function to run CLI commands
async function runCLI(args: string[], options: { input?: string; env?: Record<string, string> } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    const cliPath = path.resolve(__dirname, '../dist/cli.js');
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...options.env
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

    if (options.input) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }

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

// Mock HTTP server for testing
class MockServer {
  private responses: Map<string, any> = new Map();

  setResponse(endpoint: string, response: any) {
    this.responses.set(endpoint, response);
  }

  getResponse(endpoint: string) {
    return this.responses.get(endpoint) || { error: 'Not found' };
  }
}

describe('Nodash CLI Component Tests', () => {
  let mockServer: MockServer;
  let testConfigDir: string;

  beforeEach(() => {
    mockServer = new MockServer();
    testConfigDir = path.join(os.tmpdir(), `nodash-cli-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    // Set up default mock responses
    mockServer.setResponse('/health', {
      status: 'healthy',
      version: '1.0.0',
      uptime: 3600,
      checks: [
        { name: 'database', status: 'pass' },
        { name: 'redis', status: 'pass' }
      ]
    });

    mockServer.setResponse('/track', { success: true, id: 'event-123' });
    mockServer.setResponse('/identify', { success: true, id: 'user-456' });
  });

  describe('CLI Help and Version', () => {
    it('should show help when no arguments provided', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Nodash CLI - Developer tools');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('config');
      expect(result.stdout).toContain('track');
      expect(result.stdout).toContain('health');
      expect(result.stdout).toContain('init');
    });

    it('should show version', async () => {
      const result = await runCLI(['--version']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('0.1.0');
    });
  });

  describe('Config Management', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    it('should show empty config initially', async () => {
      const result = await runCLI(['config', 'get'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Current configuration:');
      expect(result.stdout).toContain('{}');
    });

    it('should set and get configuration values', async () => {
      const testEnv = getTestEnv();
      
      // Set base URL
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: testEnv });
      expect(setResult.exitCode).toBe(0);
      expect(setResult.stdout).toContain('✅ Set baseUrl = https://api.example.com');

      // Get specific value
      const getResult = await runCLI(['config', 'get', 'baseUrl'], { env: testEnv });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('baseUrl: https://api.example.com');

      // Get all config
      const getAllResult = await runCLI(['config', 'get'], { env: testEnv });
      expect(getAllResult.exitCode).toBe(0);
      expect(getAllResult.stdout).toContain('"baseUrl": "https://api.example.com"');
    });

    it('should set API token', async () => {
      const result = await runCLI(['config', 'set', 'apiToken', 'test-token-123'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅ Set apiToken = test-token-123');
    });

    it('should handle invalid config commands', async () => {
      const result = await runCLI(['config', 'invalid'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown action');
    });

    it('should require key and value for set command', async () => {
      const result = await runCLI(['config', 'set', 'baseUrl'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Usage: nodash config set <key> <value>');
    });
  });

  describe('Init Command', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    it('should initialize with URL and token', async () => {
      const result = await runCLI([
        'init',
        '--url', 'https://api.example.com',
        '--token', 'my-secret-token'
      ], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🚀 Initializing Nodash CLI');
      expect(result.stdout).toContain('✅ Set base URL: https://api.example.com');
      expect(result.stdout).toContain('✅ Set API token');
      expect(result.stdout).toContain('🎉 Nodash CLI is ready to use!');
    });

    it('should initialize with URL only', async () => {
      const result = await runCLI(['init', '--url', 'http://localhost:3000'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅ Set base URL: http://localhost:3000');
      expect(result.stdout).not.toContain('✅ Set API token');
    });

    it('should show usage when no options provided', async () => {
      const result = await runCLI(['init'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No configuration provided');
      expect(result.stdout).toContain('Example: nodash init --url');
    });
  });

  describe('Track Command', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    beforeEach(async () => {
      // Set up configuration for tracking tests
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: getTestEnv() });
    });

    it('should fail when no configuration is set', async () => {
      const result = await runCLI(['track', 'test_event'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Track error');
    });

    it('should handle invalid JSON properties', async () => {
      const result = await runCLI(['track', 'test_event', '--properties', '{invalid json}'], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Invalid JSON in properties');
    });

    it('should attempt to track event (will fail without real server)', async () => {
      const result = await runCLI(['track', 'user_signup'], { env: getTestEnv() });
      
      // This will fail because there's no real server, but we can test the CLI behavior
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Track error');
    });
  });

  describe('Health Command', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    beforeEach(async () => {
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: getTestEnv() });
    });

    it('should attempt health check (will fail without real server)', async () => {
      const result = await runCLI(['health'], { env: getTestEnv() });
      
      // This will fail because there's no real server, but we can test the CLI behavior
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Health check failed');
    });
  });

  describe('Real-world CLI Usage Scenarios', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    it('should handle complete setup workflow', async () => {
      const testEnv = getTestEnv();
      
      // 1. Initialize CLI
      const initResult = await runCLI([
        'init',
        '--url', 'https://analytics.myapp.com',
        '--token', 'prod-token-123'
      ], { env: testEnv });
      expect(initResult.exitCode).toBe(0);
      expect(initResult.stdout).toContain('✅ Set base URL: https://analytics.myapp.com');
      expect(initResult.stdout).toContain('✅ Set API token');

      // 2. Verify configuration was saved
      const configResult = await runCLI(['config', 'get'], { env: testEnv });
      expect(configResult.exitCode).toBe(0);
      expect(configResult.stdout).toContain('analytics.myapp.com');
    });

    it('should persist configuration between commands', async () => {
      const testEnv = getTestEnv();
      
      // Set configuration
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://persistent.test'], { env: testEnv });
      expect(setResult.exitCode).toBe(0);

      // Verify it persists in a new command
      const getResult = await runCLI(['config', 'get', 'baseUrl'], { env: testEnv });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('baseUrl: https://persistent.test');
    });

    it('should handle different environments', async () => {
      const environments = [
        { name: 'development', url: 'http://localhost:3000', token: undefined },
        { name: 'staging', url: 'https://staging-api.example.com', token: 'staging-token' },
        { name: 'production', url: 'https://api.example.com', token: 'prod-token' }
      ];

      for (const env of environments) {
        // Use a unique test config directory for each environment test
        const envTestDir = path.join(os.tmpdir(), `nodash-cli-env-${env.name}-${Date.now()}`);
        const testEnv = { NODASH_CONFIG_DIR: envTestDir };
        
        const args = ['init', '--url', env.url];
        if (env.token) {
          args.push('--token', env.token);
        }

        const result = await runCLI(args, { env: testEnv });
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(`✅ Set base URL: ${env.url}`);
        
        if (env.token) {
          expect(result.stdout).toContain('✅ Set API token');
        }
        
        // Clean up
        if (fs.existsSync(envTestDir)) {
          fs.rmSync(envTestDir, { recursive: true, force: true });
        }
      }
    });
  });

  describe('Environment Variable Support', () => {
    let testConfigDir1: string;
    let testConfigDir2: string;

    beforeEach(() => {
      testConfigDir1 = path.join(os.tmpdir(), `nodash-cli-env-test-1-${Date.now()}`);
      testConfigDir2 = path.join(os.tmpdir(), `nodash-cli-env-test-2-${Date.now()}`);
    });

    afterEach(() => {
      // Clean up test directories
      [testConfigDir1, testConfigDir2].forEach(dir => {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
    });

    it('should use custom config directory when NODASH_CONFIG_DIR is set', async () => {
      // Set configuration in custom directory
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://custom-env.com'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });
      expect(setResult.exitCode).toBe(0);

      // Verify config was written to custom directory
      const configFile = path.join(testConfigDir1, 'config.json');
      expect(fs.existsSync(configFile)).toBe(true);

      // Verify we can read it back
      const getResult = await runCLI(['config', 'get', 'baseUrl'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('baseUrl: https://custom-env.com');
    });

    it('should maintain separate configurations for different directories', async () => {
      // Set up first environment
      await runCLI(['config', 'set', 'baseUrl', 'https://env1.com'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });
      await runCLI(['config', 'set', 'apiToken', 'token1'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });

      // Set up second environment
      await runCLI(['config', 'set', 'baseUrl', 'https://env2.com'], {
        env: { NODASH_CONFIG_DIR: testConfigDir2 }
      });
      await runCLI(['config', 'set', 'apiToken', 'token2'], {
        env: { NODASH_CONFIG_DIR: testConfigDir2 }
      });

      // Verify first environment
      const env1Result = await runCLI(['config', 'get'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });
      expect(env1Result.stdout).toContain('https://env1.com');
      expect(env1Result.stdout).toContain('token1');
      expect(env1Result.stdout).not.toContain('https://env2.com');
      expect(env1Result.stdout).not.toContain('token2');

      // Verify second environment
      const env2Result = await runCLI(['config', 'get'], {
        env: { NODASH_CONFIG_DIR: testConfigDir2 }
      });
      expect(env2Result.stdout).toContain('https://env2.com');
      expect(env2Result.stdout).toContain('token2');
      expect(env2Result.stdout).not.toContain('https://env1.com');
      expect(env2Result.stdout).not.toContain('token1');
    });

    it('should create custom directory if it does not exist', async () => {
      const nonExistentDir = path.join(testConfigDir1, 'nested', 'config');
      
      expect(fs.existsSync(nonExistentDir)).toBe(false);

      const result = await runCLI(['config', 'set', 'baseUrl', 'https://nested.com'], {
        env: { NODASH_CONFIG_DIR: nonExistentDir }
      });

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(nonExistentDir)).toBe(true);
      expect(fs.existsSync(path.join(nonExistentDir, 'config.json'))).toBe(true);
    });

    it('should work with all CLI commands using custom config directory', async () => {
      const customEnv = { NODASH_CONFIG_DIR: testConfigDir1 };

      // Test init command
      const initResult = await runCLI([
        'init',
        '--url', 'https://test-env.com',
        '--token', 'test-env-token'
      ], { env: customEnv });
      expect(initResult.exitCode).toBe(0);

      // Test config get
      const getResult = await runCLI(['config', 'get'], { env: customEnv });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('https://test-env.com');

      // Test config set
      const setResult = await runCLI(['config', 'set', 'environment', 'testing'], { env: customEnv });
      expect(setResult.exitCode).toBe(0);

      // Verify the set worked
      const verifyResult = await runCLI(['config', 'get', 'environment'], { env: customEnv });
      expect(verifyResult.exitCode).toBe(0);
      expect(verifyResult.stdout).toContain('environment: testing');
    });

    it('should handle configuration updates correctly with custom directory', async () => {
      const customEnv = { NODASH_CONFIG_DIR: testConfigDir1 };

      // Set initial value
      await runCLI(['config', 'set', 'apiToken', 'initial-token'], { env: customEnv });

      // Update the value
      await runCLI(['config', 'set', 'apiToken', 'updated-token'], { env: customEnv });

      // Verify the update
      const result = await runCLI(['config', 'get', 'apiToken'], { env: customEnv });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('apiToken: updated-token');
      expect(result.stdout).not.toContain('initial-token');
    });

    it('should handle permission errors gracefully', async () => {
      // Try to use a directory that should cause permission issues
      const restrictedPath = process.platform === 'win32' 
        ? 'C:\\Windows\\System32\\nodash-test' 
        : '/root/nodash-test';

      const result = await runCLI(['config', 'set', 'baseUrl', 'https://test.com'], {
        env: { NODASH_CONFIG_DIR: restrictedPath }
      });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Config error');
    });
  });

  describe('Event Recording E2E', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    beforeEach(async () => {
      // Set up configuration for recording tests
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: getTestEnv() });
    });

    it('should complete full recording session with temp file', async () => {
      const testEnv = getTestEnv();
      const tempFile = path.join(os.tmpdir(), `nodash-session-${Date.now()}.json`);

      try {
        // Start recording
        const startResult = await runCLI(['record', 'start', '--max-events', '5'], { env: testEnv });
        expect(startResult.exitCode).toBe(0);
        expect(startResult.stdout).toContain('📹 Started recording events (max: 5)');

        // Stop recording and save to file
        const stopResult = await runCLI(['record', 'stop', '--out', tempFile], { env: testEnv });
        expect(stopResult.exitCode).toBe(0);
        expect(stopResult.stdout).toContain(`✅ Session saved to ${tempFile}`);
        expect(stopResult.stdout).toContain('📊 Recorded 0 events');

        // Verify file was created and has valid JSON
        expect(fs.existsSync(tempFile)).toBe(true);
        const sessionData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
        expect(sessionData).toHaveProperty('events');
        expect(sessionData).toHaveProperty('recordedAt');
        expect(sessionData).toHaveProperty('totalEvents');
        expect(Array.isArray(sessionData.events)).toBe(true);
        expect(sessionData.totalEvents).toBe(0);

        // Test replay with dry-run
        const replayResult = await runCLI(['replay', tempFile, '--dry-run'], { env: testEnv });
        expect(replayResult.exitCode).toBe(0);
        expect(replayResult.stdout).toContain('🔄 Replaying 0 events');
        expect(replayResult.stdout).toContain('🧪 Dry run mode');
        expect(replayResult.stdout).toContain('✅ Replay completed successfully');

      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    it('should handle recording commands help', async () => {
      const recordHelpResult = await runCLI(['record', '--help']);
      expect(recordHelpResult.exitCode).toBe(0);
      expect(recordHelpResult.stdout).toContain('Record events for testing and debugging');
      expect(recordHelpResult.stdout).toContain('start');
      expect(recordHelpResult.stdout).toContain('stop');

      const startHelpResult = await runCLI(['record', 'start', '--help']);
      expect(startHelpResult.exitCode).toBe(0);
      expect(startHelpResult.stdout).toContain('Start recording events');
      expect(startHelpResult.stdout).toContain('--max-events');

      const stopHelpResult = await runCLI(['record', 'stop', '--help']);
      expect(stopHelpResult.exitCode).toBe(0);
      expect(stopHelpResult.stdout).toContain('Stop recording and output session data');
      expect(stopHelpResult.stdout).toContain('--out');

      const replayHelpResult = await runCLI(['replay', '--help']);
      expect(replayHelpResult.exitCode).toBe(0);
      expect(replayHelpResult.stdout).toContain('Replay events from a saved session');
      expect(replayHelpResult.stdout).toContain('--url');
      expect(replayHelpResult.stdout).toContain('--dry-run');
    });

    it('should handle invalid max-events parameter', async () => {
      const result = await runCLI(['record', 'start', '--max-events', 'invalid'], { env: getTestEnv() });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Invalid max-events value');
    });

    it('should handle replay with non-existent file', async () => {
      const result = await runCLI(['replay', '/non/existent/file.json'], { env: getTestEnv() });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ File not found');
    });

    it('should handle replay with invalid JSON file', async () => {
      const tempFile = path.join(os.tmpdir(), `invalid-${Date.now()}.json`);
      
      try {
        fs.writeFileSync(tempFile, 'invalid json content');
        
        const result = await runCLI(['replay', tempFile], { env: getTestEnv() });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('❌ Invalid JSON file');
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    it('should handle replay with invalid session format', async () => {
      const tempFile = path.join(os.tmpdir(), `invalid-session-${Date.now()}.json`);
      
      try {
        fs.writeFileSync(tempFile, JSON.stringify({ invalid: 'format' }));
        
        const result = await runCLI(['replay', tempFile], { env: getTestEnv() });
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('❌ Invalid session file format');
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    });

    it('should output session data to stdout when no file specified', async () => {
      const testEnv = getTestEnv();

      // Start and stop recording
      await runCLI(['record', 'start'], { env: testEnv });
      const stopResult = await runCLI(['record', 'stop'], { env: testEnv });
      
      expect(stopResult.exitCode).toBe(0);
      
      // Should output JSON to stdout
      const sessionData = JSON.parse(stopResult.stdout);
      expect(sessionData).toHaveProperty('events');
      expect(sessionData).toHaveProperty('recordedAt');
      expect(sessionData).toHaveProperty('totalEvents');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown commands gracefully', async () => {
      const result = await runCLI(['unknown-command']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('unknown command');
    });

    it('should provide helpful error messages', async () => {
      const result = await runCLI(['track']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('missing required argument');
    });
  });
});