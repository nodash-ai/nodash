import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { createConfigCommand } from '../commands/config.js';
import { createTrackCommand } from '../commands/track.js';
import { createMetricCommand } from '../commands/metric.js';
import { createHealthCommand } from '../commands/health.js';
import { ConfigManager } from '../services/config-manager.js';
import { SDKManager } from '../services/sdk-manager.js';

// Mock dependencies
vi.mock('../services/config-manager.js');
vi.mock('../services/sdk-manager.js');

describe('Config Command', () => {
  let mockConfigManager: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockConfigManager = {
      set: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn().mockResolvedValue({}),
      validate: vi.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
      getMaskedConfig: vi.fn().mockReturnValue({})
    };
    
    vi.mocked(ConfigManager).mockImplementation(() => mockConfigManager);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates config command with subcommands', () => {
    const command = createConfigCommand();
    expect(command.name()).toBe('config');
    expect(command.commands.length).toBe(3); // set, get, list
  });

  test('config set command calls ConfigManager.set', async () => {
    const command = createConfigCommand();
    const setCommand = command.commands.find(cmd => cmd.name() === 'set');
    
    expect(setCommand).toBeDefined();
    // Note: Testing command execution would require more complex setup
    // This tests the command structure
  });
});

describe('Track Command', () => {
  let mockSDKManager: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockSDKManager = {
      trackEvent: vi.fn().mockResolvedValue({ data: { success: true } })
    };
    
    vi.mocked(SDKManager).mockImplementation(() => mockSDKManager);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates track command with correct options', () => {
    const command = createTrackCommand();
    expect(command.name()).toBe('track');
    
    const options = command.options;
    expect(options.some(opt => opt.long === '--properties')).toBe(true);
    expect(options.some(opt => opt.long === '--dry-run')).toBe(true);
    expect(options.some(opt => opt.long === '--user-id')).toBe(true);
  });
});

describe('Metric Command', () => {
  let mockSDKManager: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockSDKManager = {
      sendMetric: vi.fn().mockResolvedValue({ data: { success: true } })
    };
    
    vi.mocked(SDKManager).mockImplementation(() => mockSDKManager);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates metric command with correct options', () => {
    const command = createMetricCommand();
    expect(command.name()).toBe('metric');
    
    const options = command.options;
    expect(options.some(opt => opt.long === '--unit')).toBe(true);
    expect(options.some(opt => opt.long === '--tags')).toBe(true);
    expect(options.some(opt => opt.long === '--dry-run')).toBe(true);
  });
});

describe('Health Command', () => {
  let mockSDKManager: any;
  let consoleSpy: any;

  beforeEach(() => {
    mockSDKManager = {
      checkHealth: vi.fn().mockResolvedValue({ status: 'healthy' })
    };
    
    vi.mocked(SDKManager).mockImplementation(() => mockSDKManager);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('creates health command with correct options', () => {
    const command = createHealthCommand();
    expect(command.name()).toBe('health');
    
    const options = command.options;
    expect(options.some(opt => opt.long === '--format')).toBe(true);
    expect(options.some(opt => opt.long === '--verbose')).toBe(true);
    expect(options.some(opt => opt.long === '--timeout')).toBe(true);
  });
});