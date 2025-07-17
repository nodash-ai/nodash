import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { TestResource } from './test-isolation';

export interface MCPServerConfig {
  serverPath?: string;
  timeout?: number;
  enableLogging?: boolean;
  env?: Record<string, string>;
  retries?: number;
  healthCheckInterval?: number;
}

export interface MCPServerInstance {
  id: string;
  process: ChildProcess;
  config: MCPServerConfig;
  startTime: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  lastHealthCheck?: number;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  logs: MCPServerLog[];
}

export interface MCPServerLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'stdout' | 'stderr';
}

export interface MCPServerHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  uptime: number;
  memoryUsage?: NodeJS.MemoryUsage;
  lastResponse?: number;
  errors: string[];
}

export class MCPServerManager {
  private servers: Map<string, MCPServerInstance> = new Map();
  private defaultConfig: MCPServerConfig;

  constructor(defaultConfig: Partial<MCPServerConfig> = {}) {
    this.defaultConfig = {
      serverPath: this.findServerPath(),
      timeout: 30000,
      enableLogging: false,
      retries: 3,
      healthCheckInterval: 5000,
      ...defaultConfig
    };
  }

  private findServerPath(): string {
    // Try to find the MCP server executable
    const possiblePaths = [
      // Local development paths
      path.resolve(__dirname, '../../packages/nodash-mcp/dist/server.js'),
      path.resolve(__dirname, '../../../packages/nodash-mcp/dist/server.js'),
      // Built package path
      path.resolve(__dirname, '../../node_modules/@nodash/mcp/dist/server.js'),
      // Global installation
      'nodash-mcp'
    ];

    for (const serverPath of possiblePaths.slice(0, -1)) {
      try {
        if (fs.existsSync(serverPath)) {
          return serverPath;
        }
      } catch {
        // Continue to next path
      }
    }

    // Default to global command
    return 'nodash-mcp';
  }

