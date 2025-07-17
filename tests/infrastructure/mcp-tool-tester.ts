import { ChildProcess } from 'child_process';
import { MCPServerManager, MCPServerInstance } from './mcp-server-manager';

export interface MCPToolTestConfig {
  timeout?: number;
  retries?: number;
  enableLogging?: boolean;
}

export interface MCPToolResult {
  success: boolean;
  response?: any;
  error?: string;
  duration: number;
  toolName: string;
  parameters: any;
}

export interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface SetupProjectParams {
  baseUrl: string;
  apiToken?: string;
  environment?: string;
}

export interface RunCliCommandParams {
  command: string;
  args?: string[];
}

export interface GetDocumentationParams {
  component: 'sdk' | 'cli';
}

export class MCPToolTester {
  private serverManager: MCPServerManager;
  private config: MCPToolTestConfig;
  private messageId: number = 1;

  constructor(serverManager: MCPServerManager, config: Partial<MCPToolTestConfig> = {}) {
    this.serverManager = serverManager;
    this.config = {
      timeout: 30000,
      retries: 3,
      enableLogging: false,
      ...config
    };
  }

  async testSetupProject(
    serverId: string, 
    params: SetupProjectParams
  ): Promise<MCPToolResult> {
    return this.executeToolTest(serverId, 'setup_project', params);
  }

  async testRunCliCommand(
    serverId: string, 
    params: RunCliCommandParams
  ): Promise<MCPToolResult> {
    return this.executeToolTest(serverId, 'run_cli_command', params);
  }

  async testGetDocumentation(
    serverId: string, 
    params: GetDocumentationParams
  ): Promise<MCPToolResult> {
    return this.executeToolTest(serverId, 'get_documentation', params);
  }

  async testAllTools(serverId: string): Promise<{
    setupProject: MCPToolResult;
    runCliCommand: MCPToolResult;
    getDocumentation: MCPToolResult[];
  }> {
    const results = {
      setupProject: await this.testSetupProject(serverId, {
        baseUrl: 'http://localhost:3000',
        apiToken: 'test-token',
        environment: 'test'
      }),
      runCliCommand: await this.testRunCliCommand(serverId, {
        command: 'help'
      }),
      getDocumentation: [
        await this.testGetDocumentation(serverId, { component: 'sdk' }),
        await this.testGetDocumentation(serverId, { component: 'cli' })
      ]
    };

    return results;
  }

  async validateToolSchemas(serverId: string): Promise<{
    valid: boolean;
    tools: Array<{
      name: string;
      valid: boolean;
      schema?: any;
      errors: string[];
    }>;
  }> {
    try {
      const toolsResponse = await this.sendRequest(serverId, 'tools/list');
      
      if (!toolsResponse.result || !toolsResponse.result.tools) {
        return {
          valid: false,
          tools: []
        };
      }

      const expectedTools = ['setup_project', 'run_cli_command', 'get_documentation'];
      const toolValidations = [];

      for (const expectedTool of expectedTools) {
        const tool = toolsResponse.result.tools.find((t: any) => t.name === expectedTool);
        const validation = {
          name: expectedTool,
          valid: false,
          schema: tool?.inputSchema,
          errors: [] as string[]
        };

        if (!tool) {
          validation.errors.push(`Tool ${expectedTool} not found`);
        } else {
          // Validate tool schema
          if (!tool.inputSchema) {
            validation.errors.push('Missing inputSchema');
          } else {
            validation.valid = this.validateToolSchema(expectedTool, tool.inputSchema);
            if (!validation.valid) {
              validation.errors.push('Invalid schema structure');
            }
          }
        }

        toolValidations.push(validation);
      }

      return {
        valid: toolValidations.every(v => v.valid),
        tools: toolValidations
      };
    } catch (error) {
      return {
        valid: false,
        tools: []
      };
    }
  }

