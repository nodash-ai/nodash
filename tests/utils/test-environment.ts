import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MockServer } from './mock-server';
import { TestEnvironmentManager, TestResource } from '../infrastructure/test-isolation';

export interface TestEnvironment {
  id: string;
  tempDir: string;
  configDir: string;
  mockServer: MockServer;
  apiServer?: any; // Will be typed properly when we implement API server tests
  resources: TestResource[];
  cleanup(): Promise<void>;
}

export interface TestEnvironmentOptions {
  enableMockServer?: boolean;
  enableApiServer?: boolean;
  mockServerOptions?: {
    port?: number;
    enableLogging?: boolean;
    enableCors?: boolean;
  };
  apiServerOptions?: {
    port?: number;
    storage?: string;
  };
  tempDirPrefix?: string;
  autoCleanup?: boolean;
}

export class TestEnvironmentFactory {
  private static environments: Set<TestEnvironment> = new Set();
  private static cleanupRegistered = false;

  static async createIsolated(options: TestEnvironmentOptions = {}): Promise<TestEnvironment> {
    const envId = `test-env-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), options.tempDirPrefix || 'nodash-test-')
    );
    const configDir = path.join(tempDir, 'config');

    // Create config directory
    await fs.promises.mkdir(configDir, { recursive: true });

    // Create mock server if enabled (default: true)
    let mockServer: MockServer | null = null;
    if (options.enableMockServer !== false) {
      mockServer = new MockServer({
        port: 0, // Auto-assign port
        enableLogging: options.mockServerOptions?.enableLogging || false,
        enableCors: options.mockServerOptions?.enableCors !== false,
        ...options.mockServerOptions
      });
      await mockServer.start();
    }

    // Create API server if enabled (default: false)
    let apiServer: any = null;
    if (options.enableApiServer) {
      // This will be implemented when we work on API server tests
      // For now, we'll leave it as a placeholder
    }

    const resources: TestResource[] = [];

    // Add mock server as a resource
    if (mockServer) {
      resources.push({
        type: 'server',
        cleanup: async () => {
          await mockServer!.stop();
        }
      });
    }

    // Add API server as a resource
    if (apiServer) {
      resources.push({
        type: 'server',
        cleanup: async () => {
          await apiServer.stop();
        }
      });
    }

    // Add temp directory as a resource
    resources.push({
      type: 'directory',
      path: tempDir,
      cleanup: async () => {
        try {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (error) {
          console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
        }
      }
    });

    const environment: TestEnvironment = {
      id: envId,
      tempDir,
      configDir,
      mockServer: mockServer!,
      apiServer,
      resources,
      cleanup: async () => {
        await TestEnvironmentFactory.cleanupEnvironment(environment);
      }
    };

    // Register environment for tracking
    this.environments.add(environment);

    // Register global cleanup if not already done
    if (!this.cleanupRegistered && options.autoCleanup !== false) {
      this.registerGlobalCleanup();
    }

    return environment;
  }

  static async createWithRealAPI(options: TestEnvironmentOptions = {}): Promise<TestEnvironment> {
    return this.createIsolated({
      ...options,
      enableApiServer: true
    });
  }

  static async createWithMockOnly(options: TestEnvironmentOptions = {}): Promise<TestEnvironment> {
    return this.createIsolated({
      ...options,
      enableMockServer: true,
      enableApiServer: false
    });
  }

  private static async cleanupEnvironment(environment: TestEnvironment): Promise<void> {
    // Remove from tracking
    this.environments.delete(environment);

    // Cleanup all resources
    const cleanupPromises = environment.resources.map(async (resource) => {
      try {
        await resource.cleanup();
      } catch (error) {
        console.warn(`Failed to cleanup resource ${resource.type}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.environments).map(env => 
      this.cleanupEnvironment(env)
    );
    await Promise.allSettled(cleanupPromises);
    this.environments.clear();
  }

  static getActiveEnvironments(): TestEnvironment[] {
    return Array.from(this.environments);
  }

  static getEnvironmentCount(): number {
    return this.environments.size;
  }

  private static registerGlobalCleanup(): void {
    if (this.cleanupRegistered) {
      return;
    }

    this.cleanupRegistered = true;

    // Cleanup on process exit
    const cleanup = async () => {
      if (this.environments.size > 0) {
        console.log(`[TestEnvironment] Cleaning up ${this.environments.size} test environments...`);
        await this.cleanupAll();
      }
    };

    process.on('exit', () => {
      // Synchronous cleanup for exit
      for (const env of this.environments) {
        try {
          if (env.mockServer) {
            // Force close without waiting
            (env.mockServer as any).server?.close();
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

// Resource management utilities
export class ResourceManager {
  private static portPool = new Set<number>();
  private static tempDirs = new Set<string>();

  static async allocatePort(): Promise<number> {
    const net = await import('net');
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          server.close(() => {
            if (!this.portPool.has(port)) {
              this.portPool.add(port);
              resolve(port);
            } else {
              // Try again if port is already allocated
              this.allocatePort().then(resolve).catch(reject);
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

  static releasePort(port: number): void {
    this.portPool.delete(port);
  }

  static async createTempDir(prefix: string = 'nodash-test'): Promise<string> {
    const tempDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), `${prefix}-`)
    );
    this.tempDirs.add(tempDir);
    return tempDir;
  }

  static async cleanupTempDir(tempDir: string): Promise<void> {
    if (this.tempDirs.has(tempDir)) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        this.tempDirs.delete(tempDir);
      } catch (error) {
        console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
      }
    }
  }

  static async cleanupAll(): Promise<void> {
    // Cleanup temp directories
    const cleanupPromises = Array.from(this.tempDirs).map(dir => 
      this.cleanupTempDir(dir)
    );
    await Promise.allSettled(cleanupPromises);

    // Clear port pool
    this.portPool.clear();
  }

  static getStats(): {
    allocatedPorts: number[];
    tempDirectories: string[];
  } {
    return {
      allocatedPorts: Array.from(this.portPool),
      tempDirectories: Array.from(this.tempDirs)
    };
  }
}

// Configuration helpers for test environments
export class ConfigurationHelper {
  static async createConfigFile(
    configDir: string,
    config: Record<string, any>,
    filename: string = 'config.json'
  ): Promise<string> {
    const configPath = path.join(configDir, filename);
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    return configPath;
  }

  static async readConfigFile(configPath: string): Promise<Record<string, any>> {
    const content = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  static createEnvironmentVariables(
    config: Record<string, any>,
    prefix: string = 'NODASH'
  ): Record<string, string> {
    const envVars: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      const envKey = `${prefix}_${key.toUpperCase()}`;
      envVars[envKey] = String(value);
    }

    return envVars;
  }

  static mergeConfigurations(...configs: Record<string, any>[]): Record<string, any> {
    return configs.reduce((merged, config) => ({ ...merged, ...config }), {});
  }
}

// Convenience functions
export async function createTestEnvironment(options?: TestEnvironmentOptions): Promise<TestEnvironment> {
  return TestEnvironmentFactory.createIsolated(options);
}

export async function createTestEnvironmentWithAPI(options?: TestEnvironmentOptions): Promise<TestEnvironment> {
  return TestEnvironmentFactory.createWithRealAPI(options);
}

export async function createMockOnlyEnvironment(options?: TestEnvironmentOptions): Promise<TestEnvironment> {
  return TestEnvironmentFactory.createWithMockOnly(options);
}