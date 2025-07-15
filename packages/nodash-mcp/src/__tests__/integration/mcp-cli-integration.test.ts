import { CLIExecutor } from '../../services/cli-executor';
import { CommandTranslator } from '../../services/command-translator';
import { OutputParser } from '../../services/output-parser';
import { WorkflowOrchestrator } from '../../services/workflow-orchestrator';
import { SecurityManager } from '../../services/security-policy';

describe('MCP-CLI Integration', () => {
  let cliExecutor: CLIExecutor;
  let commandTranslator: CommandTranslator;
  let outputParser: OutputParser;
  let workflowOrchestrator: WorkflowOrchestrator;
  let securityManager: SecurityManager;

  beforeEach(() => {
    cliExecutor = new CLIExecutor();
    commandTranslator = new CommandTranslator();
    outputParser = new OutputParser();
    workflowOrchestrator = new WorkflowOrchestrator(cliExecutor, outputParser);
    securityManager = new SecurityManager();

    // Mock CLI executor for integration tests
    jest.spyOn(cliExecutor, 'execute').mockImplementation(async (command) => {
      // Simulate different CLI responses based on command
      switch (command.command) {
        case 'config':
          if (command.args[0] === 'list') {
            return {
              success: true,
              output: '{"token": "test-token", "baseUrl": "https://api.nodash.co"}',
              exitCode: 0,
              executedCommand: 'nodash config list',
              duration: 100
            };
          } else if (command.args[0] === 'set') {
            return {
              success: true,
              output: 'Configuration updated successfully',
              exitCode: 0,
              executedCommand: `nodash config set ${command.args[1]} ${command.args[2]}`,
              duration: 150
            };
          }
          break;
        case 'health':
          return {
            success: true,
            output: '✅ API Connection: Healthy\n✅ Authentication: Valid\nResponse Time: 120ms',
            exitCode: 0,
            executedCommand: 'nodash health',
            duration: 200
          };
        case 'analyze':
          return {
            success: true,
            output: JSON.stringify({
              framework: 'react',
              language: 'typescript',
              packageManager: 'npm',
              hasAnalyticsSDK: true,
              analyticsLibraries: ['@nodash/sdk'],
              recommendations: ['Update SDK to latest version'],
              setupValidation: {
                hasSDK: true,
                hasConfig: true,
                issues: []
              }
            }),
            exitCode: 0,
            executedCommand: 'nodash analyze .',
            duration: 500
          };
        case 'track':
          return {
            success: true,
            output: command.options.dryRun 
              ? 'Dry Run Mode\nEvent: test_event\nProperties: {}\nWould send to API'
              : 'Event: test_event\nProperties: {}\nStatus: Sent successfully',
            exitCode: 0,
            executedCommand: `nodash track ${command.args[0]}`,
            duration: 300
          };
      }
      
      return {
        success: false,
        output: '',
        error: 'Unknown command',
        exitCode: 1,
        executedCommand: `nodash ${command.command}`,
        duration: 50
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('End-to-End Workflow', () => {
    it('should complete setup workflow successfully', async () => {
      const workflow = workflowOrchestrator.createSetupWorkflow({
        currentDirectory: '/test/project'
      });

      const result = await workflowOrchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Verify config check
      const configResult = outputParser.parseConfigOutput(result.results[0]);
      expect(configResult.isValid).toBe(true);
      expect(configResult.settings.token).toBe('test-token');

      // Verify project analysis
      const analysisResult = outputParser.parseAnalysisOutput(result.results[1]);
      expect(analysisResult.framework).toBe('react');
      expect(analysisResult.hasAnalyticsSDK).toBe(true);

      // Verify health check
      const healthResult = outputParser.parseHealthOutput(result.results[2]);
      expect(healthResult.status).toBe('healthy');
    });

    it('should handle validation workflow with conditional execution', async () => {
      const workflow = workflowOrchestrator.createValidationWorkflow({
        currentDirectory: '/test/project'
      });

      const result = await workflowOrchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);

      // All steps should execute because conditions are met
      expect(cliExecutor.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe('Natural Language to CLI Translation', () => {
    it('should translate and execute configuration requests', async () => {
      const request = 'set my API token to abc123';
      const commands = commandTranslator.translateRequest(request);

      expect(commands).toHaveLength(1);
      
      // Validate security
      const validation = securityManager.validateCommand(commands[0]);
      expect(validation.valid).toBe(true);

      // Execute command
      const result = await cliExecutor.execute(commands[0]);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Configuration updated successfully');
    });

    it('should translate and execute health check requests', async () => {
      const request = 'check if everything is working';
      const commands = commandTranslator.translateRequest(request);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('health');

      const result = await cliExecutor.execute(commands[0]);
      expect(result.success).toBe(true);

      const healthStatus = outputParser.parseHealthOutput(result);
      expect(healthStatus.status).toBe('healthy');
    });

    it('should translate and execute tracking requests safely', async () => {
      const request = 'track a test event';
      const commands = commandTranslator.translateRequest(request);

      expect(commands).toHaveLength(1);
      expect(commands[0].command).toBe('track');
      expect(commands[0].options?.dryRun).toBe(true); // Should default to dry run for safety

      const result = await cliExecutor.execute(commands[0]);
      expect(result.success).toBe(true);

      const trackingResult = outputParser.parseTrackingOutput(result);
      expect(trackingResult.dryRun).toBe(true);
      expect(trackingResult.eventSent).toBe(false);
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should handle CLI command failures gracefully', async () => {
      // Mock a failing command
      jest.spyOn(cliExecutor, 'execute').mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'API Error: Unauthorized request',
        exitCode: 1,
        executedCommand: 'nodash health',
        duration: 100
      });

      const command = { command: 'health', args: [], options: {} };
      const result = await cliExecutor.execute(command);

      expect(result.success).toBe(false);
      
      const errorAnalysis = outputParser.parseErrorOutput(result.error || '');
      expect(errorAnalysis.errorType).toBe('API');
      expect(errorAnalysis.message).toContain('Unauthorized request');
    });

    it('should handle workflow failures with proper error reporting', async () => {
      // Mock first command to fail
      jest.spyOn(cliExecutor, 'execute').mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'Configuration Error: Invalid token',
        exitCode: 1,
        executedCommand: 'nodash config list',
        duration: 100
      });

      const workflow = workflowOrchestrator.createSetupWorkflow({
        currentDirectory: '/test/project'
      });

      const result = await workflowOrchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('Check Current Config');
      expect(result.results).toHaveLength(1);
    });
  });

  describe('Security Integration', () => {
    it('should prevent execution of dangerous commands', async () => {
      const dangerousCommand = {
        command: 'rm',
        args: ['-rf', '/'],
        options: {}
      };

      const validation = securityManager.validateCommand(dangerousCommand);
      expect(validation.valid).toBe(false);

      // Should not execute the command
      const result = await cliExecutor.execute(dangerousCommand);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Command validation failed');
    });

    it('should sanitize input and prevent injection attacks', async () => {
      const maliciousCommand = {
        command: 'config; rm -rf /',
        args: ['list'],
        options: {}
      };

      const validation = securityManager.validateCommand(maliciousCommand);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid command: config; rm -rf /');
    });

    it('should require confirmation for destructive operations', async () => {
      const destructiveCommand = {
        command: 'config',
        args: ['set', 'token', 'new-token'],
        options: {}
      };

      const requiresConfirmation = securityManager.requiresConfirmation(destructiveCommand);
      expect(requiresConfirmation).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should handle multiple concurrent requests', async () => {
      const commands = [
        { command: 'config', args: ['list'], options: {} },
        { command: 'health', args: [], options: {} },
        { command: 'analyze', args: ['.'], options: {} }
      ];

      const startTime = Date.now();
      const results = await Promise.all(
        commands.map(cmd => cliExecutor.execute(cmd))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      // Should complete reasonably quickly (concurrent execution)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});