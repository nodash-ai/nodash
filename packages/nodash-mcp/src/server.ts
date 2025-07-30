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
            name: 'query_events',
            description: 'Query events with comprehensive filtering for AI analysis',
            inputSchema: {
              type: 'object',
              properties: {
                eventTypes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Filter by event types (e.g., ["page_view", "click"])'
                },
                userId: {
                  type: 'string',
                  description: 'Filter by specific user ID'
                },
                startDate: {
                  type: 'string',
                  description: 'Start date in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")'
                },
                endDate: {
                  type: 'string',
                  description: 'End date in ISO 8601 format (e.g., "2024-01-31T23:59:59Z")'
                },
                properties: {
                  type: 'object',
                  description: 'Filter by event properties (key-value pairs)'
                },
                sortBy: {
                  type: 'string',
                  enum: ['timestamp', 'eventName', 'userId'],
                  description: 'Sort events by field'
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort order (ascending or descending)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of events to return (default: 100, max: 1000)'
                },
                offset: {
                  type: 'number',
                  description: 'Number of events to skip for pagination (default: 0)'
                }
              }
            }
          },
          {
            name: 'query_users',
            description: 'Query users with activity filters for AI insights',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'Filter by specific user ID'
                },
                activeSince: {
                  type: 'string',
                  description: 'Filter users active since date in ISO 8601 format'
                },
                activeUntil: {
                  type: 'string',
                  description: 'Filter users active until date in ISO 8601 format'
                },
                properties: {
                  type: 'object',
                  description: 'Filter by user properties (key-value pairs)'
                },
                sortBy: {
                  type: 'string',
                  enum: ['firstSeen', 'lastSeen', 'eventCount', 'sessionCount'],
                  description: 'Sort users by field'
                },
                sortOrder: {
                  type: 'string',
                  enum: ['asc', 'desc'],
                  description: 'Sort order (ascending or descending)'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of users to return (default: 100, max: 1000)'
                },
                offset: {
                  type: 'number',
                  description: 'Number of users to skip for pagination (default: 0)'
                }
              }
            }
          },
          {
            name: 'analyze_events',
            description: 'Advanced event analysis for AI insights and patterns',
            inputSchema: {
              type: 'object',
              properties: {
                analysisType: {
                  type: 'string',
                  enum: ['summary', 'trends', 'user_behavior', 'event_patterns'],
                  description: 'Type of analysis to perform'
                },
                eventTypes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Focus analysis on specific event types'
                },
                timeRange: {
                  type: 'object',
                  properties: {
                    start: { type: 'string', description: 'Start date in ISO 8601 format' },
                    end: { type: 'string', description: 'End date in ISO 8601 format' }
                  },
                  description: 'Time range for analysis'
                },
                groupBy: {
                  type: 'string',
                  enum: ['hour', 'day', 'week', 'month', 'eventType', 'userId'],
                  description: 'Group analysis results by time period or dimension'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to analyze (default: 1000)'
                }
              },
              required: ['analysisType']
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

        case 'query_events':
          return await this.queryEvents(args as any);

        case 'query_users':
          return await this.queryUsers(args as any);

        case 'analyze_events':
          return await this.analyzeEvents(args as any);

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
          ? 'Project configured successfully! Server is healthy and ready to use.'
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


  private async queryEvents(params: {
    eventTypes?: string[];
    userId?: string;
    startDate?: string;
    endDate?: string;
    properties?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const args = ['events'];

      // Add filtering parameters
      if (params.eventTypes && params.eventTypes.length > 0) {
        args.push('--type', params.eventTypes.join(','));
      }

      if (params.userId) {
        args.push('--user-id', params.userId);
      }

      if (params.startDate) {
        args.push('--start', params.startDate);
      }

      if (params.endDate) {
        args.push('--end', params.endDate);
      }

      if (params.properties) {
        args.push('--properties', JSON.stringify(params.properties));
      }

      // Add sorting parameters
      if (params.sortBy) {
        args.push('--sort-by', params.sortBy);
      }

      if (params.sortOrder) {
        args.push('--sort-order', params.sortOrder);
      }

      // Add pagination parameters
      if (params.limit) {
        args.push('--limit', params.limit.toString());
      }

      if (params.offset !== undefined) {
        args.push('--offset', params.offset.toString());
      }

      // Always use JSON format for MCP
      args.push('--format', 'json');

      const result = await this.runCliCommandInternal('query', args);
      
      if (result.success) {
        // Parse the JSON output from CLI
        try {
          const queryResult = JSON.parse(result.output);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                data: queryResult,
                summary: {
                  totalEvents: queryResult.totalCount,
                  returnedEvents: queryResult.events.length,
                  hasMore: queryResult.hasMore,
                  executionTime: queryResult.executionTime
                }
              }, null, 2)
            }]
          };
        } catch (parseError) {
          // If parsing fails, return raw output
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                rawOutput: result.output
              }, null, 2)
            }]
          };
        }
      } else {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: result.error,
              message: 'Failed to query events'
            }, null, 2)
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: `Query events failed: ${error instanceof Error ? error.message : error}`,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }

  private async queryUsers(params: {
    userId?: string;
    activeSince?: string;
    activeUntil?: string;
    properties?: Record<string, any>;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const args = ['users'];

      // Add filtering parameters
      if (params.userId) {
        args.push('--user-id', params.userId);
      }

      if (params.activeSince) {
        args.push('--active-since', params.activeSince);
      }

      if (params.activeUntil) {
        args.push('--active-until', params.activeUntil);
      }

      if (params.properties) {
        args.push('--properties', JSON.stringify(params.properties));
      }

      // Add sorting parameters
      if (params.sortBy) {
        args.push('--sort-by', params.sortBy);
      }

      if (params.sortOrder) {
        args.push('--sort-order', params.sortOrder);
      }

      // Add pagination parameters
      if (params.limit) {
        args.push('--limit', params.limit.toString());
      }

      if (params.offset !== undefined) {
        args.push('--offset', params.offset.toString());
      }

      // Always use JSON format for MCP
      args.push('--format', 'json');

      const result = await this.runCliCommandInternal('query', args);
      
      if (result.success) {
        // Parse the JSON output from CLI
        try {
          const queryResult = JSON.parse(result.output);
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                data: queryResult,
                summary: {
                  totalUsers: queryResult.totalCount,
                  returnedUsers: queryResult.users.length,
                  hasMore: queryResult.hasMore,
                  executionTime: queryResult.executionTime
                }
              }, null, 2)
            }]
          };
        } catch (parseError) {
          // If parsing fails, return raw output
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: true,
                rawOutput: result.output
              }, null, 2)
            }]
          };
        }
      } else {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: result.error,
              message: 'Failed to query users'
            }, null, 2)
          }]
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: `Query users failed: ${error instanceof Error ? error.message : error}`,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }

  private async analyzeEvents(params: {
    analysisType: 'summary' | 'trends' | 'user_behavior' | 'event_patterns';
    eventTypes?: string[];
    timeRange?: { start: string; end: string };
    groupBy?: 'hour' | 'day' | 'week' | 'month' | 'eventType' | 'userId';
    limit?: number;
  }): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      // First, query events based on the parameters
      const queryParams: any = {};
      
      if (params.eventTypes) {
        queryParams.eventTypes = params.eventTypes;
      }
      
      if (params.timeRange) {
        queryParams.startDate = params.timeRange.start;
        queryParams.endDate = params.timeRange.end;
      }
      
      queryParams.limit = params.limit || 1000;
      queryParams.sortBy = 'timestamp';
      queryParams.sortOrder = 'desc';

      // Get events using the query method
      const eventsResult = await this.queryEvents(queryParams);
      
      // Parse the events from the result
      let events: any[] = [];
      try {
        const parsedResult = JSON.parse(eventsResult.content[0]?.text || '{}');
        if (parsedResult.success && parsedResult.data && parsedResult.data.events) {
          events = parsedResult.data.events;
        }
      } catch (parseError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: false,
              error: 'Failed to parse events for analysis',
              message: 'Could not retrieve events for analysis'
            }, null, 2)
          }]
        };
      }

      // Perform analysis based on type
      let analysisResult: any = {};

      switch (params.analysisType) {
        case 'summary':
          analysisResult = this.generateEventSummary(events);
          break;
        case 'trends':
          analysisResult = this.generateTrendAnalysis(events, params.groupBy || 'day');
          break;
        case 'user_behavior':
          analysisResult = this.generateUserBehaviorAnalysis(events);
          break;
        case 'event_patterns':
          analysisResult = this.generateEventPatternAnalysis(events);
          break;
        default:
          throw new Error(`Unknown analysis type: ${params.analysisType}`);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            analysisType: params.analysisType,
            data: analysisResult,
            metadata: {
              totalEventsAnalyzed: events.length,
              timeRange: params.timeRange,
              eventTypes: params.eventTypes,
              groupBy: params.groupBy
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: `Event analysis failed: ${error instanceof Error ? error.message : error}`,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }]
      };
    }
  }

  private generateEventSummary(events: any[]): any {
    const summary = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      eventTypes: {} as Record<string, number>,
      timeRange: {
        earliest: null as string | null,
        latest: null as string | null
      },
      topProperties: {} as Record<string, number>
    };

    // Count event types
    events.forEach(event => {
      summary.eventTypes[event.eventName] = (summary.eventTypes[event.eventName] || 0) + 1;
    });

    // Find time range
    if (events.length > 0) {
      const timestamps = events.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
      const earliest = timestamps[0];
      const latest = timestamps[timestamps.length - 1];
      if (earliest !== undefined) {
        summary.timeRange.earliest = new Date(earliest).toISOString();
      }
      if (latest !== undefined) {
        summary.timeRange.latest = new Date(latest).toISOString();
      }
    }

    // Count top properties
    events.forEach(event => {
      Object.keys(event.properties || {}).forEach(key => {
        summary.topProperties[key] = (summary.topProperties[key] || 0) + 1;
      });
    });

    return summary;
  }

  private generateTrendAnalysis(events: any[], groupBy: string): any {
    const trends: Record<string, number> = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      let key: string;
      
      switch (groupBy) {
        case 'hour':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `Week of ${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'eventType':
          key = event.eventName;
          break;
        case 'userId':
          key = event.userId || 'anonymous';
          break;
        default:
          key = 'unknown';
      }
      
      trends[key] = (trends[key] || 0) + 1;
    });

    return {
      groupBy,
      trends: Object.entries(trends)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50) // Limit to top 50 results
        .map(([key, count]) => ({ [groupBy]: key, count }))
    };
  }

  private generateUserBehaviorAnalysis(events: any[]): any {
    const userStats: Record<string, any> = {};
    
    events.forEach(event => {
      const userId = event.userId || 'anonymous';
      
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          eventCount: 0,
          eventTypes: new Set(),
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          properties: new Set()
        };
      }
      
      const user = userStats[userId];
      user.eventCount++;
      user.eventTypes.add(event.eventName);
      
      if (new Date(event.timestamp) < new Date(user.firstSeen)) {
        user.firstSeen = event.timestamp;
      }
      if (new Date(event.timestamp) > new Date(user.lastSeen)) {
        user.lastSeen = event.timestamp;
      }
      
      Object.keys(event.properties || {}).forEach(key => {
        user.properties.add(key);
      });
    });

    // Convert sets to arrays and calculate additional metrics
    const behaviorAnalysis = Object.values(userStats).map((user: any) => ({
      userId: user.userId,
      eventCount: user.eventCount,
      uniqueEventTypes: user.eventTypes.size,
      eventTypes: Array.from(user.eventTypes),
      firstSeen: user.firstSeen,
      lastSeen: user.lastSeen,
      sessionDuration: new Date(user.lastSeen).getTime() - new Date(user.firstSeen).getTime(),
      uniqueProperties: user.properties.size
    }));

    return {
      totalUsers: behaviorAnalysis.length,
      topUsers: behaviorAnalysis
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 20),
      averageEventsPerUser: behaviorAnalysis.reduce((sum, user) => sum + user.eventCount, 0) / behaviorAnalysis.length,
      averageEventTypesPerUser: behaviorAnalysis.reduce((sum, user) => sum + user.uniqueEventTypes, 0) / behaviorAnalysis.length
    };
  }

  private generateEventPatternAnalysis(events: any[]): any {
    const patterns = {
      eventSequences: {} as Record<string, number>,
      commonProperties: {} as Record<string, number>,
      timePatterns: {
        hourly: {} as Record<string, number>,
        daily: {} as Record<string, number>
      }
    };

    // Analyze event sequences (pairs of consecutive events)
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i].eventName;
      const next = events[i + 1].eventName;
      const sequence = `${current} → ${next}`;
      patterns.eventSequences[sequence] = (patterns.eventSequences[sequence] || 0) + 1;
    }

    // Analyze common properties
    events.forEach(event => {
      Object.entries(event.properties || {}).forEach(([key, value]) => {
        const propertyPattern = `${key}:${typeof value}`;
        patterns.commonProperties[propertyPattern] = (patterns.commonProperties[propertyPattern] || 0) + 1;
      });
    });

    // Analyze time patterns
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const hour = date.getHours();
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      patterns.timePatterns.hourly[hour] = (patterns.timePatterns.hourly[hour] || 0) + 1;
      patterns.timePatterns.daily[day] = (patterns.timePatterns.daily[day] || 0) + 1;
    });

    return {
      topEventSequences: Object.entries(patterns.eventSequences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([sequence, count]) => ({ sequence, count })),
      topProperties: Object.entries(patterns.commonProperties)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .map(([property, count]) => ({ property, count })),
      timePatterns: {
        peakHours: Object.entries(patterns.timePatterns.hourly)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([hour, count]) => ({ hour: parseInt(hour), count })),
        peakDays: Object.entries(patterns.timePatterns.daily)
          .sort(([,a], [,b]) => b - a)
          .map(([day, count]) => ({ 
            day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)], 
            count 
          }))
      }
    };
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