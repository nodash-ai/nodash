import { CLICommand, CLIResult } from './cli-executor.js';

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'cli' | 'mcp' | 'security' | 'performance' | 'workflow';
  message: string;
  metadata?: Record<string, any>;
  executionId?: string;
  userId?: string;
}

export interface PerformanceMetrics {
  commandExecutions: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  successRate: number;
  errorRate: number;
  cacheHitRate: number;
  concurrentExecutions: number;
  peakConcurrentExecutions: number;
}

export interface HealthMetrics {
  cliAvailable: boolean;
  cliVersion?: string;
  lastHealthCheck: string;
  responseTime?: number;
  errorCount: number;
  warningCount: number;
  uptime: number;
}

export interface SecurityMetrics {
  blockedCommands: number;
  sanitizedInputs: number;
  confirmationRequests: number;
  authenticationFailures: number;
  suspiciousActivities: number;
}

export class MonitoringService {
  private logs: LogEntry[] = [];
  private performanceMetrics: PerformanceMetrics = {
    commandExecutions: 0,
    totalExecutionTime: 0,
    averageExecutionTime: 0,
    successRate: 0,
    errorRate: 0,
    cacheHitRate: 0,
    concurrentExecutions: 0,
    peakConcurrentExecutions: 0
  };
  private healthMetrics: HealthMetrics = {
    cliAvailable: false,
    lastHealthCheck: new Date().toISOString(),
    errorCount: 0,
    warningCount: 0,
    uptime: Date.now()
  };
  private securityMetrics: SecurityMetrics = {
    blockedCommands: 0,
    sanitizedInputs: 0,
    confirmationRequests: 0,
    authenticationFailures: 0,
    suspiciousActivities: 0
  };

  private maxLogEntries = 10000;
  private currentExecutions = 0;

  constructor() {
    this.startPeriodicHealthCheck();
    this.startMetricsCollection();
  }

  // Logging Methods
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    this.logs.push(logEntry);
    
