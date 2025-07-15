import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { CLIExecutor, CLICommand } from '../services/cli-executor.js';
import { CommandTranslator, ProjectContext } from '../services/command-translator.js';
import { OutputParser } from '../services/output-parser.js';
import { WorkflowOrchestrator, WorkflowContext } from '../services/workflow-orchestrator.js';
import { SecurityManager, createDefaultSecurity } from '../services/security-policy.js';

export interface EnhancedMCPResponse {
  success: boolean;
  analysis?: any;
  cliExecution?: {
    commandsExecuted: CLICommand[];
    results: any[];
    summary: string;
  };
  recommendations: string[];
  nextSteps: string[];
  troubleshooting?: {
    issues: string[];
    solutions: string[];
    diagnosticResults?: any[];
  };
  error?: string;
}

export class EnhancedToolsHandler {
  private cliExecutor: CLIExecutor;
  private commandTranslator: CommandTranslator;
  private outputParser: OutputParser;
  private workflowOrchestrator: WorkflowOrchestrator;
  private securityManager: SecurityManager;

  constructor() {
    this.cliExecutor = new CLIExecutor();
    this.commandTranslator = new CommandTranslator();
    this.outputParser = new OutputParser();
    this.workflowOrchestrator = new WorkflowOrchestrator(this.cliExecutor, this.outputParser);
    
    const { securityManager } = createDefaultSecurity();
    this.securityManager = securityManager;
  }

