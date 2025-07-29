# Test Infrastructure Utilities

This directory contains comprehensive test infrastructure utilities for the Nodash project. These utilities are designed to support product-level testing that focuses on external behavior and provides real protection against breaking changes.

## Overview

The test infrastructure is organized into several key components:

- **MockServer**: HTTP server mocking for testing API interactions
- **TestEnvironment**: Isolated test environments with automatic cleanup
- **TestHelpers**: Utilities for CLI execution, server testing, and more
- **ResourceManager**: Centralized resource allocation and cleanup

## Quick Start

```typescript
import { createTestEnvironment, CLITestHelper } from '../utils';

describe('My Test', () => {
  let testEnv: TestEnvironment;

  beforeEach(async () => {
    testEnv = await createTestEnvironment();
  });

  afterEach(async () => {
    await testEnv.cleanup();
  });

  it('should work with mock server', async () => {
    // Configure mock server
    testEnv.mockServer
      .expectRequest('POST', '/track')
      .respondWith(200, { success: true })
      .build();

    // Test your component
    const result = await CLITestHelper.executeNodashCLI([
      'track', 'test_event'
    ], {
      env: { NODASH_BASE_URL: testEnv.mockServer.getUrl() }
    });

    expect(result.exitCode).toBe(0);
    expect(testEnv.mockServer.verifyAllExpectationsMet().success).toBe(true);
  });
});
```

## Components

### MockServer

A flexible HTTP server for mocking API responses during tests.

```typescript
import { createMockServer } from '../utils';

const mockServer = createMockServer({
  port: 0, // Auto-assign port
  enableLogging: false,
  enableCors: true
});

await mockServer.start();

// Set up expectations
mockServer
  .expectRequest('POST', '/track')
  .withHeaders({ 'Authorization': 'Bearer token' })
  .withBody({ event: 'test_event' })
  .respondWith(200, { success: true, id: 'event-123' })
  .build();

// Your test code here...

// Verify expectations
const verification = mockServer.verifyAllExpectationsMet();
expect(verification.success).toBe(true);

await mockServer.stop();
```

**Features:**
- Request/response mocking with expectations
- Request logging and verification
- CORS support
- Delay simulation
- Default Nodash SDK-compatible endpoints

### TestEnvironment

Isolated test environments with automatic resource management.

```typescript
import { createTestEnvironment, createTestEnvironmentWithAPI } from '../utils';

// Basic environment with mock server
const env = await createTestEnvironment({
  enableMockServer: true,
  mockServerOptions: { enableLogging: true }
});

// Environment with real API server (for integration tests)
const integrationEnv = await createTestEnvironmentWithAPI({
  enableMockServer: true,
  enableApiServer: true
});

// Access components
console.log('Mock server URL:', env.mockServer.getUrl());
console.log('Temp directory:', env.tempDir);
console.log('Config directory:', env.configDir);

// Cleanup (automatic on process exit)
await env.cleanup();
```

**Features:**
- Isolated temporary directories
- Automatic port allocation
- Resource tracking and cleanup
- Mock and real server support
- Configuration management

### TestHelpers

Utilities for common testing operations.

#### CLI Testing

```typescript
import { CLITestHelper } from '../utils';

// Execute Nodash CLI
const result = await CLITestHelper.executeNodashCLI([
  'track', 'test_event',
  '--properties', '{"key": "value"}'
], {
  env: { NODASH_CONFIG_DIR: '/tmp/test-config' },
  timeout: 10000
});

// Validate result
const validation = CLITestHelper.validateResult(result, {
  exitCode: 0,
  stdoutContains: ['Event tracked successfully'],
  maxDuration: 5000
});

expect(validation.valid).toBe(true);
```

#### Server Testing

```typescript
import { ServerTestHelper } from '../utils';

// Wait for server to be healthy
const isHealthy = await ServerTestHelper.waitForServerHealth({
  url: 'http://localhost:3000',
  timeout: 30000,
  retries: 30
});

// Test specific endpoint
const response = await ServerTestHelper.testEndpoint(
  'http://localhost:3000/api/track',
  {
    method: 'POST',
    body: { event: 'test_event' },
    expectedStatus: 200
  }
);

expect(response.success).toBe(true);
```

#### File System Testing

```typescript
import { FileSystemTestHelper } from '../utils';

// Create temp file
const filePath = await FileSystemTestHelper.createTempFile(
  'test content',
  { prefix: 'config-', suffix: '.json' }
);

// Create directory structure
const dirPath = await FileSystemTestHelper.createTempDirectory({
  'config.json': '{"key": "value"}',
  'data': {
    'events.json': '[]'
  }
});

// Verify file content
const verification = await FileSystemTestHelper.verifyFileContent(
  filePath,
  'test content'
);

expect(verification.exists).toBe(true);
expect(verification.matches).toBe(true);
```

