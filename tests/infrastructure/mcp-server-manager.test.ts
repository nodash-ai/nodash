import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPServerManager } from './mcp-server-manager';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true)
}));

describe('MCPServerManager', () => {
  let manager: MCPServerManager;
  let mockProcess: any;

  beforeEach(() => {
    // Create a mock child process
    mockProcess = new EventEmitter();
    mockProcess.pid = 12345;
    mockProcess.killed = false;
    mockProcess.kill = vi.fn((signal) => {
      mockProcess.killed = true;
      setTimeout(() => mockProcess.emit('exit', 0, signal), 10);
      return true;
    });
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();

    // Mock spawn to return our mock process
    vi.mocked(spawn).mockReturnValue(mockProcess as any);

    manager = new MCPServerManager({
      enableLogging: false,
      timeout: 5000
    });
  });

  afterEach(async () => {
    await manager.stopAllServers();
    vi.clearAllMocks();
  });

  describe('Server Startup', () => {
    it('should start MCP server successfully', async () => {
      // Simulate server startup message
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);

      const server = await manager.startServer();

      expect(server).toBeDefined();
      expect(server.id).toBeDefined();
      expect(server.status).toBe('running');
      expect(server.process).toBe(mockProcess);
      expect(spawn).toHaveBeenCalledWith('node', expect.any(Array), expect.any(Object));
    });

    it('should handle server startup timeout', async () => {
      // Don't emit startup message to trigger timeout
      const startPromise = manager.startServer({ timeout: 1000 });

      await expect(startPromise).rejects.toThrow('Failed to start MCP server');
    });

    it('should handle server startup failure', async () => {
      // Simulate process error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Process failed'));
      }, 100);

      const startPromise = manager.startServer();

      await expect(startPromise).rejects.toThrow('Failed to start MCP server');
    });

    it('should limit maximum number of servers', async () => {
      // Start 5 servers (the maximum)
      const startPromises = [];
      for (let i = 0; i < 5; i++) {
        const mockProc = new EventEmitter();
        mockProc.pid = 12345 + i;
        mockProc.killed = false;
        mockProc.kill = vi.fn(() => true);
        mockProc.stdout = new EventEmitter();
        mockProc.stderr = new EventEmitter();
        
        vi.mocked(spawn).mockReturnValueOnce(mockProc as any);
        
        setTimeout(() => {
          mockProc.stderr.emit('data', 'Nodash MCP Server started\n');
        }, 100);
        
        startPromises.push(manager.startServer());
      }

      await Promise.all(startPromises);

      // Try to start one more - should fail
      await expect(manager.startServer()).rejects.toThrow('Maximum number of MCP servers');
    });
  });

  describe('Server Lifecycle', () => {
    let serverId: string;

    beforeEach(async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);

      const server = await manager.startServer();
      serverId = server.id;
    });

    it('should stop server gracefully', async () => {
      await manager.stopServer(serverId);

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(manager.getServer(serverId)).toBeUndefined();
    });

    it('should force kill server if graceful shutdown fails', async () => {
      // Mock process that doesn't respond to SIGTERM
      mockProcess.kill = vi.fn((signal) => {
        if (signal === 'SIGTERM') {
          // Don't emit exit event for SIGTERM
          return true;
        } else if (signal === 'SIGKILL') {
          mockProcess.killed = true;
          setTimeout(() => mockProcess.emit('exit', 137, signal), 10);
          return true;
        }
        return false;
      });

      await manager.stopServer(serverId);

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    it('should stop all servers', async () => {
      // Start another server
      const mockProcess2 = new EventEmitter();
      mockProcess2.pid = 54321;
      mockProcess2.killed = false;
      mockProcess2.kill = vi.fn((signal) => {
        mockProcess2.killed = true;
        setTimeout(() => mockProcess2.emit('exit', 0, signal), 10);
        return true;
      });
      mockProcess2.stdout = new EventEmitter();
      mockProcess2.stderr = new EventEmitter();
      
      vi.mocked(spawn).mockReturnValueOnce(mockProcess2 as any);
      
      setTimeout(() => {
        mockProcess2.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);
      
      await manager.startServer();

      expect(manager.getAllServers()).toHaveLength(2);

      await manager.stopAllServers();

      expect(manager.getAllServers()).toHaveLength(0);
    });
  });

  describe('Server Health Monitoring', () => {
    let serverId: string;

    beforeEach(async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);

      const server = await manager.startServer();
      serverId = server.id;
    });

    it('should check server health', async () => {
      // Mock process.kill to simulate a running process
      const originalKill = process.kill;
      process.kill = vi.fn(() => true);

      const health = await manager.checkServerHealth(serverId);

      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.errors).toHaveLength(0);

      // Restore original process.kill
      process.kill = originalKill;
    });

    it('should detect unhealthy server', async () => {
      // Kill the process
      mockProcess.killed = true;
      mockProcess.pid = undefined;

      const health = await manager.checkServerHealth(serverId);

      expect(health.status).toBe('unhealthy');
      expect(health.errors.length).toBeGreaterThan(0);
      expect(health.errors[0]).toContain('Process is not running');
    });

    it('should validate server reliability over time', async () => {
      // Mock process.kill to simulate a running process for health checks
      const originalKill = process.kill;
      process.kill = vi.fn(() => true);

      const reliability = await manager.validateServerReliability(serverId, 1000);

      expect(reliability.reliable).toBe(true);
      expect(reliability.uptime).toBeGreaterThan(0);
      expect(reliability.healthChecks).toBeGreaterThan(0);
      expect(reliability.failures).toBe(0);

      // Restore original process.kill
      process.kill = originalKill;
    });
  });

  describe('Server Logging', () => {
    let serverId: string;

    beforeEach(async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);

      const server = await manager.startServer({ enableLogging: false });
      serverId = server.id;
    });

    it('should capture server logs', async () => {
      // Emit some log messages
      mockProcess.stdout.emit('data', 'Info message\n');
      mockProcess.stderr.emit('data', 'Error message\n');

      // Wait a bit for logs to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const logs = manager.getServerLogs(serverId);

      expect(logs.length).toBeGreaterThan(0);
      
      const infoLog = logs.find(log => log.message.includes('Info message'));
      const errorLog = logs.find(log => log.message.includes('Error message'));
      
      expect(infoLog).toBeDefined();
      expect(infoLog?.level).toBe('info');
      expect(infoLog?.source).toBe('stdout');
      
      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('error');
      expect(errorLog?.source).toBe('stderr');
    });

    it('should limit log history', async () => {
      // Generate many log messages
      for (let i = 0; i < 1100; i++) {
        mockProcess.stdout.emit('data', `Log message ${i}\n`);
      }

      // Wait for logs to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      const logs = manager.getServerLogs(serverId);

      // Should be limited to 1000 logs
      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Server Resource Management', () => {
    let serverId: string;

    beforeEach(async () => {
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);

      const server = await manager.startServer();
      serverId = server.id;
    });

    it('should create test resource for server', () => {
      const resource = manager.createServerResource(serverId);

      expect(resource.type).toBe('server');
      expect(resource.process).toBe(mockProcess);
      expect(resource.cleanup).toBeDefined();
    });

    it('should cleanup server via resource', async () => {
      const resource = manager.createServerResource(serverId);

      await resource.cleanup();

      expect(manager.getServer(serverId)).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent server operations', async () => {
      await expect(manager.stopServer('non-existent')).rejects.toThrow('Server non-existent not found');
      await expect(manager.checkServerHealth('non-existent')).rejects.toThrow('Server non-existent not found');
      expect(() => manager.getServerLogs('non-existent')).toThrow('Server non-existent not found');
      expect(() => manager.createServerResource('non-existent')).toThrow('Server non-existent not found');
    });

    it('should handle server startup with custom config', async () => {
      const customConfig = {
        serverPath: '/custom/path/server.js',
        timeout: 10000,
        enableLogging: true,
        env: { CUSTOM_VAR: 'test' }
      };

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Nodash MCP Server started\n');
      }, 100);

      const server = await manager.startServer(customConfig);

      expect(server.config.serverPath).toBe('/custom/path/server.js');
      expect(server.config.timeout).toBe(10000);
      expect(server.config.enableLogging).toBe(true);
      expect(spawn).toHaveBeenCalledWith('node', ['/custom/path/server.js'], 
        expect.objectContaining({
          env: expect.objectContaining({ CUSTOM_VAR: 'test' })
        })
      );
    });
  });
});