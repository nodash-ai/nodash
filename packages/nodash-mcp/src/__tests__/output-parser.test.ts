import { OutputParser } from '../services/output-parser';
import { CLIResult } from '../services/cli-executor';

describe('OutputParser', () => {
  let parser: OutputParser;

  beforeEach(() => {
    parser = new OutputParser();
  });

  describe('parseConfigOutput', () => {
    it('should parse JSON config output', () => {
      const result: CLIResult = {
        success: true,
        output: '{"token": "test-token", "baseUrl": "https://api.nodash.co"}',
        exitCode: 0,
        executedCommand: 'nodash config list',
        duration: 100
      };

      const config = parser.parseConfigOutput(result);

      expect(config.isValid).toBe(true);
      expect(config.settings.token).toBe('test-token');
      expect(config.settings.baseUrl).toBe('https://api.nodash.co');
    });

    it('should parse text config output', () => {
      const result: CLIResult = {
        success: true,
        output: 'token: test-token\nbaseUrl: https://api.nodash.co',
        exitCode: 0,
        executedCommand: 'nodash config list',
        duration: 100
      };

      const config = parser.parseConfigOutput(result);

      expect(config.isValid).toBe(true);
      expect(config.settings.token).toBe('test-token');
      expect(config.settings.baseUrl).toBe('https://api.nodash.co');
    });

    it('should handle config errors', () => {
      const result: CLIResult = {
        success: false,
        output: 'Configuration Errors:\n• Invalid token format',
        error: 'Configuration validation failed',
        exitCode: 1,
        executedCommand: 'nodash config list',
        duration: 100
      };

      const config = parser.parseConfigOutput(result);

      expect(config.isValid).toBe(false);
      expect(config.issues).toContain('Invalid token format');
    });
  });

  describe('parseAnalysisOutput', () => {
    it('should parse JSON analysis output', () => {
      const result: CLIResult = {
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

      const analysis = parser.parseAnalysisOutput(result);

      expect(analysis.framework).toBe('react');
      expect(analysis.language).toBe('typescript');
      expect(analysis.hasAnalyticsSDK).toBe(true);
      expect(analysis.analyticsLibraries).toContain('@nodash/sdk');
      expect(analysis.setupStatus.hasSDK).toBe(true);
    });

    it('should parse text analysis output', () => {
      const result: CLIResult = {
        success: true,
        output: `Framework: React
Language: TypeScript
Package Manager: npm
Analytics Libraries: @nodash/sdk
Nodash SDK: ✅
Configuration: ✅`,
        exitCode: 0,
        executedCommand: 'nodash analyze .',
        duration: 500
      };

      const analysis = parser.parseAnalysisOutput(result);

      expect(analysis.framework).toBe('React');
      expect(analysis.language).toBe('TypeScript');
      expect(analysis.packageManager).toBe('npm');
      expect(analysis.setupStatus.hasSDK).toBe(true);
      expect(analysis.setupStatus.hasConfig).toBe(true);
    });
  });

  describe('parseHealthOutput', () => {
    it('should parse healthy status', () => {
      const result: CLIResult = {
        success: true,
        output: '✅ API Connection: Healthy\n✅ Authentication: Valid\nResponse Time: 150ms',
        exitCode: 0,
        executedCommand: 'nodash health',
        duration: 200
      };

      const health = parser.parseHealthOutput(result);

      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBe(150);
    });

    it('should parse unhealthy status', () => {
      const result: CLIResult = {
        success: false,
        output: '❌ API Connection: Failed\n⚠️ Authentication: Token expired',
        error: 'Health check failed',
        exitCode: 1,
        executedCommand: 'nodash health',
        duration: 200
      };

      const health = parser.parseHealthOutput(result);

      expect(health.status).toBe('unhealthy');
      expect(health.issues.length).toBeGreaterThan(0);
    });

    it('should parse JSON health output', () => {
      const result: CLIResult = {
        success: true,
        output: JSON.stringify({
          status: 'healthy',
          responseTime: 120,
          issues: [],
          suggestions: []
        }),
        exitCode: 0,
        executedCommand: 'nodash health --format json',
        duration: 200
      };

      const health = parser.parseHealthOutput(result);

      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBe(120);
    });
  });

  describe('parseTrackingOutput', () => {
    it('should parse successful tracking', () => {
      const result: CLIResult = {
        success: true,
        output: 'Event: user_login\nProperties: {"userId": "123"}\nStatus: Sent successfully',
        exitCode: 0,
        executedCommand: 'nodash track user_login',
        duration: 300
      };

      const tracking = parser.parseTrackingOutput(result);

      expect(tracking.eventSent).toBe(true);
      expect(tracking.eventName).toBe('user_login');
      expect(tracking.dryRun).toBe(false);
    });

    it('should parse dry run tracking', () => {
      const result: CLIResult = {
        success: true,
        output: 'Dry Run Mode\nEvent: test_event\nProperties: {}\nWould send to API',
        exitCode: 0,
        executedCommand: 'nodash track test_event --dry-run',
        duration: 100
      };

      const tracking = parser.parseTrackingOutput(result);

      expect(tracking.eventSent).toBe(false);
      expect(tracking.eventName).toBe('test_event');
      expect(tracking.dryRun).toBe(true);
    });
  });

  describe('parseErrorOutput', () => {
    it('should parse configuration errors', () => {
      const error = 'Configuration Error: Invalid API token format\n💡 Check your token format\n💡 Get a new token from dashboard';

      const analysis = parser.parseErrorOutput(error);

      expect(analysis.errorType).toBe('Configuration');
      expect(analysis.message).toContain('Invalid API token format');
      expect(analysis.suggestions).toContain('Check your token format');
      expect(analysis.suggestions).toContain('Get a new token from dashboard');
    });

    it('should parse API errors', () => {
      const error = 'API Error: Unauthorized request\nDocumentation: https://docs.nodash.co/auth';

      const analysis = parser.parseErrorOutput(error);

      expect(analysis.errorType).toBe('API');
      expect(analysis.relatedDocs).toBe('https://docs.nodash.co/auth');
    });
  });
});