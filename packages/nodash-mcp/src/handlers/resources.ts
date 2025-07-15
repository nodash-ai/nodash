import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { RESOURCE_URIS } from '../utils/constants.js';
import { DocumentationService } from '../services/documentation.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export function setupResourceHandlers(
  server: Server,
  docService: DocumentationService
) {
  // List available resources (documentation and examples)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        // Documentation resources
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
        // Example resources
        {
          uri: 'nodash://examples/overview',
          name: 'Examples Overview',
          description: 'Overview of all available framework examples and demos',
          mimeType: 'text/markdown',
        },
        {
          uri: 'nodash://examples/react',
          name: 'React Example',
          description: 'Complete React application with Nodash analytics integration',
          mimeType: 'text/markdown',
        },
        {
          uri: 'nodash://examples/react/app',
          name: 'React App Component',
          description: 'Main React App component showing SDK integration patterns',
          mimeType: 'text/typescript',
        },
        {
          uri: 'nodash://examples/react/main',
          name: 'React Main Entry',
          description: 'React application entry point and setup',
          mimeType: 'text/typescript',
        },
      ],
    };
  });

  // Read specific resources (documentation and examples)
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

        // Example resources
        case 'nodash://examples/overview':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: await readExampleFile('README.md'),
              },
            ],
          };

        case 'nodash://examples/react':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: await readExampleFile('react/README.md'),
              },
            ],
          };

        case 'nodash://examples/react/app':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/typescript',
                text: await readExampleFile('react/src/App.tsx'),
              },
            ],
          };

        case 'nodash://examples/react/main':
          return {
            contents: [
              {
                uri,
                mimeType: 'text/typescript',
                text: await readExampleFile('react/src/main.tsx'),
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

  // Helper function to read example files
  async function readExampleFile(relativePath: string): Promise<string> {
    try {
      // Get the examples directory path relative to the MCP server
      const examplesPath = path.resolve(process.cwd(), '../../examples', relativePath);
      const content = await fs.readFile(examplesPath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read example file ${relativePath}: ${error}`);
    }
  }
} 