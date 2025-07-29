import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ChildProcess } from 'child_process';

export interface ManagedResource {
  id: string;
  type: 'port' | 'tempDir' | 'process' | 'file' | 'server';
  value: any;
  createdAt: Date;
  cleanup: () => Promise<void>;
  metadata?: Record<string, any>;
}

export interface ResourceStats {
  totalResources: number;
  resourcesByType: Record<string, number>;
  oldestResource: Date | null;
  memoryUsage: NodeJS.MemoryUsage;
}

export interface PortAllocationOptions {
  min?: number;
  max?: number;
  exclude?: number[];
}

export interface TempDirOptions {
  prefix?: string;
  suffix?: string;
  baseDir?: string;
}

/**
 * Centralized resource management for tests
 * Handles allocation, tracking, and cleanup of test resources
 */
export class ResourceManager {
  private static instance: ResourceManager | null = null;
  private resources: Map<string, ManagedResource> = new Map();
  private portPool: Set<number> = new Set();
  private cleanupRegistered = false;

  private constructor() {
    this.registerGlobalCleanup();
  }

  static getInstance(): ResourceManager {
    if (!this.instance) {
      this.instance = new ResourceManager();
    }
    return this.instance;
  }

  /**
   * Allocate an available port
   */
  async allocatePort(options: PortAllocationOptions = {}): Promise<number> {
    const { min = 3000, max = 65535, exclude = [] } = options;
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          server.close(() => {
            // Check if port is in valid range and not excluded
            if (port >= min && port <= max && !exclude.includes(port) && !this.portPool.has(port)) {
              this.portPool.add(port);
              
              const resource: ManagedResource = {
                id: `port-${port}`,
                type: 'port',
                value: port,
                createdAt: new Date(),
                cleanup: async () => {
                  this.portPool.delete(port);
                },
                metadata: { min, max, exclude }
              };

              this.resources.set(resource.id, resource);
              resolve(port);
            } else {
              // Try again with a different port
              this.allocatePort(options).then(resolve).catch(reject);
            }
          });
        } else {
          server.close();
          reject(new Error('Failed to get port from server address'));
        }
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Release a previously allocated port
   */
  async releasePort(port: number): Promise<void> {
    const resourceId = `port-${port}`;
    const resource = this.resources.get(resourceId);
    
    if (resource) {
      await resource.cleanup();
      this.resources.delete(resourceId);
    }
  }

