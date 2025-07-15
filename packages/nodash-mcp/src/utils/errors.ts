import { CodeExample } from '../services/sdk-demonstrator.js';
import { CLIResult } from '../services/cli-executor.js';

/**
 * Base error class for MCP development-focused errors
 */
export class MCPDevelopmentError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestions: string[],
    public examples?: CodeExample[],
    public documentation?: string[]
  ) {
    super(message);
    this.name = 'MCPDevelopmentError';
  }

  /**
   * Get a formatted error response for MCP clients
   */
  toMCPResponse(): {
    error: string;
    code: string;
    suggestions: string[];
    examples?: CodeExample[];
    documentation?: string[];
    helpText: string;
  } {
    return {
      error: this.message,
      code: this.code,
      suggestions: this.suggestions,
      examples: this.examples,
      documentation: this.documentation,
      helpText: this.getHelpText()
    };
  }

  private getHelpText(): string {
    let help = `❌ ${this.message}\n\n`;
    
    if (this.suggestions.length > 0) {
      help += '💡 **Suggestions:**\n';
      this.suggestions.forEach((suggestion, index) => {
        help += `${index + 1}. ${suggestion}\n`;
      });
      help += '\n';
    }
    
    if (this.examples && this.examples.length > 0) {
      help += '📝 **Code Examples:**\n';
      this.examples.forEach((example, index) => {
        help += `**${example.title}:**\n\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`;
      });
    }
    
    if (this.documentation && this.documentation.length > 0) {
      help += '📚 **Documentation:**\n';
      this.documentation.forEach(doc => {
        help += `- ${doc}\n`;
      });
    }
    
    return help;
  }
}

/**
 * Error codes for different development scenarios
 */
export enum MCPErrorCode {
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  FRAMEWORK_NOT_DETECTED = 'FRAMEWORK_NOT_DETECTED',
  SDK_NOT_INSTALLED = 'SDK_NOT_INSTALLED',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  EXAMPLE_NOT_AVAILABLE = 'EXAMPLE_NOT_AVAILABLE',
  INVALID_EVENT_SCHEMA = 'INVALID_EVENT_SCHEMA',
  MISSING_DEPENDENCIES = 'MISSING_DEPENDENCIES',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  INVALID_FRAMEWORK = 'INVALID_FRAMEWORK'
}

/**
 * Factory functions for common development errors
 */
