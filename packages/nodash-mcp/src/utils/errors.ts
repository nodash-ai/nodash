import { CodeExample } from '../services/sdk-demonstrator.js';

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