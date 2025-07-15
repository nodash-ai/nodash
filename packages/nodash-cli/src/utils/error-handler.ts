import chalk from 'chalk';
import { ConfigurationError, APIError, NetworkError, ValidationError } from '../services/sdk-manager.js';

export interface ErrorTemplate {
  message: string;
  solution: string;
  docs?: string;
  example?: string;
}

export const ERROR_MESSAGES: Record<string, ErrorTemplate> = {
  MISSING_TOKEN: {
    message: 'API token not configured',
    solution: 'Run: nodash config set token <your-api-token>',
    docs: 'https://docs.nodash.ai/cli/authentication'
  },
  INVALID_JSON: {
    message: 'Invalid JSON in properties',
    solution: 'Use valid JSON format: \'{"key": "value"}\'',
    example: 'nodash track signup --properties \'{"plan": "pro"}\''
  },
  NETWORK_ERROR: {
    message: 'Unable to connect to Nodash API',
    solution: 'Check your internet connection and baseUrl configuration',
    example: 'nodash health'
  },
  INVALID_METRIC_VALUE: {
    message: 'Metric value must be a number',
    solution: 'Provide a numeric value for the metric',
    example: 'nodash metric response_time 150 --unit ms'
  },
  INVALID_TAGS_FORMAT: {
    message: 'Invalid tags format',
    solution: 'Use format: key1=value1,key2=value2',
    example: 'nodash metric cpu_usage 75 --tags service=api,region=us-east'
  },
  UNAUTHORIZED: {
    message: 'Authentication failed',
    solution: 'Check your API token and ensure it\'s valid',
    docs: 'https://docs.nodash.ai/cli/authentication'
  },
  FORBIDDEN: {
    message: 'Access denied',
    solution: 'Your API token may not have the required permissions'
  },
  NOT_FOUND: {
    message: 'API endpoint not found',
    solution: 'Check your baseUrl configuration',
    example: 'nodash config get baseUrl'
  },
  RATE_LIMITED: {
    message: 'Rate limit exceeded',
    solution: 'Please wait and try again. Consider reducing request frequency'
  },
  SERVER_ERROR: {
    message: 'Nodash service is experiencing issues',
    solution: 'Try again in a few minutes. If the problem persists, contact support'
  }
};

export class CLIErrorHandler {
  static handle(error: Error, context: string): void {
    if (error instanceof ConfigurationError) {
      this.handleConfigError(error, context);
    } else if (error instanceof APIError) {
      this.handleAPIError(error, context);
    } else if (error instanceof NetworkError) {
      this.handleNetworkError(error, context);
    } else if (error instanceof ValidationError) {
      this.handleValidationError(error, context);
    } else {
      this.handleGenericError(error, context);
    }
  }

  private static handleConfigError(error: ConfigurationError, context: string): void {
    console.error(chalk.red('❌ Configuration Error:'));
    console.error(chalk.red(`   ${error.message}`));
    
    const template = ERROR_MESSAGES.MISSING_TOKEN;
    console.error(chalk.yellow(`💡 ${template.solution}`));
    console.error(chalk.yellow('💡 Or: nodash config list to see current configuration'));
    
    if (template.docs) {
      console.error(chalk.blue(`📖 Documentation: ${template.docs}`));
    }
  }

  private static handleAPIError(error: APIError, context: string): void {
    console.error(chalk.red(`❌ API Error in ${context}:`));
    console.error(chalk.red(`   ${error.message}`));
    
    let template: ErrorTemplate;
    
    switch (error.status) {
      case 401:
        template = ERROR_MESSAGES.UNAUTHORIZED;
        break;
      case 403:
        template = ERROR_MESSAGES.FORBIDDEN;
        break;
      case 404:
        template = ERROR_MESSAGES.NOT_FOUND;
        break;
      case 429:
        template = ERROR_MESSAGES.RATE_LIMITED;
        break;
      case 500:
      case 502:
      case 503:
        template = ERROR_MESSAGES.SERVER_ERROR;
        break;
      default:
        template = {
          message: `HTTP ${error.status} error`,
          solution: 'Check your request and try again'
        };
    }
    
    console.error(chalk.yellow(`💡 ${template.solution}`));
    
    if (template.example) {
      console.error(chalk.yellow(`💡 Try: ${template.example}`));
    }
    
    if (template.docs) {
      console.error(chalk.blue(`📖 Documentation: ${template.docs}`));
    }
  }

