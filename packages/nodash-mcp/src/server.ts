import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { NodashSDK } from '@nodash/sdk';

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
export const tools: Tool[] = [
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

export async function handleToolCall(request: any) {
  const { toolName, input } = request;

  // Ensure SDK is initialized for tools that need it
  if (!nodashSDK && toolName !== 'nodash_set_config') {
    try {
      // Attempt to initialize from environment variables
      initializeSDK(process.env.NODASH_TOKEN);
    } catch (error) {
      return {
        toolName,
        status: 'error',
        error: 'SDK not configured. Please use nodash_set_config tool first or set NODASH_TOKEN environment variable.'
      };
    }
  }
  
  try {
    let result: any;
    switch (toolName) {
      case 'nodash_set_config':
        initializeSDK(input.token, input.baseUrl);
        result = { success: true, message: 'Nodash SDK configured successfully.' };
        break;
      case 'nodash_track_event':
        result = await nodashSDK!.track(input.event, input.properties);
        break;
      case 'nodash_identify_user':
        result = await nodashSDK!.track('user_identified', { userId: input.userId, ...input.traits });
        break;
      case 'nodash_track_page':
        result = await nodashSDK!.track('page_view', { page: input.name, ...input.properties });
        break;
      case 'nodash_report_error':
        result = await nodashSDK!.track('error_reported', {
          error_message: input.message,
          error_stack: input.stack,
          error_type: input.type,
          ...input.context,
          tags: input.tags
        });
        break;
      case 'nodash_submit_metric':
        result = await nodashSDK!.sendMetric(input.name, input.value, { unit: input.unit, tags: input.tags });
        break;
      case 'nodash_get_dashboards':
        result = { message: 'Dashboard functionality is not yet available in this version. Please use the analytics and monitoring features instead.' };
        break;
      case 'nodash_get_dashboard':
        result = { message: 'Dashboard functionality is not yet available in this version. Please use the analytics and monitoring features instead.' };
        break;
      case 'nodash_generate_report':
        result = { message: 'Report generation is not yet available in this version. Please use the analytics query features instead.' };
        break;
      case 'nodash_health_check':
        result = await nodashSDK!.monitoring.getHealth();
        break;
      default:
        return {
          toolName,
          status: 'error',
          error: `Tool "${toolName}" not found.`
        };
    }

    return {
      toolName,
      status: 'success',
      output: result
    };
  } catch (error) {
    return {
      toolName,
      status: 'error',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

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
  const result = await handleToolCall(request);
  return {
    content: [
      {
        type: 'text',
        text: result.output.message || JSON.stringify(result.output)
      }
    ],
    isError: result.status === 'error'
  };
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