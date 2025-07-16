import { describe, it, expect, beforeEach, vi } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Helper function to run CLI commands
async function runCLI(args: string[], options: { input?: string } = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
    const cliPath = path.resolve(__dirname, '../dist/cli.js');
    const child = spawn('node', [cliPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
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
  const testConfigDir = path.join(os.tmpdir(), 'nodash-cli-test');

  beforeEach(() => {
    mockServer = new MockServer();
    
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
    it('should show empty config initially', async () => {
      const result = await runCLI(['config', 'get']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Current configuration:');
      expect(result.stdout).toContain('{}');
    });

    it('should set and get configuration values', async () => {
      // Set base URL
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com']);
      expect(setResult.exitCode).toBe(0);
      expect(setResult.stdout).toContain('✅ Set baseUrl = https://api.example.com');

      // Get specific value
      const getResult = await runCLI(['config', 'get', 'baseUrl']);
      expect(getResult.exitCode).toBe(0);
      expect(getResult.stdout).toContain('baseUrl: https://api.example.com');

      // Get all config
      const getAllResult = await runCLI(['config', 'get']);
      expect(getAllResult.exitCode).toBe(0);
      expect(getAllResult.stdout).toContain('"baseUrl": "https://api.example.com"');
    });

    it('should set API token', async () => {
      const result = await runCLI(['config', 'set', 'apiToken', 'test-token-123']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅ Set apiToken = test-token-123');
    });

    it('should handle invalid config commands', async () => {
      const result = await runCLI(['config', 'invalid']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unknown action');
    });

    it('should require key and value for set command', async () => {
      const result = await runCLI(['config', 'set', 'baseUrl']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Usage: nodash config set <key> <value>');
    });
  });

  describe('Init Command', () => {
    it('should initialize with URL and token', async () => {
      const result = await runCLI([
        'init',
        '--url', 'https://api.example.com',
        '--token', 'my-secret-token'
      ]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('🚀 Initializing Nodash CLI');
      expect(result.stdout).toContain('✅ Set base URL: https://api.example.com');
      expect(result.stdout).toContain('✅ Set API token');
      expect(result.stdout).toContain('🎉 Nodash CLI is ready to use!');
    });

    it('should initialize with URL only', async () => {
      const result = await runCLI(['init', '--url', 'http://localhost:3000']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅ Set base URL: http://localhost:3000');
      expect(result.stdout).not.toContain('✅ Set API token');
    });

    it('should show usage when no options provided', async () => {
      const result = await runCLI(['init']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No configuration provided');
      expect(result.stdout).toContain('Example: nodash init --url');
    });
  });

  describe('Track Command', () => {
    beforeEach(async () => {
      // Set up configuration for tracking tests
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com']);
    });

    it('should fail when no configuration is set', async () => {
      // Clear config first
      const configPath = path.join(testConfigDir, '.nodash', 'config.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      const result = await runCLI(['track', 'test_event']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('No base URL configured');
    });

    it('should handle invalid JSON properties', async () => {
      const result = await runCLI(['track', 'test_event', '--properties', '{invalid json}']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Invalid JSON in properties');
    });

    it('should attempt to track event (will fail without real server)', async () => {
      const result = await runCLI(['track', 'user_signup']);
      
      // This will fail because there's no real server, but we can test the CLI behavior
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Track error');
    });
  });

  describe('Health Command', () => {
    beforeEach(async () => {
      await runCLI(['config', 'set', 'baseUrl', 'https://api.example.com']);
    });

    it('should attempt health check (will fail without real server)', async () => {
      const result = await runCLI(['health']);
      
      // This will fail because there's no real server, but we can test the CLI behavior
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('❌ Health check failed');
    });
  });

  describe('Real-world CLI Usage Scenarios', () => {
    it('should handle complete setup workflow', async () => {
      // 1. Initialize CLI
      const initResult = await runCLI([
        'init',
        '--url', 'https://analytics.myapp.com',
        '--token', 'prod-token-123'
      ]);
      expect(initResult.exitCode).toBe(0);
      expect(initResult.stdout).toContain('✅ Set base URL: https://analytics.myapp.com');
      expect(initResult.stdout).toContain('✅ Set API token');

      // 2. Verify configuration was saved
      const configResult = await runCLI(['config', 'get']);
      expect(configResult.exitCode).toBe(0);
      expect(configResult.stdout).toContain('analytics.myapp.com');
    });

    it('should persist configuration between commands', async () => {
      // Set configuration
      const setResult = await runCLI(['config', 'set', 'baseUrl', 'https://persistent.test']);
      expect(setResult.exitCode).toBe(0);

      // Verify it persists in a new command
      const getResult = await runCLI(['config', 'get', 'baseUrl']);
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
        const args = ['init', '--url', env.url];
        if (env.token) {
          args.push('--token', env.token);
        }

        const result = await runCLI(args);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain(`✅ Set base URL: ${env.url}`);
        
        if (env.token) {
          expect(result.stdout).toContain('✅ Set API token');
        }
      }
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