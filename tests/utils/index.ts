// Test Infrastructure Utilities
// This module provides a comprehensive set of utilities for testing Nodash components

// Mock Server
export { 
  MockServer, 
  RequestExpectationBuilder,
  createMockServer,
  type MockRequest,
  type MockResponse,
  type RequestExpectation,
  type MockServerOptions
} from './mock-server';

// Test Environment Management
export {
  TestEnvironmentFactory,
  ResourceManager as EnvResourceManager,
  ConfigurationHelper,
  createTestEnvironment,
  createTestEnvironmentWithAPI,
  createMockOnlyEnvironment,
  type TestEnvironment,
  type TestEnvironmentOptions
} from './test-environment';

// Test Helpers
export {
  CLITestHelper,
  ServerTestHelper,
  ProcessTestHelper,
  FileSystemTestHelper,
  TimingTestHelper,
  cli,
  server,
  process as processHelper,
  fs as fsHelper,
  timing,
  type CLIExecutionResult,
  type CLIExecutionOptions,
  type ServerHealthCheck,
  type ProcessWaitOptions
} from './test-helpers';

// Resource Management
export {
  ResourceManager,
  resourceManager,
  allocatePort,
  createTempDir,
  createTempFile,
  registerProcess,
  registerServer,
  cleanupAll,
  type ManagedResource,
  type ResourceStats,
  type PortAllocationOptions,
  type TempDirOptions
} from './resource-manager';

// Re-export existing infrastructure utilities for compatibility
export {
  TestEnvironmentManager as LegacyTestEnvironmentManager,
  StateResetHandler,
  ResourceCleanupManager,
  type TestEnvironment as LegacyTestEnvironment,
  type TestResource,
  type IsolationConfig
} from '../infrastructure/test-isolation';

export {
  CLITestRunner,
  ServerTestHelper as LegacyServerTestHelper,
  TestMetricsCollector,
  ConfigurationTestHelper,
  ProcessTestHelper as LegacyProcessTestHelper,
  TestDataGenerator,
  type CLITestResult,
  type ServerTestConfig,
  type TestMetrics
} from '../infrastructure/test-utilities';

export {
  MockInfrastructure,
  NetworkMocker,
  FilesystemMocker,
  ProcessMocker,
  TimeMocker,
  type NetworkCondition,
  type MockConfig,
  type FilesystemMockConfig,
  type ProcessMockConfig,
  type TimeMockConfig
} from '../infrastructure/mock-infrastructure';

// Test Server (existing)
export {
  NodashTestServer,
  type TestServer,
  type TestServerConfig
} from '../test-server';

// Convenience factory functions
export function createTestInfrastructure() {
  return {
    mockServer: createMockServer,
    testEnvironment: createTestEnvironment,
    resourceManager,
    cli: CLITestHelper,
    server: ServerTestHelper,
    timing: TimingTestHelper
  };
}

// Common test patterns
export const testPatterns = {
  // Standard test environment setup
  async setupStandardTest() {
    const env = await createTestEnvironment({
      enableMockServer: true,
      enableApiServer: false
    });
    
    return {
      env,
      mockServer: env.mockServer,
      tempDir: env.tempDir,
      configDir: env.configDir,
      cleanup: env.cleanup
    };
  },

  // Integration test environment setup
  async setupIntegrationTest() {
    const env = await createTestEnvironmentWithAPI({
      enableMockServer: true,
      enableApiServer: true
    });
    
    return {
      env,
      mockServer: env.mockServer,
      apiServer: env.apiServer,
      tempDir: env.tempDir,
      configDir: env.configDir,
      cleanup: env.cleanup
    };
  },

  // CLI test environment setup
  async setupCLITest() {
    const env = await createTestEnvironment();
    const cliEnv = {
      NODASH_CONFIG_DIR: env.configDir,
      NODASH_BASE_URL: env.mockServer.getUrl()
    };

    return {
      env,
      mockServer: env.mockServer,
      cliEnv,
      async executeCLI(args: string[]) {
        return CLITestHelper.executeNodashCLI(args, { env: cliEnv });
      },
      cleanup: env.cleanup
    };
  }
};

// Test assertions and validations
export const testAssertions = {
  // Validate CLI result
  validateCLIResult(result: any, expectations: any) {
    return CLITestHelper.validateResult(result, expectations);
  },

  // Validate server health
  async validateServerHealth(url: string) {
    return ServerTestHelper.checkServerHealth(url);
  },

  // Validate mock server expectations
  validateMockExpectations(mockServer: MockServer) {
    return mockServer.verifyAllExpectationsMet();
  }
};

// Export types for external use
export type {
  // From mock-server
  MockRequest,
  MockResponse,
  RequestExpectation,
  MockServerOptions,
  
  // From test-environment
  TestEnvironment,
  TestEnvironmentOptions,
  
  // From test-helpers
  CLIExecutionResult,
  CLIExecutionOptions,
  ServerHealthCheck,
  ProcessWaitOptions,
  
  // From resource-manager
  ManagedResource,
  ResourceStats,
  PortAllocationOptions,
  TempDirOptions
};