export class MCPErrorFactory {
  static projectNotFound(projectPath: string): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Project not found at path: ${projectPath}`,
      MCPErrorCode.PROJECT_NOT_FOUND,
      [
        'Ensure the project path exists and is accessible',
        'Check that you\'re running the MCP server from the correct directory',
        'Verify the project has a package.json file',
        'Try using an absolute path instead of a relative path'
      ],
      [
        {
          title: 'Check Project Structure',
          description: 'Verify your project has the expected structure',
          language: 'bash',
          code: `# Check if project directory exists
ls -la ${projectPath}

# Look for package.json
find ${projectPath} -name "package.json" -type f

# Check current working directory
pwd`
        }
      ],
      [
        'MCP Server Setup Guide: https://docs.nodash.ai/mcp/setup',
        'Project Structure Requirements: https://docs.nodash.ai/mcp/project-structure'
      ]
    );
  }

  static frameworkNotDetected(availableFrameworks: string[]): MCPDevelopmentError {
    return new MCPDevelopmentError(
      'Could not detect framework from package.json dependencies',
      MCPErrorCode.FRAMEWORK_NOT_DETECTED,
      [
        'Ensure your package.json includes framework dependencies',
        'Check that dependencies are properly installed',
        'Consider manually specifying the framework',
        `Supported frameworks: ${availableFrameworks.join(', ')}`
      ],
      [
        {
          title: 'Add Framework Dependencies',
          description: 'Example of adding React dependencies',
          language: 'json',
          code: `{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}`
        }
      ]
    );
  }

  static sdkNotInstalled(): MCPDevelopmentError {
    return new MCPDevelopmentError(
      'Nodash SDK is not installed in the project',
      MCPErrorCode.SDK_NOT_INSTALLED,
      [
        'Install the Nodash SDK using your package manager',
        'Add the SDK to your package.json dependencies',
        'Run npm install or yarn install after adding the dependency',
        'Verify the installation by checking node_modules'
      ],
      [
        {
          title: 'Install Nodash SDK',
          description: 'Install using your preferred package manager',
          language: 'bash',
          code: `# Using npm
npm install @nodash/sdk

# Using yarn
yarn add @nodash/sdk

# Using pnpm
pnpm add @nodash/sdk`
        },
        {
          title: 'Verify Installation',
          description: 'Check that the SDK is properly installed',
          language: 'bash',
          code: `# Check if SDK is in package.json
grep "@nodash/sdk" package.json

# Verify in node_modules
ls node_modules/@nodash/sdk`
        }
      ]
    );
  }

  static invalidEventSchema(eventName: string, issues: string[]): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Invalid event schema for '${eventName}': ${issues.join(', ')}`,
      MCPErrorCode.INVALID_EVENT_SCHEMA,
      [
        'Use snake_case for event names (e.g., user_signup, button_click)',
        'Include required properties like timestamp and user context',
        'Validate property types and naming conventions',
        'Follow Nodash event schema best practices'
      ],
      [
        {
          title: 'Valid Event Schema',
          description: 'Example of a properly structured event',
          language: 'typescript',
          code: `// Good event schema
await nodash.track('user_signup', {
  email: 'user@example.com',
  source: 'organic',
  plan: 'free',
  timestamp: new Date().toISOString()
}, {
  userId: 'user_123',
  sessionId: 'session_456'
});`
        },
        {
          title: 'Event Naming Conventions',
          description: 'Follow consistent naming patterns',
          language: 'typescript',
          code: `// Use snake_case for event names
'user_signup'     // ✅ Good
'userSignup'      // ❌ Avoid camelCase
'User-Signup'     // ❌ Avoid kebab-case
'USER_SIGNUP'     // ❌ Avoid UPPER_CASE

// Use descriptive, action-oriented names
'button_click'    // ✅ Good
'click'          // ❌ Too generic
'purchase_completed' // ✅ Good
'purchase'       // ❌ Unclear state`
        }
      ],
      [
        'Event Schema Guide: https://docs.nodash.ai/events/schema',
        'Best Practices: https://docs.nodash.ai/events/best-practices'
      ]
    );
  }

  static exampleNotAvailable(framework: string, availableExamples: string[]): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Example not available for framework: ${framework}`,
      MCPErrorCode.EXAMPLE_NOT_AVAILABLE,
      [
        `Available examples: ${availableExamples.join(', ')}`,
        'Check the examples directory for supported frameworks',
        'Consider using a similar framework example as a starting point',
        'Request a new example for your framework'
      ],
      [
        {
          title: 'List Available Examples',
          description: 'See what examples are currently available',
          language: 'bash',
          code: `# List all available examples
ls examples/

# Check specific framework
ls examples/${availableExamples[0] || 'react'}/`
        }
      ]
    );
  }

  static missingDependencies(missing: string[]): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Missing required dependencies: ${missing.join(', ')}`,
      MCPErrorCode.MISSING_DEPENDENCIES,
      [
        'Install the missing dependencies using your package manager',
        'Check that all required packages are in package.json',
        'Run npm install or yarn install to install dependencies',
        'Verify the installation was successful'
      ],
      [
        {
          title: 'Install Missing Dependencies',
          description: 'Install the required packages',
          language: 'bash',
          code: `# Install missing dependencies
npm install ${missing.join(' ')}

# Or using yarn
yarn add ${missing.join(' ')}`
        }
      ]
    );
  }

  static analysisFailure(reason: string, projectPath: string): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Project analysis failed: ${reason}`,
      MCPErrorCode.ANALYSIS_FAILED,
      [
        'Check that the project directory is accessible',
        'Ensure package.json exists and is valid JSON',
        'Verify file permissions allow reading project files',
        'Try running the analysis from the project root directory'
      ],
      [
        {
          title: 'Debug Project Analysis',
          description: 'Steps to diagnose analysis issues',
          language: 'bash',
          code: `# Check project structure
