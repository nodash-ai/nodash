import { CLICommand } from './cli-executor.js';

export interface UserIntent {
  action: 'configure' | 'track' | 'analyze' | 'monitor' | 'troubleshoot' | 'setup' | 'validate';
  target?: string;
  parameters?: Record<string, any>;
  safety?: 'safe' | 'destructive';
  confidence?: number;
}

export interface ProjectContext {
  framework?: string;
  hasConfig?: boolean;
  currentDirectory?: string;
  previousCommands?: CLICommand[];
  configurationState?: any;
}

export interface CommandTemplate {
  command: string;
  subcommand?: string;
  args: string[];
  options: Record<string, any>;
  description: string;
  requiresConfirmation?: boolean;
}

export class CommandTranslator {
  private patterns: Map<RegExp, CommandTemplate> = new Map();
  private intentKeywords: Map<string, UserIntent['action']> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeIntentKeywords();
  }

  translateRequest(request: string, context?: ProjectContext): CLICommand[] {
    const normalizedRequest = request.toLowerCase().trim();
    
    // First try pattern matching for specific requests
    for (const [pattern, template] of this.patterns) {
      const match = normalizedRequest.match(pattern);
      if (match) {
        return this.buildCommandsFromTemplate(template, match, context);
      }
    }
    
    // Fall back to intent analysis
    const intent = this.analyzeIntent(normalizedRequest, context);
    return this.suggestCommands(intent, context);
  }

  suggestCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    const commands: CLICommand[] = [];
    
    switch (intent.action) {
      case 'configure':
        commands.push(...this.getConfigurationCommands(intent, context));
        break;
      case 'track':
        commands.push(...this.getTrackingCommands(intent, context));
        break;
      case 'analyze':
        commands.push(...this.getAnalysisCommands(intent, context));
        break;
      case 'monitor':
        commands.push(...this.getMonitoringCommands(intent, context));
        break;
      case 'troubleshoot':
        commands.push(...this.getTroubleshootingCommands(intent, context));
        break;
      case 'setup':
        commands.push(...this.getSetupCommands(intent, context));
        break;
      case 'validate':
        commands.push(...this.getValidationCommands(intent, context));
        break;
    }
    
    return commands;
  }

  validateTranslation(commands: CLICommand[]): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (commands.length === 0) {
      errors.push('No commands generated from request');
      return { valid: false, errors, warnings };
    }
    
    // Check for potentially dangerous command sequences
    const destructiveCommands = commands.filter(cmd => 
      cmd.requiresConfirmation || this.isDestructiveCommand(cmd)
    );
    
    if (destructiveCommands.length > 0) {
      warnings.push(`${destructiveCommands.length} commands require confirmation`);
    }
    
    // Check for conflicting commands
    const configCommands = commands.filter(cmd => cmd.command === 'config');
    if (configCommands.length > 1) {
      warnings.push('Multiple configuration commands detected');
    }
    
    return { valid: errors.length === 0, errors, warnings };
  }

  private initializePatterns(): void {
    // Configuration patterns
    this.patterns.set(
      /set.*token.*?([a-zA-Z0-9\-_]+)/,
      {
        command: 'config',
        subcommand: 'set',
        args: ['token', '$1'],
        options: {},
        description: 'Set API token',
        requiresConfirmation: true
      }
    );

    this.patterns.set(
      /set.*base.*?url.*?(https?:\/\/[^\s]+)/,
      {
        command: 'config',
        subcommand: 'set',
        args: ['baseUrl', '$1'],
        options: {},
        description: 'Set base URL',
        requiresConfirmation: true
      }
    );

    this.patterns.set(
      /(check|show|list).*config/,
      {
        command: 'config',
        subcommand: 'list',
        args: [],
        options: { format: 'json' },
        description: 'List configuration'
      }
    );

    // Tracking patterns
    this.patterns.set(
      /track.*event.*?([a-zA-Z_][a-zA-Z0-9_]*)/,
      {
        command: 'track',
        args: ['$1'],
        options: { dryRun: true },
        description: 'Track event (dry run)'
      }
    );

    this.patterns.set(
      /test.*track/,
      {
        command: 'track',
        args: ['test_event'],
        options: { dryRun: true },
        description: 'Test event tracking'
      }
    );

    // Health and monitoring patterns
    this.patterns.set(
      /(check|test).*health|connectivity/,
      {
        command: 'health',
        args: [],
        options: { format: 'json' },
        description: 'Check service health'
      }
    );

    this.patterns.set(
      /send.*metric.*?([a-zA-Z_][a-zA-Z0-9_]*)\s+(\d+)/,
      {
        command: 'metric',
        args: ['$1', '$2'],
        options: { dryRun: true },
        description: 'Send metric (dry run)'
      }
    );

    // Analysis patterns
    this.patterns.set(
      /analyz.*project/,
      {
        command: 'analyze',
        args: ['.'],
        options: { format: 'json' },
        description: 'Analyze current project'
      }
    );

    this.patterns.set(
      /generate.*setup/,
      {
        command: 'analyze',
        args: ['.'],
        options: {},
        description: 'Generate setup files'
      }
    );
  }

  private initializeIntentKeywords(): void {
    this.intentKeywords.set('configure', 'configure');
    this.intentKeywords.set('config', 'configure');
    this.intentKeywords.set('setup', 'setup');
    this.intentKeywords.set('install', 'setup');
    this.intentKeywords.set('initialize', 'setup');
    
    this.intentKeywords.set('track', 'track');
    this.intentKeywords.set('event', 'track');
    this.intentKeywords.set('send', 'track');
    
    this.intentKeywords.set('analyze', 'analyze');
    this.intentKeywords.set('analysis', 'analyze');
    this.intentKeywords.set('examine', 'analyze');
    this.intentKeywords.set('inspect', 'analyze');
    
    this.intentKeywords.set('monitor', 'monitor');
    this.intentKeywords.set('health', 'monitor');
    this.intentKeywords.set('status', 'monitor');
    this.intentKeywords.set('metric', 'monitor');
    
    this.intentKeywords.set('troubleshoot', 'troubleshoot');
    this.intentKeywords.set('debug', 'troubleshoot');
    this.intentKeywords.set('fix', 'troubleshoot');
    this.intentKeywords.set('problem', 'troubleshoot');
    
    this.intentKeywords.set('validate', 'validate');
    this.intentKeywords.set('verify', 'validate');
    this.intentKeywords.set('check', 'validate');
    this.intentKeywords.set('test', 'validate');
  }

  private analyzeIntent(request: string, context?: ProjectContext): UserIntent {
    const words = request.split(/\s+/);
    const actionScores = new Map<UserIntent['action'], number>();
    
    // Score based on keyword matches
    for (const word of words) {
      const action = this.intentKeywords.get(word);
      if (action) {
        actionScores.set(action, (actionScores.get(action) || 0) + 1);
      }
    }
    
    // Find highest scoring action
    let bestAction: UserIntent['action'] = 'analyze'; // default
    let bestScore = 0;
    
    for (const [action, score] of actionScores) {
      if (score > bestScore) {
        bestAction = action;
        bestScore = score;
      }
    }
    
    // Extract parameters
    const parameters: Record<string, any> = {};
    
    // Look for event names
    const eventMatch = request.match(/event\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (eventMatch) {
      parameters.eventName = eventMatch[1];
    }
    
    // Look for metric names and values
    const metricMatch = request.match(/metric\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+(\d+)/);
    if (metricMatch) {
      parameters.metricName = metricMatch[1];
      parameters.metricValue = parseInt(metricMatch[2]);
    }
    
    // Look for tokens
    const tokenMatch = request.match(/token\s+([a-zA-Z0-9\-_]+)/);
    if (tokenMatch) {
      parameters.token = tokenMatch[1];
    }
    
    // Determine safety level
    const safety = this.determineSafety(request, bestAction);
    
    return {
      action: bestAction,
      parameters,
      safety,
      confidence: bestScore > 0 ? Math.min(bestScore / words.length, 1) : 0.5
    };
  }

  private buildCommandsFromTemplate(
    template: CommandTemplate, 
    match: RegExpMatchArray, 
    context?: ProjectContext
  ): CLICommand[] {
    const command: CLICommand = {
      command: template.command,
      args: template.args.map(arg => {
        // Replace placeholders like $1, $2 with regex match groups
        return arg.replace(/\$(\d+)/g, (_, index) => match[parseInt(index)] || '');
      }),
      options: { ...template.options },
      requiresConfirmation: template.requiresConfirmation,
      description: template.description
    };
    
    // Add subcommand if present
    if (template.subcommand) {
      command.args.unshift(template.subcommand);
    }
    
    return [command];
  }

  private getConfigurationCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    const commands: CLICommand[] = [];
    
    if (intent.parameters?.token) {
      commands.push({
        command: 'config',
        args: ['set', 'token', intent.parameters.token],
        options: {},
        requiresConfirmation: true,
        description: 'Set API token'
      });
    } else {
      // Show current configuration
      commands.push({
        command: 'config',
        args: ['list'],
        options: { format: 'json' },
        description: 'Show current configuration'
      });
    }
    
    return commands;
  }

  private getTrackingCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    const eventName = intent.parameters?.eventName || 'test_event';
    
    return [{
      command: 'track',
      args: [eventName],
      options: { dryRun: true, format: 'json' },
      description: `Track ${eventName} event (dry run)`
    }];
  }

  private getAnalysisCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    return [{
      command: 'analyze',
      args: ['.'],
      options: { format: 'json', verbose: true },
      description: 'Analyze current project'
    }];
  }

  private getMonitoringCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    const commands: CLICommand[] = [];
    
    // Always start with health check
    commands.push({
      command: 'health',
      args: [],
      options: { format: 'json' },
      description: 'Check service health'
    });
    
    // Add metric command if specified
    if (intent.parameters?.metricName && intent.parameters?.metricValue) {
      commands.push({
        command: 'metric',
        args: [intent.parameters.metricName, intent.parameters.metricValue.toString()],
        options: { dryRun: true, format: 'json' },
        description: `Send ${intent.parameters.metricName} metric (dry run)`
      });
    }
    
    return commands;
  }

  private getTroubleshootingCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    return [
      {
        command: 'config',
        args: ['list'],
        options: { format: 'json' },
        description: 'Check configuration'
      },
      {
        command: 'health',
        args: [],
        options: { format: 'json', verbose: true },
        description: 'Check service health'
      }
    ];
  }

  private getSetupCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    const commands: CLICommand[] = [];
    
    // First analyze the project
    commands.push({
      command: 'analyze',
      args: ['.'],
      options: { format: 'json' },
      description: 'Analyze project structure'
    });
    
    // Generate setup files if requested
    commands.push({
      command: 'analyze',
      args: ['.'],
      options: {},
      description: 'Generate setup files'
    });
    
    return commands;
  }

  private getValidationCommands(intent: UserIntent, context?: ProjectContext): CLICommand[] {
    return [
      {
        command: 'config',
        args: ['list'],
        options: { format: 'json' },
        description: 'Validate configuration'
      },
      {
        command: 'health',
        args: [],
        options: { format: 'json' },
        description: 'Validate connectivity'
      },
      {
        command: 'track',
        args: ['validation_test'],
        options: { dryRun: true, format: 'json' },
        description: 'Test event tracking'
      }
    ];
  }

  private determineSafety(request: string, action: UserIntent['action']): 'safe' | 'destructive' {
    const destructiveKeywords = ['set', 'change', 'update', 'delete', 'remove', 'clear'];
    const safeKeywords = ['show', 'list', 'check', 'test', 'dry-run', 'analyze'];
    
    const hasDestructive = destructiveKeywords.some(keyword => 
      request.toLowerCase().includes(keyword)
    );
    const hasSafe = safeKeywords.some(keyword => 
      request.toLowerCase().includes(keyword)
    );
    
    if (hasDestructive && !hasSafe) {
      return 'destructive';
    }
    
    // Configuration changes are always considered destructive
    if (action === 'configure' && request.includes('set')) {
      return 'destructive';
    }
    
    return 'safe';
  }

  private isDestructiveCommand(command: CLICommand): boolean {
    return command.command === 'config' && 
           command.args.length > 0 && 
           command.args[0] === 'set';
  }
}