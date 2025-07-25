# Nodash Monorepo Testing Guide

Comprehensive testing strategy for the Nodash SDK, CLI, and MCP server ecosystem.

## Overview

Our testing approach emphasizes **integration and component testing** to ensure seamless interactions between packages while maintaining individual package reliability. Tests focus on real-world usage patterns and cross-package compatibility.

## Test Architecture

### Component Tests (`packages/*/test/`)
**Purpose**: Test individual packages with real implementations
- **CLI Tests** (54 tests): Complete CLI workflow testing with real commands
- **MCP Tests** (27 tests): MCP server protocol compliance and tool execution
- **SDK Tests**: Core SDK functionality and API interactions

### Integration Tests (`tests/integration/`)
**Purpose**: Test cross-package interactions and real-world scenarios
- **CLI-MCP Integration** (19 tests): Complete agent-driven workflows
- **SDK-CLI Integration** (11 tests): Configuration sharing and data flow
- **End-to-end workflows**: Setup → configuration → usage → verification

### Infrastructure Tests (`tests/infrastructure/`)
**Purpose**: Test development and deployment infrastructure
- **MCP Server Management**: Server lifecycle and resource validation
- **Test Utilities**: Shared testing infrastructure and isolation
- **Mock Infrastructure**: Controlled testing environments

## Running Tests

### Quick Commands
```bash
# Fast development feedback (component + typecheck)
npm run test:fast

# Run specific test types
npm run test:component     # Individual package tests
npm run test:integration   # Cross-package integration tests
npm run test:e2e           # End-to-end workflow tests

# Comprehensive testing
npm run test:all           # All test types + build verification
npm run test:ci            # CI-optimized test execution
```

### Advanced Test Execution
```bash
# Use test runner with specific modes
node scripts/test-runner.js fast  # Quick feedback
node scripts/test-runner.js all   # Comprehensive
node scripts/test-runner.js ci    # CI pipeline

# Build verification across all packages
npm run build:check
```

### Package-specific Testing
```bash
# Test individual packages
npm run test -w @nodash/cli        # CLI component tests
npm run test -w @nodash/mcp        # MCP component tests
npm run test -w @nodash/sdk        # SDK component tests

# Build individual packages
npm run build -w @nodash/cli
npm run build -w @nodash/mcp
npm run build -w @nodash/sdk
```

## Test Features & Scenarios

### ✅ Component Testing (CLI Package)
- **Configuration Management** (20 tests): Config file handling, validation, persistence
- **Command Execution** (34 tests): All CLI commands with real argument processing
- **Event Recording** (12 tests): Session capture, replay, and file handling
- **Environment Support** (10 tests): Custom config directories, environment variables
- **Error Handling** (8 tests): Graceful failure modes and user-friendly messages

### ✅ Component Testing (MCP Package)
- **Server Lifecycle** (6 tests): Startup, shutdown, and process management
- **Tool Discovery** (5 tests): Available tools and schema validation
- **Resource Access** (4 tests): Documentation and resource retrieval
- **Command Execution** (12 tests): Real CLI command execution through MCP protocol

### ✅ Integration Testing
- **Cross-package Configuration**: CLI config shared with SDK operations
- **Agent Workflows**: Complete AI agent interaction patterns
- **Data Flow**: Event tracking from CLI through SDK to backend
- **Environment Switching**: Development, staging, production configurations
- **Performance**: Rapid sequential operations and concurrent usage

### ✅ Real-world Scenarios
- **Developer Workflow**: Project setup → configuration → tracking → health checks
- **Agent-driven Operations**: MCP server handling complex multi-step tasks
- **Multi-environment Support**: Seamless switching between environments
- **Error Recovery**: Network failures, invalid configurations, permission issues

## Test Configuration

### Vitest Configurations
- **`vitest.integration.config.ts`**: Cross-package integration tests
- **`vitest.e2e.config.ts`**: End-to-end workflow tests
- **`packages/*/vitest.config.ts`**: Individual package configurations

### Test Server Management
```typescript
// Integration tests run against real test servers
const testServer = await startIntegrationServer();
const serverUrl = `http://localhost:${testServer.port}`;

// Tests use real SDK instances
const sdk = new NodashSDK(serverUrl, 'test-api-key');
```

### Environment Variables
```bash
# Test environment settings
NODE_ENV=test
NODASH_CONFIG_DIR=./test-config
INTEGRATION_SERVER_PORT=65042
MCP_SERVER_TIMEOUT=10000
```

## Writing New Tests

### Component Test Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('CLI Component Tests', () => {
  it('should execute command successfully', async () => {
    const { stdout, stderr } = await execFileAsync('node', [
      'dist/index.js',
      'command',
      '--option', 'value'
    ]);
    
    expect(stderr).toBe('');
    expect(stdout).toContain('expected output');
  });
});
```

### Integration Test Pattern
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { NodashSDK } from '@nodash/sdk';
import { startIntegrationServer, stopIntegrationServer } from './setup';