  private static handleNetworkError(error: NetworkError, context: string): void {
    console.error(chalk.red(`❌ Network Error in ${context}:`));
    console.error(chalk.red(`   ${error.message}`));
    
    const template = ERROR_MESSAGES.NETWORK_ERROR;
    console.error(chalk.yellow(`💡 ${template.solution}`));
    console.error(chalk.yellow(`💡 Test connectivity: ${template.example}`));
    console.error(chalk.yellow('💡 Or: nodash config list to verify baseUrl'));
  }

  private static handleValidationError(error: ValidationError, context: string): void {
    console.error(chalk.red(`❌ Validation Error in ${context}:`));
    console.error(chalk.red(`   ${error.message}`));
    
    // Provide context-specific guidance
    if (context === 'track') {
      const template = ERROR_MESSAGES.INVALID_JSON;
      console.error(chalk.yellow(`💡 ${template.solution}`));
      console.error(chalk.yellow(`💡 Example: ${template.example}`));
    } else if (context === 'metric') {
      if (error.message.includes('number')) {
        const template = ERROR_MESSAGES.INVALID_METRIC_VALUE;
        console.error(chalk.yellow(`💡 ${template.solution}`));
        console.error(chalk.yellow(`💡 Example: ${template.example}`));
      } else if (error.message.includes('tags')) {
        const template = ERROR_MESSAGES.INVALID_TAGS_FORMAT;
        console.error(chalk.yellow(`💡 ${template.solution}`));
        console.error(chalk.yellow(`💡 Example: ${template.example}`));
      }
    }
  }

  private static handleGenericError(error: Error, context: string): void {
    console.error(chalk.red(`❌ Unexpected Error in ${context}:`));
    console.error(chalk.red(`   ${error.message}`));
    
    console.error(chalk.yellow('💡 Troubleshooting steps:'));
    console.error(chalk.yellow('   1. Check your configuration: nodash config list'));
    console.error(chalk.yellow('   2. Test connectivity: nodash health'));
    console.error(chalk.yellow('   3. Try with --verbose for more details'));
    
    if (error.stack) {
      console.error(chalk.gray('\nStack trace:'));
      console.error(chalk.gray(error.stack));
    }
  }

  // Helper method for displaying troubleshooting guides
  static displayTroubleshootingGuide(context: string): void {
    console.log(chalk.bold.yellow('\n🔧 Troubleshooting Guide'));
    console.log(chalk.gray('─'.repeat(30)));
    
    switch (context) {
      case 'authentication':
        console.log(chalk.yellow('1. Verify your API token is correct'));
        console.log(chalk.yellow('2. Check token permissions and expiration'));
        console.log(chalk.yellow('3. Ensure baseUrl is correct'));
        console.log(chalk.yellow('4. Test with: nodash health'));
        break;
        
      case 'network':
        console.log(chalk.yellow('1. Check internet connection'));
        console.log(chalk.yellow('2. Verify firewall/proxy settings'));
        console.log(chalk.yellow('3. Check baseUrl configuration'));
        console.log(chalk.yellow('4. Try with default URL: nodash config set baseUrl https://api.nodash.ai'));
        break;
        
      case 'configuration':
        console.log(chalk.yellow('1. List current config: nodash config list'));
        console.log(chalk.yellow('2. Set API token: nodash config set token <token>'));
        console.log(chalk.yellow('3. Verify configuration is valid'));
        console.log(chalk.yellow('4. Test setup: nodash health'));
        break;
        
      default:
        console.log(chalk.yellow('1. Check configuration: nodash config list'));
        console.log(chalk.yellow('2. Test connectivity: nodash health'));
        console.log(chalk.yellow('3. Review command syntax and options'));
        console.log(chalk.yellow('4. Use --help for command-specific guidance'));
    }
  }

  // Helper method for displaying common solutions
  static displayCommonSolutions(): void {
    console.log(chalk.bold.blue('\n💡 Common Solutions'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(chalk.blue('• Set API token: nodash config set token <your-token>'));
    console.log(chalk.blue('• Check configuration: nodash config list'));
    console.log(chalk.blue('• Test connectivity: nodash health'));
    console.log(chalk.blue('• View help: nodash --help'));
    console.log(chalk.blue('• Get command help: nodash <command> --help'));
  }
}