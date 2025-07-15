import { CLIExecutor, CLICommand } from '../services/cli-executor';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('CLIExecutor', () => {
  let cliExecutor: CLIExecutor;
  let mockChildProcess: any;

  beforeEach(() => {
    cliExecutor = new CLIExecutor();
    mockChildProcess = new EventEmitter();
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    mockChildProcess.kill = jest.fn();
    mockSpawn.mockReturnValue(mockChildProcess as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute a valid command successfully', async () => {
      const command: CLICommand = {
        command: 'config',
        args: ['list'],
        options: { format: 'json' }
      };

      const executePromise = cliExecutor.execute(command);

      // Simulate successful execution
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', '{"token": "test-token"}');
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await executePromise;

      expect(result.success).toBe(true);
      expect(result.output).toBe('{"token": "test-token"}');
      expect(result.exitCode).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        ['config', 'list', '--format', 'json'],
        expect.any(Object)
      );
    });

    it('should handle command execution failure', async () => {
      const command: CLICommand = {
        command: 'config',
        args: ['invalid'],
        options: { format: 'json' }
      };

      const executePromise = cliExecutor.execute(command);

      // Simulate failed execution
      setTimeout(() => {
        mockChildProcess.stderr.emit('data', 'Invalid command');
        mockChildProcess.emit('close', 1);
      }, 10);

      const result = await executePromise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid command');
      expect(result.exitCode).toBe(1);
    });

    it('should handle command timeout', async () => {
      const command: CLICommand = {
        command: 'health',
        args: [],
        options: { timeout: 100 }
      };

      const executePromise = cliExecutor.execute(command);

      // Don't emit close event to simulate timeout
      const result = await executePromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(mockChildProcess.kill).toHaveBeenCalled();
    });

    it('should validate commands and reject invalid ones', async () => {
      const command: CLICommand = {
        command: 'rm', // Not allowed
        args: ['-rf', '/'],
        options: {}
      };

      const result = await cliExecutor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Command validation failed');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should sanitize dangerous input', async () => {
      const command: CLICommand = {
        command: 'config; rm -rf /',
        args: ['list'],
        options: {}
      };

      const result = await cliExecutor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid command');
    });
  });

  describe('validateCommand', () => {
    it('should validate allowed commands', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['list'],
        options: {}
      };

      const validation = cliExecutor.validateCommand(command);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject disallowed commands', () => {
      const command: CLICommand = {
        command: 'rm',
        args: ['-rf', '/'],
        options: {}
      };

      const validation = cliExecutor.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Command not allowed: rm');
    });

    it('should warn about dangerous options', () => {
      const command: CLICommand = {
        command: 'config',
        args: ['set', '--force'],
        options: {}
      };

      const validation = cliExecutor.validateCommand(command);

      expect(validation.warnings).toContain('Potentially destructive option: --force');
    });
  });
});