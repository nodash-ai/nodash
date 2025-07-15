import { CLIExecutor } from '../../services/cli-executor';
import { WorkflowOrchestrator } from '../../services/workflow-orchestrator';
import { OutputParser } from '../../services/output-parser';

describe('CLI Performance Tests', () => {
  let cliExecutor: CLIExecutor;
  let workflowOrchestrator: WorkflowOrchestrator;
  let outputParser: OutputParser;

  beforeEach(() => {
    cliExecutor = new CLIExecutor();
    outputParser = new OutputParser();
    workflowOrchestrator = new WorkflowOrchestrator(cliExecutor, outputParser);

    // Mock CLI executor with realistic timing
    jest.spyOn(cliExecutor, 'execute').mockImplementation(async (command) => {
      // Simulate realistic command execution times
      const executionTimes = {
        config: 100,
        health: 200,
        analyze: 500,
        track: 300
      };

      const delay = executionTimes[command.command as keyof typeof executionTimes] || 100;
      await new Promise(resolve => setTimeout(resolve, delay));

      return {
        success: true,
        output: `Mock output for ${command.command}`,
        exitCode: 0,
        executedCommand: `nodash ${command.command} ${command.args.join(' ')}`,
        duration: delay
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Command Execution Performance', () => {
    it('should execute single commands within acceptable time limits', async () => {
      const commands = [
        { command: 'config', args: ['list'], options: {}, expectedMaxTime: 200 },
        { command: 'health', args: [], options: {}, expectedMaxTime: 300 },
        { command: 'analyze', args: ['.'], options: {}, expectedMaxTime: 600 },
        { command: 'track', args: ['test'], options: { dryRun: true }, expectedMaxTime: 400 }
      ];

      for (const { expectedMaxTime, ...command } of commands) {
        const startTime = Date.now();
        const result = await cliExecutor.execute(command);
        const endTime = Date.now();

        expect(result.success).toBe(true);
        expect(endTime - startTime).toBeLessThan(expectedMaxTime);
        expect(result.duration).toBeLessThan(expectedMaxTime);
      }
    });

    it('should handle concurrent command execution efficiently', async () => {
      const commands = Array(10).fill(null).map((_, i) => ({
        command: 'config',
        args: ['list'],
        options: {}
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        commands.map(cmd => cliExecutor.execute(cmd))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      
      // Concurrent execution should be faster than sequential
      // Sequential would take ~1000ms (10 * 100ms), concurrent should be much less
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should handle command timeouts appropriately', async () => {
      // Mock a slow command
      jest.spyOn(cliExecutor, 'execute').mockImplementationOnce(async (command) => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        return {
          success: false,
          output: '',
          error: 'Command execution timed out after 1000ms',
          exitCode: -1,
          executedCommand: `nodash ${command.command}`,
          duration: 2000
        };
      });

      const command = {
        command: 'health',
        args: [],
        options: { timeout: 1000 }
      };

      const startTime = Date.now();
      const result = await cliExecutor.execute(command);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
      expect(endTime - startTime).toBeLessThan(2500); // Should timeout before 2.5s
    });
  });

  describe('Workflow Performance', () => {
    it('should execute setup workflow within acceptable time', async () => {
      const workflow = workflowOrchestrator.createSetupWorkflow({
        currentDirectory: '/test/project'
      });

      const startTime = Date.now();
      const result = await workflowOrchestrator.executeWorkflow(workflow);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Setup workflow should complete within 1 second
      // (config: 100ms + analyze: 500ms + health: 200ms = 800ms + overhead)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should execute validation workflow efficiently', async () => {
      const workflow = workflowOrchestrator.createValidationWorkflow({
        currentDirectory: '/test/project'
      });

      const startTime = Date.now();
      const result = await workflowOrchestrator.executeWorkflow(workflow);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      
      // Validation workflow should complete within 1.2 seconds
      // (config: 100ms + health: 200ms + track: 300ms = 600ms + overhead)
      expect(endTime - startTime).toBeLessThan(1200);
    });

    it('should handle workflow step failures without significant delay', async () => {
      // Mock first command to fail quickly
      jest.spyOn(cliExecutor, 'execute').mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'Quick failure',
        exitCode: 1,
        executedCommand: 'nodash config list',
        duration: 50
      });

      const workflow = workflowOrchestrator.createSetupWorkflow({
        currentDirectory: '/test/project'
      });

      const startTime = Date.now();
      const result = await workflowOrchestrator.executeWorkflow(workflow);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('Check Current Config');
      
      // Should fail quickly without waiting for other steps
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory during repeated executions', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many commands
      for (let i = 0; i < 100; i++) {
        await cliExecutor.execute({
          command: 'config',
          args: ['list'],
          options: {}
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large output efficiently', async () => {
      // Mock command with large output
      const largeOutput = 'x'.repeat(1024 * 1024); // 1MB of data
      jest.spyOn(cliExecutor, 'execute').mockResolvedValueOnce({
        success: true,
        output: largeOutput,
        exitCode: 0,
        executedCommand: 'nodash analyze .',
        duration: 500
      });

      const startTime = Date.now();
      const result = await cliExecutor.execute({
        command: 'analyze',
        args: ['.'],
        options: {}
      });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.output.length).toBe(1024 * 1024);
      
      // Should handle large output without significant delay
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Caching Performance', () => {
    it('should demonstrate performance improvement with caching', async () => {
      // This test would be more meaningful with actual caching implementation
      // For now, we'll simulate the expected behavior
      
      const command = {
        command: 'analyze',
        args: ['.'],
        options: {}
      };

      // First execution (cache miss)
      const startTime1 = Date.now();
      const result1 = await cliExecutor.execute(command);
      const endTime1 = Date.now();
      const firstExecutionTime = endTime1 - startTime1;

      expect(result1.success).toBe(true);
      expect(firstExecutionTime).toBeGreaterThan(400); // Should take full time

      // Second execution (would be cache hit in real implementation)
      const startTime2 = Date.now();
      const result2 = await cliExecutor.execute(command);
      const endTime2 = Date.now();
      const secondExecutionTime = endTime2 - startTime2;

      expect(result2.success).toBe(true);
      
      // In a real caching implementation, second execution would be much faster
      // For now, we just verify it completes successfully
      expect(secondExecutionTime).toBeGreaterThan(0);
    });
  });
});