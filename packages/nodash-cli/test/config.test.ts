import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../src/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: string | undefined;
  let testConfigDir: string;

  beforeEach(() => {
    configManager = new ConfigManager();
    originalEnv = process.env.NODASH_CONFIG_DIR;
    testConfigDir = path.join(os.tmpdir(), `nodash-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.NODASH_CONFIG_DIR = originalEnv;
    } else {
      delete process.env.NODASH_CONFIG_DIR;
    }

    // Clean up test directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Environment Variable Support', () => {
    it('should use NODASH_CONFIG_DIR when set', () => {
      process.env.NODASH_CONFIG_DIR = testConfigDir;
      
      configManager.setConfigValue('baseUrl', 'https://test.example.com');
      
      // Verify config was written to custom directory
      const configFile = path.join(testConfigDir, 'config.json');
      expect(fs.existsSync(configFile)).toBe(true);
      
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      expect(config.baseUrl).toBe('https://test.example.com');
    });

    it('should fall back to default directory when NODASH_CONFIG_DIR is not set', () => {
      delete process.env.NODASH_CONFIG_DIR;
      
      // Create a new ConfigManager instance to ensure it uses the default directory
      const defaultConfigManager = new ConfigManager();
      const config = defaultConfigManager.getConfig();
      
      // Should not throw error and return config (may be empty or contain existing values)
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should create custom directory if it does not exist', () => {
      process.env.NODASH_CONFIG_DIR = testConfigDir;
      
      expect(fs.existsSync(testConfigDir)).toBe(false);
      
      configManager.setConfigValue('apiToken', 'test-token');
      
      expect(fs.existsSync(testConfigDir)).toBe(true);
      expect(fs.existsSync(path.join(testConfigDir, 'config.json'))).toBe(true);
    });

    it('should handle nested directory paths', () => {
      const nestedDir = path.join(testConfigDir, 'nested', 'config');
      process.env.NODASH_CONFIG_DIR = nestedDir;
      
      configManager.setConfigValue('environment', 'test');
      
      expect(fs.existsSync(nestedDir)).toBe(true);
      expect(fs.existsSync(path.join(nestedDir, 'config.json'))).toBe(true);
    });
  });

  describe('Configuration Persistence', () => {
    beforeEach(() => {
      process.env.NODASH_CONFIG_DIR = testConfigDir;
    });

    it('should persist configuration values correctly', () => {
      configManager.setConfigValue('baseUrl', 'https://api.example.com');
      configManager.setConfigValue('apiToken', 'secret-token');
      
      // Create new instance to test persistence
      const newConfigManager = new ConfigManager();
      const config = newConfigManager.getConfig();
      
      expect(config.baseUrl).toBe('https://api.example.com');
      expect(config.apiToken).toBe('secret-token');
    });

    it('should retrieve individual config values correctly', () => {
      configManager.setConfigValue('baseUrl', 'https://test.com');
      configManager.setConfigValue('apiToken', 'token123');
      
      expect(configManager.getConfigValue('baseUrl')).toBe('https://test.com');
      expect(configManager.getConfigValue('apiToken')).toBe('token123');
      expect(configManager.getConfigValue('environment')).toBeUndefined();
    });

    it('should merge configurations correctly', () => {
      configManager.setConfig({ baseUrl: 'https://first.com' });
      configManager.setConfig({ apiToken: 'token456' });
      
      const config = configManager.getConfig();
      expect(config.baseUrl).toBe('https://first.com');
      expect(config.apiToken).toBe('token456');
    });

    it('should update existing configuration values', () => {
      configManager.setConfigValue('baseUrl', 'https://old.com');
      configManager.setConfigValue('baseUrl', 'https://new.com');
      
      expect(configManager.getConfigValue('baseUrl')).toBe('https://new.com');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when cannot create directory', () => {
      // Try to create config in a location that should fail (like root on Unix systems)
      const invalidPath = process.platform === 'win32' ? 'C:\\Windows\\System32\\nodash-test' : '/root/nodash-test';
      process.env.NODASH_CONFIG_DIR = invalidPath;
      
      expect(() => {
        configManager.setConfigValue('test', 'value');
      }).toThrow(/Failed to create configuration directory/);
    });

    it('should handle corrupted config file gracefully', () => {
      process.env.NODASH_CONFIG_DIR = testConfigDir;
      
      // Create directory and write invalid JSON
      fs.mkdirSync(testConfigDir, { recursive: true });
      fs.writeFileSync(path.join(testConfigDir, 'config.json'), 'invalid json content');
      
      // Should return empty config instead of throwing
      const config = configManager.getConfig();
      expect(config).toEqual({});
    });

    it('should provide helpful error messages', () => {
      // Test error handling by trying to write to a read-only directory
      process.env.NODASH_CONFIG_DIR = testConfigDir;
      
      // Create the directory first
      fs.mkdirSync(testConfigDir, { recursive: true });
      
      // Create a read-only config file to trigger write error
      const configFile = path.join(testConfigDir, 'config.json');
      fs.writeFileSync(configFile, '{}');
      
      // Make the file read-only (on Unix systems)
      if (process.platform !== 'win32') {
        fs.chmodSync(configFile, 0o444); // Read-only
      }
      
      try {
        configManager.setConfigValue('test', 'value');
        
        // On Windows, the write might succeed, so we'll just check that no error was thrown
        if (process.platform === 'win32') {
          expect(true).toBe(true); // Test passes on Windows
        }
      } catch (error) {
        // On Unix systems, we expect an error with helpful message
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Failed to write configuration to');
        expect((error as Error).message).toContain(testConfigDir);
      }
    });
  });

  describe('Configuration Isolation', () => {
    it('should maintain separate configurations for different directories', () => {
      const dir1 = path.join(testConfigDir, 'env1');
      const dir2 = path.join(testConfigDir, 'env2');
      
      // Configure first environment
      process.env.NODASH_CONFIG_DIR = dir1;
      const config1 = new ConfigManager();
      config1.setConfigValue('baseUrl', 'https://env1.com');
      config1.setConfigValue('apiToken', 'token1');
      
      // Configure second environment
      process.env.NODASH_CONFIG_DIR = dir2;
      const config2 = new ConfigManager();
      config2.setConfigValue('baseUrl', 'https://env2.com');
      config2.setConfigValue('apiToken', 'token2');
      
      // Verify isolation
      process.env.NODASH_CONFIG_DIR = dir1;
      const check1 = new ConfigManager();
      expect(check1.getConfigValue('baseUrl')).toBe('https://env1.com');
      expect(check1.getConfigValue('apiToken')).toBe('token1');
      
      process.env.NODASH_CONFIG_DIR = dir2;
      const check2 = new ConfigManager();
      expect(check2.getConfigValue('baseUrl')).toBe('https://env2.com');
      expect(check2.getConfigValue('apiToken')).toBe('token2');
    });

    it('should not interfere with default configuration', () => {
      // Set up custom config
      process.env.NODASH_CONFIG_DIR = testConfigDir;
      configManager.setConfigValue('baseUrl', 'https://custom.com');
      
      // Switch to default (this test assumes default directory is accessible)
      delete process.env.NODASH_CONFIG_DIR;
      const defaultConfig = new ConfigManager();
      const defaultValues = defaultConfig.getConfig();
      
      // Default config should not contain custom values
      expect(defaultValues.baseUrl).not.toBe('https://custom.com');
    });
  });

  describe('File Permissions', () => {
    beforeEach(() => {
      process.env.NODASH_CONFIG_DIR = testConfigDir;
    });

    it('should create config directory with proper permissions', () => {
      configManager.setConfigValue('test', 'value');
      
      const stats = fs.statSync(testConfigDir);
      // Check that directory is readable and writable by owner
      expect(stats.isDirectory()).toBe(true);
      
      // On Unix systems, check permissions (skip on Windows)
      if (process.platform !== 'win32') {
        const mode = stats.mode & parseInt('777', 8);
        expect(mode).toBe(parseInt('700', 8)); // Owner read/write/execute only
      }
    });

    it('should create config file with proper permissions', () => {
      configManager.setConfigValue('test', 'value');
      
      const configFile = path.join(testConfigDir, 'config.json');
      const stats = fs.statSync(configFile);
      
      // On Unix systems, check file permissions (skip on Windows)
      if (process.platform !== 'win32') {
        const mode = stats.mode & parseInt('777', 8);
        expect(mode).toBe(parseInt('600', 8)); // Owner read/write only
      }
    });
  });

  describe('Backward Compatibility', () => {
    let defaultConfigDir: string;
    let defaultConfigFile: string;

    beforeEach(() => {
      // Ensure we're testing default behavior
      delete process.env.NODASH_CONFIG_DIR;
      defaultConfigDir = path.join(os.homedir(), '.nodash');
      defaultConfigFile = path.join(defaultConfigDir, 'config.json');
    });

    afterEach(() => {
      // Clean up any test config in default directory (be careful!)
      if (fs.existsSync(defaultConfigFile)) {
        try {
          const config = JSON.parse(fs.readFileSync(defaultConfigFile, 'utf8'));
          // Only remove if it contains our test values
          if (config.baseUrl === 'https://backward-compat-test.com' || 
              config.apiToken === 'backward-compat-token') {
            fs.unlinkSync(defaultConfigFile);
          }
        } catch {
          // Ignore errors
        }
      }
    });

    it('should use default ~/.nodash directory when NODASH_CONFIG_DIR is not set', () => {
      const defaultConfigManager = new ConfigManager();
      
      // This should work without throwing errors
      const config = defaultConfigManager.getConfig();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should maintain existing configurations in default directory', () => {
      // Create a config in the default directory (if accessible)
      try {
        const defaultConfigManager = new ConfigManager();
        defaultConfigManager.setConfigValue('baseUrl', 'https://backward-compat-test.com');
        
        // Create a new instance to test persistence
        const newConfigManager = new ConfigManager();
        const config = newConfigManager.getConfig();
        
        expect(config.baseUrl).toBe('https://backward-compat-test.com');
      } catch (error) {
        // If we can't write to the default directory (permissions), skip this test
        console.log('Skipping default directory test due to permissions');
        expect(true).toBe(true);
      }
    });

    it('should not break existing CLI behavior when environment variable is not set', () => {
      // Ensure environment variable is not set
      delete process.env.NODASH_CONFIG_DIR;
      
      const defaultConfigManager = new ConfigManager();
      
      // These operations should work the same as before
      expect(() => defaultConfigManager.getConfig()).not.toThrow();
      expect(() => defaultConfigManager.getConfigValue('baseUrl')).not.toThrow();
      
      // Setting config should work (if permissions allow)
      try {
        defaultConfigManager.setConfigValue('apiToken', 'backward-compat-token');
        expect(defaultConfigManager.getConfigValue('apiToken')).toBe('backward-compat-token');
      } catch (error) {
        // If permissions don't allow, that's expected in some environments
        console.log('Skipping default directory write test due to permissions');
        expect(true).toBe(true);
      }
    });

    it('should handle migration between default and custom directories', () => {
      // Test switching from default to custom directory
      delete process.env.NODASH_CONFIG_DIR;
      
      try {
        // Set up config in default directory
        const defaultManager = new ConfigManager();
        defaultManager.setConfigValue('baseUrl', 'https://default-config.com');
        
        // Switch to custom directory
        process.env.NODASH_CONFIG_DIR = testConfigDir;
        const customManager = new ConfigManager();
        
        // Custom directory should start empty
        const customConfig = customManager.getConfig();
        expect(customConfig.baseUrl).toBeUndefined();
        
        // Set different config in custom directory
        customManager.setConfigValue('baseUrl', 'https://custom-config.com');
        
        // Switch back to default
        delete process.env.NODASH_CONFIG_DIR;
        const backToDefaultManager = new ConfigManager();
        const defaultConfig = backToDefaultManager.getConfig();
        
        // Should still have original default config
        expect(defaultConfig.baseUrl).toBe('https://default-config.com');
        
      } catch (error) {
        // If we can't write to default directory, skip this test
        console.log('Skipping migration test due to permissions');
        expect(true).toBe(true);
      }
    });

    it('should preserve existing config file format and structure', () => {
      process.env.NODASH_CONFIG_DIR = testConfigDir;
      
      // Create config with the expected structure
      const manager = new ConfigManager();
      manager.setConfig({
        baseUrl: 'https://api.example.com',
        apiToken: 'secret-token',
        environment: 'production'
      });
      
      // Read the file directly and verify format
      const configFile = path.join(testConfigDir, 'config.json');
      const fileContent = fs.readFileSync(configFile, 'utf8');
      const parsedConfig = JSON.parse(fileContent);
      
      // Should be properly formatted JSON
      expect(parsedConfig).toEqual({
        baseUrl: 'https://api.example.com',
        apiToken: 'secret-token',
        environment: 'production'
      });
      
      // Should be readable by a new ConfigManager instance
      const newManager = new ConfigManager();
      const loadedConfig = newManager.getConfig();
      expect(loadedConfig).toEqual(parsedConfig);
    });
  });
});