ls -la ${projectPath}

# Validate package.json
cat ${projectPath}/package.json | jq .

# Check file permissions
ls -la ${projectPath}/package.json`
        }
      ]
    );
  }

  static fileReadError(filePath: string, error: string): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Failed to read file: ${filePath}`,
      MCPErrorCode.FILE_READ_ERROR,
      [
        'Check that the file exists at the specified path',
        'Verify file permissions allow reading',
        'Ensure the file is not corrupted or locked',
        'Try using an absolute path instead of relative path'
      ],
      [
        {
          title: 'Debug File Access',
          description: 'Check file accessibility',
          language: 'bash',
          code: `# Check if file exists
ls -la "${filePath}"

# Check file permissions
stat "${filePath}"

# Try reading the file
head -n 5 "${filePath}"`
        }
      ]
    );
  }

  static invalidFramework(framework: string, supported: string[]): MCPDevelopmentError {
    return new MCPDevelopmentError(
      `Unsupported framework: ${framework}`,
      MCPErrorCode.INVALID_FRAMEWORK,
      [
        `Supported frameworks: ${supported.join(', ')}`,
        'Check the spelling of the framework name',
        'Use one of the supported frameworks',
        'Request support for your framework'
      ],
      [
        {
          title: 'Supported Frameworks',
          description: 'List of currently supported frameworks',
          language: 'text',
          code: supported.map(f => `- ${f}`).join('\n')
        }
      ]
    );
  }
}

/**
 * Utility function to wrap async operations with better error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: string,
  suggestions: string[] = []
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof MCPDevelopmentError) {
      throw error;
    }
    
    throw new MCPDevelopmentError(
      `${errorContext}: ${error instanceof Error ? error.message : String(error)}`,
      'OPERATION_FAILED',
      suggestions.length > 0 ? suggestions : [
        'Check the error message for specific details',
        'Verify all required parameters are provided',
        'Ensure the operation has necessary permissions',
        'Try the operation again with different parameters'
      ]
    );
  }
}

/**
 * Validate common development scenarios
 */
export class MCPValidator {
  static validateProjectPath(projectPath: string): void {
    if (!projectPath || typeof projectPath !== 'string') {
      throw new MCPDevelopmentError(
        'Invalid project path provided',
        'INVALID_PROJECT_PATH',
        [
          'Provide a valid string path to your project directory',
          'Use absolute paths for better reliability',
          'Ensure the path exists and is accessible'
        ]
      );
    }
  }

  static validateFramework(framework: string, supported: string[]): void {
    if (!framework || !supported.includes(framework)) {
      throw MCPErrorFactory.invalidFramework(framework, supported);
    }
  }

  static validateEventName(eventName: string): void {
    if (!eventName || typeof eventName !== 'string') {
      throw new MCPDevelopmentError(
        'Event name is required and must be a string',
        'INVALID_EVENT_NAME',
        [
          'Provide a valid event name as a string',
          'Use snake_case naming convention',
          'Make the name descriptive and action-oriented'
        ]
      );
    }

    if (!eventName.match(/^[a-z][a-z0-9_]*$/)) {
      throw new MCPDevelopmentError(
        'Event name must follow snake_case convention',
        'INVALID_EVENT_NAME_FORMAT',
        [
          'Use lowercase letters, numbers, and underscores only',
          'Start with a letter, not a number or underscore',
          'Examples: user_signup, button_click, page_view'
        ],
        [
          {
            title: 'Valid Event Names',
            description: 'Examples of properly formatted event names',
            language: 'typescript',
            code: `// ✅ Good event names
'user_signup'
'button_click'
'page_view'
'purchase_completed'
'form_submitted'

// ❌ Invalid event names
'userSignup'      // camelCase
'User-Signup'     // kebab-case
'USER_SIGNUP'     // UPPER_CASE
'123_event'       // starts with number
'_private_event'  // starts with underscore`
          }
        ]
      );
    }
  }
}
/**

 * CLI Integration Error Types
 */