    // Maintain log size limit
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }

    // Update metrics based on log level
    if (entry.level === 'error') {
      this.healthMetrics.errorCount++;
    } else if (entry.level === 'warn') {
      this.healthMetrics.warningCount++;
    }

    // Output to console for immediate visibility
    this.outputToConsole(logEntry);
  }

  debug(message: string, category: LogEntry['category'] = 'mcp', metadata?: Record<string, any>): void {
    this.log({ level: 'debug', category, message, metadata });
  }

  info(message: string, category: LogEntry['category'] = 'mcp', metadata?: Record<string, any>): void {
    this.log({ level: 'info', category, message, metadata });
  }

  warn(message: string, category: LogEntry['category'] = 'mcp', metadata?: Record<string, any>): void {
    this.log({ level: 'warn', category, message, metadata });
  }

  error(message: string, category: LogEntry['category'] = 'mcp', metadata?: Record<string, any>): void {
    this.log({ level: 'error', category, message, metadata });
  }

  // CLI Command Monitoring
  logCommandExecution(command: CLICommand, result: CLIResult, executionId: string): void {
    const success = result.success;
    const duration = result.duration;

    // Log the command execution
    this.log({
      level: success ? 'info' : 'error',
      category: 'cli',
      message: `CLI command executed: ${command.command} ${command.args.join(' ')}`,
      metadata: {
        command: command.command,
        args: this.sanitizeArgs(command.args),
        success,
        duration,
        exitCode: result.exitCode,
        dryRun: command.options?.dryRun || false,
        executionId
      },
      executionId
    });

    // Update performance metrics
    this.updatePerformanceMetrics(success, duration);
  }

  logCommandStart(command: CLICommand, executionId: string): void {
    this.currentExecutions++;
    if (this.currentExecutions > this.performanceMetrics.peakConcurrentExecutions) {
      this.performanceMetrics.peakConcurrentExecutions = this.currentExecutions;
    }
    this.performanceMetrics.concurrentExecutions = this.currentExecutions;

    this.debug(`Starting CLI command execution`, 'cli', {
      command: command.command,
      args: this.sanitizeArgs(command.args),
      executionId,
      concurrentExecutions: this.currentExecutions
    });
  }

  logCommandEnd(executionId: string): void {
    this.currentExecutions = Math.max(0, this.currentExecutions - 1);
    this.performanceMetrics.concurrentExecutions = this.currentExecutions;

    this.debug(`CLI command execution completed`, 'cli', {
      executionId,
      concurrentExecutions: this.currentExecutions
    });
  }

  // Security Event Monitoring
  logSecurityEvent(eventType: 'blocked_command' | 'sanitized_input' | 'confirmation_required' | 'auth_failure' | 'suspicious_activity', details: Record<string, any>): void {
    this.log({
      level: 'warn',
      category: 'security',
      message: `Security event: ${eventType}`,
      metadata: {
        eventType,
        ...details,
        timestamp: new Date().toISOString()
      }
    });

    // Update security metrics
    switch (eventType) {
      case 'blocked_command':
        this.securityMetrics.blockedCommands++;
        break;
      case 'sanitized_input':
        this.securityMetrics.sanitizedInputs++;
        break;
      case 'confirmation_required':
        this.securityMetrics.confirmationRequests++;
        break;
      case 'auth_failure':
        this.securityMetrics.authenticationFailures++;
        break;
      case 'suspicious_activity':
        this.securityMetrics.suspiciousActivities++;
        break;
    }
  }

  // Workflow Monitoring
  logWorkflowExecution(workflowName: string, success: boolean, duration: number, steps: number, failedStep?: string): void {
    this.log({
      level: success ? 'info' : 'error',
      category: 'workflow',
      message: `Workflow executed: ${workflowName}`,
      metadata: {
        workflowName,
        success,
        duration,
        steps,
        failedStep,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Performance Monitoring
  logPerformanceEvent(eventType: 'cache_hit' | 'cache_miss' | 'slow_execution' | 'resource_limit', details: Record<string, any>): void {
    this.log({
      level: eventType === 'slow_execution' || eventType === 'resource_limit' ? 'warn' : 'debug',
      category: 'performance',
      message: `Performance event: ${eventType}`,
      metadata: {
        eventType,
        ...details,
        timestamp: new Date().toISOString()
      }
    });

    // Update cache metrics
    if (eventType === 'cache_hit' || eventType === 'cache_miss') {
      const totalCacheEvents = this.performanceMetrics.commandExecutions;
      if (totalCacheEvents > 0) {
        // This is a simplified calculation - in a real implementation,
        // you'd track cache hits and misses separately
        this.performanceMetrics.cacheHitRate = eventType === 'cache_hit' ? 
          Math.min(1, this.performanceMetrics.cacheHitRate + 0.1) :
          Math.max(0, this.performanceMetrics.cacheHitRate - 0.1);
      }
    }
  }

  // Health Monitoring
  updateHealthStatus(cliAvailable: boolean, cliVersion?: string, responseTime?: number): void {
    this.healthMetrics.cliAvailable = cliAvailable;
    this.healthMetrics.cliVersion = cliVersion;
    this.healthMetrics.lastHealthCheck = new Date().toISOString();
    this.healthMetrics.responseTime = responseTime;

    this.info(`Health status updated`, 'cli', {
      cliAvailable,
      cliVersion,
      responseTime
    });
  }

  // Metrics Retrieval
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  getHealthMetrics(): HealthMetrics {
    return { 
      ...this.healthMetrics,
      uptime: Date.now() - this.healthMetrics.uptime
    };
  }

  getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  getLogs(filter?: {
    level?: LogEntry['level'];
    category?: LogEntry['category'];
    since?: string;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }
      if (filter.since) {
        const sinceDate = new Date(filter.since);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate);
      }
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }

  // Comprehensive Status Report
  getStatusReport(): {
    performance: PerformanceMetrics;
    health: HealthMetrics;
    security: SecurityMetrics;
    recentErrors: LogEntry[];
    recentWarnings: LogEntry[];
  } {
    const recentErrors = this.getLogs({ level: 'error', limit: 10 });
    const recentWarnings = this.getLogs({ level: 'warn', limit: 10 });

    return {
      performance: this.getPerformanceMetrics(),
      health: this.getHealthMetrics(),
      security: this.getSecurityMetrics(),
      recentErrors,
      recentWarnings
    };
  }

  // Private Helper Methods
  private updatePerformanceMetrics(success: boolean, duration: number): void {
    this.performanceMetrics.commandExecutions++;
    this.performanceMetrics.totalExecutionTime += duration;
    this.performanceMetrics.averageExecutionTime = 
      this.performanceMetrics.totalExecutionTime / this.performanceMetrics.commandExecutions;

    const totalCommands = this.performanceMetrics.commandExecutions;
    if (success) {
      this.performanceMetrics.successRate = 
        ((this.performanceMetrics.successRate * (totalCommands - 1)) + 1) / totalCommands;
    } else {
      this.performanceMetrics.successRate = 
        (this.performanceMetrics.successRate * (totalCommands - 1)) / totalCommands;
    }

    this.performanceMetrics.errorRate = 1 - this.performanceMetrics.successRate;
  }

  private sanitizeArgs(args: string[]): string[] {
    return args.map(arg => {
      // Mask potential tokens or sensitive data
      if (arg.length > 20 && /^[a-zA-Z0-9_-]+$/.test(arg)) {
        return `${arg.slice(0, 4)}...${arg.slice(-4)}`;
      }
      return arg;
    });
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    switch (entry.level) {
      case 'error':
        console.error(`${prefix} ${entry.message}`, entry.metadata || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${entry.message}`, entry.metadata || '');
        break;
      case 'info':
        console.log(`${prefix} ${entry.message}`, entry.metadata || '');
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
          console.debug(`${prefix} ${entry.message}`, entry.metadata || '');
        }
        break;
    }
  }

  private startPeriodicHealthCheck(): void {
    // Run health check every 5 minutes
    setInterval(() => {
      this.info('Periodic health check', 'cli', {
        performanceMetrics: this.getPerformanceMetrics(),
        healthMetrics: this.getHealthMetrics(),
        securityMetrics: this.getSecurityMetrics()
      });
    }, 5 * 60 * 1000);
  }

  private startMetricsCollection(): void {
    // Collect and log metrics every minute
    setInterval(() => {
      const metrics = this.getStatusReport();
      
      this.debug('Metrics collection', 'performance', {
        commandExecutions: metrics.performance.commandExecutions,
        averageExecutionTime: metrics.performance.averageExecutionTime,
        successRate: metrics.performance.successRate,
        cacheHitRate: metrics.performance.cacheHitRate,
        concurrentExecutions: metrics.performance.concurrentExecutions
      });
    }, 60 * 1000);
  }

  // Cleanup method for graceful shutdown
  cleanup(): void {
    this.info('MonitoringService shutting down', 'mcp', {
      totalLogs: this.logs.length,
      finalMetrics: this.getStatusReport()
    });
  }
}