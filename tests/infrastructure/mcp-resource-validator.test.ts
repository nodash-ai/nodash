import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPResourceValidator } from './mcp-resource-validator';
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

describe('MCPResourceValidator', () => {
  let serverManager: MCPServerManager;
  let resourceValidator: MCPResourceValidator;
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
    resourceValidator = new MCPResourceValidator(serverManager, { enableLogging: false });

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

  describe('Resource Listing', () => {
    it('should list available resources', async () => {
      // Mock resources/list response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            resources: [
              {
                uri: 'nodash://docs/sdk',
                name: 'SDK Documentation',
                description: 'Complete SDK documentation with examples',
                mimeType: 'text/markdown'
              },
              {
                uri: 'nodash://docs/cli',
                name: 'CLI Documentation',
                description: 'Complete CLI documentation with examples',
                mimeType: 'text/markdown'
              }
            ]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.listResources(serverId);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].uri).toBe('nodash://docs/sdk');
      expect(result.resources[1].uri).toBe('nodash://docs/cli');
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle resource listing errors', async () => {
      // Mock error response
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.listResources(serverId);

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.resources).toHaveLength(0);
      expect(result.errors).toContain('Method not found');
    });
  });

  describe('Resource Validation', () => {
    it('should validate SDK documentation resource', async () => {
      // Mock resources/read response for SDK docs
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{
              uri: 'nodash://docs/sdk',
              mimeType: 'text/markdown',
              text: '# @nodash/sdk\n\nThe NodashSDK class provides...\n\n## Usage\n\n```typescript\nconst sdk = new NodashSDK();\n```'
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.validateResource(serverId, 'nodash://docs/sdk');

      expect(result.valid).toBe(true);
      expect(result.uri).toBe('nodash://docs/sdk');
      expect(result.exists).toBe(true);
      expect(result.accessible).toBe(true);
      expect(result.contentValid).toBe(true);
      expect(result.mimeTypeValid).toBe(true);
      expect(result.content).toContain('@nodash/sdk');
      expect(result.content).toContain('NodashSDK');
      expect(result.mimeType).toBe('text/markdown');
      expect(result.size).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate CLI documentation resource', async () => {
      // Mock resources/read response for CLI docs with proper content
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{
              uri: 'nodash://docs/cli',
              mimeType: 'text/markdown',
              text: '# @nodash/cli\n\nThe nodash CLI provides comprehensive command-line interface for analytics management.\n\n## Commands\n\n- `nodash init` - Initialize configuration\n- `nodash track` - Track events\n\nThis CLI tool integrates with the nodash analytics platform.'
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.validateResource(serverId, 'nodash://docs/cli');

      expect(result.valid).toBe(true);
      expect(result.uri).toBe('nodash://docs/cli');
      expect(result.exists).toBe(true);
      expect(result.accessible).toBe(true);
      expect(result.contentValid).toBe(true);
      expect(result.mimeTypeValid).toBe(true);
      expect(result.content).toContain('@nodash/cli');
      expect(result.content).toContain('nodash');
      expect(result.mimeType).toBe('text/markdown');
    });

    it('should handle invalid resource URIs', async () => {
      // Mock error response for invalid URI
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          error: {
            code: -32602,
            message: 'Unknown resource: invalid://uri'
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.validateResource(serverId, 'invalid://uri');

      expect(result.valid).toBe(false);
      expect(result.uri).toBe('invalid://uri');
      expect(result.exists).toBe(false);
      expect(result.accessible).toBe(false);
      expect(result.errors).toContain('Unknown resource: invalid://uri');
    });

    it('should detect invalid content', async () => {
      // Mock response with invalid content
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{
              uri: 'nodash://docs/sdk',
              mimeType: 'text/markdown',
              text: 'Invalid content without proper SDK references'
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.validateResource(serverId, 'nodash://docs/sdk');

      expect(result.valid).toBe(false);
      expect(result.contentValid).toBe(false);
      expect(result.errors.some(e => e.includes('@nodash/sdk'))).toBe(true);
      expect(result.errors.some(e => e.includes('NodashSDK'))).toBe(true);
    });

    it('should detect invalid MIME types', async () => {
      // Mock response with invalid MIME type
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{
              uri: 'nodash://docs/sdk',
              mimeType: 'application/octet-stream',
              text: '# @nodash/sdk\n\nThe NodashSDK class provides...'
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.validateResource(serverId, 'nodash://docs/sdk');

      expect(result.valid).toBe(false);
      expect(result.mimeTypeValid).toBe(false);
      expect(result.errors.some(e => e.includes('text/markdown'))).toBe(true);
    });

    it('should handle empty content', async () => {
      // Mock response with empty content
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{
              uri: 'nodash://docs/sdk',
              mimeType: 'text/markdown',
              text: ''
            }]
          }
        };
        mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
      }, 100);

      const result = await resourceValidator.validateResource(serverId, 'nodash://docs/sdk');

      expect(result.valid).toBe(false);
      expect(result.contentValid).toBe(false);
      expect(result.errors).toContain('Content is empty');
    });
  });

  describe('All Resources Validation', () => {
    it('should validate all resources successfully', async () => {
      let requestCount = 0;
      
      // Mock responses for list and read operations
      mockProcess.stdin.write = vi.fn((data) => {
        requestCount++;
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          let response;

          if (request.method === 'resources/list') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                resources: [
                  {
                    uri: 'nodash://docs/sdk',
                    name: 'SDK Documentation',
                    description: 'SDK docs',
                    mimeType: 'text/markdown'
                  },
                  {
                    uri: 'nodash://docs/cli',
                    name: 'CLI Documentation',
                    description: 'CLI docs',
                    mimeType: 'text/markdown'
                  }
                ]
              }
            };
          } else if (request.method === 'resources/read') {
            const uri = request.params.uri;
            const isSDK = uri.includes('sdk');
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'text/markdown',
                  text: isSDK 
                    ? '# @nodash/sdk\n\nThe NodashSDK class provides comprehensive analytics tracking capabilities for modern applications...'
                    : '# @nodash/cli\n\nThe nodash CLI provides command-line interface for analytics management and configuration...'
                }]
              }
            };
          }

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 50);
        return true;
      });

      const result = await resourceValidator.validateAllResources(serverId);

      expect(result.overall).toBe(true);
      expect(result.resources).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);
      expect(result.summary.accessible).toBe(2);
      expect(result.summary.inaccessible).toBe(0);
    });

    it('should handle mixed validation results', async () => {
      let requestCount = 0;
      
      // Mock responses with one valid, one invalid
      mockProcess.stdin.write = vi.fn((data) => {
        requestCount++;
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          let response;

          if (request.method === 'resources/list') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                resources: [
                  {
                    uri: 'nodash://docs/sdk',
                    name: 'SDK Documentation',
                    description: 'SDK docs',
                    mimeType: 'text/markdown'
                  },
                  {
                    uri: 'nodash://docs/invalid',
                    name: 'Invalid Documentation',
                    description: 'Invalid docs',
                    mimeType: 'text/markdown'
                  }
                ]
              }
            };
          } else if (request.method === 'resources/read') {
            const uri = request.params.uri;
            if (uri.includes('sdk')) {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                result: {
                  contents: [{
                    uri,
                    mimeType: 'text/markdown',
                    text: '# @nodash/sdk\n\nThe NodashSDK class provides comprehensive analytics tracking capabilities for modern applications. This SDK enables developers to integrate powerful analytics into their projects.'
                  }]
                }
              };
            } else {
              response = {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                  code: -32602,
                  message: 'Unknown resource'
                }
              };
            }
          }

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 50);
        return true;
      });

      const result = await resourceValidator.validateAllResources(serverId);

      expect(result.overall).toBe(false);
      expect(result.resources).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(1);
      expect(result.summary.invalid).toBe(1);
    });
  });

  describe('Documentation Resources Validation', () => {
    it('should validate both SDK and CLI documentation', async () => {
      let requestCount = 0;
      
      // Mock responses for both documentation resources
      mockProcess.stdin.write = vi.fn((data) => {
        requestCount++;
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          const uri = request.params.uri;
          const isSDK = uri.includes('sdk');
          
          const response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              contents: [{
                uri,
                mimeType: 'text/markdown',
                text: isSDK 
                  ? '# @nodash/sdk\n\nThe NodashSDK class provides comprehensive analytics tracking capabilities for modern applications. This SDK enables developers to integrate powerful analytics into their projects with ease.'
                  : '# @nodash/cli\n\nThe nodash CLI provides command-line interface for analytics management and configuration. Use nodash commands to manage your analytics setup.'
              }]
            }
          };

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 50);
        return true;
      });

      const result = await resourceValidator.validateDocumentationResources(serverId);

      expect(result.overall).toBe(true);
      expect(result.sdkDocs.valid).toBe(true);
      expect(result.cliDocs.valid).toBe(true);
      expect(result.sdkDocs.content).toContain('@nodash/sdk');
      expect(result.cliDocs.content).toContain('@nodash/cli');
    });
  });

  describe('URI Format Validation', () => {
    it('should validate various URI formats', async () => {
      let requestCount = 0;
      
      // Mock responses for URI format testing
      mockProcess.stdin.write = vi.fn((data) => {
        requestCount++;
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          const uri = request.params.uri;
          let response;

          if (uri === 'nodash://docs/sdk' || uri === 'nodash://docs/cli') {
            const isSDK = uri.includes('sdk');
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri,
                  mimeType: 'text/markdown',
                  text: isSDK 
                    ? '# @nodash/sdk\n\nThe NodashSDK class provides comprehensive analytics tracking capabilities for modern applications.'
                    : '# @nodash/cli\n\nThe nodash CLI provides command-line interface for analytics management. Use nodash commands to manage your setup.'
                }]
              }
            };
          } else {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32602,
                message: `Unknown resource: ${uri}`
              }
            };
          }

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 50);
        return true;
      });

      const result = await resourceValidator.validateResourceUriFormats(serverId);

      expect(result.overall).toBe(true);
      expect(result.validUris.length).toBeGreaterThanOrEqual(2);
      expect(result.invalidUris.length).toBeGreaterThanOrEqual(5);
      
      // Check that valid URIs are actually valid
      const validUriStrings = result.validUris.map(v => v.uri);
      expect(validUriStrings).toContain('nodash://docs/sdk');
      expect(validUriStrings).toContain('nodash://docs/cli');
    });
  });

  describe('Performance Testing', () => {
    it('should measure resource operation performance', async () => {
      // Mock fast responses for performance testing
      mockProcess.stdin.write = vi.fn((data) => {
        setTimeout(() => {
          const request = JSON.parse(data.toString().trim());
          let response;

          if (request.method === 'resources/list') {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                resources: [
                  { uri: 'nodash://docs/sdk', name: 'SDK', description: 'SDK docs', mimeType: 'text/markdown' }
                ]
              }
            };
          } else {
            response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                contents: [{
                  uri: request.params.uri,
                  mimeType: 'text/markdown',
                  text: '# Fast response content'
                }]
              }
            };
          }

          mockProcess.stdout.emit('data', JSON.stringify(response) + '\n');
        }, 10); // Fast response
        return true;
      });

      const performance = await resourceValidator.testResourcePerformance(serverId, 3);

      expect(performance.listResources.averageTime).toBeGreaterThan(0);
      expect(performance.readResource.averageTime).toBeGreaterThan(0);
      expect(performance.overall).toBe(true);
      
      expect(performance.listResources.minTime).toBeLessThanOrEqual(performance.listResources.maxTime);
      expect(performance.readResource.minTime).toBeLessThanOrEqual(performance.readResource.maxTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle server communication timeouts', async () => {
      // Create validator with short timeout
      const shortTimeoutValidator = new MCPResourceValidator(serverManager, { timeout: 100 });
      
      // Don't mock any response to trigger timeout
      const result = await shortTimeoutValidator.validateResource(serverId, 'nodash://docs/sdk');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Request timeout');
    });

    it('should handle invalid server ID', async () => {
      const result = await resourceValidator.validateResource('invalid-server-id', 'nodash://docs/sdk');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Server invalid-server-id not found');
    });

    it('should handle malformed responses', async () => {
      // Create validator with short timeout to avoid waiting too long
      const shortTimeoutValidator = new MCPResourceValidator(serverManager, { timeout: 500 });
      
      // Mock malformed JSON response
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'invalid json response\n');
      }, 100);

      const result = await shortTimeoutValidator.validateResource(serverId, 'nodash://docs/sdk');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});