export enum CLIIntegrationErrorType {
  CLI_NOT_AVAILABLE = 'CLI_NOT_AVAILABLE',
  COMMAND_FAILED = 'COMMAND_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_COMMAND = 'INVALID_COMMAND',
  TIMEOUT = 'TIMEOUT',
  PARSING_ERROR = 'PARSING_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

/**
 * CLI Integration specific error class
 */
export class CLIIntegrationError extends Error {
  constructor(
    public type: CLIIntegrationErrorType,
    message: string,
    public cliResult?: CLIResult,
    public suggestions?: string[]
  ) {
    super(message);
    this.name = 'CLIIntegrationError';
  }

  toMCPResponse(): MCPErrorResponse {
    return {
      error: this.message,
      type: this.type,
      suggestions: this.suggestions || [],
      cliOutput: this.cliResult?.output,
      troubleshooting: this.generateTroubleshooting()
    };
  }

  private generateTroubleshooting(): string[] {
    switch (this.type) {
      case CLIIntegrationErrorType.CLI_NOT_AVAILABLE:
        return [
          'Ensure @nodash/cli is installed: npm install -g @nodash/cli',
          'Check if nodash command is in PATH',
          'Try running: which nodash',
          'Verify Node.js version >= 18.0.0'
        ];
      case CLIIntegrationErrorType.COMMAND_FAILED:
        return [
          'Check the CLI error message above',
          'Verify your configuration: nodash config list',
          'Test connectivity: nodash health',
          'Try running the command manually to isolate the issue'
        ];
      case CLIIntegrationErrorType.PERMISSION_DENIED:
        return [
          'Check file and directory permissions',
          'Ensure you have write access to the project directory',
          'Try running with appropriate permissions'
        ];
      case CLIIntegrationErrorType.SECURITY_VIOLATION:
        return [
          'Command blocked for security reasons',
          'Review command arguments for unsafe characters',
          'Use allowed commands only: config, track, metric, health, analyze'
        ];
      case CLIIntegrationErrorType.RATE_LIMIT_EXCEEDED:
        return [
          'Too many commands executed in short time',
          'Wait a moment before retrying',
          'Consider batching operations'
        ];
      default:
        return ['Check the error message and try again'];
    }
  }
}

/**
 * MCP Error Response interface for CLI integration
 */
export interface MCPErrorResponse {
  error: string;
  type: CLIIntegrationErrorType;
  suggestions: string[];
  cliOutput?: string;
  troubleshooting: string[];
}

/**
 * Fallback strategy interface
 */
export interface FallbackStrategy {
  condition: (error: CLIIntegrationError) => boolean;
  action: (originalRequest: any, error: CLIIntegrationError) => Promise<any>;
  description: string;
}

/**
 * Fallback Manager for handling CLI integration failures
 */
export class FallbackManager {
  private strategies: FallbackStrategy[] = [];

  constructor() {
    this.initializeDefaultStrategies();
  }

  addStrategy(strategy: FallbackStrategy): void {
    this.strategies.push(strategy);
  }

  async handleError(error: CLIIntegrationError, originalRequest: any): Promise<any> {
    // Find applicable fallback strategy
    for (const strategy of this.strategies) {
      if (strategy.condition(error)) {
        console.log(`Applying fallback strategy: ${strategy.description}`);
        try {
          return await strategy.action(originalRequest, error);
        } catch (fallbackError) {
          console.warn(`Fallback strategy failed: ${fallbackError}`);
          continue;
        }
      }
    }

    // No fallback available, return error response
    return {
      success: false,
      error: error.message,
      type: error.type,
      fallbackUsed: false,
      suggestions: error.suggestions || [],
      troubleshooting: error.generateTroubleshooting()
    };
  }