  /**
   * Create a temporary directory
   */
  async createTempDir(options: TempDirOptions = {}): Promise<string> {
    const {
      prefix = 'nodash-test-',
      suffix = '',
      baseDir = os.tmpdir()
    } = options;

    const tempDir = await fs.promises.mkdtemp(
      path.join(baseDir, `${prefix}`) + suffix
    );

    const resource: ManagedResource = {
      id: `tempdir-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: 'tempDir',
      value: tempDir,
      createdAt: new Date(),
      cleanup: async () => {
        try {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
        }
      },
      metadata: { prefix, suffix, baseDir }
    };

    this.resources.set(resource.id, resource);
    return tempDir;
  }

  /**
   * Create a temporary file
   */
  async createTempFile(
    content: string,
    options: {
      prefix?: string;
      suffix?: string;
      directory?: string;
    } = {}
  ): Promise<string> {
    const { prefix = 'test-', suffix = '.tmp', directory } = options;
    
    const tempDir = directory || await this.createTempDir();
    const filename = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 8)}${suffix}`;
    const filepath = path.join(tempDir, filename);
    
    await fs.promises.writeFile(filepath, content);

    const resource: ManagedResource = {
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      type: 'file',
      value: filepath,
      createdAt: new Date(),
      cleanup: async () => {
        try {
          await fs.promises.unlink(filepath);
        } catch (error) {
          console.warn(`Failed to cleanup temp file ${filepath}:`, error);
        }
      },
      metadata: { prefix, suffix, directory, content: content.length }
    };

    this.resources.set(resource.id, resource);
    return filepath;
  }

  /**
   * Register a process for cleanup
   */
  registerProcess(process: ChildProcess, metadata?: Record<string, any>): string {
    const resourceId = `process-${process.pid || Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const resource: ManagedResource = {
      id: resourceId,
      type: 'process',
      value: process,
      createdAt: new Date(),
      cleanup: async () => {
        if (!process.killed && process.pid) {
          try {
            process.kill('SIGTERM');
            
            // Wait for graceful shutdown
            await new Promise<void>((resolve) => {
              const timeout = setTimeout(() => {
                if (!process.killed && process.pid) {
                  process.kill('SIGKILL');
                }
                resolve();
              }, 5000);

              process.on('exit', () => {
                clearTimeout(timeout);
                resolve();
              });
            });
          } catch (error) {
            console.warn(`Failed to kill process ${process.pid}:`, error);
          }
        }
      },
      metadata: { pid: process.pid, ...metadata }
    };

    this.resources.set(resourceId, resource);
    return resourceId;
  }

  /**
   * Register a server for cleanup
   */
  registerServer(server: any, metadata?: Record<string, any>): string {
    const resourceId = `server-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const resource: ManagedResource = {
      id: resourceId,
      type: 'server',
      value: server,
      createdAt: new Date(),
      cleanup: async () => {
        if (server && typeof server.stop === 'function') {
          try {
            await server.stop();
          } catch (error) {
            console.warn(`Failed to stop server:`, error);
          }
        } else if (server && typeof server.close === 'function') {
          try {
            await new Promise<void>((resolve) => {
              server.close(() => resolve());
            });
          } catch (error) {
            console.warn(`Failed to close server:`, error);
          }
        }
      },
      metadata
    };

    this.resources.set(resourceId, resource);
    return resourceId;
  }

  /**
   * Register a custom resource with cleanup function
   */
  registerCustomResource(
    type: string,
    value: any,
    cleanup: () => Promise<void>,
    metadata?: Record<string, any>
  ): string {
    const resourceId = `${type}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const resource: ManagedResource = {
      id: resourceId,
      type: type as any,
      value,
      createdAt: new Date(),
      cleanup,
      metadata
    };

    this.resources.set(resourceId, resource);
    return resourceId;
  }

  /**
   * Get resource by ID
   */
  getResource(id: string): ManagedResource | undefined {
    return this.resources.get(id);
  }

  /**
   * Get all resources of a specific type
   */
  getResourcesByType(type: string): ManagedResource[] {
    return Array.from(this.resources.values()).filter(r => r.type === type);
  }

  /**
   * Get resource statistics
   */
  getStats(): ResourceStats {
    const resources = Array.from(this.resources.values());
    const resourcesByType: Record<string, number> = {};
    
    for (const resource of resources) {
      resourcesByType[resource.type] = (resourcesByType[resource.type] || 0) + 1;
    }

    const oldestResource = resources.length > 0 
      ? resources.reduce((oldest, current) => 
          current.createdAt < oldest.createdAt ? current : oldest
        ).createdAt
      : null;

    return {
      totalResources: resources.length,
      resourcesByType,
      oldestResource,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Cleanup a specific resource
   */
  async cleanupResource(id: string): Promise<boolean> {
    const resource = this.resources.get(id);
    if (!resource) {
      return false;
    }

    try {
      await resource.cleanup();
      this.resources.delete(id);
      return true;
    } catch (error) {
      console.warn(`Failed to cleanup resource ${id}:`, error);
      return false;
    }
  }

  /**
   * Cleanup resources by type
   */
  async cleanupResourcesByType(type: string): Promise<number> {
    const resources = this.getResourcesByType(type);
    let cleanedCount = 0;

    const cleanupPromises = resources.map(async (resource) => {
      const success = await this.cleanupResource(resource.id);
      if (success) {
        cleanedCount++;
      }
    });

    await Promise.allSettled(cleanupPromises);
    return cleanedCount;
  }

  /**
   * Cleanup all resources
   */
  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.resources.keys()).map(id => 
      this.cleanupResource(id)
    );

    await Promise.allSettled(cleanupPromises);
    this.resources.clear();
    this.portPool.clear();
  }

  /**
   * Cleanup resources older than specified age
   */
  async cleanupOldResources(maxAgeMs: number): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    const oldResources = Array.from(this.resources.values())
      .filter(r => r.createdAt < cutoffTime);

    let cleanedCount = 0;
    const cleanupPromises = oldResources.map(async (resource) => {
      const success = await this.cleanupResource(resource.id);
      if (success) {
        cleanedCount++;
      }
    });

    await Promise.allSettled(cleanupPromises);
    return cleanedCount;
  }

  /**
   * Check for resource leaks
   */
  detectLeaks(): {
    hasLeaks: boolean;
    leaks: Array<{
      id: string;
      type: string;
      age: number;
      metadata?: Record<string, any>;
    }>;
  } {
    const now = Date.now();
    const leaks = Array.from(this.resources.values()).map(resource => ({
      id: resource.id,
      type: resource.type,
      age: now - resource.createdAt.getTime(),
      metadata: resource.metadata
    }));

    return {
      hasLeaks: leaks.length > 0,
      leaks
    };
  }

  private registerGlobalCleanup(): void {
    if (this.cleanupRegistered) {
      return;
    }

    this.cleanupRegistered = true;

    const cleanup = async () => {
      if (this.resources.size > 0) {
        console.log(`[ResourceManager] Cleaning up ${this.resources.size} resources...`);
        await this.cleanupAll();
      }
    };

    // Cleanup on process exit
    process.on('exit', () => {
      // Synchronous cleanup for exit
      for (const resource of this.resources.values()) {
        try {
          if (resource.type === 'process' && resource.value && !resource.value.killed) {
            resource.value.kill('SIGKILL');
          }
        } catch (error) {
          // Ignore errors during forced cleanup
        }
      }
    });

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await cleanup();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('Unhandled rejection:', reason);
      await cleanup();
      process.exit(1);
    });
  }
}

// Singleton instance
export const resourceManager = ResourceManager.getInstance();

// Convenience functions
export async function allocatePort(options?: PortAllocationOptions): Promise<number> {
  return resourceManager.allocatePort(options);
}

export async function createTempDir(options?: TempDirOptions): Promise<string> {
  return resourceManager.createTempDir(options);
}

export async function createTempFile(content: string, options?: { prefix?: string; suffix?: string; directory?: string }): Promise<string> {
  return resourceManager.createTempFile(content, options);
}

export function registerProcess(process: ChildProcess, metadata?: Record<string, any>): string {
  return resourceManager.registerProcess(process, metadata);
}

export function registerServer(server: any, metadata?: Record<string, any>): string {
  return resourceManager.registerServer(server, metadata);
}

export async function cleanupAll(): Promise<void> {
  return resourceManager.cleanupAll();
}