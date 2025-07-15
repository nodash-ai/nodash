import { CLIResult } from './cli-executor.js';

export interface ConfigurationState {
  isValid: boolean;
  settings: Record<string, string>;
  issues: string[];
  recommendations: string[];
  hasToken: boolean;
  hasBaseUrl: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  issues: string[];
  suggestions: string[];
  connectivity: boolean;
  authentication: boolean;
}

export interface TrackingResult {
  eventSent: boolean;
  eventName: string;
  properties: Record<string, any>;
  dryRun: boolean;
  error?: string;
  timestamp?: string;
}

export interface MetricResult {
  metricSent: boolean;
  metricName: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  dryRun: boolean;
  error?: string;
  timestamp?: string;
}

export interface ProjectAnalysis {
  language: string;
  framework?: string;
  packageManager?: string;
  hasAnalyticsSDK: boolean;
  analyticsLibraries: string[];
  recommendations: string[];
  setupStatus: {
    hasSDK: boolean;
    hasConfig: boolean;
    issues: string[];
  };
}

export interface ErrorAnalysis {
  errorType: 'configuration' | 'network' | 'authentication' | 'validation' | 'unknown';
  message: string;
  suggestions: string[];
  troubleshootingSteps: string[];
  relatedCommands: string[];
}

export class OutputParser {
  parseConfigOutput(result: CLIResult): ConfigurationState {
    if (!result.success) {
      return this.parseConfigError(result);
    }

    try {
      // Try to parse JSON output first
      const jsonData = JSON.parse(result.output);
      return this.parseConfigJSON(jsonData);
    } catch {
      // Fall back to text parsing
      return this.parseConfigText(result.output);
    }
  }

