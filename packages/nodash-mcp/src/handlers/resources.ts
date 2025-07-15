import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RESOURCE_URIS } from '../utils/constants';
import { DocumentationService } from '../services/documentation';

export function setupResourceHandlers(
  server: Server,
  docService: DocumentationService
) {
  // List available resources (documentation only)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: RESOURCE_URIS.SDK_README,
          name: 'Nodash SDK Documentation',
          description: 'Complete SDK documentation with API reference, examples, and guides',
          mimeType: 'text/markdown',
        },
        {
          uri: RESOURCE_URIS.SDK_QUICK_START,
          name: 'SDK Quick Start Guide',
          description: '5-minute quick start guide for getting up and running',
          mimeType: 'text/markdown',
        },
        {
          uri: RESOURCE_URIS.SDK_FRAMEWORK_GUIDES,
          name: 'Framework Integration Guides',
          description: 'Comprehensive guides for React, Vue, Next.js, Express, Angular, and Svelte',
          mimeType: 'text/markdown',
        },
        {
          uri: RESOURCE_URIS.SDK_API_REFERENCE,
          name: 'SDK API Reference',
          description: 'Complete API reference with TypeScript definitions',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // Read specific resources (documentation only)
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      switch (uri) {
        case RESOURCE_URIS.SDK_README:
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: await docService.readSDKDoc('README.md'),
              },
            ],
          };

        case RESOURCE_URIS.SDK_QUICK_START:
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: await docService.readSDKDoc('docs/quick-start.md'),
              },
            ],
          };

        case RESOURCE_URIS.SDK_FRAMEWORK_GUIDES:
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: await docService.readSDKDoc('docs/framework-guides.md'),
              },
            ],
          };

        case RESOURCE_URIS.SDK_API_REFERENCE:
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(await docService.generateAPIReference(), null, 2),
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
      }
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to read resource ${uri}: ${error}`);
    }
  });
} 