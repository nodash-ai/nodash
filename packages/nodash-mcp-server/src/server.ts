import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import NodashSDK from '@nodash/sdk';

// Initialize the SDK
let nodashSDK: NodashSDK | null = null;

// Initialize SDK with configuration
function initializeSDK(token?: string, baseUrl?: string) {
  if (!token) {
    throw new Error('Nodash token is required. Set NODASH_TOKEN environment variable or provide via set_config tool.');
  }
  
  nodashSDK = new NodashSDK(token, {
    baseUrl: baseUrl || process.env.NODASH_API_URL || 'https://api.nodash.ai'
  });
  
  return nodashSDK;
}

// Tool definitions
const tools: Tool[] = [
  {
    name: 'nodash_set_config',
    description: 'Configure Nodash SDK with API token and base URL',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Nodash API token'
        },
        baseUrl: {
          type: 'string',
          description: 'Nodash API base URL (optional, defaults to https://api.nodash.ai)'
        }
      },
      required: ['token']
    }
  },
  {
    name: 'nodash_track_event',
    description: 'Track an analytics event',
    inputSchema: {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          description: 'Event name'
        },
        properties: {
          type: 'object',
          description: 'Event properties',
          additionalProperties: true
        },
        userId: {
          type: 'string',
          description: 'User ID (optional)'
        },
        anonymousId: {
          type: 'string',
          description: 'Anonymous ID (optional)'
        },
        sessionId: {
          type: 'string',
          description: 'Session ID (optional)'
        }
      },
      required: ['event']
    }
  },
  {
    name: 'nodash_identify_user',
    description: 'Identify a user with traits',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID'
        },
        traits: {
          type: 'object',
          description: 'User traits',
          additionalProperties: true
        }
      },
      required: ['userId']
    }
  },
  {
    name: 'nodash_track_page',
    description: 'Track a page view',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Page name (optional)'
        },
        properties: {
          type: 'object',
          description: 'Page properties',
          additionalProperties: true
        },
        userId: {
          type: 'string',
          description: 'User ID (optional)'
        },
        anonymousId: {
          type: 'string',
          description: 'Anonymous ID (optional)'
        }
      }
    }
  },
  {
    name: 'nodash_report_error',
    description: 'Report an application error',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Error message'
        },
        stack: {
          type: 'string',
          description: 'Error stack trace (optional)'
        },
        type: {
          type: 'string',
          description: 'Error type (optional)'
        },
        context: {
          type: 'object',
          description: 'Error context',
          additionalProperties: true
        },
        tags: {
          type: 'object',
          description: 'Error tags',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['message']
    }
  },
  {
    name: 'nodash_submit_metric',
    description: 'Submit a performance metric',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Metric name'
        },
        value: {
          type: 'number',
          description: 'Metric value'
        },
        unit: {
          type: 'string',
          description: 'Metric unit (optional)'
        },
        tags: {
          type: 'object',
          description: 'Metric tags',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['name', 'value']
    }
  },
  {
    name: 'nodash_get_dashboards',
    description: 'Get available dashboards (placeholder - not yet implemented)',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'nodash_get_dashboard',
    description: 'Get a specific dashboard (placeholder - not yet implemented)',
    inputSchema: {
      type: 'object',
      properties: {
        dashboardId: {
          type: 'string',
          description: 'Dashboard ID'
        }
      },
      required: ['dashboardId']
    }
  },
  {
    name: 'nodash_generate_report',
    description: 'Generate a custom report',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Report name'
        },
        type: {
          type: 'string',
          enum: ['funnel', 'retention', 'insights', 'custom'],
          description: 'Report type'
        },
        parameters: {
          type: 'object',
          description: 'Report parameters',
          additionalProperties: true
        },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date (ISO string)' },
            end: { type: 'string', description: 'End date (ISO string)' }
          },
          required: ['start', 'end']
        },
        filters: {
          type: 'array',
          description: 'Report filters',
          items: {
            type: 'object',
            properties: {
              property: { type: 'string' },
              operator: { type: 'string' },
              value: { }
            },
            required: ['property', 'operator', 'value']
          }
        }
      },
      required: ['name', 'type', 'parameters', 'dateRange']
    }
  },
  {
    name: 'nodash_health_check',
    description: 'Check health status of all Nodash services',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

// Create server instance
const server = new Server(
  {
    name: 'nodash-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'nodash_set_config': {
        const { token, baseUrl } = args as { token: string; baseUrl?: string };
        initializeSDK(token, baseUrl);
        return {
          content: [
            {
              type: 'text',
              text: `Nodash SDK configured successfully with base URL: ${baseUrl || 'https://api.nodash.ai'}`
            }
          ]
        };
      }

      case 'nodash_track_event': {
        if (!nodashSDK) {
          nodashSDK = initializeSDK(process.env.NODASH_TOKEN);
        }
        
        const { event, properties = {}, userId, anonymousId, sessionId } = args as {
          event: string;
          properties?: Record<string, any>;
          userId?: string;
          anonymousId?: string;
          sessionId?: string;
        };

        const result = await nodashSDK.track(event, properties, { 
          userId, 
          sessionId,
          source: 'mcp-server'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Event "${event}" tracked successfully.`
            }
          ]
        };
      }

      case 'nodash_identify_user': {
        if (!nodashSDK) {
          nodashSDK = initializeSDK(process.env.NODASH_TOKEN);
        }
        
        const { userId, traits = {} } = args as {
          userId: string;
          traits?: Record<string, any>;
        };

        // Track identify as a special event
        await nodashSDK.track('user_identified', { userId, ...traits }, { 
          userId,
          source: 'mcp-server'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `User "${userId}" identified successfully.`
            }
          ]
        };
      }

      case 'nodash_track_page': {
        if (!nodashSDK) {
          nodashSDK = initializeSDK(process.env.NODASH_TOKEN);
        }
        
        const { name, properties = {}, userId, anonymousId } = args as {
          name?: string;
          properties?: Record<string, any>;
          userId?: string;
          anonymousId?: string;
        };

        // Track page view as an event
        await nodashSDK.track('page_view', { 
          page: name,
          ...properties 
        }, { 
          userId,
          source: 'mcp-server'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Page view tracked successfully${name ? ` for "${name}"` : ''}.`
            }
          ]
        };
      }

      case 'nodash_report_error': {
        if (!nodashSDK) {
          nodashSDK = initializeSDK(process.env.NODASH_TOKEN);
        }
        
        const { message, stack, type, context = {}, tags = {} } = args as {
          message: string;
          stack?: string;
          type?: string;
          context?: Record<string, any>;
          tags?: Record<string, string>;
        };

        // Track error as an event
        await nodashSDK.track('error_reported', {
          error_message: message,
          error_stack: stack,
          error_type: type,
          ...context,
          tags
        }, {
          source: 'mcp-server'
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error reported successfully.`
            }
          ]
        };
      }

      case 'nodash_submit_metric': {
        if (!nodashSDK) {
          nodashSDK = initializeSDK(process.env.NODASH_TOKEN);
        }
        
        const { name, value, unit, tags } = args as {
          name: string;
          value: number;
          unit?: string;
          tags?: Record<string, string>;
        };

        const result = await nodashSDK.sendMetric(name, value, { unit, tags });
        
        return {
          content: [
            {
              type: 'text',
              text: `Metric "${name}" submitted successfully. Value: ${value}${unit ? ` ${unit}` : ''}`
            }
          ]
        };
      }

      case 'nodash_get_dashboards': {
        return {
          content: [
            {
              type: 'text',
              text: `Dashboard functionality is not yet available in this version. Please use the analytics and monitoring features instead.`
            }
          ]
        };
      }

      case 'nodash_get_dashboard': {
        return {
          content: [
            {
              type: 'text',
              text: `Dashboard functionality is not yet available in this version. Please use the analytics and monitoring features instead.`
            }
          ]
        };
      }

      case 'nodash_generate_report': {
        return {
          content: [
            {
              type: 'text',
              text: `Report generation is not yet available in this version. Please use the analytics query features instead.`
            }
          ]
        };
      }

      case 'nodash_health_check': {
        if (!nodashSDK) {
          nodashSDK = initializeSDK(process.env.NODASH_TOKEN);
        }
        
        const result = await nodashSDK.monitoring.getHealth();
        
        const statusText = `- System: ${result.status === 'healthy' ? '✅' : '⚠️'} ${result.status}\n` +
          Object.entries(result.checks || {})
            .map(([service, check]) => {
              const status = (check as any).status === 'pass' ? '✅' : '❌';
              const message = (check as any).message || 'OK';
              return `- ${service}: ${status} ${message}`;
            })
            .join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Nodash Services Health Check:\n${statusText}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Nodash MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});                                                                                                                                                                                                                                                                                  