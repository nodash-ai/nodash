import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import handlers
import { setupToolHandlers } from './handlers/tools.js';
import { setupPromptHandlers } from './handlers/prompts.js';
import { setupResourceHandlers } from './handlers/resources.js';
import { EnhancedToolsHandler } from './handlers/enhanced-tools.js';

// Import services
import { ProjectAnalysisService } from './services/project-analysis.js';
import { AdvancedAnalysisService } from './services/advanced-analysis.js';
import { ImplementationGuideService } from './services/code-generator.js';
import { PromptsService } from './services/prompts.js';
import { DocumentationService } from './services/documentation.js';

// Import CLI integration services
import { CLIExecutor } from './services/cli-executor.js';
import { EnhancedMCPIntegration } from './services/enhanced-mcp-integration.js';
import { EnvironmentManager, quickEnvironmentCheck } from './services/environment-manager.js';
import { CommandCache, PerformanceMonitor } from './services/performance-manager.js';
import { MonitoringService } from './services/monitoring-service.js';
import { createErrorRecovery } from './utils/errors.js';

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

// Initialize core services
const projectService = new ProjectAnalysisService();
const advancedAnalysisService = new AdvancedAnalysisService();
const implementationGuideService = new ImplementationGuideService();
const promptsService = new PromptsService();
const documentationService = new DocumentationService();

// Initialize monitoring service first
const monitoringService = new MonitoringService();

// Initialize CLI integration services with monitoring
const environmentManager = new EnvironmentManager();
const cliExecutor = new CLIExecutor(undefined, monitoringService);
const commandCache = new CommandCache();
const performanceMonitor = new PerformanceMonitor();
const errorRecovery = createErrorRecovery();

// Initialize enhanced integration
const enhancedIntegration = new EnhancedMCPIntegration(
  projectService,
  advancedAnalysisService,
  implementationGuideService
);

// Initialize enhanced tools handler with CLI integration
const enhancedToolsHandler = new EnhancedToolsHandler();

// Setup all handlers
setupToolHandlers(
  server,
  projectService,
  advancedAnalysisService,
  implementationGuideService
);

setupPromptHandlers(server, promptsService);
setupResourceHandlers(server, documentationService);

// Setup enhanced CLI-integrated tools after existing handlers
enhancedToolsHandler.setupEnhancedTools(server);

// Add server-level error handling with monitoring
server.onerror = (error) => {
  monitoringService.error('MCP Server error', 'mcp', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  performanceMonitor.recordCacheMiss(); // Track errors as cache misses for monitoring
};

// Start server
async function main() {
  try {
    monitoringService.info('Initializing Nodash MCP Server with CLI integration...', 'mcp');
    
    // Check CLI environment
    const envCheck = await quickEnvironmentCheck();
    if (envCheck.cliAvailable) {
      monitoringService.info(`CLI integration available (version: ${envCheck.version})`, 'cli');
      monitoringService.updateHealthStatus(true, envCheck.version);
      
      if (!envCheck.compatible) {
        monitoringService.warn('CLI version compatibility issues detected', 'cli', {
          issues: envCheck.issues
        });
        envCheck.issues.forEach(issue => console.error(`   - ${issue}`));
      }
    } else {
      monitoringService.warn('CLI not available - running in MCP-only mode', 'cli');
      monitoringService.updateHealthStatus(false);
      console.error('   Install CLI for enhanced functionality: npm install -g @nodash/cli');
    }
    
    // Initialize environment
    await environmentManager.initializeEnvironment();
    monitoringService.info('Environment initialized', 'mcp');
    
    // Start performance monitoring
    monitoringService.info('Performance monitoring enabled', 'performance');
    
    // Connect to transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    monitoringService.info('Nodash MCP Server running on stdio', 'mcp');
    monitoringService.info('Enhanced with CLI integration and performance monitoring', 'mcp');
    console.error('🚀 Nodash MCP Server running on stdio');
    console.error('   Enhanced with CLI integration and performance monitoring');
    
    // Set up periodic cleanup with monitoring
    setInterval(() => {
      try {
        // Clean up old cache entries
        commandCache.clear();
        
        // Log performance metrics periodically
        const metrics = performanceMonitor.getPerformanceSummary();
        const statusReport = monitoringService.getStatusReport();
        
        if (metrics.metrics.commandExecutions > 0) {
          monitoringService.info('Periodic performance report', 'performance', {
            commandExecutions: metrics.metrics.commandExecutions,
            cacheHitRate: metrics.cacheHitRate,
            averageExecutionTime: statusReport.performance.averageExecutionTime,
            successRate: statusReport.performance.successRate
          });
          console.error(`📈 Performance: ${metrics.metrics.commandExecutions} commands, ${(metrics.cacheHitRate * 100).toFixed(1)}% cache hit rate`);
        }
      } catch (error) {
        monitoringService.error('Cleanup error', 'mcp', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
  } catch (error) {
    console.error('Failed to initialize MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown with monitoring
process.on('SIGINT', () => {
  monitoringService.info('Shutting down Nodash MCP Server...', 'mcp');
  console.error('Shutting down Nodash MCP Server...');
  
  // Log final performance metrics
  const finalMetrics = performanceMonitor.getPerformanceSummary();
  const finalStatusReport = monitoringService.getStatusReport();
  
  monitoringService.info('Final performance metrics', 'performance', {
    metrics: finalMetrics.metrics,
    statusReport: finalStatusReport
  });
  console.error('Final performance metrics:', JSON.stringify(finalMetrics.metrics, null, 2));
  
  // Cleanup monitoring service
  monitoringService.cleanup();
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitoringService.info('Received SIGTERM, shutting down gracefully...', 'mcp');
  console.error('Received SIGTERM, shutting down gracefully...');
  
  // Cleanup monitoring service
  monitoringService.cleanup();
  
  process.exit(0);
});

main().catch((error) => {
  monitoringService.error('Server startup error', 'mcp', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  console.error('Server startup error:', error);
  process.exit(1);
});                                                                                                                                                                                                                                                                                  