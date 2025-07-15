import { describe, expect, test, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { ConfigManager } from '../services/config-manager.js';
import { SDKManager } from '../services/sdk-manager.js';

// Mock the SDK
vi.mock('@nodash/sdk', () => ({
  NodashSDK: vi.fn().mockImplementation(() => ({
    track: vi.fn().mockResolvedValue({ data: { success: true } }),
    sendMetric: vi.fn().mockResolvedValue({ data: { success: true } }),
    monitoring: {
      getHealth: vi.fn().mockResolvedValue({ status: 'healthy' })
    }
  })),
  NodashAPIError: class extends Error {
    constructor(message: string, public status: number) {
      super(message);
      this.name = 'NodashAPIError';
    }
  }
}));

describe('CLI Commands', () => {
  test('parses all commands correctly', () => {
    const program = new Command();
    program.command('analyze');
    program.command('config');
    program.command('track');
    program.command('metric');
    program.command('health');
    expect(program.commands.length).toBe(5);
  });
});

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager('/tmp/test-project');
  });

  test('validates configuration correctly', async () => {
    const validation = await configManager.validate();
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('API token is required. Set it with: nodash config set token <your-token>');
  });

  test('masks sensitive values', () => {
    const config = { token: 'very-long-secret-token-12345', baseUrl: 'https://api.nodash.ai' };
    const masked = configManager.getMaskedConfig(config);
    expect(masked.token).toBe('very...2345');
    expect(masked.baseUrl).toBe('https://api.nodash.ai');
  });
});

describe('SDKManager', () => {
  let sdkManager: SDKManager;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    mockConfigManager = {
      getSDKConfig: vi.fn().mockResolvedValue({
        token: 'test-token',
        baseUrl: 'https://api.test.com',
        timeout: 30000,
        retries: 3
      })
    } as any;
    
    sdkManager = new SDKManager(mockConfigManager);
  });

  test('initializes SDK with config', async () => {
    const sdk = await sdkManager.getSDK();
    expect(sdk).toBeDefined();
    expect(mockConfigManager.getSDKConfig).toHaveBeenCalled();
  });

  test('tracks events successfully', async () => {
    const result = await sdkManager.trackEvent('test_event', { prop: 'value' });
    expect(result.data.success).toBe(true);
  });

  test('sends metrics successfully', async () => {
    const result = await sdkManager.sendMetric('test_metric', 100, { unit: 'ms' });
    expect(result.data.success).toBe(true);
  });

  test('checks health successfully', async () => {
    const result = await sdkManager.checkHealth();
    expect(result.status).toBe('healthy');
  });
}); 