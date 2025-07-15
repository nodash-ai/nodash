import { CLIExecutor, CLICommand, CLIResult } from './cli-executor.js';
import { OutputParser, ConfigurationState, HealthStatus, ProjectAnalysis } from './output-parser.js';
import { ProjectContext } from './command-translator.js';

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
  rollbackSteps?: WorkflowStep[];
  requiresConfirmation: boolean;
  estimatedDuration?: string;
  tags?: string[];
}

export interface WorkflowStep {
  name: string;
  command: CLICommand;
  condition?: (previousResults: CLIResult[], context: WorkflowContext) => boolean;
  onSuccess?: (result: CLIResult, context: WorkflowContext) => void;
  onFailure?: (result: CLIResult, context: WorkflowContext) => WorkflowAction;
  timeout?: number;
  retries?: number;
  optional?: boolean;
}

export interface WorkflowContext {
  projectPath: string;
  userPreferences: {
    confirmDestructive: boolean;
    defaultFormat: 'json' | 'table';
    verboseOutput: boolean;
  };
  sessionState: {
    configurationState?: ConfigurationState;
    healthStatus?: HealthStatus;
    projectAnalysis?: ProjectAnalysis;
    lastError?: string;
  };
}

export interface WorkflowResult {
  success: boolean;
  results: CLIResult[];
  failedStep?: string;
  rolledBack?: boolean;
  summary: string;
  recommendations: string[];
  nextSteps: string[];
}

export type WorkflowAction = 'continue' | 'stop' | 'retry' | 'rollback' | 'skip';

export class WorkflowOrchestrator {
  private predefinedWorkflows: Map<string, Workflow> = new Map();

  constructor(
    private cliExecutor: CLIExecutor,
    private outputParser: OutputParser
  ) {
    this.initializePredefinedWorkflows();
  }

  getWorkflow(name: string): Workflow | undefined {
    return this.predefinedWorkflows.get(name);
  }

