import { CommandTranslator, UserIntent, ProjectContext } from '../services/command-translator';

describe('CommandTranslator', () => {
  let translator: CommandTranslator;

  beforeEach(() => {
    translator = new CommandTranslator();
  });

  describe('translateRequest', () => {
    it('should translate configuration requests', () => {
      const request = 'set token abc123';
      const commands = translator.translateRequest(request);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('config');
      expect(commands[0].args).toContain('set');
      expect(commands[0].args).toContain('token');
      expect(commands[0].args).toContain('abc123');
    });

    it('should translate tracking requests', () => {
      const request = 'track event user_login';
      const commands = translator.translateRequest(request);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('track');
      expect(commands[0].args).toContain('user_login');
      expect(commands[0].options?.dryRun).toBe(true);
    });

    it('should translate health check requests', () => {
      const request = 'check health';
      const commands = translator.translateRequest(request);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('health');
      expect(commands[0].options?.format).toBe('json');
    });

    it('should translate project analysis requests', () => {
      const request = 'analyze project';
      const commands = translator.translateRequest(request);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('analyze');
      expect(commands[0].options?.format).toBe('json');
    });

    it('should handle complex requests with context', () => {
      const request = 'analyze my react project';
      const context: ProjectContext = {
        framework: 'react',
        currentDirectory: '/path/to/project'
      };

      const commands = translator.translateRequest(request, context);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('analyze');
      expect(commands[0].description).toContain('react');
    });
  });

  describe('suggestCommands', () => {
    it('should suggest configuration commands', () => {
      const intent: UserIntent = {
        action: 'configure',
        parameters: { token: 'test-token' }
      };

      const commands = translator.suggestCommands(intent);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('config');
      expect(commands[0].args).toContain('set');
      expect(commands[0].args).toContain('token');
      expect(commands[0].requiresConfirmation).toBe(true);
    });

    it('should suggest tracking commands', () => {
      const intent: UserIntent = {
        action: 'track',
        target: 'user_action',
        parameters: { userId: '123' }
      };

      const commands = translator.suggestCommands(intent);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('track');
      expect(commands[0].args).toContain('user_action');
      expect(commands[0].options?.dryRun).toBe(true);
    });

    it('should suggest troubleshooting commands', () => {
      const intent: UserIntent = {
        action: 'troubleshoot'
      };

      const commands = translator.suggestCommands(intent);

      expect(commands.length).toBeGreaterThan(1);
      expect(commands.some(cmd => cmd.command === 'health')).toBe(true);
      expect(commands.some(cmd => cmd.command === 'config')).toBe(true);
    });
  });

  describe('validateTranslation', () => {
    it('should validate correct command structure', () => {
      const commands = [{
        command: 'config',
        args: ['list'],
        options: { format: 'json' }
      }];

      const validation = translator.validateTranslation(commands);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid command structure', () => {
      const commands = [{
        command: '',
        args: 'invalid' as any,
        options: {}
      }];

      const validation = translator.validateTranslation(commands);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});