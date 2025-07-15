import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import handlers
import { setupToolHandlers } from './handlers/tools.js';
import { setupPromptHandlers } from './handlers/prompts.js';
import { setupResourceHandlers } from './handlers/resources.js';

// Import services
import { ProjectAnalysisService } from './services/project-analysis.js';
import { AdvancedAnalysisService } from './services/advanced-analysis.js';
import { ImplementationGuideService } from './services/code-generator.js';
import { PromptsService } from './services/prompts.js';
import { DocumentationService } from './services/documentation.js';

// Create server instance
const server = new Server(
  {
    name: 'nodash-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {}
    },
  }
);

// Initialize services
const projectService = new ProjectAnalysisService();
const advancedAnalysisService = new AdvancedAnalysisService();
const implementationGuideService = new ImplementationGuideService();
const promptsService = new PromptsService();
const documentationService = new DocumentationService();

// Setup all handlers
setupToolHandlers(
  server,
  projectService,
  advancedAnalysisService,
  implementationGuideService
);

setupPromptHandlers(server, promptsService);
setupResourceHandlers(server, documentationService);

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