  parseAnalysisOutput(result: CLIResult): ProjectAnalysis {
    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error}`);
    }

    try {
      const jsonData = JSON.parse(result.output);
      return this.parseAnalysisJSON(jsonData);
    } catch {
      return this.parseAnalysisText(result.output);
    }
  }

  parseHealthOutput(result: CLIResult): HealthStatus {
    if (!result.success) {
      return this.parseHealthError(result);
    }

    try {
      const jsonData = JSON.parse(result.output);
      return this.parseHealthJSON(jsonData);
    } catch {
      return this.parseHealthText(result.output);
    }
  }

  parseTrackingOutput(result: CLIResult): TrackingResult {
    const isDryRun = result.executedCommand.includes('--dry-run');
    
    if (!result.success) {
      return {
        eventSent: false,
        eventName: this.extractEventName(result.executedCommand),
        properties: {},
        dryRun: isDryRun,
        error: result.error
      };
    }

    try {
      const jsonData = JSON.parse(result.output);
      return this.parseTrackingJSON(jsonData, isDryRun);
    } catch {
      return this.parseTrackingText(result.output, isDryRun);
    }
  }

  parseMetricOutput(result: CLIResult): MetricResult {
    const isDryRun = result.executedCommand.includes('--dry-run') || result.output.includes('Dry Run Mode');
    
    if (!result.success) {
      return {
        metricSent: false,
        metricName: this.extractMetricName(result.executedCommand),
        value: 0,
        dryRun: isDryRun,
        error: result.error
      };
    }

    try {
      const jsonData = JSON.parse(result.output);
      return this.parseMetricJSON(jsonData, isDryRun);
    } catch {
      return this.parseMetricText(result.output, isDryRun);
    }
  }

  parseErrorOutput(result: CLIResult): ErrorAnalysis {
    const error = result.error || result.output;
    const errorType = this.classifyError(error);
    
    return {
      errorType,
      message: error,
      suggestions: this.generateSuggestions(errorType, error),
      troubleshootingSteps: this.generateTroubleshootingSteps(errorType),
      relatedCommands: this.getRelatedCommands(errorType)
    };
  }

  private parseConfigJSON(data: any): ConfigurationState {
    const settings: Record<string, string> = {};
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Extract settings
    if (data.token) settings.token = this.maskToken(data.token);
    if (data.baseUrl) settings.baseUrl = data.baseUrl;
    if (data.timeout) settings.timeout = data.timeout.toString();
    if (data.retries) settings.retries = data.retries.toString();
    
    // Check for issues
    const hasToken = !!data.token;
    const hasBaseUrl = !!data.baseUrl;
    
    if (!hasToken) {
      issues.push('API token not configured');
      recommendations.push('Set API token: nodash config set token <your-token>');
    }
    
    if (!hasBaseUrl) {
      recommendations.push('Consider setting custom base URL if needed');
    }
    
    return {
      isValid: issues.length === 0,
      settings,
      issues,
      recommendations,
      hasToken,
      hasBaseUrl
    };
  }

  private parseConfigText(output: string): ConfigurationState {
    const settings: Record<string, string> = {};
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const lines = output.split('\n');
    let hasToken = false;
    let hasBaseUrl = false;
    
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase();
        const value = match[2].trim();
        
        if (key === 'token') {
          settings.token = value;
          hasToken = value !== 'Not set' && value !== '';
        } else if (key.includes('url')) {
          settings.baseUrl = value;
          hasBaseUrl = value !== 'Not set' && value !== '';
        } else {
          settings[key] = value;
        }
      }
      
      // Look for error messages
      if (line.includes('❌') || line.includes('Error')) {
        issues.push(line.replace(/[❌✅⚠️]/g, '').trim());
      }
      
      // Look for recommendations
      if (line.includes('💡')) {
        recommendations.push(line.replace(/💡/g, '').trim());
      }
    }
    
    return {
      isValid: issues.length === 0,
      settings,
      issues,
      recommendations,
      hasToken,
      hasBaseUrl
    };
  }

  private parseConfigError(result: CLIResult): ConfigurationState {
    return {
      isValid: false,
      settings: {},
      issues: [result.error || 'Configuration command failed'],
      recommendations: ['Check CLI installation and try again'],
      hasToken: false,
      hasBaseUrl: false
    };
  }

  private parseHealthJSON(data: any): HealthStatus {
    return {
      status: data.status || 'unknown',
      responseTime: data.responseTime,
      issues: data.issues || [],
      suggestions: data.suggestions || [],
      connectivity: data.status === 'healthy',
      authentication: data.status === 'healthy'
    };
  }

  private parseHealthText(output: string): HealthStatus {
    const lines = output.split('\n');
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'unhealthy';
    let responseTime: number | undefined;
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    for (const line of lines) {
      if (line.includes('✅') || line.includes('healthy')) {
        status = 'healthy';
      } else if (line.includes('⚠️') || line.includes('degraded')) {
        status = 'degraded';
      }
      
      // Extract response time
      const timeMatch = line.match(/(\d+)ms/);
      if (timeMatch) {
        responseTime = parseInt(timeMatch[1]);
      }
      
      // Extract issues
      if (line.includes('❌')) {
        issues.push(line.replace(/❌/g, '').trim());
      }
      
      // Extract suggestions
      if (line.includes('💡')) {
        suggestions.push(line.replace(/💡/g, '').trim());
      }
    }
    
    return {
      status,
      responseTime,
      issues,
      suggestions,
      connectivity: status !== 'unhealthy',
      authentication: status === 'healthy'
    };
  }

  private parseHealthError(result: CLIResult): HealthStatus {
    const errorAnalysis = this.parseErrorOutput(result);
    
    return {
      status: 'unhealthy',
      issues: [errorAnalysis.message],
      suggestions: errorAnalysis.suggestions,
      connectivity: false,
      authentication: errorAnalysis.errorType !== 'authentication'
    };
  }

  private parseAnalysisJSON(data: any): ProjectAnalysis {
    return {
      language: data.language || 'Unknown',
      framework: data.framework,
      packageManager: data.packageManager,
      hasAnalyticsSDK: data.hasAnalyticsSDK || false,
      analyticsLibraries: data.analyticsLibraries || [],
      recommendations: data.recommendations || [],
      setupStatus: {
        hasSDK: data.setupValidation?.hasSDK || false,
        hasConfig: data.setupValidation?.hasConfig || false,
        issues: data.setupValidation?.issues || []
      }
    };
  }

  private parseAnalysisText(output: string): ProjectAnalysis {
    const lines = output.split('\n');
    let language = 'Unknown';
    let framework: string | undefined;
    let packageManager: string | undefined;
    let hasAnalyticsSDK = false;
    const analyticsLibraries: string[] = [];
    const recommendations: string[] = [];
    
    for (const line of lines) {
      if (line.includes('Language:')) {
        language = line.split(':')[1]?.trim() || 'Unknown';
      } else if (line.includes('Framework:')) {
        framework = line.split(':')[1]?.trim();
      } else if (line.includes('Package Manager:')) {
        packageManager = line.split(':')[1]?.trim();
      } else if (line.includes('Analytics Libraries:')) {
        const libs = line.split(':')[1]?.trim();
        if (libs && libs !== 'None detected') {
          analyticsLibraries.push(...libs.split(',').map(lib => lib.trim()));
          hasAnalyticsSDK = true;
        }
      } else if (line.includes('💡')) {
        recommendations.push(line.replace(/💡/g, '').trim());
      }
    }
    
    return {
      language,
      framework,
      packageManager,
      hasAnalyticsSDK,
      analyticsLibraries,
      recommendations,
      setupStatus: {
        hasSDK: analyticsLibraries.includes('@nodash/sdk'),
        hasConfig: false, // Can't determine from text output
        issues: []
      }
    };
  }

  private parseTrackingJSON(data: any, isDryRun: boolean): TrackingResult {
    return {
      eventSent: !isDryRun && data.success,
      eventName: data.event || data.eventName || 'unknown',
      properties: data.properties || {},
      dryRun: isDryRun,
      timestamp: data.timestamp
    };
  }

  private parseTrackingText(output: string, isDryRun: boolean): TrackingResult {
    const lines = output.split('\n');
    let eventName = 'unknown';
    const properties: Record<string, any> = {};
    let timestamp: string | undefined;
    
    for (const line of lines) {
      if (line.includes('Event:')) {
        eventName = line.split(':')[1]?.trim() || 'unknown';
      } else if (line.includes('Timestamp:')) {
        timestamp = line.split(':')[1]?.trim();
      } else if (line.includes(':') && !line.includes('Event') && !line.includes('Timestamp')) {
        const [key, value] = line.split(':');
        if (key && value) {
          properties[key.trim()] = value.trim();
        }
      }
    }
    
    return {
      eventSent: !isDryRun && output.includes('✅'),
      eventName,
      properties,
      dryRun: isDryRun,
      timestamp
    };
  }

  private parseMetricJSON(data: any, isDryRun: boolean): MetricResult {
    return {
      metricSent: !isDryRun && data.success,
      metricName: data.name || data.metricName || 'unknown',
      value: data.value || 0,
      unit: data.unit,
      tags: data.tags,
      dryRun: isDryRun,
      timestamp: data.timestamp
    };
  }

  private parseMetricText(output: string, isDryRun: boolean): MetricResult {
    const lines = output.split('\n');
    let metricName = 'unknown';
    let value = 0;
    let unit: string | undefined;
    let tags: Record<string, string> | undefined;
    let timestamp: string | undefined;
    
    for (const line of lines) {
      if (line.includes('Name:')) {
        metricName = line.split(':')[1]?.trim() || 'unknown';
      } else if (line.includes('Value:')) {
        value = parseFloat(line.split(':')[1]?.trim() || '0');
      } else if (line.includes('Unit:')) {
        unit = line.split(':')[1]?.trim();
      } else if (line.includes('Timestamp:')) {
        timestamp = line.split(':')[1]?.trim();
      }
    }
    
    return {
      metricSent: !isDryRun && output.includes('✅'),
      metricName,
      value,
      unit,
      tags,
      dryRun: isDryRun,
      timestamp
    };
  }

  private classifyError(error: string): ErrorAnalysis['errorType'] {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('token') || errorLower.includes('authentication')) {
      return 'authentication';
    } else if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('enotfound')) {
      return 'network';
    } else if (errorLower.includes('config') || errorLower.includes('not configured')) {
      return 'configuration';
    } else if (errorLower.includes('validation') || errorLower.includes('invalid')) {
      return 'validation';
    } else {
      return 'unknown';
    }
  }

  private generateSuggestions(errorType: ErrorAnalysis['errorType'], error: string): string[] {
    switch (errorType) {
      case 'authentication':
        return [
          'Check your API token configuration',
          'Verify token is valid and not expired',
          'Run: nodash config set token <your-token>'
        ];
      case 'network':
        return [
          'Check your internet connection',
          'Verify the base URL is correct',
          'Check firewall and proxy settings'
        ];
      case 'configuration':
        return [
          'Run: nodash config list to check current settings',
          'Set required configuration values',
          'Verify configuration file permissions'
        ];
      case 'validation':
        return [
          'Check command syntax and parameters',
          'Verify input data format',
          'Review command documentation'
        ];
      default:
        return [
          'Check the error message for specific details',
          'Try running the command with --verbose flag',
          'Verify CLI installation and version'
        ];
    }
  }

  private generateTroubleshootingSteps(errorType: ErrorAnalysis['errorType']): string[] {
    switch (errorType) {
      case 'authentication':
        return [
          'Verify API token: nodash config get token',
          'Test authentication: nodash health',
          'Check token permissions and expiration'
        ];
      case 'network':
        return [
          'Test connectivity: ping api.nodash.ai',
          'Check DNS resolution',
          'Verify proxy settings if applicable'
        ];
      case 'configuration':
        return [
          'List current config: nodash config list',
          'Check config file: ~/.nodash/config.json',
          'Verify file permissions'
        ];
      default:
        return [
          'Check CLI version: nodash --version',
          'Verify installation: which nodash',
          'Review command help: nodash <command> --help'
        ];
    }
  }

  private getRelatedCommands(errorType: ErrorAnalysis['errorType']): string[] {
    switch (errorType) {
      case 'authentication':
        return ['nodash config set token', 'nodash health'];
      case 'network':
        return ['nodash health', 'nodash config get baseUrl'];
      case 'configuration':
        return ['nodash config list', 'nodash config set'];
      default:
        return ['nodash --help', 'nodash health'];
    }
  }

  private extractEventName(command: string): string {
    const match = command.match(/track\s+([^\s]+)/);
    return match ? match[1] : 'unknown';
  }

  private extractMetricName(command: string): string {
    const match = command.match(/metric\s+([^\s]+)/);
    return match ? match[1] : 'unknown';
  }

  private maskToken(token: string): string {
    if (token.length <= 8) return '***';
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }
}