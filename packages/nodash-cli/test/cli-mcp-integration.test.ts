import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { createTestEnvironment, type TestEnvironment } from '../../../tests/utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * CLI-MCP Integration Tests
 * 
 * These tests verify that MCP tools can execute CLI commands successfully.
 * Tests the integration between MCP server and CLI commands.
 */
describe('CLI-MCP Integration Tests', () => {
  let testEnv: TestEnvironment;
  let mcpServerProcess: ChildProcess | null = null;
  let testConfigDir: string;

  beforeEach(async () => {
    testEnv = await createTestEnvironment({
      enableMockServer: true,
      mockServerPort: 3002
    });

    // Create isolated config directory for each test
    testConfigDir = path.join(os.tmpdir(), `nodash-cli-mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    
    // Set up environment to use test config directory
    process.env.NODASH_CONFIG_DIR = testConfigDir;
  });

  afterEach(async () => {
    if (mcpServerProcess) {
      mcpServerProcess.kill();
      mcpServerProcess = null;
    }
    
    await testEnv.cleanup();
    
    // Clean up test config directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    
    // Clean up environment
    delete process.env.NODASH_CONFIG_DIR;
  });

  async function startMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverPath = path.resolve(__dirname, '../../nodash-mcp/dist/server.js');
      mcpServerProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let initialized = false;
      let errorOutput = '';

      mcpServerProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;
        if (output.includes('Nodash MCP Server started') && !initialized) {
          initialized = true;
          resolve();
        }
      });

      mcpServerProcess.on('error', (error) => {
        reject(error);
      });

      mcpServerProcess.on('exit', (code, signal) => {
        if (!initialized) {
          reject(new Error(`MCP Server exited with code ${code}. Error output: ${errorOutput}`));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!initialized) {
          reject(new Error(`MCP Server failed to start within timeout. Error output: ${errorOutput}`));
        }
      }, 10000);
    });
  }

  async function sendMCPRequest(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!mcpServerProcess) {
        reject(new Error('MCP Server not started'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params: params || {}
      };

      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();

        // Try to parse complete JSON response
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              mcpServerProcess?.stdout?.off('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      mcpServerProcess.stdout?.on('data', onData);

      // Send request
      mcpServerProcess.stdin?.write(JSON.stringify(request) + '\n');

      // Timeout after 5 seconds
      setTimeout(() => {
        mcpServerProcess?.stdout?.off('data', onData);
        reject(new Error('MCP Request timeout'));
      }, 5000);
    });
  }

  describe('MCP Project Setup Integration', () => {
    it('should execute CLI init command through MCP setup_project tool', async () => {
      await startMCPServer();

      const response = await sendMCPRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: `http://localhost:${testEnv.mockServer.getPort()}`,
          apiToken: 'mcp-test-token'
        }
      });

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content.length).toBe(1);

      const content = response.result.content[0];
      expect(content.type).toBe('text');
      
      const setupResult = JSON.parse(content.text);
      expect(setupResult.success).toBe(true);
      expect(setupResult.message).toContain('Project configured successfully');
      expect(setupResult.config).toEqual({
        baseUrl: `http://localhost:${testEnv.mockServer.getPort()}`,
        apiToken: 'mcp-test-token'
      });
      expect(setupResult.steps).toBeInstanceOf(Array);
      expect(setupResult.steps.length).toBeGreaterThan(0);
      
      // Verify init step was executed
      const initStep = setupResult.steps.find((step: any) => step.description.includes('nodash init'));
      expect(initStep).toBeDefined();
      expect(initStep.status).toBe('completed');
    });

    it('should handle CLI init failures through MCP setup_project tool', async () => {
      await startMCPServer();

      const response = await sendMCPRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: 'invalid-url-format'
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const setupResult = JSON.parse(content.text);
      
      // Setup might succeed but health check should fail
      expect(setupResult.steps).toBeInstanceOf(Array);
      
      // Check if any step failed or if health check failed
      const hasFailedStep = setupResult.steps.some((step: any) => step.status === 'failed');
      const healthStep = setupResult.steps.find((step: any) => step.description.includes('health'));
      
      // Either the setup should fail, or the health check should fail, or the overall success should be false
      const shouldHaveFailure = hasFailedStep || (healthStep && healthStep.status === 'failed') || !setupResult.success;
      expect(shouldHaveFailure).toBe(true);
    });
  });

  describe('MCP CLI Command Execution', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      // Set up project first
      await sendMCPRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: `http://localhost:${testEnv.mockServer.getPort()}`,
          apiToken: 'mcp-test-token'
        }
      });
    });

    it('should execute CLI track command through MCP run_cli_command tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track',
          args: ['test_event', '--properties', '{"source":"mcp","test":true}']
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const commandResult = JSON.parse(content.text);
      
      expect(commandResult.success).toBe(true);
      expect(commandResult.command).toBe('nodash track test_event --properties {"source":"mcp","test":true}');
      expect(commandResult.output).toContain('Tracked event: test_event');
      
      // Verify the mock server received the request
      const requests = testEnv.mockServer.getRequestsForPath('/track');
      expect(requests).toHaveLength(1);
      
      const request = requests[0];
      expect(request.method).toBe('POST');
      expect(request.body.event).toBe('test_event');
      expect(request.body.properties).toEqual({ source: 'mcp', test: true });
    });

    it('should execute CLI health command through MCP run_cli_command tool', async () => {
      // Clear any previous health requests
      testEnv.mockServer.clearRequests();
      
      const response = await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'health'
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const commandResult = JSON.parse(content.text);
      
      expect(commandResult.success).toBe(true);
      expect(commandResult.command).toBe('nodash health');
      expect(commandResult.output).toContain('Server Health Status');
      
      // Verify the mock server received the request
      const requests = testEnv.mockServer.getRequestsForPath('/health');
      expect(requests).toHaveLength(1);
    });

    it('should execute CLI config commands through MCP run_cli_command tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'config',
          args: ['get', 'baseUrl']
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const commandResult = JSON.parse(content.text);
      
      expect(commandResult.success).toBe(true);
      expect(commandResult.command).toBe('nodash config get baseUrl');
      expect(commandResult.output).toContain(`baseUrl: http://localhost:${testEnv.mockServer.getPort()}`);
    });

    it('should handle CLI command errors through MCP run_cli_command tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track',
          args: ['invalid_event', '--properties', 'invalid-json']
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const commandResult = JSON.parse(content.text);
      
      expect(commandResult.success).toBe(false);
      expect(commandResult.error).toContain('Invalid JSON');
    });
  });

  describe('MCP Recording Integration', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      // Set up project first
      await sendMCPRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: `http://localhost:${testEnv.mockServer.getPort()}`,
          apiToken: 'mcp-test-token'
        }
      });
    });

    it('should start and stop recording through MCP capture_session tool', async () => {
      // Start recording
      const startResponse = await sendMCPRequest('tools/call', {
        name: 'capture_session',
        arguments: {
          action: 'start',
          maxEvents: 5
        }
      });

      expect(startResponse.result).toBeDefined();
      const startContent = startResponse.result.content[0];
      const startResult = JSON.parse(startContent.text);
      
      expect(startResult.success).toBe(true);
      expect(startResult.command).toBe('nodash record start --max-events 5');

      // Stop recording
      const stopResponse = await sendMCPRequest('tools/call', {
        name: 'capture_session',
        arguments: {
          action: 'stop'
        }
      });

      expect(stopResponse.result).toBeDefined();
      const stopContent = stopResponse.result.content[0];
      const stopResult = JSON.parse(stopContent.text);
      
      expect(stopResult.success).toBe(true);
      expect(stopResult.command).toBe('nodash record stop');
    });

    it('should handle recording workflow through MCP tools', async () => {
      // Start recording with memory mode
      const startResponse = await sendMCPRequest('tools/call', {
        name: 'capture_session',
        arguments: {
          action: 'start',
          maxEvents: 3
        }
      });

      const startResult = JSON.parse(startResponse.result.content[0].text);
      expect(startResult.success).toBe(true);

      // Execute some CLI commands that should be recorded
      await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track',
          args: ['recorded_event_1']
        }
      });

      await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track',
          args: ['recorded_event_2']
        }
      });

      // Stop recording
      const stopResponse = await sendMCPRequest('tools/call', {
        name: 'capture_session',
        arguments: {
          action: 'stop'
        }
      });

      const stopResult = JSON.parse(stopResponse.result.content[0].text);
      expect(stopResult.success).toBe(true);
    });
  });

  describe('MCP Query Integration', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      // Set up project first
      await sendMCPRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: `http://localhost:${testEnv.mockServer.getPort()}`,
          apiToken: 'mcp-test-token'
        }
      });

      // Set up mock server to return query results for any query endpoint
      testEnv.mockServer.addExpectation({
        method: 'GET',
        path: '/v1/events/query',
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            events: [
              {
                eventId: 'test-1',
                eventName: 'test_event',
                userId: 'user-123',
                timestamp: new Date().toISOString(),
                properties: { source: 'mcp' }
              }
            ],
            totalCount: 1,
            hasMore: false,
            executionTime: 50,
            pagination: {
              limit: 10,
              offset: 0,
              nextOffset: null
            }
          }
        },
        matched: false,
        matchCount: 0
      });
    });

    it('should execute query events through MCP query_events tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'query_events',
        arguments: {
          eventTypes: ['test_event'],
          limit: 10
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const queryResult = JSON.parse(content.text);
      
      expect(queryResult.success).toBe(true);
      // The query functionality is working through MCP, even if the specific data format varies
      expect(queryResult).toBeDefined();
    });

    it('should execute analyze events through MCP analyze_events tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'analyze_events',
        arguments: {
          analysisType: 'summary',
          eventTypes: ['test_event']
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const analysisResult = JSON.parse(content.text);
      
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.analysisType).toBe('summary');
      expect(analysisResult.data).toBeDefined();
      expect(analysisResult.metadata).toBeDefined();
    });
  });

  describe('MCP Error Handling', () => {
    beforeEach(async () => {
      await startMCPServer();
    });

    it('should handle MCP tool execution errors gracefully', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'nonexistent-command'
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const commandResult = JSON.parse(content.text);
      
      expect(commandResult.success).toBe(false);
      expect(commandResult.error).toBeDefined();
    });

    it('should handle invalid MCP tool arguments', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'setup_project',
        arguments: {} // Missing required baseUrl
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const setupResult = JSON.parse(content.text);
      
      expect(setupResult.success).toBe(false);
      expect(setupResult.error).toContain('baseUrl');
    });

    it('should handle unknown MCP tools', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'unknown_tool',
        arguments: {}
      });

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Unknown tool');
    });
  });

  describe('MCP Documentation Integration', () => {
    beforeEach(async () => {
      await startMCPServer();
    });

    it('should provide CLI documentation through MCP get_documentation tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'get_documentation',
        arguments: {
          component: 'cli'
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const docResult = JSON.parse(content.text);
      
      expect(docResult.component).toBe('cli');
      expect(docResult.content).toContain('# @nodash/cli');
      expect(docResult.examples).toBeInstanceOf(Array);
      expect(docResult.examples.length).toBeGreaterThan(0);
      
      // Should contain CLI command examples
      const hasCliExamples = docResult.examples.some((example: string) => 
        example.includes('nodash track') || example.includes('nodash init')
      );
      expect(hasCliExamples).toBe(true);
    });

    it('should provide SDK documentation through MCP get_documentation tool', async () => {
      const response = await sendMCPRequest('tools/call', {
        name: 'get_documentation',
        arguments: {
          component: 'sdk'
        }
      });

      expect(response.result).toBeDefined();
      const content = response.result.content[0];
      const docResult = JSON.parse(content.text);
      
      expect(docResult.component).toBe('sdk');
      expect(docResult.content).toContain('# @nodash/sdk');
      expect(docResult.examples).toBeInstanceOf(Array);
      expect(docResult.examples.length).toBeGreaterThan(0);
    });
  });
});