  private initializeDefaultStrategies(): void {
    // CLI not available - use MCP-only functionality
    this.strategies.push({
      condition: (error) => error.type === CLIIntegrationErrorType.CLI_NOT_AVAILABLE,
      action: async (request, error) => {
        return {
          success: true,
          fallbackUsed: true,
          fallbackType: 'MCP_ONLY',
          message: 'CLI not available, using MCP-only analysis',
          data: await this.executeMCPOnlyFallback(request),
          recommendations: [
            'Install @nodash/cli for enhanced functionality',
            'Current analysis is based on MCP capabilities only'
          ]
        };
      },
      description: 'Use MCP-only analysis when CLI is unavailable'
    });

    // Command failed - provide guidance without execution
    this.strategies.push({
      condition: (error) => error.type === CLIIntegrationErrorType.COMMAND_FAILED,
      action: async (request, error) => {
        return {
          success: false,
          fallbackUsed: true,
          fallbackType: 'GUIDANCE_ONLY',
          message: 'Command execution failed, providing guidance instead',
          guidance: this.generateCommandGuidance(request, error),
          troubleshooting: error.generateTroubleshooting()
        };
      },
      description: 'Provide guidance when CLI commands fail'
    });

    // Security violation - sanitize and retry or provide safe alternative
    this.strategies.push({
      condition: (error) => error.type === CLIIntegrationErrorType.SECURITY_VIOLATION,
      action: async (request, error) => {
        return {
          success: false,
          fallbackUsed: true,
          fallbackType: 'SECURITY_BLOCK',
          message: 'Command blocked for security reasons',
          safeAlternatives: this.generateSafeAlternatives(request),
          securityInfo: {
            violation: error.message,
            allowedCommands: ['config', 'track', 'metric', 'health', 'analyze'],
            safetyTips: [
              'Use dry-run mode for testing',
              'Avoid restricted arguments',
              'Use only allowed commands'
            ]
          }
        };
      },
      description: 'Provide safe alternatives for security violations'
    });

    // Rate limit exceeded - suggest retry with delay
    this.strategies.push({
      condition: (error) => error.type === CLIIntegrationErrorType.RATE_LIMIT_EXCEEDED,
      action: async (request, error) => {
        return {
          success: false,
          fallbackUsed: true,
          fallbackType: 'RATE_LIMITED',
          message: 'Rate limit exceeded, please retry after a delay',
          retryAfter: 60, // seconds
          batchingSuggestions: [
            'Combine multiple operations into workflows',
            'Use dry-run mode for testing',
            'Space out command executions'
          ]
        };
      },
      description: 'Handle rate limit exceeded errors'
    });
  }

  private async executeMCPOnlyFallback(request: any): Promise<any> {
    // This would execute MCP-only functionality
    // For now, return a placeholder response
    return {
      type: 'mcp_analysis',
      message: 'Analysis completed using MCP capabilities',
      limitations: [
        'No CLI validation available',
        'Cannot execute actual commands',
        'Limited to static analysis'
      ]
    };
  }

