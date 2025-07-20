#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ProjectConfig, SetupResult, CommandResult, Documentation, SetupStep } from './types.js';
import { SDK_DOCUMENTATION, CLI_DOCUMENTATION, extractExamples } from './bundled-docs.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodashMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'nodash-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
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
          },
          {
            name: 'capture_session',
            description: 'Start or stop event recording session',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['start', 'stop'],
                  description: 'Action to perform (start or stop recording)'
                },
                maxEvents: {
                  type: 'number',
                  description: 'Maximum number of events to record (only for start action, default: 100)'
                }
              },
              required: ['action']
            }
          },
          {
            name: 'replay_session',
            description: 'Replay events from a saved session file',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to session JSON file'
                },
                url: {
                  type: 'string',
                  description: 'Override base URL for replay (optional)'
                },
                dryRun: {
                  type: 'boolean',
                  description: 'Log events without sending HTTP requests (optional)'
                }
              },
              required: ['filePath']
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

        case 'capture_session':
          return await this.captureSession((args as any).action, (args as any).maxEvents);

        case 'replay_session':
          return await this.replaySession((args as any).filePath, (args as any).url, (args as any).dryRun);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async setupProject(config: ProjectConfig): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // Validate required parameters
      if (!config.baseUrl) {
        const result = {
          success: false,
          message: 'Setup failed: baseUrl is required',
          error: 'Missing required parameter: baseUrl',
          steps: []
        };
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      const steps: SetupStep[] = [];

      // Step 1: Initialize configuration
      const initStep: SetupStep = {
        description: `Running nodash init --url ${config.baseUrl}${config.apiToken ? ' --token [REDACTED]' : ''}`,
        status: 'running'
      };
      steps.push(initStep);

      const initResult = await this.runCliCommandInternal('init', [
        '--url', config.baseUrl,
        ...(config.apiToken ? ['--token', config.apiToken] : [])
      ]);

      initStep.status = initResult.success ? 'completed' : 'failed';
      initStep.output = initResult.output;
      if (!initResult.success) {
        initStep.error = initResult.error;
      }

      if (!initResult.success) {
        const result = {
          success: false,
          message: `Failed to initialize project: ${initResult.error}`,
          error: initResult.error,
          steps,
          config
        };
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      // Step 2: Test the configuration
      const healthStep: SetupStep = {
        description: 'Running nodash health to verify configuration',
        status: 'running'
      };
      steps.push(healthStep);

      const healthResult = await this.runCliCommandInternal('health', []);

      healthStep.status = healthResult.success ? 'completed' : 'failed';
      healthStep.output = healthResult.output;
      if (!healthResult.success) {
        healthStep.error = healthResult.error;
      }

      const result: SetupResult = {
        success: initResult.success, // Setup is successful if init worked, even if health check fails
        message: healthResult.success
          ? 'Project setup completed successfully! Server is healthy and ready to use.'
          : `Project configured successfully, but server health check failed: ${healthResult.error}`,
        config,
        steps
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const result = {
        success: false,
        message: `Setup failed: ${error instanceof Error ? error.message : error}`,
        error: error instanceof Error ? error.message : String(error),
        steps: []
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  }

  private async runCliCommand(command: string, args: string[]): Promise<{ content: Array<{ type: string; text: string }> }> {
    const result = await this.runCliCommandInternal(command, args);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  private async runCliCommandInternal(command: string, args: string[]): Promise<CommandResult> {
    return new Promise((resolve) => {
      // Try to find the CLI executable - first try local build, then global
      const cliPaths = [
        // Local development path
        path.resolve(__dirname, '../../nodash-cli/dist/cli.js'),
        // Alternative local path
        path.resolve(__dirname, '../../../nodash-cli/dist/cli.js'),
        // Global nodash command
        'nodash'
      ];

      let cliPath = 'nodash';
      let useNode = false;

      // Check if local CLI exists
      for (const cliPathCandidate of cliPaths.slice(0, -1)) {
        try {
          fs.accessSync(cliPathCandidate);
          cliPath = cliPathCandidate;
          useNode = true;
          break;
        } catch {
          // Continue to next path
        }
      }

      const commandArgs = useNode ? [cliPath, command, ...args] : [command, ...args];
      const executable = useNode ? 'node' : 'nodash';

      const child = spawn(executable, commandArgs, {
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
        const fullCommand = `nodash ${command}${args.length > 0 ? ' ' + args.join(' ') : ''}`;
        resolve({
          success: code === 0,
          output: stdout.trim(),
          error: stderr.trim() || undefined,
          exitCode: code || 0,
          command: fullCommand
        });
      });

      child.on('error', (error) => {
        const fullCommand = `nodash ${command}${args.length > 0 ? ' ' + args.join(' ') : ''}`;
        resolve({
          success: false,
          output: '',
          error: error.message,
          exitCode: 1,
          command: fullCommand
        });
      });
    });
  }

  private async getDocumentation(component: 'sdk' | 'cli'): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const docs = component === 'sdk'
        ? this.getSDKDocumentation()
        : this.getCLIDocumentation();

      const result = {
        component: docs.component,
        content: docs.content,
        examples: docs.examples,
        lastUpdated: docs.lastUpdated
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Failed to get ${component} documentation: ${error}`);
    }
  }

  private async captureSession(action: 'start' | 'stop', maxEvents?: number): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      if (action === 'start') {
        const args = maxEvents ? ['--max-events', maxEvents.toString()] : [];
        const result = await this.runCliCommandInternal('record', ['start', ...args]);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } else if (action === 'stop') {
        const result = await this.runCliCommandInternal('record', ['stop']);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } else {
        throw new Error(`Invalid action: ${action}. Must be 'start' or 'stop'`);
      }
    } catch (error) {
      const result = {
        success: false,
        message: `Capture session failed: ${error instanceof Error ? error.message : error}`,
        error: error instanceof Error ? error.message : String(error)
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  }

  private async replaySession(filePath: string, url?: string, dryRun?: boolean): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const args = [filePath];
      
      if (url) {
        args.push('--url', url);
      }
      
      if (dryRun) {
        args.push('--dry-run');
      }

      const result = await this.runCliCommandInternal('replay', args);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const result = {
        success: false,
        message: `Replay session failed: ${error instanceof Error ? error.message : error}`,
        error: error instanceof Error ? error.message : String(error)
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
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