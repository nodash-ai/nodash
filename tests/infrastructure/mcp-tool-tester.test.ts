import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPToolTester } from './mcp-tool-tester';
import { MCPServerManager } from './mcp-server-manager';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true)
}));

describe('MCPToolTester', () => {
  let serverManager: MCPServerManager;
  let toolTester: MCPToolTester;
  let mockProcess: any;
  let serverId: string;

  beforeEach(async () => {
    // Create mock process
    mockProcess = new EventEmitter();
    mockProcess.pid = 12345;
    mockProcess.killed = false;
    mockProcess.kill = vi.fn((signal) => {
      mockProcess.killed = true;
      setTimeout(() => mockProcess.emit('exit', 0, signal), 10);
      return true;
    });
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: vi.fn()
    };

    vi.mocked(spawn).mockReturnValue(mockProcess as any);

    serverManager = new MCPServerManager({ enableLogging: false });
    toolTester = new MCPToolTester(serverManager, { enableLogging: false });

    // Start a test server
    setTimeout(() => {
      mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
    }, 100);

    const server = await serverManager.startServer();
    serverId = server.id;
  });

  afterEach(async () => {
    await serverManager.stopAllServers();
    vi.clearAllMocks();
  });

  describe('Tool Schema Validation', () => {
    it('should validate tool schemas correctly', async () => {
      // Mock tools/list response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              {
                name: 'setup_project',
                inputSchema: {
                  type: 'object',
                  properties: {
                    baseUrl: { type: 'string' },
                    apiToken: { type: 'string' }
                  },
                  required: ['baseUrl']
                }
              },
              {
                name: 'run_cli_command',
                inputSchema: {
                  type: 'object',
                  properties: {
                    command: { type: 'string' },
                    args: { type: 'array' }
                  },
                  required: ['command']
                }
              },
              {
                name: 'get_documentation',
                inputSchema: {
                  type: 'object',
                  properties: {
                    component: {
                      type: 'string',
                      enum: ['sdk', 'cli']
                    }
                  },
                  required: ['component']
                }
              }
            ]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const validation = await toolTester.validateToolSchemas(serverId);

      expect(validation.valid).toBe(true);
      expect(validation.tools).toHaveLength(3);
      expect(validation.tools.every(t => t.valid)).toBe(true);
    });

    it('should detect invalid tool schemas', async () => {
      // Mock tools/list response with invalid schemas
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              {
                name: 'setup_project',
                inputSchema: {
                  type: 'object',
                  properties: {
                    baseUrl: { type: 'string' }
                  }
                  // Missing required field
                }
              },
              {
                name: 'run_cli_command',
                // Missing inputSchema entirely
              },
              {
                name: 'get_documentation',
                inputSchema: {
                  type: 'object',
                  properties: {
                    component: { type: 'string' }
                    // Missing enum constraint
                  },
                  required: ['component']
                }
              }
            ]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const validation = await toolTester.validateToolSchemas(serverId);

      expect(validation.valid).toBe(false);
      expect(validation.tools).toHaveLength(3);
      
      // Check that at least one tool is invalid
      const invalidTools = validation.tools.filter(t => !t.valid);
      expect(invalidTools.length).toBeGreaterThan(0);
      
      // Check that errors are present for invalid tools
      const toolsWithErrors = validation.tools.filter(t => t.errors.length > 0);
      expect(toolsWithErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Setup Project Tool Testing', () => {
    it('should test setup_project tool successfully', async () => {
      // Mock successful setup_project response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{
              success: true,
              message: 'Project setup completed successfully',
              config: { baseUrl: 'http://test.com', apiToken: 'test-token' },
              steps: [
                { description: 'Running nodash init', status: 'completed' }
              ]
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await toolTester.testSetupProject(serverId, {
        baseUrl: 'http://test.com',
        apiToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(result.response.content[0].success).toBe(true);
      expect(result.toolName).toBe('setup_project');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle setup_project tool errors', async () => {
      // Mock error response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{
              success: false,
              message: 'Setup failed: baseUrl is required',
              error: 'Missing required parameter: baseUrl',
              steps: []
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await toolTester.testSetupProject(serverId, {
        baseUrl: 'http://test.com'
      });

      expect(result.success).toBe(true); // Tool executed successfully
      expect(result.response.content[0].success).toBe(false); // But setup failed
      expect(result.response.content[0].error).toContain('baseUrl');
    });
  });

  describe('CLI Command Tool Testing', () => {
    it('should test run_cli_command tool successfully', async () => {
      // Mock successful CLI command response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{
              success: true,
              output: 'Nodash CLI v0.1.0\nUsage: nodash <command>',
              exitCode: 0,
              command: 'nodash help'
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await toolTester.testRunCliCommand(serverId, {
        command: 'help'
      });

      expect(result.success).toBe(true);
      expect(result.response.content[0].success).toBe(true);
      expect(result.response.content[0].command).toBe('nodash help');
      expect(result.response.content[0].exitCode).toBe(0);
    });

    it('should handle CLI command failures', async () => {
      // Mock CLI command failure
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{
              success: false,
              output: '',
              error: 'Command not found',
              exitCode: 1,
              command: 'nodash invalid-command'
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await toolTester.testRunCliCommand(serverId, {
        command: 'invalid-command'
      });

      expect(result.success).toBe(true); // Tool executed successfully
      expect(result.response.content[0].success).toBe(false); // But command failed
      expect(result.response.content[0].exitCode).toBe(1);
    });
  });

  describe('Documentation Tool Testing', () => {
    it('should test get_documentation tool for SDK', async () => {
      // Mock SDK documentation response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{
              component: 'sdk',
              content: '# @nodash/sdk\n\nSDK documentation content...',
              examples: ['const sdk = new NodashSDK()', 'sdk.track("event")'],
              lastUpdated: new Date().toISOString()
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await toolTester.testGetDocumentation(serverId, {
        component: 'sdk'
      });

      expect(result.success).toBe(true);
      expect(result.response.content[0].component).toBe('sdk');
      expect(result.response.content[0].content).toContain('@nodash/sdk');
      expect(result.response.content[0].examples).toBeInstanceOf(Array);
    });

    it('should test get_documentation tool for CLI', async () => {
      // Mock CLI documentation response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{
              component: 'cli',
              content: '# @nodash/cli\n\nCLI documentation content...',
              examples: ['nodash init --url http://localhost:3000', 'nodash track event'],
              lastUpdated: new Date().toISOString()
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await toolTester.testGetDocumentation(serverId, {
        component: 'cli'
      });

      expect(result.success).toBe(true);
      expect(result.response.content[0].component).toBe('cli');
      expect(result.response.content[0].content).toContain('@nodash/cli');
      expect(result.response.content[0].examples).toBeInstanceOf(Array);
    });
  });

  describe('Parameter Validation Testing', () => {
    it('should test parameter validation for all tools', async () => {
      let requestCount = 0;
      
      // Mock responses for parameter validation tests
      mockProcess.stdin.write = vi.fn((data) => {
        requestCount++;
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          let response;

          if (request.params.name === 'setup_project') {
            if (!request.params.arguments.baseUrl) {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    success: false,
                    error: 'Missing required parameter: baseUrl'
                  }]
                }
              };
            } else {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    success: true,
                    message: 'Setup completed'
                  }]
                }
              };
            }
          } else if (request.params.name === 'run_cli_command') {
            if (!request.params.arguments.command) {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    success: false,
                    error: 'Missing required parameter: command'
                  }]
                }
              };
            } else {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    success: true,
                    output: 'Command executed'
                  }]
                }
              };
            }
          } else if (request.params.name === 'get_documentation') {
            if (!request.params.arguments.component || 
                !['sdk', 'cli'].includes(request.params.arguments.component)) {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: -32602,
                  message: 'Invalid component parameter'
                }
              };
            } else {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  content: [{
                    component: request.params.arguments.component,
                    content: 'Documentation content'
                  }]
                }
              };
            }
          }

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 50);
        return true;
      });

      const validation = await toolTester.testToolParameterValidation(serverId);

      // Check setup_project validation
      expect(validation.setupProject).toHaveLength(4);
      expect(validation.setupProject[0].result.success).toBe(true); // Valid params
      expect(validation.setupProject[2].result.success).toBe(true); // Tool executed
      expect(validation.setupProject[2].result.response.content[0].success).toBe(false); // But failed validation

      // Check run_cli_command validation
      expect(validation.runCliCommand).toHaveLength(5);
      expect(validation.runCliCommand[0].result.success).toBe(true); // Valid params

      // Check get_documentation validation
      expect(validation.getDocumentation).toHaveLength(4);
      expect(validation.getDocumentation[0].result.success).toBe(true); // Valid SDK
      expect(validation.getDocumentation[1].result.success).toBe(true); // Valid CLI
    });
  });

  describe('All Tools Testing', () => {
    it('should test all tools together', async () => {
      let requestCount = 0;
      
      // Mock responses for all tools
      mockProcess.stdin.write = vi.fn((data) => {
        requestCount++;
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          let response;

          if (request.params.name === 'setup_project') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  success: true,
                  message: 'Project setup completed',
                  steps: []
                }]
              }
            };
          } else if (request.params.name === 'run_cli_command') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  success: true,
                  output: 'Help content',
                  command: 'nodash help'
                }]
              }
            };
          } else if (request.params.name === 'get_documentation') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                content: [{
                  component: request.params.arguments.component,
                  content: `${request.params.arguments.component} documentation`,
                  examples: []
                }]
              }
            };
          }

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 50);
        return true;
      });

      const results = await toolTester.testAllTools(serverId);

      expect(results.setupProject.success).toBe(true);
      expect(results.runCliCommand.success).toBe(true);
      expect(results.getDocumentation).toHaveLength(2);
      expect(results.getDocumentation[0].success).toBe(true); // SDK docs
      expect(results.getDocumentation[1].success).toBe(true); // CLI docs
    });
  });

  describe('Performance Testing', () => {
    it('should measure tool performance', async () => {
      // Mock fast responses for performance testing
      mockProcess.stdin.write = vi.fn((data) => {
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [{
                success: true,
                message: 'Fast response'
              }]
            }
          };
          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 10); // Fast response
        return true;
      });

      const performance = await toolTester.testToolPerformance(serverId, 3);

      expect(performance.setupProject.averageTime).toBeGreaterThan(0);
      expect(performance.runCliCommand.averageTime).toBeGreaterThan(0);
      expect(performance.getDocumentation.averageTime).toBeGreaterThan(0);
      
      expect(performance.setupProject.minTime).toBeLessThanOrEqual(performance.setupProject.maxTime);
      expect(performance.runCliCommand.minTime).toBeLessThanOrEqual(performance.runCliCommand.maxTime);
      expect(performance.getDocumentation.minTime).toBeLessThanOrEqual(performance.getDocumentation.maxTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle tool execution timeouts', async () => {
      // Create a tool tester with very short timeout
      const shortTimeoutTester = new MCPToolTester(serverManager, { timeout: 100 });
      
      // Don't mock any response to trigger timeout
      const result = await shortTimeoutTester.testSetupProject(serverId, {
        baseUrl: 'http://test.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);

    it('should handle invalid server ID', async () => {
      const result = await toolTester.testSetupProject('invalid-server-id', { 
        baseUrl: 'http://test.com' 
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Server invalid-server-id not found');
    });

    it('should handle malformed responses', async () => {
      // Create a tool tester with short timeout to avoid waiting too long
      const shortTimeoutTester = new MCPToolTester(serverManager, { timeout: 500 });
      
      // Mock malformed JSON response
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'invalid json\n');
      }, 100);

      const result = await shortTimeoutTester.testSetupProject(serverId, {
        baseUrl: 'http://test.com'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});