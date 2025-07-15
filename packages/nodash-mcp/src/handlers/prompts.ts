import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { PromptsService } from '../services/prompts';

export function setupPromptHandlers(server: Server, promptsService: PromptsService) {
  // List available prompts
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'implement-analytics',
          description: 'Get step-by-step implementation guide for your project',
          arguments: [
            {
              name: 'framework',
              description: 'Target framework (auto-detect, react, vue, nextjs, express, etc.)',
              required: false,
            },
            {
              name: 'business_type',
              description: 'Type of business (e-commerce, saas, content, etc.)',
              required: false,
            },
          ],
        },
        {
          name: 'debug-analytics',
          description: 'Get debugging help for analytics issues',
          arguments: [
            {
              name: 'issue_description',
              description: 'Description of the issue you are experiencing',
              required: false,
            },
            {
              name: 'error_message',
              description: 'Any error messages you are seeing',
              required: false,
            },
          ],
        },
        {
          name: 'design-events',
          description: 'Get guidance on designing event schemas for your business',
          arguments: [
            {
              name: 'business_type',
              description: 'Type of business (e-commerce, saas, content, etc.)',
              required: false,
            },
            {
              name: 'key_metrics',
              description: 'Key metrics you want to track',
              required: false,
            },
          ],
        },
        {
          name: 'migrate-analytics',
          description: 'Get help migrating from another analytics solution',
          arguments: [
            {
              name: 'current_solution',
              description: 'Current analytics solution (Google Analytics, Mixpanel, etc.)',
              required: false,
            },
            {
              name: 'migration_scope',
              description: 'Scope of migration (events, users, historical data)',
              required: false,
            },
          ],
        },
        {
          name: 'optimize-performance',
          description: 'Get performance optimization recommendations',
          arguments: [
            {
              name: 'performance_issue',
              description: 'Specific performance issue (slow loading, high bandwidth, etc.)',
              required: false,
            },
          ],
        },
      ],
    };
  });

  // Handle prompt requests
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let content: string;

      switch (name) {
        case 'implement-analytics':
          content = await promptsService.generateImplementationPrompt(args);
          break;

        case 'debug-analytics':
          content = await promptsService.generateDebuggingPrompt(args);
          break;

        case 'design-events':
          content = await promptsService.generateEventDesignPrompt(args);
          break;

        case 'migrate-analytics':
          content = await promptsService.generateMigrationPrompt(args);
          break;

        case 'optimize-performance':
          content = await promptsService.generateOptimizationPrompt(args);
          break;

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown prompt: ${name}`);
      }

      return {
        description: `Generated ${name} guidance`,
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: content,
            },
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Prompt generation failed: ${error}`);
    }
  });
} 