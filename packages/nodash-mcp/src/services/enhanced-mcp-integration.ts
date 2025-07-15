import { CLIExecutor, CLICommand } from './cli-executor.js';
import { OutputParser } from './output-parser.js';
import { ProjectAnalysisService } from './project-analysis.js';
import { AdvancedAnalysisService } from './advanced-analysis.js';
import { ImplementationGuideService } from './code-generator.js';

export interface EnhancedAnalysisResult {
  mcpAnalysis: any;
  cliAnalysis?: any;
  combined: {
    framework: string;
    language: string;
    hasSDK: boolean;
    configurationStatus: any;
    recommendations: string[];
    setupFiles?: string[];
  };
  executedCommands: CLICommand[];
}

export class EnhancedMCPIntegration {
  private cliExecutor: CLIExecutor;
  private outputParser: OutputParser;
  private cliAvailable: boolean = false;

  constructor(
    private projectService: ProjectAnalysisService,
    private advancedAnalysisService: AdvancedAnalysisService,
    private implementationGuideService: ImplementationGuideService
  ) {
    this.cliExecutor = new CLIExecutor();
    this.outputParser = new OutputParser();
    this.initializeCLI();
  }

  private async initializeCLI(): Promise<void> {
    try {
      this.cliAvailable = await this.cliExecutor.checkCLIAvailability();
      if (this.cliAvailable) {
        console.log('CLI integration available');
      } else {
        console.log('CLI not available, using MCP-only mode');
      }
    } catch (error) {
      console.warn('Failed to check CLI availability:', error);
      this.cliAvailable = false;
    }
  }

  async enhancedProjectAnalysis(projectPath?: string): Promise<EnhancedAnalysisResult> {
    const executedCommands: CLICommand[] = [];
    
    // Always get MCP analysis first
    const mcpAnalysis = await this.projectService.analyzeProject(projectPath);
    
    let cliAnalysis: any = null;
    let configurationStatus: any = null;
    
    // Try to get CLI analysis if available
    if (this.cliAvailable) {
      try {
        // Run CLI analyze command
        const analyzeCommand: CLICommand = {
          command: 'analyze',
          args: [projectPath || '.'],
          options: { format: 'json', verbose: true },
          description: 'Enhanced project analysis via CLI'
        };
        
        const analyzeResult = await this.cliExecutor.execute(analyzeCommand);
        executedCommands.push(analyzeCommand);
        
        if (analyzeResult.success) {
          cliAnalysis = this.outputParser.parseAnalysisOutput(analyzeResult);
        }
        
        // Also check configuration status
        const configCommand: CLICommand = {
          command: 'config',
          args: ['list'],
          options: { format: 'json' },
          description: 'Check configuration status'
        };
        
        const configResult = await this.cliExecutor.execute(configCommand);
        executedCommands.push(configCommand);
        
        if (configResult.success) {
          configurationStatus = this.outputParser.parseConfigOutput(configResult);
        }
      } catch (error) {
        console.warn('CLI analysis failed, using MCP-only analysis:', error);
      }
    }
    
    // Combine results
    const combined = this.combineAnalysisResults(mcpAnalysis, cliAnalysis, configurationStatus);
    
    return {
      mcpAnalysis,
      cliAnalysis,
      combined,
      executedCommands
    };
  }

  async enhancedImplementationGuide(
    framework: string, 
    language: string, 
    complexity: string = 'basic'
  ): Promise<any> {
    // Get base implementation guide from MCP
    const baseGuide = this.implementationGuideService.generateImplementationGuide(
      framework as any,
      language as any,
      complexity as any
    );
    
    // Enhance with CLI-generated setup files if available
    if (this.cliAvailable) {
      try {
        const setupCommand: CLICommand = {
          command: 'analyze',
          args: ['.'],
          options: {},
          description: 'Generate setup files via CLI'
        };
        
        const setupResult = await this.cliExecutor.execute(setupCommand);
        
        if (setupResult.success) {
          // CLI setup completed successfully
          console.log('CLI setup files generated successfully');
          
          // Add step to copy generated files
          baseGuide.steps.push({
            id: 'use-generated-setup-files',
            title: 'Use Generated Setup Files',
            description: 'Copy the CLI-generated setup files to your project',
            files: [
              {
                action: 'create',
                path: '.nodash/setup/*',
                purpose: 'Use pre-generated integration files'
              }
            ],
            validation: [
              'Files copied to appropriate locations',
              'Configuration updated with your API token',
              'Framework integration is working'
            ]
          });
        }
      } catch (error) {
        console.warn('Failed to generate CLI setup files:', error);
      }
    }
    
    return baseGuide;
  }

