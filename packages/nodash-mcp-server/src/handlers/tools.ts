import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { ProjectAnalysisService } from '../services/project-analysis.js';
import { EventsService } from '../services/events.js';

export function setupToolHandlers(
  server: Server,
  projectService: ProjectAnalysisService,
  eventsService: EventsService
) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'analyze_project',
          description: 'Analyze current project structure and provide implementation recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              project_path: {
                type: 'string',
                description: 'Path to project directory (defaults to current directory)',
              },
            },
          },
        },
        {
          name: 'get_events_schema',
          description: 'Get current event schema definitions',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'set_event_definition',
          description: 'Define or update an event schema',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Name of the event',
              },
              properties: {
                type: 'object',
                description: 'Event properties schema',
              },
              description: {
                type: 'string',
                description: 'Event description',
              },
            },
            required: ['event_name', 'properties'],
          },
        },
        {
          name: 'query_events',
          description: 'Query existing event data for analysis',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Filter by event name (optional)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of events to return',
                default: 100,
              },
            },
          },
        },
        {
          name: 'track_event',
          description: 'Track a test event (for testing purposes)',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: {
                type: 'string',
                description: 'Name of the event to track',
              },
              properties: {
                type: 'object',
                description: 'Event properties',
              },
            },
            required: ['event_name'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'analyze_project':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await projectService.analyzeProject(args?.project_path as string), null, 2),
              },
            ],
          };

        case 'get_events_schema':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await eventsService.getEventsSchema(), null, 2),
              },
            ],
          };

        case 'set_event_definition':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await eventsService.setEventDefinition(args), null, 2),
              },
            ],
          };

        case 'query_events':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await eventsService.queryEvents(args), null, 2),
              },
            ],
          };

        case 'track_event':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(await eventsService.trackEvent(args), null, 2),
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(
        ErrorCode.InternalError,
        `Tool execution failed: ${errorMessage}`
      );
    }
  });
} 