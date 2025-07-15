import { WorkflowOrchestrator, Workflow, WorkflowStep } from '../services/workflow-orchestrator';
import { CLIExecutor, CLIResult } from '../services/cli-executor';
import { OutputParser } from '../services/output-parser';

// Mock dependencies
jest.mock('../services/cli-executor');
jest.mock('../services/output-parser');

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockCLIExecutor: jest.Mocked<CLIExecutor>;
  let mockOutputParser: jest.Mocked<OutputParser>;

  beforeEach(() => {
    mockCLIExecutor = new CLIExecutor() as jest.Mocked<CLIExecutor>;
    mockOutputParser = new OutputParser() as jest.Mocked<OutputParser>;
    orchestrator = new WorkflowOrchestrator(mockCLIExecutor, mockOutputParser);
  });

  describe('executeWorkflow', () => {
    it('should execute all steps successfully', async () => {
      const workflow: Workflow = {
        name: 'Test Workflow',
        description: 'Test workflow',
        requiresConfirmation: false,
        steps: [
          {
            name: 'Step 1',
            command: { command: 'config', args: ['list'], options: {} }
          },
          {
            name: 'Step 2',
            command: { command: 'health', args: [], options: {} }
          }
        ]
      };

      const mockResults: CLIResult[] = [
        {
          success: true,
          output: '{"token": "test"}',
          exitCode: 0,
          executedCommand: 'config list',
          duration: 100
        },
        {
          success: true,
          output: 'Healthy',
          exitCode: 0,
          executedCommand: 'health',
          duration: 200
        }
      ];

      mockCLIExecutor.execute
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockCLIExecutor.execute).toHaveBeenCalledTimes(2);
    });

    it('should handle step failure and stop execution', async () => {
      const workflow: Workflow = {
        name: 'Test Workflow',
        description: 'Test workflow',
        requiresConfirmation: false,
        steps: [
          {
            name: 'Step 1',
            command: { command: 'config', args: ['list'], options: {} }
          },
          {
            name: 'Step 2',
            command: { command: 'health', args: [], options: {} }
          }
        ]
      };

      const failedResult: CLIResult = {
        success: false,
        output: '',
        error: 'Command failed',
        exitCode: 1,
        executedCommand: 'config list',
        duration: 100
      };

      mockCLIExecutor.execute.mockResolvedValueOnce(failedResult);

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(false);
      expect(result.failedStep).toBe('Step 1');
      expect(result.results).toHaveLength(1);
      expect(mockCLIExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('should skip steps based on conditions', async () => {
      const workflow: Workflow = {
        name: 'Test Workflow',
        description: 'Test workflow',
        requiresConfirmation: false,
        steps: [
          {
            name: 'Step 1',
            command: { command: 'config', args: ['list'], options: {} }
          },
          {
            name: 'Step 2',
            command: { command: 'health', args: [], options: {} },
            condition: (results) => results.length > 0 && results[0].success
          }
        ]
      };

      const failedResult: CLIResult = {
        success: false,
        output: '',
        error: 'Command failed',
        exitCode: 1,
        executedCommand: 'config list',
        duration: 100
      };

      mockCLIExecutor.execute.mockResolvedValueOnce(failedResult);

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(true); // Workflow succeeds because step 2 was skipped
      expect(result.results).toHaveLength(1);
      expect(mockCLIExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('should retry failed steps when configured', async () => {
      const workflow: Workflow = {
        name: 'Test Workflow',
        description: 'Test workflow',
        requiresConfirmation: false,
        steps: [
          {
            name: 'Step 1',
            command: { command: 'config', args: ['list'], options: {} },
            onFailure: () => 'retry'
          }
        ]
      };

      const failedResult: CLIResult = {
        success: false,
        output: '',
        error: 'Command failed',
        exitCode: 1,
        executedCommand: 'config list',
        duration: 100
      };

      const successResult: CLIResult = {
        success: true,
        output: '{"token": "test"}',
        exitCode: 0,
        executedCommand: 'config list',
        duration: 100
      };

      mockCLIExecutor.execute
        .mockResolvedValueOnce(failedResult)
        .mockResolvedValueOnce(successResult);

      const result = await orchestrator.executeWorkflow(workflow);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(mockCLIExecutor.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('createSetupWorkflow', () => {
    it('should create a setup workflow with correct steps', () => {
      const context = {
        currentDirectory: '/test/project',
        framework: 'react'
      };

      const workflow = orchestrator.createSetupWorkflow(context);

      expect(workflow.name).toBe('Complete Setup');
      expect(workflow.steps).toHaveLength(3);
      expect(workflow.steps[0].name).toBe('Check Current Config');
      expect(workflow.steps[1].name).toBe('Analyze Project');
      expect(workflow.steps[2].name).toBe('Test Health');
    });
  });

  describe('createValidationWorkflow', () => {
    it('should create a validation workflow with conditional steps', () => {
      const context = {
        currentDirectory: '/test/project'
      };

      const workflow = orchestrator.createValidationWorkflow(context);

      expect(workflow.name).toBe('Validate Implementation');
      expect(workflow.steps).toHaveLength(3);
      expect(workflow.steps[1].condition).toBeDefined();
      expect(workflow.steps[2].condition).toBeDefined();
    });
  });

  describe('createTroubleshootingWorkflow', () => {
    it('should create troubleshooting workflow based on issues', () => {
      const issues = ['token error', 'tracking failed'];

      const workflow = orchestrator.createTroubleshootingWorkflow(issues);

      expect(workflow.name).toBe('Troubleshooting');
      expect(workflow.steps.length).toBeGreaterThan(2);
      expect(workflow.steps.some(step => step.name.includes('Authentication'))).toBe(true);
      expect(workflow.steps.some(step => step.name.includes('Event Tracking'))).toBe(true);
    });
  });
});