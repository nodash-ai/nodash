import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  TestEnvironmentManager, 
  MockInfrastructure, 
  TestMetricsCollector,
  ConfigurationTestHelper,
  TestDataGenerator
} from './index';
import * as fs from 'fs';

describe('Test Infrastructure Foundation', () => {
  let envManager: TestEnvironmentManager;
  let mockInfra: MockInfrastructure;

  beforeEach(() => {
    envManager = new TestEnvironmentManager();
    mockInfra = new MockInfrastructure();
  });

  afterEach(async () => {
    await envManager.cleanup();
    mockInfra.disableAll();
  });

  describe('TestEnvironmentManager', () => {
    it('should create isolated test environments', async () => {
      const env1 = await envManager.createIsolatedEnvironment();
      const env2 = await envManager.createIsolatedEnvironment();

      expect(env1.id).toBeDefined();
      expect(env2.id).toBeDefined();
      expect(env1.id).not.toBe(env2.id);
      expect(env1.tempDirectory).not.toBe(env2.tempDirectory);

      // Verify directories exist
      expect(await fs.promises.access(env1.tempDirectory).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.promises.access(env2.tempDirectory).then(() => true).catch(() => false)).toBe(true);
    });

    it('should reset environment state', async () => {
      const env = await envManager.createIsolatedEnvironment();
      
      // Create a test file
      const testFile = `${env.tempDirectory}/test.txt`;
      await fs.promises.writeFile(testFile, 'test content');
      
      // Verify file exists
      expect(await fs.promises.access(testFile).then(() => true).catch(() => false)).toBe(true);
      
      // Reset state
      await envManager.resetState(env);
      
      // Verify file is gone but directory structure remains
      expect(await fs.promises.access(testFile).then(() => true).catch(() => false)).toBe(false);
      expect(await fs.promises.access(env.configDirectory).then(() => true).catch(() => false)).toBe(true);
    });

    it('should validate isolation', async () => {
      const env1 = await envManager.createIsolatedEnvironment();
      const env2 = await envManager.createIsolatedEnvironment();

      const validation = await envManager.validateIsolation();

      expect(validation.environmentCount).toBe(2);
      expect(validation.isolatedDirectories).toHaveLength(2);
      expect(validation.isolatedDirectories).toContain(env1.tempDirectory);
      expect(validation.isolatedDirectories).toContain(env2.tempDirectory);
      expect(validation.issues).toHaveLength(0);
    });

    it('should cleanup all environments', async () => {
      const env1 = await envManager.createIsolatedEnvironment();
      const env2 = await envManager.createIsolatedEnvironment();

      // Verify environments exist
      expect(envManager.getAllEnvironments()).toHaveLength(2);

      await envManager.cleanup();

      // Verify cleanup
      expect(envManager.getAllEnvironments()).toHaveLength(0);
      expect(await fs.promises.access(env1.tempDirectory).then(() => true).catch(() => false)).toBe(false);
      expect(await fs.promises.access(env2.tempDirectory).then(() => true).catch(() => false)).toBe(false);
    });
  });

  describe('MockInfrastructure', () => {
    it('should enable and disable all mocks', () => {
      expect(mockInfra.isEnabled()).toBe(false);

      mockInfra.enableAll();
      expect(mockInfra.isEnabled()).toBe(true);

      mockInfra.disableAll();
      expect(mockInfra.isEnabled()).toBe(false);
    });

    it('should provide access to individual mockers', () => {
      const network = mockInfra.getNetwork();
      const filesystem = mockInfra.getFilesystem();
      const process = mockInfra.getProcess();
      const time = mockInfra.getTime();

      expect(network).toBeDefined();
      expect(filesystem).toBeDefined();
      expect(process).toBeDefined();
      expect(time).toBeDefined();
    });

    it('should clear all logs', () => {
      mockInfra.clearAllLogs();
      const logs = mockInfra.getAllLogs();

      expect(logs.network).toHaveLength(0);
      expect(logs.filesystem).toHaveLength(0);
      expect(logs.process).toHaveLength(0);
    });
  });

  describe('TestMetricsCollector', () => {
    it('should collect test metrics', async () => {
      const collector = new TestMetricsCollector();
      
      collector.start();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = collector.end();

      expect(metrics.startTime).toBeDefined();
      expect(metrics.endTime).toBeDefined();
      expect(metrics.duration).toBeGreaterThan(90); // Should be around 100ms
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.cpuUsage).toBeDefined();
    });

    it('should format metrics nicely', async () => {
      const collector = new TestMetricsCollector();
      
      collector.start();
      await new Promise(resolve => setTimeout(resolve, 50));
      const metrics = collector.end();

      const formatted = TestMetricsCollector.formatMetrics(metrics);

      expect(formatted).toContain('Duration:');
      expect(formatted).toContain('Memory Delta');
      expect(formatted).toContain('CPU Usage');
    });
  });

  describe('ConfigurationTestHelper', () => {
    it('should create temp config directories', () => {
      const configDir1 = ConfigurationTestHelper.createTempConfigDir();
      const configDir2 = ConfigurationTestHelper.createTempConfigDir('custom');

      expect(configDir1).toContain('nodash-test');
      expect(configDir2).toContain('custom');
      expect(configDir1).not.toBe(configDir2);
    });

    it('should create and read config files', async () => {
      const configDir = ConfigurationTestHelper.createTempConfigDir();
      const testConfig = { baseUrl: 'http://test.com', apiToken: 'test123' };

      const configPath = await ConfigurationTestHelper.createConfigFile(configDir, testConfig);
      const readConfig = await ConfigurationTestHelper.readConfigFile(configPath);

      expect(readConfig).toEqual(testConfig);

      // Cleanup
      await fs.promises.rm(configDir, { recursive: true, force: true });
    });

    it('should validate config format', async () => {
      const configDir = ConfigurationTestHelper.createTempConfigDir();
      const validConfig = { baseUrl: 'http://test.com', apiToken: 'test123' };
      const invalidConfig = { baseUrl: 123, apiToken: null };

      const validConfigPath = await ConfigurationTestHelper.createConfigFile(configDir + '/valid', validConfig);
      const invalidConfigPath = await ConfigurationTestHelper.createConfigFile(configDir + '/invalid', invalidConfig);

      const validResult = await ConfigurationTestHelper.validateConfigFormat(validConfigPath);
      const invalidResult = await ConfigurationTestHelper.validateConfigFormat(invalidConfigPath);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.config).toEqual(validConfig);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);

      // Cleanup
      await fs.promises.rm(configDir, { recursive: true, force: true });
    });

    it('should create environment variables from config', () => {
      const config = { baseUrl: 'http://test.com', apiToken: 'test123', timeout: 5000 };
      const envVars = ConfigurationTestHelper.createEnvironmentVariables(config);

      expect(envVars.NODASH_BASEURL).toBe('http://test.com');
      expect(envVars.NODASH_APITOKEN).toBe('test123');
      expect(envVars.NODASH_TIMEOUT).toBe('5000');
    });
  });

  describe('TestDataGenerator', () => {
    it('should generate random strings', () => {
      const str1 = TestDataGenerator.generateRandomString(10);
      const str2 = TestDataGenerator.generateRandomString(10);

      expect(str1).toHaveLength(10);
      expect(str2).toHaveLength(10);
      expect(str1).not.toBe(str2);
    });

    it('should generate test events', () => {
      const event1 = TestDataGenerator.generateTestEvent();
      const event2 = TestDataGenerator.generateTestEvent({ userId: 'custom_user' });

      expect(event1.event).toBeDefined();
      expect(event1.timestamp).toBeDefined();
      expect(event1.userId).toBeDefined();
      expect(event1.properties).toBeDefined();

      expect(event2.userId).toBe('custom_user');
      expect(event1.event).not.toBe(event2.event);
    });

    it('should generate large payloads', () => {
      const payload = TestDataGenerator.generateLargePayload(10); // 10KB
      const serialized = JSON.stringify(payload);

      expect(serialized.length).toBeGreaterThan(9000); // Should be around 10KB
      expect(payload.largeData).toBeDefined();
    });

    it('should generate test configurations', () => {
      const config1 = TestDataGenerator.generateTestConfiguration();
      const config2 = TestDataGenerator.generateTestConfiguration({ baseUrl: 'http://custom.com' });

      expect(config1.baseUrl).toBe('http://localhost:3000');
      expect(config1.apiToken).toBeDefined();
      expect(config1.environment).toBe('test');

      expect(config2.baseUrl).toBe('http://custom.com');
      expect(config1.apiToken).not.toBe(config2.apiToken);
    });
  });
});