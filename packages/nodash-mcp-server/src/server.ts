import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SERVER_CONFIG } from './utils/constants.js';

// Services
import { DocumentationService } from './services/documentation.js';
import { ProjectAnalysisService } from './services/project-analysis.js';
import { EventsService } from './services/events.js';
import { PromptsService } from './services/prompts.js';

// Handlers
import { setupResourceHandlers } from './handlers/resources.js';
import { setupToolHandlers } from './handlers/tools.js';
import { setupPromptHandlers } from './handlers/prompts.js';

export async function createServer(): Promise<Server> {
  const server = new Server(SERVER_CONFIG, {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  });

  // Initialize services
  const docService = new DocumentationService();
  const projectService = new ProjectAnalysisService();
  const eventsService = new EventsService();
  const promptsService = new PromptsService();

  // Setup handlers
  setupResourceHandlers(server, docService);
  setupToolHandlers(server, projectService, eventsService);
  setupPromptHandlers(server, promptsService);

  return server;
}

export async function runServer(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Nodash MCP Server running on stdio');
}

// Start the server
runServer().catch(console.error);                                                                                                                                                                                                                                                                                  