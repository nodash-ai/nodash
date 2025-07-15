import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { MonitoringService } from './monitoring-service.js';

export interface CLICommand {
  command: string;
  args: string[];
  options: {
    dryRun?: boolean;
    format?: 'json' | 'table';
    timeout?: number;
    workingDirectory?: string;
    verbose?: boolean;
  };
  requiresConfirmation?: boolean;
  description?: string;
}

export interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  executedCommand: string;
  duration: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class CLIExecutor {
  private cliPath: string;
  private defaultTimeout: number = 30000;
  private allowedCommands: Set<string> = new Set([
    'config', 'track', 'metric', 'health', 'analyze'
  ]);
  private restrictedArgs: Set<string> = new Set([
    '--force', '--no-confirm', '--delete', '--remove'
  ]);
  private monitoringService?: MonitoringService;

  constructor(cliPath?: string, monitoringService?: MonitoringService) {
    this.cliPath = cliPath || 'nodash';
    this.monitoringService = monitoringService;
  }

  async execute(command: CLICommand): Promise<CLIResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    // Log command start
    this.monitoringService?.logCommandStart(command, executionId);
    
    try {
      // Validate command before execution
      const validation = this.validateCommand(command);
      if (!validation.valid) {
        // Log security events for blocked commands
        this.monitoringService?.logSecurityEvent('blocked_command', {
          command: command.command,
          args: command.args,
          errors: validation.errors,
          executionId
        });

        const result = {
          success: false,
          output: '',
          error: `Command validation failed: ${validation.errors.join(', ')}`,
          exitCode: -1,
          executedCommand: this.buildCommandString(command),
          duration: Date.now() - startTime
        };

        this.monitoringService?.logCommandExecution(command, result, executionId);
        this.monitoringService?.logCommandEnd(executionId);
        return result;
      }

      // Log security events for sanitized inputs
      if (validation.warnings.length > 0) {
        this.monitoringService?.logSecurityEvent('sanitized_input', {
          command: command.command,
          warnings: validation.warnings,
          executionId
        });
      }

      // Log confirmation requirements
      if (command.requiresConfirmation) {
        this.monitoringService?.logSecurityEvent('confirmation_required', {
          command: command.command,
          description: command.description,
          executionId
        });
      }

      // Build command arguments
      const args = this.buildArgs(command);
      
      // Execute command
      const result = await this.executeProcess(this.cliPath, args, {
        timeout: command.options.timeout || this.defaultTimeout,
        cwd: command.options.workingDirectory || process.cwd()
      });
      
      const cliResult = {
        success: result.exitCode === 0,
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode,
        executedCommand: this.buildCommandString(command),
        duration: Date.now() - startTime
      };

      // Log command execution
      this.monitoringService?.logCommandExecution(command, cliResult, executionId);
      
      // Log performance events for slow executions
      if (cliResult.duration > 10000) { // 10 seconds
        this.monitoringService?.logPerformanceEvent('slow_execution', {
          command: command.command,
          duration: cliResult.duration,
          executionId
        });
      }

      this.monitoringService?.logCommandEnd(executionId);
      return cliResult;
      
    } catch (error) {
      const cliResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: -1,
        executedCommand: this.buildCommandString(command),
        duration: Date.now() - startTime
      };

      // Log command execution failure
      this.monitoringService?.logCommandExecution(command, cliResult, executionId);
      this.monitoringService?.logCommandEnd(executionId);
      
      return cliResult;
    }
  }

  async executeWithConfirmation(command: CLICommand): Promise<CLIResult> {
    // For MCP integration, we'll handle confirmation through the MCP protocol
    // This method adds extra validation for destructive operations
    if (this.isDestructiveCommand(command)) {
      const validation = this.validateDestructiveCommand(command);
      if (!validation.valid) {
        return {
          success: false,
          output: '',
          error: `Destructive command blocked: ${validation.errors.join(', ')}`,
          exitCode: -1,
          executedCommand: this.buildCommandString(command),
          duration: 0
        };
      }
    }
    
    return this.execute(command);
  }

  validateCommand(command: CLICommand): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if command is allowed
    if (!this.allowedCommands.has(command.command)) {
      errors.push(`Command '${command.command}' is not allowed`);
    }

    // Check for restricted arguments
    const restrictedFound = command.args.filter(arg => 
      this.restrictedArgs.has(arg) || this.restrictedArgs.has(arg.split('=')[0])
    );
    if (restrictedFound.length > 0) {
      errors.push(`Restricted arguments found: ${restrictedFound.join(', ')}`);
    }

    // Sanitize arguments
    const unsafeArgs = command.args.filter(arg => this.containsUnsafeCharacters(arg));
    if (unsafeArgs.length > 0) {
      errors.push(`Unsafe characters in arguments: ${unsafeArgs.join(', ')}`);
    }

    // Validate working directory
    if (command.options.workingDirectory) {
      if (!this.isValidPath(command.options.workingDirectory)) {
        errors.push('Invalid working directory path');
      }
    }

    // Add warnings for potentially risky operations
    if (command.command === 'config' && command.args[0] === 'set' && !command.options.dryRun) {
      warnings.push('Configuration changes will be applied immediately');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  parseOutput(output: string, format: 'json' | 'table' | 'auto' = 'auto'): any {
    if (!output.trim()) {
      return null;
    }

    // Try to parse as JSON first
    if (format === 'json' || (format === 'auto' && this.looksLikeJSON(output))) {
      try {
        return JSON.parse(output);
      } catch {
        // Fall through to text parsing
      }
    }

    // Parse table/text output
    return this.parseTextOutput(output);
  }

  private buildArgs(command: CLICommand): string[] {
    const args = [command.command, ...command.args];
    
    // Add global options
    if (command.options.format) {
      args.push('--format', command.options.format);
    }
    if (command.options.dryRun) {
      args.push('--dry-run');
    }
    if (command.options.verbose) {
      args.push('--verbose');
    }
    
    return args;
  }

  private buildCommandString(command: CLICommand): string {
    const args = this.buildArgs(command);
    return `${this.cliPath} ${args.join(' ')}`;
  }

  private async executeProcess(
    command: string, 
    args: string[], 
    options: { timeout: number; cwd: string }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      const child: ChildProcess = spawn(command, args, {
        cwd: options.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false // Security: don't use shell
      });

      // Set up timeout
      timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${options.timeout}ms`));
      }, options.timeout);

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      // Handle errors
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  private isDestructiveCommand(command: CLICommand): boolean {
    // Commands that modify state or configuration
    const destructiveCommands = new Set(['config']);
    const destructiveSubcommands = new Set(['set', 'delete', 'clear']);
    
    return destructiveCommands.has(command.command) && 
           command.args.length > 0 && 
           destructiveSubcommands.has(command.args[0]);
  }

  private validateDestructiveCommand(command: CLICommand): ValidationResult {
    const errors: string[] = [];
    
    // Require dry-run for destructive operations unless explicitly confirmed
    if (!command.options.dryRun && !command.requiresConfirmation) {
      errors.push('Destructive operations require dry-run mode or explicit confirmation');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private containsUnsafeCharacters(arg: string): boolean {
    // Check for shell injection characters
    const unsafeChars = /[;&|`$(){}[\]<>]/;
    return unsafeChars.test(arg);
  }

  private isValidPath(path: string): boolean {
    // Basic path validation - no traversal attempts
    return !path.includes('..') && 
           !path.startsWith('/') && 
           !path.includes('~') &&
           path.length < 256;
  }

  private looksLikeJSON(output: string): boolean {
    const trimmed = output.trim();
    return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
           (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }

  private parseTextOutput(output: string): any {
    const lines = output.split('\n').filter(line => line.trim());
    
    // Try to extract key-value pairs
    const result: Record<string, any> = {};
    let hasStructuredData = false;
    
    for (const line of lines) {
      // Look for key: value patterns
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        const value = match[2].trim();
        result[key] = value;
        hasStructuredData = true;
      }
    }
    
    return hasStructuredData ? result : { output: lines };
  }

  // Utility method to check if CLI is available
  async checkCLIAvailability(): Promise<boolean> {
    try {
      const result = await this.executeProcess(this.cliPath, ['--version'], {
        timeout: 5000,
        cwd: process.cwd()
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  // Get CLI version for compatibility checking
  async getCLIVersion(): Promise<string | null> {
    try {
      const result = await this.executeProcess(this.cliPath, ['--version'], {
        timeout: 5000,
        cwd: process.cwd()
      });
      if (result.exitCode === 0) {
        // Extract version from output
        const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : null;
      }
    } catch {
      // CLI not available
    }
    return null;
  }

  // Generate unique execution ID for tracking
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}