import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('CLI-MCP Integration Tests', () => {
  let mcpServer: ChildProcess | null = null;
  const testConfigDir = path.join(os.tmpdir(), 'nodash-cli-mcp-test');

  // Mock MCP Client for testing
  class MCPTestClient {
    private messageId = 1;

    async sendRequest(method: string, params?: any): Promise<any> {
      return new Promise((resolve, reject) => {
        if (!mcpServer) {
          reject(new Error('MCP Server not started'));
          return;
        }

        const request = {
          jsonrpc: '2.0',
          id: this.messageId++,
          method,
          params: params || {}
        };

        let responseData = '';

        const onData = (data: Buffer) => {
          responseData += data.toString();
          
          try {
            const lines = responseData.split('\n').filter(line => line.trim());
            for (const line of lines) {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                mcpServer?.stdout?.off('data', onData);
                resolve(response);
                return;
              }
            }
          } catch (e) {
            // Continue collecting data
          }
        };

        mcpServer.stdout?.on('data', onData);
        mcpServer.stdin?.write(JSON.stringify(request) + '\n');

        setTimeout(() => {
          mcpServer?.stdout?.off('data', onData);
          reject(new Error('Request timeout'));
        }, 10000);
      });
    }
  }

  let mcpClient: MCPTestClient;

  beforeAll(async () => {
    // Start MCP server
    const serverPath = path.resolve(__dirname, '../../packages/nodash-mcp/dist/server.js');
    mcpServer = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });

    mcpClient = new MCPTestClient();

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      let initialized = false;

      mcpServer!.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Nodash MCP Server started') && !initialized) {
          initialized = true;
          resolve();
        }
      });

      mcpServer!.on('error', reject);

      setTimeout(() => {
        if (!initialized) {
          reject(new Error('MCP Server failed to start within timeout'));
        }
      }, 15000);
    });
  });

  afterAll(async () => {
    if (mcpServer) {
      mcpServer.kill();
      mcpServer = null;
    }
    
    // Clean up test config directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Clean up any existing config
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('MCP Tool Discovery', () => {
    it('should discover CLI-related tools', async () => {
      const response = await mcpClient.sendRequest('tools/list');
      
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);

      const toolNames = response.result.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('setup_project');
      expect(toolNames).toContain('run_cli_command');

      // Verify CLI-specific tool schemas
      const setupTool = response.result.tools.find((tool: any) => tool.name === 'setup_project');
      expect(setupTool.inputSchema.properties.baseUrl).toBeDefined();
      expect(setupTool.inputSchema.required).toContain('baseUrl');

      const cliTool = response.result.tools.find((tool: any) => tool.name === 'run_cli_command');
      expect(cliTool.inputSchema.properties.command).toBeDefined();
      expect(cliTool.inputSchema.required).toContain('command');
    });
  });

  describe('Project Setup Integration', () => {
    it('should execute project setup through MCP', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: 'https://test-integration.example.com',
          apiToken: 'mcp-integration-token',
          environment: 'test'
        }
      });

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content.length).toBe(1);

      const setupResult = response.result.content[0];
      expect(setupResult.success).toBeDefined();
      expect(setupResult.message).toBeDefined();
      expect(setupResult.steps).toBeInstanceOf(Array);
      expect(setupResult.steps.length).toBeGreaterThan(0);

      // Verify setup steps include expected CLI operations
      const stepDescriptions = setupResult.steps.map((step: any) => step.description);
      expect(stepDescriptions.some((desc: string) => desc.includes('nodash init'))).toBe(true);
    });

    it('should handle setup with minimal configuration', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: 'http://localhost:3000'
        }
      });

      const setupResult = response.result.content[0];
      expect(setupResult.success).toBeDefined();
      // The message should mention the baseUrl was configured, even if health check fails
      expect(setupResult.message).toContain('configured');
    });

    it('should validate required setup parameters', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'setup_project',
        arguments: {} // Missing required baseUrl
      });

      // Should handle missing required parameters gracefully
      expect(response.result || response.error).toBeDefined();
      
      if (response.result) {
        const setupResult = response.result.content[0];
        expect(setupResult.success).toBe(false);
        expect(setupResult.error).toContain('baseUrl');
      }
    });
  });

  describe('CLI Command Execution', () => {
    it('should execute help command through MCP', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'help'
        }
      });

      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content.length).toBe(1);

      const commandResult = response.result.content[0];
      expect(commandResult.success).toBeDefined();
      expect(commandResult.output).toBeDefined();
      expect(commandResult.exitCode).toBeDefined();
      expect(commandResult.command).toBe('nodash help');
    });

    it('should execute version command through MCP', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'version'
        }
      });

      const commandResult = response.result.content[0];
      expect(commandResult.command).toBe('nodash version');
      
      // Command might fail if CLI isn't globally installed, but MCP should handle it
      expect(typeof commandResult.success).toBe('boolean');
      expect(commandResult.output).toBeDefined();
    });

    it('should execute config commands through MCP', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'config get'
        }
      });

      const commandResult = response.result.content[0];
      expect(commandResult.command).toBe('nodash config get');
      expect(typeof commandResult.success).toBe('boolean');
    });

    it('should handle complex CLI commands with arguments', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track test_event --properties {"source":"mcp","test":true}'
        }
      });

      const commandResult = response.result.content[0];
      expect(commandResult.command).toContain('nodash track test_event');
      expect(commandResult.command).toContain('--properties');
      expect(typeof commandResult.success).toBe('boolean');
    });

    it('should handle invalid CLI commands gracefully', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'invalid-command'
        }
      });

      const commandResult = response.result.content[0];
      expect(commandResult.success).toBe(false);
      expect(commandResult.exitCode).not.toBe(0);
      expect(commandResult.error || commandResult.output).toBeDefined();
    });
  });

  describe('Documentation Integration', () => {
    it('should provide CLI documentation through MCP', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'get_documentation',
        arguments: {
          component: 'cli'
        }
      });

      expect(response.result).toBeDefined();
      const docData = response.result.content[0];
      
      expect(docData.component).toBe('cli');
      expect(docData.content).toContain('# @nodash/cli');
      expect(docData.examples).toBeInstanceOf(Array);
      expect(docData.examples.length).toBeGreaterThan(0);

      // Verify CLI-specific examples
      const cliExamples = docData.examples.filter((ex: string) => 
        ex.includes('nodash ') || ex.includes('npm install @nodash/cli')
      );
      expect(cliExamples.length).toBeGreaterThan(0);
    });

    it('should provide CLI documentation via resource access', async () => {
      const response = await mcpClient.sendRequest('resources/read', {
        uri: 'nodash://docs/cli'
      });

      expect(response.result).toBeDefined();
      const content = response.result.contents[0];
      
      expect(content.uri).toBe('nodash://docs/cli');
      expect(content.mimeType).toBe('text/markdown');
      expect(content.text).toContain('# @nodash/cli');
      expect(content.text).toContain('nodash init');
      expect(content.text).toContain('nodash track');
      expect(content.text).toContain('nodash health');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle CLI execution errors gracefully', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track' // Missing required event name
        }
      });

      const commandResult = response.result.content[0];
      expect(commandResult.success).toBe(false);
      expect(commandResult.exitCode).not.toBe(0);
      expect(commandResult.error || commandResult.output).toContain('missing required argument');
    });

    it('should handle setup errors gracefully', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: 'invalid-url-format'
        }
      });

      const setupResult = response.result.content[0];
      // Should either succeed with warning or fail gracefully
      expect(typeof setupResult.success).toBe('boolean');
      if (!setupResult.success) {
        expect(setupResult.error).toBeDefined();
      }
    });

    it('should handle unknown tool requests', async () => {
      const response = await mcpClient.sendRequest('tools/call', {
        name: 'unknown_cli_tool',
        arguments: {}
      });

      expect(response.error).toBeDefined();
      expect(response.error.message).toContain('Unknown tool');
    });
  });

  describe('Real-world Agent Scenarios', () => {
    it('should support agent-driven project setup workflow', async () => {
      // 1. Agent discovers available tools
      const toolsResponse = await mcpClient.sendRequest('tools/list');
      const toolNames = toolsResponse.result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('setup_project');
      expect(toolNames).toContain('run_cli_command');

      // 2. Agent reads CLI documentation
      const docsResponse = await mcpClient.sendRequest('tools/call', {
        name: 'get_documentation',
        arguments: { component: 'cli' }
      });
      expect(docsResponse.result.content[0].examples.length).toBeGreaterThan(0);

      // 3. Agent sets up project
      const setupResponse = await mcpClient.sendRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: 'https://agent-setup.example.com',
          apiToken: 'agent-token',
          environment: 'development'
        }
      });
      expect(setupResponse.result.content[0].success).toBeDefined();

      // 4. Agent verifies setup by running config command
      const configResponse = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: { command: 'config get' }
      });
      expect(configResponse.result.content[0].command).toBe('nodash config get');
    });

    it('should support agent-driven troubleshooting workflow', async () => {
      // 1. Agent checks CLI help
      const helpResponse = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: { command: 'help' }
      });
      expect(helpResponse.result.content[0].command).toBe('nodash help');

      // 2. Agent checks current configuration
      const configResponse = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: { command: 'config get' }
      });
      expect(configResponse.result.content[0].command).toBe('nodash config get');

      // 3. Agent attempts health check
      const healthResponse = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: { command: 'health' }
      });
      expect(healthResponse.result.content[0].command).toBe('nodash health');
    });

    it('should support agent-driven analytics workflow', async () => {
      // 1. Agent sets up project for analytics
      const setupResponse = await mcpClient.sendRequest('tools/call', {
        name: 'setup_project',
        arguments: {
          baseUrl: 'https://analytics.example.com',
          apiToken: 'analytics-token'
        }
      });
      expect(setupResponse.result.content[0].success).toBeDefined();

      // 2. Agent tracks test event
      const trackResponse = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: {
          command: 'track agent_test_event --properties {"agent":"mcp","workflow":"analytics"}'
        }
      });
      expect(trackResponse.result.content[0].command).toContain('track agent_test_event');

      // 3. Agent verifies health
      const healthResponse = await mcpClient.sendRequest('tools/call', {
        name: 'run_cli_command',
        arguments: { command: 'health' }
      });
      expect(healthResponse.result.content[0].command).toBe('nodash health');
    });
  });

  describe('Parameter Validation Integration', () => {
    it('should validate setup_project parameters', async () => {
      const testCases = [
        {
          args: { baseUrl: 'https://valid.com', apiToken: 'token' },
          shouldSucceed: true
        },
        {
          args: { baseUrl: 'https://valid.com' },
          shouldSucceed: true
        },
        {
          args: {},
          shouldSucceed: false
        }
      ];

      for (const testCase of testCases) {
        const response = await mcpClient.sendRequest('tools/call', {
          name: 'setup_project',
          arguments: testCase.args
        });

        if (testCase.shouldSucceed) {
          expect(response.result).toBeDefined();
          const result = response.result.content[0];
          expect(typeof result.success).toBe('boolean');
        } else {
          // Should either return error or success=false
          expect(response.result || response.error).toBeDefined();
        }
      }
    });

    it('should validate run_cli_command parameters', async () => {
      const testCases = [
        { command: 'help', shouldSucceed: true },
        { command: 'config get', shouldSucceed: true },
        { command: '', shouldSucceed: false }
      ];

      for (const testCase of testCases) {
        const response = await mcpClient.sendRequest('tools/call', {
          name: 'run_cli_command',
          arguments: { command: testCase.command }
        });

        expect(response.result).toBeDefined();
        const result = response.result.content[0];
        
        if (testCase.shouldSucceed) {
          expect(result.command).toBeDefined();
        } else {
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      }
    });
  });
});