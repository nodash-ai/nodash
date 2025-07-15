import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { SDKConfig } from '@nodash/sdk';
import { fileExists } from '../utils/file-utils.js';

export interface CLIConfig {
  token?: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  defaultFormat?: 'json' | 'table';
  verbose?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigManager {
  private userConfigPath: string;
  private projectConfigPath: string;
  private cachedConfig: CLIConfig | null = null;

  constructor(projectRoot: string = process.cwd()) {
    this.userConfigPath = join(homedir(), '.nodash', 'config.json');
    this.projectConfigPath = join(projectRoot, '.nodash', 'config.json');
  }

  async set(key: string, value: string): Promise<void> {
    // Validate key
    const validKeys = ['token', 'baseUrl', 'timeout', 'retries', 'defaultFormat', 'verbose'];
    if (!validKeys.includes(key)) {
      throw new Error(`Invalid configuration key: ${key}. Valid keys: ${validKeys.join(', ')}`);
    }

    // Parse value based on key type
    let parsedValue: any = value;
    if (key === 'timeout' || key === 'retries') {
      parsedValue = parseInt(value, 10);
      if (isNaN(parsedValue) || parsedValue < 0) {
        throw new Error(`${key} must be a positive number`);
      }
    } else if (key === 'verbose') {
      parsedValue = value.toLowerCase() === 'true';
    } else if (key === 'defaultFormat') {
      if (!['json', 'table'].includes(value)) {
        throw new Error('defaultFormat must be either "json" or "table"');
      }
    }

    // Load current config
    const config = await this.loadProjectConfig();
    config[key as keyof CLIConfig] = parsedValue;

    // Save to project config
    await this.saveProjectConfig(config);
    
    // Clear cache
    this.cachedConfig = null;
  }

  async get(key: string): Promise<string | undefined> {
    const config = await this.getAll();
    const value = config[key as keyof CLIConfig];
    return value?.toString();
  }

  async getAll(): Promise<CLIConfig> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    // Load user config first (defaults)
    const userConfig = await this.loadUserConfig();
    
    // Load project config (overrides)
    const projectConfig = await this.loadProjectConfig();

    // Merge configs (project overrides user)
    this.cachedConfig = {
      ...userConfig,
      ...projectConfig
    };

    return this.cachedConfig;
  }

  async validate(): Promise<ValidationResult> {
    const config = await this.getAll();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.token) {
      errors.push('API token is required. Set it with: nodash config set token <your-token>');
    }

    // Validate token format (basic check)
    if (config.token && config.token.length < 10) {
      warnings.push('API token seems too short. Make sure you have the correct token.');
    }

    // Validate baseUrl format
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push('baseUrl must be a valid URL');
      }
    }

    // Validate numeric values
    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      warnings.push('timeout should be between 1000ms and 300000ms (5 minutes)');
    }

    if (config.retries && (config.retries < 0 || config.retries > 10)) {
      warnings.push('retries should be between 0 and 10');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getSDKConfig(): Promise<SDKConfig> {
    const config = await this.getAll();
    
    if (!config.token) {
      throw new Error('API token not configured. Run: nodash config set token <your-token>');
    }

    return {
      token: config.token,
      baseUrl: config.baseUrl,
      timeout: config.timeout || 30000,
      retries: config.retries || 3
    };
  }

  private async loadUserConfig(): Promise<CLIConfig> {
    if (!await fileExists(this.userConfigPath)) {
      return {};
    }

    try {
      const content = await readFile(this.userConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async loadProjectConfig(): Promise<CLIConfig> {
    if (!await fileExists(this.projectConfigPath)) {
      return {};
    }

    try {
      const content = await readFile(this.projectConfigPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private async saveProjectConfig(config: CLIConfig): Promise<void> {
    // Ensure directory exists
    const configDir = dirname(this.projectConfigPath);
    if (!await fileExists(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    // Save config
    await writeFile(this.projectConfigPath, JSON.stringify(config, null, 2));
  }

  async saveUserConfig(config: CLIConfig): Promise<void> {
    // Ensure directory exists
    const configDir = dirname(this.userConfigPath);
    if (!await fileExists(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    // Save config
    await writeFile(this.userConfigPath, JSON.stringify(config, null, 2));
  }

  // Helper method to mask sensitive values for display
  getMaskedConfig(config: CLIConfig): Record<string, string> {
    const masked: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(config)) {
      if (key === 'token' && value) {
        // Show first 4 and last 4 characters
        const token = value.toString();
        if (token.length > 8) {
          masked[key] = `${token.slice(0, 4)}...${token.slice(-4)}`;
        } else {
          masked[key] = '***';
        }
      } else {
        masked[key] = value?.toString() || '';
      }
    }
    
    return masked;
  }
}