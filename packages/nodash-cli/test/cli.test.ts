import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// afterEach import removed - not used

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

// Mock server class removed - not used in tests

describe('Nodash CLI Component Tests', () => {
  let testConfigDir: string;

  beforeEach(() => {
    testConfigDir = path.join(os.tmpdir(), `nodash-cli-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  });

  // Help and version tests removed - these test output formatting rather than functionality

  describe('Config Management', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    it('should manage configuration correctly', async () => {
      const testEnv = getTestEnv();
      
      // Set configuration values
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: testEnv });
      expect(setResult.exitCode).toBe(0);

      // Verify configuration was saved and can be retrieved
      const getResult = await runCLI(['config', 'get', 'baseUrl'], { env: testEnv });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('https://api.example.com');

      // Test error handling for invalid commands
      const invalidResult = await runCLI(['config', 'invalid'], { env: testEnv });
      expect(invalidResult.exitCode).toBe(1);
    });
  });

  describe('Init Command', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    it('should initialize CLI configuration', async () => {
      const result = await runCLI([
        'init',
        '--url', 'https://api.example.com',
        '--token', 'my-secret-token'
      ], { env: getTestEnv() });
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('https://api.example.com');
    });
  });

  describe('Track Command', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    beforeEach(async () => {
      // Set up configuration for tracking tests
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: getTestEnv() });
    });

    it('should handle track command appropriately', async () => {
      // Test error handling for missing configuration
      const noConfigResult = await runCLI(['track', 'test_event'], { env: getTestEnv() });
      expect(noConfigResult.exitCode).toBe(1);

      // Test error handling for invalid JSON
      const invalidJsonResult = await runCLI(['track', 'test_event', '--properties', '{invalid json}'], { env: getTestEnv() });
      expect(invalidJsonResult.exitCode).toBe(1);
    });
  });

  describe('Health Command', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    beforeEach(async () => {
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com'], { env: getTestEnv() });
    });

    it('should handle health command appropriately', async () => {
      const result = await runCLI(['health'], { env: getTestEnv() });
      
      // Without real server, should handle error gracefully
      expect(result.exitCode).toBe(1);
    });
  });

  // Real-world usage scenarios removed - these are redundant with individual command tests

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

    it('should support custom config directories via environment variables', async () => {
      // Test that custom config directory works
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://custom-env.com'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });
      expect(setResult.exitCode).toBe(0);

      // Verify config was written and can be read back
      const getResult = await runCLI(['config', 'get', 'baseUrl'], {
        env: { NODASH_CONFIG_DIR: testConfigDir1 }
      });
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('https://custom-env.com');

      // Test that different directories maintain separate configs
      await runCLI(['config', 'set', 'baseUrl', 'https://different-env.com'], {
        env: { NODASH_CONFIG_DIR: testConfigDir2 }
      });

      const env2Result = await runCLI(['config', 'get', 'baseUrl'], {
        env: { NODASH_CONFIG_DIR: testConfigDir2 }
      });
      expect(env2Result.stdout).toContain('https://different-env.com');
      expect(env2Result.stdout).not.toContain('https://custom-env.com');
    });
  });

  describe('CLI Integration with SDK', () => {
    const getTestEnv = () => ({ NODASH_CONFIG_DIR: testConfigDir });

    it('should handle CLI integration with SDK', async () => {
      const testEnv = getTestEnv();
      
      // Test that CLI commands work (even if they fail due to no real server)
      const initResult = await runCLI(['init', '--url', 'https://test.com', '--token', 'test'], { env: testEnv });
      expect(initResult.exitCode).toBe(0);

      // Test error handling for invalid commands
      const invalidResult = await runCLI(['invalid-command'], { env: testEnv });
      expect(invalidResult.exitCode).toBe(1);
    });
  });

  // Error handling tests removed - covered in individual command tests
});