  async startServer(config: Partial<MCPServerConfig> = {}): Promise<MCPServerInstance> {
    const serverId = `mcp-server-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const serverConfig = { ...this.defaultConfig, ...config };

    if (this.servers.size >= 5) {
      throw new Error('Maximum number of MCP servers (5) already running');
    }

    const serverPath = serverConfig.serverPath!;
    const useNode = serverPath.endsWith('.js');
    const command = useNode ? 'node' : serverPath;
    const args = useNode ? [serverPath] : [];

    const childProcess = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...serverConfig.env
      }
    });

    const server: MCPServerInstance = {
      id: serverId,
      process: childProcess,
      config: serverConfig,
      startTime: Date.now(),
      status: 'starting',
      logs: []
    };

    this.servers.set(serverId, server);

    // Set up logging
    this.setupServerLogging(server);

    // Wait for server to start
    try {
      await this.waitForServerStart(server);
      server.status = 'running';
      
      if (serverConfig.enableLogging) {
        console.log(`MCP Server ${serverId} started successfully`);
      }

      // Start health monitoring
      this.startHealthMonitoring(server);

      return server;
    } catch (error) {
      server.status = 'error';
      this.servers.delete(serverId);
      
      if (!childProcess.killed) {
        childProcess.kill('SIGKILL');
      }
      
      throw new Error(`Failed to start MCP server: ${error}`);
    }
  }

  async stopServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    server.status = 'stopping';

    try {
      // Graceful shutdown
      if (!server.process.killed && server.process.pid) {
        server.process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            if (!server.process.killed && server.process.pid) {
              server.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);

          server.process.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      server.status = 'stopped';
      
      if (server.config.enableLogging) {
        console.log(`MCP Server ${serverId} stopped`);
      }
    } catch (error) {
      server.status = 'error';
      throw new Error(`Failed to stop MCP server ${serverId}: ${error}`);
    } finally {
      this.servers.delete(serverId);
    }
  }

  async stopAllServers(): Promise<void> {
    const stopPromises = Array.from(this.servers.keys()).map(id => 
      this.stopServer(id).catch(error => 
        console.warn(`Failed to stop server ${id}:`, error)
      )
    );

    await Promise.allSettled(stopPromises);
  }

  async checkServerHealth(serverId: string): Promise<MCPServerHealth> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const health: MCPServerHealth = {
      status: 'unknown',
      uptime: Date.now() - server.startTime,
      errors: []
    };

    try {
      // Check if process is still running
      if (server.process.killed || !server.process.pid) {
        health.status = 'unhealthy';
        health.errors.push('Process is not running');
        return health;
      }

      // Check server status
      if (server.status === 'error') {
        health.status = 'unhealthy';
        health.errors.push('Server is in error state');
        return health;
      }

      if (server.status === 'running') {
        // Try to send a simple request to test responsiveness
        const responseTime = await this.testServerResponsiveness(server);
        health.lastResponse = responseTime;
        health.status = responseTime < 5000 ? 'healthy' : 'unhealthy';
        
        if (responseTime >= 5000) {
          health.errors.push('Server response time too slow');
        }
      } else {
        health.status = 'unhealthy';
        health.errors.push(`Server status is ${server.status}`);
      }

      // Get memory usage if available
      if (server.process.pid) {
        try {
          health.memoryUsage = process.memoryUsage();
        } catch {
          // Memory usage not available
        }
      }

      server.lastHealthCheck = Date.now();
      server.healthStatus = health.status;

      return health;
    } catch (error) {
      health.status = 'unhealthy';
      health.errors.push(`Health check failed: ${error}`);
      return health;
    }
  }

  getServer(serverId: string): MCPServerInstance | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): MCPServerInstance[] {
    return Array.from(this.servers.values());
  }

  getServerLogs(serverId: string, limit: number = 100): MCPServerLog[] {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return server.logs.slice(-limit);
  }

  async validateServerReliability(serverId: string, duration: number = 30000): Promise<{
    reliable: boolean;
    uptime: number;
    healthChecks: number;
    failures: number;
    averageResponseTime: number;
    issues: string[];
  }> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const startTime = Date.now();
    const healthChecks: number[] = [];
    const failures: string[] = [];
    let healthCheckCount = 0;

    while (Date.now() - startTime < duration) {
      try {
        const health = await this.checkServerHealth(serverId);
        healthCheckCount++;

        if (health.status === 'healthy' && health.lastResponse) {
          healthChecks.push(health.lastResponse);
        } else {
          failures.push(...health.errors);
        }
      } catch (error) {
        failures.push(`Health check error: ${error}`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const averageResponseTime = healthChecks.length > 0 
      ? healthChecks.reduce((a, b) => a + b, 0) / healthChecks.length 
      : 0;

    const uptime = Date.now() - server.startTime;
    const failureRate = failures.length / healthCheckCount;

    return {
      reliable: failureRate < 0.1 && averageResponseTime < 2000,
      uptime,
      healthChecks: healthCheckCount,
      failures: failures.length,
      averageResponseTime,
      issues: failures
    };
  }

  createServerResource(serverId: string): TestResource {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return {
      type: 'server',
      process: server.process,
      cleanup: async () => {
        await this.stopServer(serverId);
      }
    };
  }

  private setupServerLogging(server: MCPServerInstance): void {
    const addLog = (level: MCPServerLog['level'], message: string, source: MCPServerLog['source']) => {
      server.logs.push({
        timestamp: Date.now(),
        level,
        message: message.trim(),
        source
      });

      // Keep only last 1000 logs
      if (server.logs.length > 1000) {
        server.logs = server.logs.slice(-1000);
      }

      if (server.config.enableLogging) {
        console.log(`[MCP-${server.id}] ${level.toUpperCase()}: ${message.trim()}`);
      }
    };

    server.process.stdout?.on('data', (data) => {
      addLog('info', data.toString(), 'stdout');
    });

    server.process.stderr?.on('data', (data) => {
      const message = data.toString();
      // MCP servers often log startup messages to stderr
      if (message.includes('started') || message.includes('ready')) {
        addLog('info', message, 'stderr');
      } else {
        addLog('error', message, 'stderr');
      }
    });

    server.process.on('error', (error) => {
      addLog('error', `Process error: ${error.message}`, 'stderr');
      server.status = 'error';
    });

    server.process.on('exit', (code, signal) => {
      addLog('info', `Process exited with code ${code}, signal ${signal}`, 'stderr');
      if (server.status === 'running') {
        server.status = 'stopped';
      }
    });
  }

  private async waitForServerStart(server: MCPServerInstance): Promise<void> {
    const timeout = server.config.timeout || 30000;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStartup = () => {
        // Check for startup indicators in logs
        const hasStartupMessage = server.logs.some(log => 
          log.message.toLowerCase().includes('started') ||
          log.message.toLowerCase().includes('ready') ||
          log.message.toLowerCase().includes('listening')
        );

        if (hasStartupMessage) {
          resolve();
          return;
        }

        // Check for error conditions
        if (server.process.killed || server.status === 'error') {
          reject(new Error('Server process died during startup'));
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error('Server startup timeout'));
          return;
        }

        // Continue checking
        setTimeout(checkStartup, 100);
      };

      // Start checking after a brief delay
      setTimeout(checkStartup, 500);
    });
  }

  private async testServerResponsiveness(server: MCPServerInstance): Promise<number> {
    const startTime = Date.now();
    
    // For MCP servers, we can't easily test responsiveness without implementing
    // the full MCP protocol. For now, we'll just check if the process is responsive
    // by checking if it's still running and hasn't had recent errors
    
    return new Promise((resolve) => {
      // Simple responsiveness test - check if process is still alive
      if (server.process.pid && !server.process.killed) {
        try {
          // Send signal 0 to check if process exists
          process.kill(server.process.pid, 0);
          resolve(Date.now() - startTime);
        } catch {
          resolve(10000); // Process not responsive
        }
      } else {
        resolve(10000); // Process not running
      }
    });
  }

  private startHealthMonitoring(server: MCPServerInstance): void {
    if (!server.config.healthCheckInterval) {
      return;
    }

    const healthCheckInterval = setInterval(async () => {
      try {
        await this.checkServerHealth(server.id);
      } catch (error) {
        if (server.config.enableLogging) {
          console.warn(`Health check failed for server ${server.id}:`, error);
        }
      }
    }, server.config.healthCheckInterval);

    // Clean up interval when server stops
    server.process.on('exit', () => {
      clearInterval(healthCheckInterval);
    });
  }
}