  async validateImplementationWithCLI(): Promise<any> {
    if (!this.cliAvailable) {
      return {
        available: false,
        message: 'CLI validation not available, using MCP-only validation'
      };
    }
    
    const validationResults: any[] = [];
    const executedCommands: CLICommand[] = [];
    
    try {
      // Check configuration
      const configCommand: CLICommand = {
        command: 'config',
        args: ['list'],
        options: { format: 'json' },
        description: 'Validate configuration'
      };
      
      const configResult = await this.cliExecutor.execute(configCommand);
      executedCommands.push(configCommand);
      
      if (configResult.success) {
        const configStatus = this.outputParser.parseConfigOutput(configResult);
        validationResults.push({
          type: 'configuration',
          status: configStatus.isValid ? 'valid' : 'invalid',
          details: configStatus
        });
      }
      
      // Test connectivity
      const healthCommand: CLICommand = {
        command: 'health',
        args: [],
        options: { format: 'json' },
        description: 'Test service connectivity'
      };
      
      const healthResult = await this.cliExecutor.execute(healthCommand);
      executedCommands.push(healthCommand);
      
      if (healthResult.success) {
        const healthStatus = this.outputParser.parseHealthOutput(healthResult);
        validationResults.push({
          type: 'connectivity',
          status: healthStatus.status === 'healthy' ? 'healthy' : 'unhealthy',
          details: healthStatus
        });
      }
      
      // Test event tracking (dry run)
      const trackCommand: CLICommand = {
        command: 'track',
        args: ['validation_test'],
        options: { dryRun: true, format: 'json' },
        description: 'Test event tracking'
      };
      
      const trackResult = await this.cliExecutor.execute(trackCommand);
      executedCommands.push(trackCommand);
      
      if (trackResult.success) {
        const trackingResult = this.outputParser.parseTrackingOutput(trackResult);
        validationResults.push({
          type: 'event_tracking',
          status: 'working',
          details: trackingResult
        });
      }
      
    } catch (error) {
      console.error('CLI validation failed:', error);
    }
    
    return {
      available: true,
      results: validationResults,
      executedCommands,
      summary: this.generateValidationSummary(validationResults)
    };
  }

  async executeCommandWithFallback(command: CLICommand): Promise<any> {
    if (!this.cliAvailable) {
      return {
        success: false,
        error: 'CLI not available',
        fallback: 'Using MCP-only functionality'
      };
    }
    
    try {
      const result = await this.cliExecutor.execute(command);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        parsed: this.parseCommandResult(result, command.command)
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        fallback: 'CLI execution failed, consider using MCP-only tools'
      };
    }
  }

  private combineAnalysisResults(mcpAnalysis: any, cliAnalysis: any, configStatus: any): any {
    const combined = {
      framework: mcpAnalysis.framework || cliAnalysis?.framework || 'Unknown',
      language: mcpAnalysis.language || cliAnalysis?.language || 'Unknown',
      hasSDK: mcpAnalysis.hasAnalyticsSDK || cliAnalysis?.hasAnalyticsSDK || false,
      configurationStatus: configStatus || { isValid: false, hasToken: false },
      recommendations: [] as string[],
      setupFiles: [] as string[]
    };
    
    // Combine recommendations
    if (mcpAnalysis.recommendations && Array.isArray(mcpAnalysis.recommendations)) {
      combined.recommendations.push(...mcpAnalysis.recommendations);
    }
    if (cliAnalysis?.recommendations && Array.isArray(cliAnalysis.recommendations)) {
      combined.recommendations.push(...cliAnalysis.recommendations);
    }
    
    // Add CLI-specific recommendations
    if (configStatus && !configStatus.isValid) {
      combined.recommendations.push('Configure API token: nodash config set token <your-token>');
    }
    
    // Remove duplicates
    combined.recommendations = [...new Set(combined.recommendations)];
    
    return combined;
  }

  private parseCommandResult(result: any, command: string): any {
    if (!result.success) {
      return this.outputParser.parseErrorOutput(result);
    }
    
    switch (command) {
      case 'config':
        return this.outputParser.parseConfigOutput(result);
      case 'health':
        return this.outputParser.parseHealthOutput(result);
      case 'track':
        return this.outputParser.parseTrackingOutput(result);
      case 'metric':
        return this.outputParser.parseMetricOutput(result);
      case 'analyze':
        return this.outputParser.parseAnalysisOutput(result);
      default:
        return { output: result.output };
    }
  }

  private generateValidationSummary(results: any[]): string {
    const passed = results.filter(r => r.status === 'valid' || r.status === 'healthy' || r.status === 'working').length;
    const total = results.length;
    
    if (passed === total) {
      return `All ${total} validation checks passed ✅`;
    } else {
      return `${passed}/${total} validation checks passed. Review failed checks for issues.`;
    }
  }

  // Utility method to check if CLI integration is available
  isCLIAvailable(): boolean {
    return this.cliAvailable;
  }

  // Method to get CLI status for debugging
  async getCLIStatus(): Promise<any> {
    if (!this.cliAvailable) {
      return {
        available: false,
        reason: 'CLI not found or not accessible'
      };
    }
    
    try {
      const version = await this.cliExecutor.getCLIVersion();
      return {
        available: true,
        version,
        path: 'nodash'
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}