### ResourceManager

Centralized resource allocation and cleanup.

```typescript
import { resourceManager, allocatePort, createTempDir } from '../utils';

// Allocate resources
const port = await allocatePort({ min: 3000, max: 4000 });
const tempDir = await createTempDir({ prefix: 'my-test-' });

// Register custom resources
const serverId = resourceManager.registerServer(myServer);
const processId = resourceManager.registerProcess(childProcess);

// Get statistics
const stats = resourceManager.getStats();
console.log('Total resources:', stats.totalResources);

// Cleanup (automatic on process exit)
await resourceManager.cleanupAll();
```

## Test Patterns

### Standard Test Pattern

```typescript
import { testPatterns } from '../utils';

describe('Standard Test', () => {
  it('should work', async () => {
    const { env, mockServer, cleanup } = await testPatterns.setupStandardTest();
    
    try {
      // Your test code here
      mockServer.expectRequest('GET', '/health').respondWith(200, { status: 'ok' }).build();
      
      // Test logic...
      
    } finally {
      await cleanup();
    }
  });
});
```

### Integration Test Pattern

```typescript
import { testPatterns } from '../utils';

describe('Integration Test', () => {
  it('should integrate components', async () => {
    const { env, mockServer, apiServer, cleanup } = await testPatterns.setupIntegrationTest();
    
    try {
      // Test with both mock and real servers
      
    } finally {
      await cleanup();
    }
  });
});
```

### CLI Test Pattern

```typescript
import { testPatterns } from '../utils';

describe('CLI Test', () => {
  it('should execute CLI commands', async () => {
    const { env, mockServer, executeCLI, cleanup } = await testPatterns.setupCLITest();
    
    try {
      mockServer.expectRequest('POST', '/track').respondWith(200, { success: true }).build();
      
      const result = await executeCLI(['track', 'test_event']);
      expect(result.exitCode).toBe(0);
      
    } finally {
      await cleanup();
    }
  });
});
```

## Best Practices

### 1. Always Clean Up Resources

```typescript
// Good: Use try/finally or beforeEach/afterEach
let testEnv: TestEnvironment;

beforeEach(async () => {
  testEnv = await createTestEnvironment();
});

afterEach(async () => {
  await testEnv.cleanup();
});
```

### 2. Use Expectations for Mock Server

```typescript
// Good: Set up expectations before testing
mockServer
  .expectRequest('POST', '/track')
  .withHeaders({ 'Content-Type': 'application/json' })
  .respondWith(200, { success: true })
  .build();

// Test your code...

// Verify expectations were met
expect(mockServer.verifyAllExpectationsMet().success).toBe(true);
```

### 3. Test External Behavior, Not Implementation

```typescript
// Good: Test the CLI behavior
const result = await CLITestHelper.executeNodashCLI(['track', 'event']);
expect(result.exitCode).toBe(0);
expect(result.stdout).toContain('Event tracked successfully');

// Bad: Test internal implementation details
// expect(internalFunction).toHaveBeenCalled();
```

### 4. Use Appropriate Timeouts

```typescript
// Good: Set reasonable timeouts
const result = await CLITestHelper.executeNodashCLI(args, {
  timeout: 10000 // 10 seconds for CLI commands
});

const isHealthy = await ServerTestHelper.waitForServerHealth({
  url: serverUrl,
  timeout: 30000 // 30 seconds for server startup
});
```

### 5. Validate Results Thoroughly

```typescript
// Good: Use validation helpers
const validation = CLITestHelper.validateResult(result, {
  exitCode: 0,
  stdoutContains: ['Success'],
  stderrNotContains: ['Error'],
  maxDuration: 5000
});

expect(validation.valid).toBe(true);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}
```

## Troubleshooting

### Port Allocation Issues

If you encounter port allocation issues:

```typescript
// Use port ranges to avoid conflicts
const port = await allocatePort({ min: 3000, max: 4000, exclude: [3001, 3002] });
```

### Resource Leaks

Check for resource leaks:

```typescript
const leaks = resourceManager.detectLeaks();
if (leaks.hasLeaks) {
  console.log('Resource leaks detected:', leaks.leaks);
}
```

### Test Isolation Issues

Ensure proper test isolation:

```typescript
// Each test should have its own environment
beforeEach(async () => {
  testEnv = await createTestEnvironment();
});

afterEach(async () => {
  await testEnv.cleanup();
});
```

## Migration from Legacy Infrastructure

If you're migrating from the legacy test infrastructure:

```typescript
// Old way
import { NodashTestServer } from '../test-server';
const server = new NodashTestServer();
await server.start();

// New way
import { createTestEnvironment } from '../utils';
const env = await createTestEnvironment();
// Mock server is automatically available as env.mockServer
```

The new infrastructure provides better resource management, more consistent APIs, and automatic cleanup.