  async executeWorkflow(workflow: Workflow, context: WorkflowContext): Promise<WorkflowResult> {
    const results: CLIResult[] = [];
    let failedStep: string | undefined;
    let rolledBack = false;

    console.log(`Starting workflow: ${workflow.name}`);

    try {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        
        // Check if step should be executed
        if (step.condition && !step.condition(results, context)) {
          console.log(`Skipping step: ${step.name} (condition not met)`);
          continue;
        }

        console.log(`Executing step: ${step.name}`);

        // Execute step with retries
        const result = await this.executeStepWithRetries(step, context);
        results.push(result);

        // Update context with result
        this.updateContextFromResult(result, step, context);

        // Handle result
        if (result.success) {
          step.onSuccess?.(result, context);
          console.log(`Step completed successfully: ${step.name}`);
        } else {
          console.log(`Step failed: ${step.name} - ${result.error}`);
          
          if (step.optional) {
            console.log(`Step is optional, continuing workflow`);
            continue;
          }

          const action = step.onFailure?.(result, context) || 'stop';
          
          switch (action) {
            case 'continue':
              console.log(`Continuing despite failure`);
              break;
            case 'stop':
              failedStep = step.name;
              return this.createFailureResult(results, failedStep, workflow);
            case 'retry':
              console.log(`Retrying step: ${step.name}`);
              i--; // Retry current step
              break;
            case 'rollback':
              console.log(`Rolling back workflow`);
              rolledBack = await this.executeRollback(workflow, results, context);
              failedStep = step.name;
              return this.createRollbackResult(results, failedStep, rolledBack, workflow);
            case 'skip':
              console.log(`Skipping failed step and continuing`);
              break;
          }
        }
      }

      return this.createSuccessResult(results, workflow, context);
    } catch (error) {
      console.error(`Workflow execution error: ${error}`);
      return this.createErrorResult(results, error, workflow);
    }
  }

  createSetupWorkflow(context: ProjectContext): Workflow {
    return {
      name: 'Complete Nodash Setup',
      description: 'Set up Nodash configuration, analyze project, and validate setup',
      requiresConfirmation: true,
      estimatedDuration: '2-3 minutes',
      tags: ['setup', 'configuration', 'analysis'],
      steps: [
        {
          name: 'Check Current Configuration',
          command: {
            command: 'config',
            args: ['list'],
            options: { format: 'json' }
          },
          optional: true
        },
        {
          name: 'Analyze Project Structure',
          command: {
            command: 'analyze',
            args: ['.'],
            options: { format: 'json', verbose: true }
          }
        },
        {
          name: 'Test Connectivity',
          command: {
            command: 'health',
            args: [],
            options: { format: 'json' }
          },
          condition: (results, ctx) => {
            return ctx.sessionState.configurationState?.hasToken || false;
          },
          optional: true
        },
        {
          name: 'Generate Setup Files',
          command: {
            command: 'analyze',
            args: ['.'],
            options: {}
          },
          condition: (results, ctx) => {
            return ctx.sessionState.projectAnalysis?.framework !== undefined;
          },
          optional: true
        }
      ]
    };
  }

  createValidationWorkflow(context: ProjectContext): Workflow {
    return {
      name: 'Comprehensive Validation',
      description: 'Validate configuration, connectivity, and implementation',
      requiresConfirmation: false,
      estimatedDuration: '1-2 minutes',
      tags: ['validation', 'testing', 'health'],
      steps: [
        {
          name: 'Validate Configuration',
          command: {
            command: 'config',
            args: ['list'],
            options: { format: 'json' }
          }
        },
        {
          name: 'Check Service Health',
          command: {
            command: 'health',
            args: [],
            options: { format: 'json', verbose: true }
          }
        },
        {
          name: 'Test Event Tracking',
          command: {
            command: 'track',
            args: ['validation_test'],
            options: { dryRun: true, format: 'json' }
          },
          condition: (results, ctx) => {
            return ctx.sessionState.healthStatus?.status === 'healthy';
          }
        },
        {
          name: 'Test Metric Sending',
          command: {
            command: 'metric',
            args: ['validation_metric', '1'],
            options: { dryRun: true, format: 'json' }
          },
          condition: (results, ctx) => {
            return ctx.sessionState.healthStatus?.status === 'healthy';
          }
        }
      ]
    };
  }

  createTroubleshootingWorkflow(issues: string[]): Workflow {
    const steps: WorkflowStep[] = [
      {
        name: 'Check Configuration',
        command: {
          command: 'config',
          args: ['list'],
          options: { format: 'json' }
        }
      },
      {
        name: 'Test Connectivity',
        command: {
          command: 'health',
          args: [],
          options: { format: 'json', verbose: true }
        }
      }
    ];

    // Add specific diagnostic steps based on issues
    if (issues.some(issue => issue.toLowerCase().includes('token'))) {
      steps.push({
        name: 'Validate Token Configuration',
        command: {
          command: 'config',
          args: ['get', 'token'],
          options: {}
        }
      });
    }

    if (issues.some(issue => issue.toLowerCase().includes('network'))) {
      steps.push({
        name: 'Test Network Connectivity',
        command: {
          command: 'health',
          args: [],
          options: { timeout: 10000 }
        }
      });
    }

    return {
      name: 'Troubleshooting Diagnostics',
      description: 'Run diagnostic commands to identify and resolve issues',
      requiresConfirmation: false,
      estimatedDuration: '1-2 minutes',
      tags: ['troubleshooting', 'diagnostics'],
      steps
    };
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.predefinedWorkflows.values());
  }

  private async executeStepWithRetries(step: WorkflowStep, context: WorkflowContext): Promise<CLIResult> {
    const maxRetries = step.retries || 0;
    let lastResult: CLIResult;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt} for step: ${step.name}`);
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      lastResult = await this.cliExecutor.execute(step.command);

      if (lastResult.success) {
        return lastResult;
      }

      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }
    }

    return lastResult!;
  }

  private updateContextFromResult(result: CLIResult, step: WorkflowStep, context: WorkflowContext): void {
    if (!result.success) {
      context.sessionState.lastError = result.error;
      return;
    }

    try {
      switch (step.command.command) {
        case 'config':
          if (step.command.args[0] === 'list') {
            context.sessionState.configurationState = this.outputParser.parseConfigOutput(result);
          }
          break;
        case 'health':
          context.sessionState.healthStatus = this.outputParser.parseHealthOutput(result);
          break;
        case 'analyze':
          context.sessionState.projectAnalysis = this.outputParser.parseAnalysisOutput(result);
          break;
      }
    } catch (error) {
      console.warn(`Failed to update context from result: ${error}`);
    }
  }

  private async executeRollback(workflow: Workflow, results: CLIResult[], context: WorkflowContext): Promise<boolean> {
    if (!workflow.rollbackSteps || workflow.rollbackSteps.length === 0) {
      console.log('No rollback steps defined');
      return false;
    }

    console.log('Executing rollback steps');
    
    try {
      for (const step of workflow.rollbackSteps) {
        const result = await this.cliExecutor.execute(step.command);
        if (!result.success) {
          console.warn(`Rollback step failed: ${step.name} - ${result.error}`);
        }
      }
      return true;
    } catch (error) {
      console.error(`Rollback execution failed: ${error}`);
      return false;
    }
  }

  private createSuccessResult(results: CLIResult[], workflow: Workflow, context: WorkflowContext): WorkflowResult {
    const summary = `Workflow '${workflow.name}' completed successfully with ${results.length} steps executed.`;
    const recommendations = this.generateRecommendations(results, context);
    const nextSteps = this.generateNextSteps(workflow, context);

    return {
      success: true,
      results,
      summary,
      recommendations,
      nextSteps
    };
  }

  private createFailureResult(results: CLIResult[], failedStep: string, workflow: Workflow): WorkflowResult {
    const summary = `Workflow '${workflow.name}' failed at step: ${failedStep}`;
    const recommendations = [
      'Review the error message from the failed step',
      'Check configuration and connectivity',
      'Try running individual commands to isolate the issue'
    ];
    const nextSteps = [
      'Run troubleshooting workflow',
      'Check CLI documentation',
      'Verify system requirements'
    ];

    return {
      success: false,
      results,
      failedStep,
      summary,
      recommendations,
      nextSteps
    };
  }

  private createRollbackResult(results: CLIResult[], failedStep: string, rolledBack: boolean, workflow: Workflow): WorkflowResult {
    const summary = `Workflow '${workflow.name}' failed at step: ${failedStep}. Rollback ${rolledBack ? 'completed' : 'failed'}.`;
    const recommendations = [
      'Review the failure and rollback results',
      'Check system state after rollback',
      'Consider manual cleanup if needed'
    ];
    const nextSteps = [
      'Verify system is in clean state',
      'Address the root cause of failure',
      'Retry workflow after fixes'
    ];

    return {
      success: false,
      results,
      failedStep,
      rolledBack,
      summary,
      recommendations,
      nextSteps
    };
  }

  private createErrorResult(results: CLIResult[], error: unknown, workflow: Workflow): WorkflowResult {
    const summary = `Workflow '${workflow.name}' encountered an unexpected error: ${error}`;
    const recommendations = [
      'Check system resources and permissions',
      'Verify CLI installation',
      'Review workflow definition'
    ];
    const nextSteps = [
      'Check system logs',
      'Verify environment setup',
      'Contact support if issue persists'
    ];

    return {
      success: false,
      results,
      summary,
      recommendations,
      nextSteps
    };
  }

  private generateRecommendations(results: CLIResult[], context: WorkflowContext): string[] {
    const recommendations: string[] = [];

    // Analyze results to provide specific recommendations
    if (context.sessionState.configurationState?.issues.length) {
      recommendations.push('Address configuration issues identified during setup');
    }

    if (context.sessionState.healthStatus?.status !== 'healthy') {
      recommendations.push('Resolve connectivity issues before proceeding');
    }

    if (context.sessionState.projectAnalysis?.setupStatus.issues.length) {
      recommendations.push('Follow project-specific setup recommendations');
    }

    // Default recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push('Configuration and setup completed successfully');
      recommendations.push('Begin implementing analytics in your application');
    }

    return recommendations;
  }

  private generateNextSteps(workflow: Workflow, context: WorkflowContext): string[] {
    const nextSteps: string[] = [];

    if (workflow.name.includes('Setup')) {
      nextSteps.push('Start implementing event tracking in your application');
      nextSteps.push('Test your implementation with dry-run commands');
      nextSteps.push('Monitor your analytics data in the dashboard');
    } else if (workflow.name.includes('Validation')) {
      nextSteps.push('Address any validation issues found');
      nextSteps.push('Implement additional event tracking as needed');
      nextSteps.push('Set up monitoring and alerts');
    } else if (workflow.name.includes('Troubleshooting')) {
      nextSteps.push('Apply fixes for identified issues');
      nextSteps.push('Re-run validation workflow');
      nextSteps.push('Test your implementation thoroughly');
    }

    return nextSteps;
  }

  private initializePredefinedWorkflows(): void {
    // Setup workflow
    this.predefinedWorkflows.set('setup', {
      name: 'Complete Setup',
      description: 'Complete Nodash setup and configuration',
      requiresConfirmation: true,
      estimatedDuration: '2-3 minutes',
      tags: ['setup'],
      steps: [
        {
          name: 'Check Configuration',
          command: { command: 'config', args: ['list'], options: { format: 'json' } }
        },
        {
          name: 'Analyze Project',
          command: { command: 'analyze', args: ['.'], options: { format: 'json' } }
        }
      ]
    });

    // Validation workflow
    this.predefinedWorkflows.set('validation', {
      name: 'Comprehensive Validation',
      description: 'Validate complete Nodash setup',
      requiresConfirmation: false,
      estimatedDuration: '1-2 minutes',
      tags: ['validation'],
      steps: [
        {
          name: 'Validate Configuration',
          command: { command: 'config', args: ['list'], options: { format: 'json' } }
        },
        {
          name: 'Check Health',
          command: { command: 'health', args: [], options: { format: 'json' } }
        }
      ]
    });

    // Quick health check workflow
    this.predefinedWorkflows.set('health-check', {
      name: 'Quick Health Check',
      description: 'Quick validation of system health',
      requiresConfirmation: false,
      estimatedDuration: '30 seconds',
      tags: ['health', 'quick'],
      steps: [
        {
          name: 'Check Health',
          command: { command: 'health', args: [], options: { format: 'json' } }
        }
      ]
    });
  }
}