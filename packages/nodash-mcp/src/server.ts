#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ProjectConfig, SetupResult, CommandResult, Documentation } from './types.js';
import { SDK_DOCUMENTATION, CLI_DOCUMENTATION, extractExamples } from './bundled-docs.js';
import { spawn } from 'child_process';

class NodashMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'nodash-mcp',
        version: '0.1.0',
      }
    );

    this.setupHandlers();
  }

  private getSDKDocumentation(): Documentation {
    const examples = extractExamples(SDK_DOCUMENTATION);

    return {
      component: 'sdk',
      content: SDK_DOCUMENTATION,
      examples,
      lastUpdated: new Date()
    };
  }

  private getCLIDocumentation(): Documentation {
    const examples = extractExamples(CLI_DOCUMENTATION);

    return {
      component: 'cli',
      content: CLI_DOCUMENTATION,
      examples,
      lastUpdated: new Date()
    };
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'setup_project',
            description: 'Set up a nodash project with optimal configuration',
            inputSchema: {
              type: 'object',
              properties: {
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for the nodash server'
                },
                apiToken: {
                  type: 'string',
                  description: 'API token (optional)'
                },
                environment: {
                  type: 'string',
                  description: 'Environment name (optional)'
                }
              },
              required: ['baseUrl']
            }
          },
          {
            name: 'run_cli_command',
            description: 'Execute a nodash CLI command',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'CLI command to run (without "nodash" prefix)'
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Command arguments'
                }
              },
              required: ['command']
            }
          },
          {
            name: 'get_documentation',
            description: 'Get documentation for SDK or CLI components',
            inputSchema: {
              type: 'object',
              properties: {
                component: {
                  type: 'string',
                  enum: ['sdk', 'cli'],
                  description: 'Component to get documentation for'
                }
              },
              required: ['component']
            }
          }
        ]
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
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
      };
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'nodash://docs/sdk') {
        const docs = this.getSDKDocumentation();
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: docs.content
            }
          ]
        };
      }

      if (uri === 'nodash://docs/cli') {
        const docs = this.getCLIDocumentation();
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: docs.content
            }
          ]
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'setup_project':
          return await this.setupProject(args as any);
        
        case 'run_cli_command':
          return await this.runCliCommand(
            (args as any).command,
            (args as any).args || []
          );
        
        case 'get_documentation':
          return await this.getDocumentation((args as any).component);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async setupProject(config: ProjectConfig): Promise<{ content: SetupResult[] }> {
    try {
      // Initialize configuration using CLI logic
      const initResult = await this.runCliCommandInternal('init', [
        '--url', config.baseUrl,
        ...(config.apiToken ? ['--token', config.apiToken] : [])
      ]);

      if (!initResult.success) {
        return {
          content: [{
            success: false,
            message: `Failed to initialize project: ${initResult.error}`,
          }]
        };
      }

      // Test the configuration
      const healthResult = await this.runCliCommandInternal('health', []);
      
      const result: SetupResult = {
        success: healthResult.success,
        message: healthResult.success 
          ? 'Project setup completed successfully! Server is healthy and ready to use.'
          : `Project configured but server health check failed: ${healthResult.error}`,
        config
      };

      return { content: [result] };
    } catch (error) {
      return {
        content: [{
          success: false,
          message: `Setup failed: ${error instanceof Error ? error.message : error}`,
        }]
      };
    }
  }

  private async runCliCommand(command: string, args: string[]): Promise<{ content: CommandResult[] }> {
    const result = await this.runCliCommandInternal(command, args);
    return { content: [result] };
  }

  private async runCliCommandInternal(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve) => {
      // Use global nodash CLI command instead of relative path
      const child = spawn('nodash', [command, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: stderr.trim() || undefined,
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          output: '',
          error: error.message,
          exitCode: 1
        });
      });
    });
  }

  private async getDocumentation(component: 'sdk' | 'cli'): Promise<{ content: any[] }> {
    try {
      const docs = component === 'sdk' 
        ? this.getSDKDocumentation()
        : this.getCLIDocumentation();

      return {
        content: [{
          component: docs.component,
          content: docs.content,
          examples: docs.examples,
          lastUpdated: docs.lastUpdated
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get ${component} documentation: ${error}`);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Nodash MCP Server started');
  }
}

// Start the server
const server = new NodashMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});