describe('SDK-CLI Integration', () => {
  let serverUrl: string;
  let sdk: NodashSDK;
  
  beforeAll(async () => {
    const server = await startIntegrationServer();
    serverUrl = `http://localhost:${server.port}`;
    sdk = new NodashSDK(serverUrl, 'test-token');
  });
  
  it('should share configuration between CLI and SDK', async () => {
    // Use CLI to set configuration
    await execCLI(['config', 'set', 'baseUrl', serverUrl]);
    
    // Verify SDK can use the same configuration
    const health = await sdk.health();
    expect(health.status).toBe('healthy');
  });
});
```

### MCP Integration Pattern
```typescript
import { describe, it, expect } from 'vitest';
import { startMCPServer, sendMCPRequest } from './mcp-utils';

describe('MCP Integration', () => {
  it('should handle tool execution', async () => {
    const server = await startMCPServer();
    
    const response = await sendMCPRequest(server, {
      method: 'tools/call',
      params: {
        name: 'setup_project',
        arguments: {
          baseUrl: 'http://localhost:3001',
          apiToken: 'test-token'
        }
      }
    });
    
    expect(response.result.success).toBe(true);
  });
});
```

## Test Data Management

### Temporary Directories
```bash
# Component tests
./test-config/              # CLI configuration testing
./test-sessions/            # Event recording sessions

# Integration tests  
./integration-temp/         # Cross-package test data

# Infrastructure tests
./test-infrastructure/      # Mock servers and utilities
```

### Cleanup Automation
- **Component tests**: Each test gets isolated config directory
- **Integration tests**: Servers automatically started/stopped
- **Process cleanup**: All spawned processes properly terminated
- **File cleanup**: Temporary files removed after test completion

## Performance & Reliability

### Performance Benchmarks
- **CLI startup time**: Commands execute in <500ms
- **MCP server response**: Tool calls complete in <2s
- **Integration workflows**: Complete developer workflows in <5s
- **Concurrent operations**: Multiple CLI processes without conflicts

### Reliability Features
- **Process isolation**: Each test runs in separate process context
- **Port management**: Dynamic port allocation prevents conflicts
- **Timeout handling**: All operations have appropriate timeouts
- **Resource cleanup**: Servers, files, and processes cleaned up automatically

## Troubleshooting

### Common Issues

**MCP server tests failing:**
```bash
# Check server startup
DEBUG=mcp:* npm run test:integration

# Manually test MCP server
node packages/nodash-mcp/dist/server.js
```

**CLI tests hanging:**
```bash
# Check for zombie processes
ps aux | grep "nodash\|node.*cli"

# Clean test configurations
rm -rf test-config test-sessions

# Rebuild packages
npm run build
```

**Integration server conflicts:**
```bash
# Find processes using integration ports
lsof -ti:65042 | xargs kill -9

# Clean integration temp data
rm -rf integration-temp
```

### Debug Mode
```bash
# Run with debug output
DEBUG=nodash:* npm run test:integration

# Test single integration file
npx vitest run tests/integration/specific.test.ts

# Debug CLI component tests
DEBUG=cli:* npm run test -w @nodash/cli
```

## CI/CD Integration

### GitHub Actions Matrix
Tests run across:
- **Node.js versions**: 20, 22
- **Operating systems**: Ubuntu, Windows, macOS
- **Test types**: Component, integration, comprehensive

### Workflow Steps
1. **Component Tests**: Fast package-level validation
2. **Integration Tests**: Cross-package compatibility
3. **Build Matrix**: Multi-platform build verification
4. **E2E Tests**: Complete workflow validation (main branch only)

### Artifacts
- **Test results**: JUnit XML format for CI dashboard
- **Coverage reports**: Per-package and combined coverage
- **Build artifacts**: Compiled packages for deployment

## Development Workflow

### Daily Development
```bash
# Quick feedback during development
npm run test:fast

# Test specific package you're working on
npm run test -w @nodash/cli

# Integration test after cross-package changes
npm run test:integration
```

### Before Committing
```bash
# Comprehensive testing
npm run test:all

# Verify builds work across all packages
npm run build:check

# Run type checking
npm run typecheck
```

### Package Development
```bash
# Develop CLI features
cd packages/nodash-cli
npm run dev

# Test CLI changes
npm run test

# Test CLI integration with other packages
cd ../.. && npm run test:integration
```

## Architecture Testing

### Cross-package Dependencies
Tests verify:
- **SDK-CLI compatibility**: Shared configuration and authentication
- **CLI-MCP protocol**: Command execution through MCP interface
- **Version alignment**: Compatible package versions across ecosystem

### API Contract Testing
- **SDK interface stability**: Public API compatibility across versions
- **CLI command interface**: Argument parsing and output format consistency
- **MCP protocol compliance**: JSON-RPC 2.0 specification adherence

### Build System Validation
- **Dual packaging** (CLI): CommonJS and ESM builds work correctly
- **Binary generation**: CLI executable properly created and functional
- **Documentation bundling** (MCP): SDK and CLI docs embedded in server

## Philosophy

**Integration-focused testing** that validates real-world usage patterns and cross-package interactions. We prioritize testing complete workflows over isolated units, ensuring the entire Nodash ecosystem works seamlessly together for both human developers and AI agents.