  async testToolParameterValidation(serverId: string): Promise<{
    setupProject: Array<{ params: any; shouldSucceed: boolean; result: MCPToolResult }>;
    runCliCommand: Array<{ params: any; shouldSucceed: boolean; result: MCPToolResult }>;
    getDocumentation: Array<{ params: any; shouldSucceed: boolean; result: MCPToolResult }>;
  }> {
    const testCases = {
      setupProject: [
        { params: { baseUrl: 'http://valid.com' }, shouldSucceed: true },
        { params: { baseUrl: 'http://valid.com', apiToken: 'token' }, shouldSucceed: true },
        { params: {}, shouldSucceed: false }, // Missing required baseUrl
        { params: { baseUrl: 123 }, shouldSucceed: false }, // Invalid type
      ],
      runCliCommand: [
        { params: { command: 'help' }, shouldSucceed: true },
        { params: { command: 'version' }, shouldSucceed: true },
        { params: { command: 'config', args: ['get'] }, shouldSucceed: true },
        { params: {}, shouldSucceed: false }, // Missing required command
        { params: { command: '' }, shouldSucceed: false }, // Empty command
      ],
      getDocumentation: [
        { params: { component: 'sdk' }, shouldSucceed: true },
        { params: { component: 'cli' }, shouldSucceed: true },
        { params: {}, shouldSucceed: false }, // Missing required component
        { params: { component: 'invalid' }, shouldSucceed: false }, // Invalid component
      ]
    };

    const results = {
      setupProject: [] as Array<{ params: any; shouldSucceed: boolean; result: MCPToolResult }>,
      runCliCommand: [] as Array<{ params: any; shouldSucceed: boolean; result: MCPToolResult }>,
      getDocumentation: [] as Array<{ params: any; shouldSucceed: boolean; result: MCPToolResult }>
    };

    // Test setup_project parameter validation
    for (const testCase of testCases.setupProject) {
      const result = await this.executeToolTest(serverId, 'setup_project', testCase.params);
      results.setupProject.push({
        params: testCase.params,
        shouldSucceed: testCase.shouldSucceed,
        result
      });
    }

    // Test run_cli_command parameter validation
    for (const testCase of testCases.runCliCommand) {
      const result = await this.executeToolTest(serverId, 'run_cli_command', testCase.params);
      results.runCliCommand.push({
        params: testCase.params,
        shouldSucceed: testCase.shouldSucceed,
        result
      });
    }

    // Test get_documentation parameter validation
    for (const testCase of testCases.getDocumentation) {
      const result = await this.executeToolTest(serverId, 'get_documentation', testCase.params);
      results.getDocumentation.push({
        params: testCase.params,
        shouldSucceed: testCase.shouldSucceed,
        result
      });
    }

    return results;
  }

  async testToolPerformance(serverId: string, iterations: number = 10): Promise<{
    setupProject: { averageTime: number; minTime: number; maxTime: number };
    runCliCommand: { averageTime: number; minTime: number; maxTime: number };
    getDocumentation: { averageTime: number; minTime: number; maxTime: number };
  }> {
    const performanceResults = {
      setupProject: [] as number[],
      runCliCommand: [] as number[],
      getDocumentation: [] as number[]
    };

    // Test setup_project performance
    for (let i = 0; i < iterations; i++) {
      const result = await this.testSetupProject(serverId, {
        baseUrl: `http://test-${i}.com`,
        apiToken: `token-${i}`
      });
      performanceResults.setupProject.push(result.duration);
    }

    // Test run_cli_command performance
    for (let i = 0; i < iterations; i++) {
      const result = await this.testRunCliCommand(serverId, {
        command: i % 2 === 0 ? 'help' : 'version'
      });
      performanceResults.runCliCommand.push(result.duration);
    }

    // Test get_documentation performance
    for (let i = 0; i < iterations; i++) {
      const result = await this.testGetDocumentation(serverId, {
        component: i % 2 === 0 ? 'sdk' : 'cli'
      });
      performanceResults.getDocumentation.push(result.duration);
    }

    return {
      setupProject: this.calculateStats(performanceResults.setupProject),
      runCliCommand: this.calculateStats(performanceResults.runCliCommand),
      getDocumentation: this.calculateStats(performanceResults.getDocumentation)
    };
  }

  private async executeToolTest(
    serverId: string, 
    toolName: string, 
    parameters: any
  ): Promise<MCPToolResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.sendRequest(serverId, 'tools/call', {
        name: toolName,
        arguments: parameters
      });

      const duration = Date.now() - startTime;

      if (response.error) {
        return {
          success: false,
          error: response.error.message,
          duration,
          toolName,
          parameters
        };
      }

      return {
        success: true,
        response: response.result,
        duration,
        toolName,
        parameters
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        toolName,
        parameters
      };
    }
  }

  private async sendRequest(
    serverId: string, 
    method: string, 
    params?: any
  ): Promise<MCPResponse> {
    const server = this.serverManager.getServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method,
      params: params || {}
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              server.process.stdout?.off('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      server.process.stdout?.on('data', onData);
      
      if (server.process.stdin) {
        server.process.stdin.write(JSON.stringify(request) + '\n');
      } else {
        clearTimeout(timeout);
        reject(new Error('Server stdin not available'));
      }
    });
  }

  private validateToolSchema(toolName: string, schema: any): boolean {
    if (!schema || typeof schema !== 'object') {
      return false;
    }

    switch (toolName) {
      case 'setup_project':
        return (
          schema.type === 'object' &&
          schema.properties &&
          schema.properties.baseUrl &&
          schema.required &&
          schema.required.includes('baseUrl')
        );
      
      case 'run_cli_command':
        return (
          schema.type === 'object' &&
          schema.properties &&
          schema.properties.command &&
          schema.required &&
          schema.required.includes('command')
        );
      
      case 'get_documentation':
        return (
          schema.type === 'object' &&
          schema.properties &&
          schema.properties.component &&
          schema.properties.component.enum &&
          schema.properties.component.enum.includes('sdk') &&
          schema.properties.component.enum.includes('cli') &&
          schema.required &&
          schema.required.includes('component')
        );
      
      default:
        return false;
    }
  }

  private calculateStats(times: number[]): { averageTime: number; minTime: number; maxTime: number } {
    if (times.length === 0) {
      return { averageTime: 0, minTime: 0, maxTime: 0 };
    }

    const sum = times.reduce((a, b) => a + b, 0);
    return {
      averageTime: Math.round(sum / times.length),
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }
}