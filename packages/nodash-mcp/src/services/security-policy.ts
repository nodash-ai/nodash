import { CLICommand } from './cli-executor.js';

export interface SecurityViolation {
  type: 'COMMAND_NOT_ALLOWED' | 'ARGUMENT_RESTRICTED' | 'INPUT_SANITIZATION' | 'CONFIRMATION_REQUIRED';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommandValidation {
  valid: boolean;
  violations: SecurityViolation[];
  sanitizedCommand?: CLICommand;
  requiresConfirmation: boolean;
}

export interface SecurityPolicy {
  allowedCommands: string[];
  restrictedArgs: string[];
  requireConfirmation: (command: CLICommand) => boolean;
  sanitizeInput: (input: string) => string;
  validateToken: (token: string) => boolean;
}

export class SecurityManager {
  private policy: SecurityPolicy;

  constructor(policy?: Partial<SecurityPolicy>) {
    this.policy = {
      allowedCommands: ['config', 'track', 'metric', 'health', 'analyze'],
      restrictedArgs: ['--force', '--no-confirm', '-f', '--delete', '--remove'],
      requireConfirmation: (command) => {
        return !command.options?.dryRun || 
               (command.command === 'config' && command.args[0] === 'set');
      },
      sanitizeInput: (input) => {
        // Remove potentially dangerous characters
        return input.replace(/[;&|`$()]/g, '');
      },
      validateToken: (token) => {
        return token && token.length >= 10 && /^[a-zA-Z0-9_-]+$/.test(token);
      },
      ...policy
    };
  }

  async validateAndPrepareCommand(command: CLICommand): Promise<CommandValidation> {
    const violations: SecurityViolation[] = [];

    // Check if command is allowed
    if (!this.policy.allowedCommands.includes(command.command)) {
      violations.push({
        type: 'COMMAND_NOT_ALLOWED',
        message: `Command not allowed: ${command.command}`,
        severity: 'high'
      });
    }

    // Check for restricted arguments
    for (const arg of command.args) {
      if (this.policy.restrictedArgs.includes(arg)) {
        violations.push({
          type: 'ARGUMENT_RESTRICTED',
          message: `Restricted argument: ${arg}`,
          severity: 'medium'
        });
      }
    }

    // Sanitize command and arguments
    const sanitizedCommand = this.sanitizeCommand(command);
    if (JSON.stringify(sanitizedCommand) !== JSON.stringify(command)) {
      violations.push({
        type: 'INPUT_SANITIZATION',
        message: 'Input was sanitized for security',
        severity: 'low'
      });
    }

    // Check if confirmation is required
    const requiresConfirmation = this.policy.requireConfirmation(command);
    if (requiresConfirmation) {
      violations.push({
        type: 'CONFIRMATION_REQUIRED',
        message: 'Command requires explicit confirmation',
        severity: 'low'
      });
    }

    return {
      valid: violations.filter(v => v.severity === 'high' || v.severity === 'critical').length === 0,
      violations,
      sanitizedCommand,
      requiresConfirmation
    };
  }

  async handleTokenInCommand(command: CLICommand): Promise<CLICommand> {
    // If this is a token set command, validate the token
    if (command.command === 'config' && command.args[0] === 'set' && command.args[1] === 'token') {
      const token = command.args[2];
      if (!this.policy.validateToken(token)) {
        throw new Error('Invalid token format. Token must be at least 10 characters and contain only alphanumeric characters, underscores, and hyphens.');
      }
    }

    return command;
  }

  private sanitizeCommand(command: CLICommand): CLICommand {
    return {
      ...command,
      command: this.policy.sanitizeInput(command.command),
      args: command.args.map(arg => this.policy.sanitizeInput(arg))
    };
  }

  maskToken(token: string): string {
    if (!token) return '***';
    if (token.length <= 8) return '***';
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }
}

export function createDefaultSecurity(): { securityManager: SecurityManager } {
  const securityManager = new SecurityManager();
  return { securityManager };
}