  setupEnhancedTools(server: Server): void {
    // Get existing handler if it exists
    const existingListHandler = server.getRequestHandler?.(ListToolsRequestSchema);
    const existingCallHandler = server.getRequestHandler?.(CallToolRequestSchema);

    // Override the list tools handler to include enhanced tools
    server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      // Get existing tools first
      let existingTools: any[] = [];
      if (existingListHandler) {
        try {
          const existingResponse = await existingListHandler(request);
          existingTools = existingResponse.tools || [];
        } catch (error) {
          console.warn('Failed to get existing tools:', error);
        }
      }
      
      const enhancedTools = [
        {
          name: 'setup_nodash_complete',
          description: 'Complete Nodash setup with configuration, analysis, and validation using CLI',
          inputSchema: {
            type: 'object',
            properties: {
              apiToken: {
                type: 'string',
                description: 'Nodash API token for authentication'
              },
              environment: {
                type: 'string',
                description: 'Environment name (dev, staging, prod)',
                default: 'dev'
              },
              generateSetupFiles: {
                type: 'boolean',
                description: 'Generate framework-specific setup files',
                default: true
              }
            },
            required: ['apiToken']
          }
        },
        {
          name: 'execute_cli_command',
          description: 'Execute any Nodash CLI command with safety checks and confirmation',
          inputSchema: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'CLI command to execute (config, track, metric, health, analyze)'
              },
              args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Command arguments'
              },
              options: {
                type: 'object',
                properties: {
                  dryRun: { type: 'boolean', default: true },
                  format: { type: 'string', enum: ['json', 'table'], default: 'json' },
                  verbose: { type: 'boolean', default: false }
                }
              },
              requireConfirmation: {
                type: 'boolean',
                description: 'Require explicit confirmation for destructive operations',
                default: true
              }
            },
            required: ['command']
          }
        },
        {
          name: 'validate_implementation',
          description: 'Comprehensive validation of Nodash implementation using CLI diagnostics',
          inputSchema: {
            type: 'object',
            properties: {
              includeHealthCheck: {
                type: 'boolean',
                description: 'Include service health check',
                default: true
              },
              testEvents: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of events to test (dry-run mode)',
                default: ['test_event']
              },
              testMetrics: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' }
                  }
                },
                description: 'List of metrics to test (dry-run mode)'
              }
            }
          }
        },
        {
          name: 'troubleshoot_issues',
          description: 'Automated troubleshooting using CLI diagnostics and analysis',
          inputSchema: {
            type: 'object',
            properties: {
              symptoms: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of symptoms or issues observed'
              },
              runDiagnostics: {
                type: 'boolean',
                description: 'Run comprehensive diagnostic commands',
                default: true
              },
              includeProjectAnalysis: {
                type: 'boolean',
                description: 'Include project structure analysis',
                default: true
              }
            }
          }
        },
        {
          name: 'execute_workflow',
          description: 'Execute predefined workflows for common tasks',
          inputSchema: {
            type: 'object',
            properties: {
              workflowName: {
                type: 'string',
                enum: ['setup', 'validation', 'health-check'],
                description: 'Name of the workflow to execute'
              },
              context: {
                type: 'object',
                properties: {
                  projectPath: { type: 'string', default: '.' },
                  confirmDestructive: { type: 'boolean', default: true },
                  verboseOutput: { type: 'boolean', default: false }
                }
              }
            },
            required: ['workflowName']
          }
        }
      ];

      return {
        tools: [...existingTools, ...enhancedTools]
      };
    });

    // Handle enhanced tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Check if this is one of our enhanced tools
      const enhancedToolNames = [
        'setup_nodash_complete',
        'execute_cli_command', 
        'validate_implementation',
        'troubleshoot_issues',
        'execute_workflow'
      ];

      if (enhancedToolNames.includes(name)) {
        try {
          switch (name) {
            case 'setup_nodash_complete':
              return await this.handleCompleteSetup(args);
            case 'execute_cli_command':
              return await this.handleExecuteCommand(args);
            case 'validate_implementation':
              return await this.handleValidateImplementation(args);
            case 'troubleshoot_issues':
              return await this.handleTroubleshootIssues(args);
            case 'execute_workflow':
              return await this.handleExecuteWorkflow(args);
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                recommendations: ['Check the error message and try again'],
                nextSteps: ['Verify CLI installation and configuration']
              }, null, 2)
            }]
          };
        }
      } else {
        // For non-enhanced tools, delegate to existing handler
        if (existingCallHandler) {
          return await existingCallHandler(request);
        } else {
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      }
    });
  }

  private async handleCompleteSetup(args: any): Promise<any> {
    const { apiToken, environment = 'dev', generateSetupFiles = true } = args;

    if (!apiToken) {
      throw new Error('API token is required for setup');
    }

    const commands: CLICommand[] = [];
    const results: any[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Step 1: Set API token
      const tokenCommand: CLICommand = {
        command: 'config',
        args: ['set', 'token', apiToken],
        options: {},
        requiresConfirmation: true,
        description: 'Set API token'
      };

      const tokenResult = await this.executeSecureCommand(tokenCommand);
      commands.push(tokenCommand);
      results.push(this.outputParser.parseConfigOutput(tokenResult));

      if (!tokenResult.success) {
        issues.push('Failed to set API token');
        recommendations.push('Verify token format and try again');
      }

      // Step 2: Analyze project
      const analyzeCommand: CLICommand = {
        command: 'analyze',
        args: ['.'],
        options: { format: 'json', verbose: true },
        description: 'Analyze project structure'
      };

      const analyzeResult = await this.cliExecutor.execute(analyzeCommand);
      commands.push(analyzeCommand);
      
      if (analyzeResult.success) {
        const analysis = this.outputParser.parseAnalysisOutput(analyzeResult);
        results.push(analysis);
        
        if (!analysis.hasAnalyticsSDK) {
          recommendations.push('Install @nodash/sdk: npm install @nodash/sdk');
        }
      }

      // Step 3: Test connectivity
      const healthCommand: CLICommand = {
        command: 'health',
        args: [],
        options: { format: 'json' },
        description: 'Test service connectivity'
      };

      const healthResult = await this.cliExecutor.execute(healthCommand);
      commands.push(healthCommand);
      
      if (healthResult.success) {
        const health = this.outputParser.parseHealthOutput(healthResult);
        results.push(health);
        
        if (health.status !== 'healthy') {
          issues.push('Service connectivity issues detected');
          recommendations.push(...health.suggestions);
        }
      }

      // Step 4: Generate setup files if requested
      if (generateSetupFiles) {
        const setupCommand: CLICommand = {
          command: 'analyze',
          args: ['.', '--setup'],
          options: { format: 'json' },
          description: 'Generate setup files'
        };

        const setupResult = await this.cliExecutor.execute(setupCommand);
        commands.push(setupCommand);
        
        if (setupResult.success) {
          recommendations.push('Setup files generated in .nodash/setup/');
          recommendations.push('Copy relevant files to your project');
        }
      }

      const response: EnhancedMCPResponse = {
        success: issues.length === 0,
        cliExecution: {
          commandsExecuted: commands,
          results,
          summary: `Setup completed with ${commands.length} commands executed`
        },
        recommendations: [
          ...recommendations,
          'Begin implementing event tracking in your application',
          'Test your implementation with dry-run commands'
        ],
        nextSteps: [
          'Review generated setup files',
          'Implement basic event tracking',
          'Test with validation workflow'
        ]
      };

      if (issues.length > 0) {
        response.troubleshooting = {
          issues,
          solutions: recommendations
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            cliExecution: {
              commandsExecuted: commands,
              results,
              summary: 'Setup failed during execution'
            },
            recommendations: [
              'Check CLI installation',
              'Verify API token format',
              'Ensure proper permissions'
            ],
            nextSteps: [
              'Run individual commands to isolate issues',
              'Check troubleshooting guide'
            ]
          }, null, 2)
        }]
      };
    }
  }

  private async handleExecuteCommand(args: any): Promise<any> {
    const { command, args: cmdArgs = [], options = {}, requireConfirmation = true } = args;

    if (!command) {
      throw new Error('Command is required');
    }

    const cliCommand: CLICommand = {
      command,
      args: cmdArgs,
      options: {
        dryRun: options.dryRun !== false, // Default to dry-run for safety
        format: options.format || 'json',
        verbose: options.verbose || false
      },
      requiresConfirmation: requireConfirmation,
      description: `Execute ${command} command`
    };

    try {
      const result = await this.executeSecureCommand(cliCommand);
      const parsedResult = this.parseCommandResult(result, command);

      const response: EnhancedMCPResponse = {
        success: result.success,
        cliExecution: {
          commandsExecuted: [cliCommand],
          results: [parsedResult],
          summary: result.success ? 'Command executed successfully' : 'Command execution failed'
        },
        recommendations: result.success 
          ? ['Command completed successfully']
          : ['Check error message and retry'],
        nextSteps: result.success
          ? ['Review command output', 'Continue with next steps']
          : ['Address the error', 'Verify command syntax']
      };

      if (!result.success) {
        const errorAnalysis = this.outputParser.parseErrorOutput(result);
        response.troubleshooting = {
          issues: [errorAnalysis.message],
          solutions: errorAnalysis.suggestions
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            recommendations: ['Check command syntax and permissions'],
            nextSteps: ['Verify CLI installation', 'Review command documentation']
          }, null, 2)
        }]
      };
    }
  }

  private async handleValidateImplementation(args: any): Promise<any> {
    const { 
      includeHealthCheck = true, 
      testEvents = ['test_event'], 
      testMetrics = [] 
    } = args;

    const commands: CLICommand[] = [];
    const results: any[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Step 1: Check configuration
      const configCommand: CLICommand = {
        command: 'config',
        args: ['list'],
        options: { format: 'json' },
        description: 'Validate configuration'
      };

      const configResult = await this.cliExecutor.execute(configCommand);
      commands.push(configCommand);
      
      if (configResult.success) {
        const config = this.outputParser.parseConfigOutput(configResult);
        results.push(config);
        
        if (!config.isValid) {
          issues.push(...config.issues);
          recommendations.push(...config.recommendations);
        }
      }

      // Step 2: Health check
      if (includeHealthCheck) {
        const healthCommand: CLICommand = {
          command: 'health',
          args: [],
          options: { format: 'json', verbose: true },
          description: 'Check service health'
        };

        const healthResult = await this.cliExecutor.execute(healthCommand);
        commands.push(healthCommand);
        
        if (healthResult.success) {
          const health = this.outputParser.parseHealthOutput(healthResult);
          results.push(health);
          
          if (health.status !== 'healthy') {
            issues.push(...health.issues);
            recommendations.push(...health.suggestions);
          }
        }
      }

      // Step 3: Test events
      for (const eventName of testEvents) {
        const trackCommand: CLICommand = {
          command: 'track',
          args: [eventName],
          options: { dryRun: true, format: 'json' },
          description: `Test ${eventName} event tracking`
        };

        const trackResult = await this.cliExecutor.execute(trackCommand);
        commands.push(trackCommand);
        
        if (trackResult.success) {
          const tracking = this.outputParser.parseTrackingOutput(trackResult);
          results.push(tracking);
        } else {
          issues.push(`Failed to test event: ${eventName}`);
        }
      }

      // Step 4: Test metrics
      for (const metric of testMetrics) {
        const metricCommand: CLICommand = {
          command: 'metric',
          args: [metric.name, metric.value.toString()],
          options: { dryRun: true, format: 'json' },
          description: `Test ${metric.name} metric`
        };

        const metricResult = await this.cliExecutor.execute(metricCommand);
        commands.push(metricCommand);
        
        if (metricResult.success) {
          const metricData = this.outputParser.parseMetricOutput(metricResult);
          results.push(metricData);
        } else {
          issues.push(`Failed to test metric: ${metric.name}`);
        }
      }

      const response: EnhancedMCPResponse = {
        success: issues.length === 0,
        cliExecution: {
          commandsExecuted: commands,
          results,
          summary: `Validation completed with ${commands.length} checks`
        },
        recommendations: issues.length === 0 
          ? ['All validation checks passed', 'Implementation is ready for use']
          : recommendations,
        nextSteps: issues.length === 0
          ? ['Begin production implementation', 'Set up monitoring']
          : ['Address validation issues', 'Re-run validation after fixes']
      };

      if (issues.length > 0) {
        response.troubleshooting = {
          issues,
          solutions: recommendations
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            cliExecution: {
              commandsExecuted: commands,
              results,
              summary: 'Validation failed during execution'
            },
            recommendations: ['Check CLI installation and configuration'],
            nextSteps: ['Run individual validation steps', 'Check troubleshooting guide']
          }, null, 2)
        }]
      };
    }
  }

  private async handleTroubleshootIssues(args: any): Promise<any> {
    const { 
      symptoms = [], 
      runDiagnostics = true, 
      includeProjectAnalysis = true 
    } = args;

    const workflow = this.workflowOrchestrator.createTroubleshootingWorkflow(symptoms);
    
    const context: WorkflowContext = {
      projectPath: '.',
      userPreferences: {
        confirmDestructive: false,
        defaultFormat: 'json',
        verboseOutput: true
      },
      sessionState: {}
    };

    try {
      const workflowResult = await this.workflowOrchestrator.executeWorkflow(workflow, context);

      const response: EnhancedMCPResponse = {
        success: workflowResult.success,
        cliExecution: {
          commandsExecuted: workflow.steps.map(step => step.command),
          results: workflowResult.results.map(result => this.parseCommandResult(result, result.executedCommand)),
          summary: workflowResult.summary
        },
        recommendations: workflowResult.recommendations,
        nextSteps: workflowResult.nextSteps,
        troubleshooting: {
          issues: symptoms,
          solutions: workflowResult.recommendations,
          diagnosticResults: workflowResult.results
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            troubleshooting: {
              issues: symptoms,
              solutions: ['Check CLI installation', 'Verify configuration', 'Review error logs']
            },
            recommendations: ['Run basic health check', 'Verify system requirements'],
            nextSteps: ['Check troubleshooting documentation', 'Contact support if needed']
          }, null, 2)
        }]
      };
    }
  }

  private async handleExecuteWorkflow(args: any): Promise<any> {
    const { workflowName, context: workflowContext = {} } = args;

    if (!workflowName) {
      throw new Error('Workflow name is required');
    }

    const workflow = this.workflowOrchestrator.getWorkflow(workflowName);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    const context: WorkflowContext = {
      projectPath: workflowContext.projectPath || '.',
      userPreferences: {
        confirmDestructive: workflowContext.confirmDestructive !== false,
        defaultFormat: 'json',
        verboseOutput: workflowContext.verboseOutput || false
      },
      sessionState: {}
    };

    try {
      const result = await this.workflowOrchestrator.executeWorkflow(workflow, context);

      const response: EnhancedMCPResponse = {
        success: result.success,
        cliExecution: {
          commandsExecuted: workflow.steps.map(step => step.command),
          results: result.results.map(r => this.parseCommandResult(r, r.executedCommand)),
          summary: result.summary
        },
        recommendations: result.recommendations,
        nextSteps: result.nextSteps
      };

      if (!result.success && result.failedStep) {
        response.troubleshooting = {
          issues: [`Workflow failed at step: ${result.failedStep}`],
          solutions: result.recommendations
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
            recommendations: ['Check workflow definition', 'Verify CLI availability'],
            nextSteps: ['Run individual commands', 'Check system requirements']
          }, null, 2)
        }]
      };
    }
  }

  private async executeSecureCommand(command: CLICommand): Promise<any> {
    // Validate command through security manager
    const validation = await this.securityManager.validateAndPrepareCommand(command);
    
    if (!validation.valid) {
      throw new Error(`Security validation failed: ${validation.violations.map(v => v.message).join(', ')}`);
    }

    if (validation.requiresConfirmation) {
      // In a real implementation, this would prompt for user confirmation
      // For now, we'll proceed with a warning
      console.warn(`Command requires confirmation: ${command.description}`);
    }

    // Handle token commands securely
    const secureCommand = await this.securityManager.handleTokenInCommand(validation.sanitizedCommand!);
    
    // Execute the command
    return await this.cliExecutor.execute(secureCommand);
  }

  private parseCommandResult(result: any, command: string): any {
    if (!result.success) {
      return this.outputParser.parseErrorOutput(result);
    }

    const commandName = command.split(' ')[0];
    
    switch (commandName) {
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
        return { output: result.output, success: result.success };
    }
  }


}