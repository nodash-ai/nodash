import { SecurityManager } from '../services/security-policy';
import { CLICommand } from '../services/cli-executor';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;

  beforeEach(() => {
    securityManager = new SecurityManager();
  });

  describe('validateCommand', () => {
    it('should allow valid commands', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['list'],
        options: {}
      };

      const validation = securityManager.validateCommand(command);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject disallowed commands', () => {
      const command: CLICommand = {
        command: 'rm',
        args: ['-rf', '/'],
        options: {}
      };

      const validation = securityManager.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Command not allowed: rm');
    });

    it('should reject restricted arguments', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['set', '--force'],
        options: {}
      };

      const validation = securityManager.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Restricted argument: --force');
    });

    it('should sanitize dangerous input', () => {
      const command: CLICommand = {
        command: 'config; rm -rf /',
        args: ['list'],
        options: {}
      };

      const validation = securityManager.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid command: config; rm -rf /');
    });

    it('should sanitize dangerous arguments', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['list; rm -rf /'],
        options: {}
      };

      const validation = securityManager.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid argument: list; rm -rf /');
    });
  });

  describe('requiresConfirmation', () => {
    it('should require confirmation for non-dry-run commands', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['set', 'token', 'abc123'],
        options: {}
      };

      const requiresConfirmation = securityManager.requiresConfirmation(command);

      expect(requiresConfirmation).toBe(true);
    });

    it('should not require confirmation for dry-run commands', () => {
      const command: CLICommand = {
        command: 'track',
        args: ['test_event'],
        options: { dryRun: true }
      };

      const requiresConfirmation = securityManager.requiresConfirmation(command);

      expect(requiresConfirmation).toBe(false);
    });

    it('should require confirmation for config set commands even with dry-run', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['set', 'token', 'abc123'],
        options: { dryRun: true }
      };

      const requiresConfirmation = securityManager.requiresConfirmation(command);

      expect(requiresConfirmation).toBe(true);
    });
  });

  describe('token management', () => {
    it('should mask tokens properly', () => {
      const token = 'abcd1234567890efgh';
      const masked = securityManager.maskToken(token);

      expect(masked).toBe('abcd...efgh');
      expect(masked).not.toContain('1234567890');
    });

    it('should handle short tokens', () => {
      const token = 'short';
      const masked = securityManager.maskToken(token);

      expect(masked).toBe('***');
    });

    it('should handle empty tokens', () => {
      const token = '';
      const masked = securityManager.maskToken(token);

      expect(masked).toBe('***');
    });
  });

  describe('custom security policy', () => {
    it('should accept custom allowed commands', () => {
      const customManager = new SecurityManager({
        allowedCommands: ['custom-command']
      });

      const command: CLICommand = {
        command: 'custom-command',
        args: [],
        options: {}
      };

      const validation = customManager.validateCommand(command);

      expect(validation.valid).toBe(true);
    });

    it('should accept custom restricted args', () => {
      const customManager = new SecurityManager({
        restrictedArgs: ['--dangerous']
      });

      const command: CLICommand = {
        command: 'config',
        args: ['--dangerous'],
        options: {}
      };

      const validation = customManager.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Restricted argument: --dangerous');
    });
  });
});