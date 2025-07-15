/**
 * Minimal MCP server for testing basic functionality
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Simple tools for testing
const tools: Tool[] = [
  {
    name: 'test_tool',
    description: 'A simple test tool',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Test message'
        }
      },
      required: ['message']
    }
  }
];

// Create server instance
const server = new Server(
  {
    name: 'nodash-mcp-server-minimal',
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
  
  if (name === 'test_tool') {
    return {
      content: [
        {
          type: 'text',
          text: `Test tool called with message: ${args?.message || 'no message'}`
        }
      ]
    };
  }
  
  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${name}`
      }
    ],
    isError: true
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Minimal Nodash MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});