  private generateCommandGuidance(request: any, error: CLIIntegrationError): any {
    const command = request.command || 'unknown';
    
    const guidance: Record<string, any> = {
      config: {
        purpose: 'Manage Nodash CLI configuration',
        commonIssues: [
          'Invalid token format',
          'Network connectivity issues',
          'Permission problems'
        ],
        manualSteps: [
          'Check token format: should be alphanumeric with hyphens/underscores',
          'Test connectivity: ping api.nodash.ai',
          'Verify file permissions in ~/.nodash/ directory'
        ]
      },
      health: {
        purpose: 'Check Nodash service connectivity',
        commonIssues: [
          'Network connectivity',
          'Invalid API token',
          'Service unavailable'
        ],
        manualSteps: [
          'Check internet connection',
          'Verify API token is set and valid',
          'Check service status at status.nodash.ai'
        ]
      },
      track: {
        purpose: 'Send analytics events',
        commonIssues: [
          'Invalid event format',
          'Authentication failure',
          'Network issues'
        ],
        manualSteps: [
          'Use dry-run mode first: --dry-run',
          'Verify event name format (snake_case)',
          'Check API token configuration'
        ]
      }
    };

    return guidance[command] || {
      purpose: 'Execute Nodash CLI command',
      commonIssues: ['Command syntax', 'Configuration', 'Permissions'],
      manualSteps: ['Check command help: nodash <command> --help']
    };
  }

  private generateSafeAlternatives(request: any): string[] {
    const alternatives = [];
    
    if (request.command === 'config') {
      alternatives.push('Use: nodash config list (to view current settings)');
      alternatives.push('Use: nodash config get <key> (to get specific values)');
    }
    
    if (request.command === 'track') {
      alternatives.push('Use: nodash track <event> --dry-run (to test safely)');
      alternatives.push('Use: nodash track <event> --properties \'{"key":"value"}\' (with proper JSON)');
    }
    
    alternatives.push('Review command documentation for safe usage patterns');
    alternatives.push('Use MCP-only tools for analysis without command execution');
    
    return alternatives;
  }
}

/**
 * Error Recovery Manager for CLI integration
 */
export class ErrorRecoveryManager {
  constructor(private fallbackManager: FallbackManager) {}

  async handleCLIError(
    error: unknown, 
    context: string, 
    originalRequest?: any
  ): Promise<any> {
    let cliError: CLIIntegrationError;

    // Convert various error types to CLIIntegrationError
    if (error instanceof CLIIntegrationError) {
      cliError = error;
    } else if (error instanceof Error) {
      cliError = this.classifyError(error, context);
    } else {
      cliError = new CLIIntegrationError(
        CLIIntegrationErrorType.COMMAND_FAILED,
        `Unknown error in ${context}: ${String(error)}`
      );
    }

    // Try fallback strategies
    if (originalRequest) {
      return await this.fallbackManager.handleError(cliError, originalRequest);
    }

    // Return error response
    return cliError.toMCPResponse();
  }

  private classifyError(error: Error, context: string): CLIIntegrationError {
    const message = error.message.toLowerCase();

    if (message.includes('command not found') || message.includes('enoent')) {
      return new CLIIntegrationError(
        CLIIntegrationErrorType.CLI_NOT_AVAILABLE,
        'Nodash CLI not found or not installed',
        undefined,
        ['Install CLI: npm install -g @nodash/cli']
      );
    }

    if (message.includes('permission denied') || message.includes('eacces')) {
      return new CLIIntegrationError(
        CLIIntegrationErrorType.PERMISSION_DENIED,
        'Permission denied executing CLI command',
        undefined,
        ['Check file permissions', 'Run with appropriate privileges']
      );
    }

    if (message.includes('timeout')) {
      return new CLIIntegrationError(
        CLIIntegrationErrorType.TIMEOUT,
        'CLI command timed out',
        undefined,
        ['Increase timeout value', 'Check network connectivity']
      );
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
      return new CLIIntegrationError(
        CLIIntegrationErrorType.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded',
        undefined,
        ['Wait before retrying', 'Reduce command frequency']
      );
    }

    // Default to command failed
    return new CLIIntegrationError(
      CLIIntegrationErrorType.COMMAND_FAILED,
      `CLI command failed in ${context}: ${error.message}`,
      undefined,
      ['Check command syntax', 'Verify configuration']
    );
  }
}

/**
 * Utility function to create error recovery system
 */
export function createErrorRecovery(): ErrorRecoveryManager {
  const fallbackManager = new FallbackManager();
  return new ErrorRecoveryManager(fallbackManager);
}