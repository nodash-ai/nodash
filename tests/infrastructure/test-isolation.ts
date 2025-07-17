import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

export interface TestEnvironment {
  id: string;
  tempDirectory: string;
  configDirectory: string;
  processes: ChildProcess[];
  resources: TestResource[];
  startTime: number;
}

export interface TestResource {
  type: 'file' | 'directory' | 'process' | 'server' | 'network';
  path?: string;
  process?: ChildProcess;
  cleanup: () => Promise<void>;
}

export interface IsolationConfig {
  tempDirectory?: string;
  cleanupTimeout: number;
  stateResetEnabled: boolean;
  processCleanupEnabled: boolean;
  maxEnvironments: number;
}

export class TestEnvironmentManager {
  private environments: Map<string, TestEnvironment> = new Map();
  private config: IsolationConfig;

  constructor(config: Partial<IsolationConfig> = {}) {
    this.config = {
      tempDirectory: path.join(os.tmpdir(), 'nodash-test'),
      cleanupTimeout: 10000,
      stateResetEnabled: true,
      processCleanupEnabled: true,
      maxEnvironments: 10,
      ...config
    };
  }

  async createIsolatedEnvironment(): Promise<TestEnvironment> {
    const envId = `test-env-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Clean up old environments if we're at the limit
    if (this.environments.size >= this.config.maxEnvironments) {
      await this.cleanupOldestEnvironment();
    }

    const tempDirectory = path.join(this.config.tempDirectory!, envId);
    const configDirectory = path.join(tempDirectory, 'config');

    // Create directories
    await fs.promises.mkdir(tempDirectory, { recursive: true });
    await fs.promises.mkdir(configDirectory, { recursive: true });

    const environment: TestEnvironment = {
      id: envId,
      tempDirectory,
      configDirectory,
      processes: [],
      resources: [],
      startTime: Date.now()
    };

    this.environments.set(envId, environment);
    return environment;
  }

  async resetState(environment: TestEnvironment): Promise<void> {
    if (!this.config.stateResetEnabled) {
      return;
    }

    // Reset file system state
    await this.cleanupDirectory(environment.tempDirectory);
    await fs.promises.mkdir(environment.configDirectory, { recursive: true });

    // Reset process state
    if (this.config.processCleanupEnabled) {
      await this.cleanupProcesses(environment);
    }

    // Reset resources
    await this.cleanupResources(environment.resources);
    environment.resources = [];
  }

  async cleanupResources(resources: TestResource[]): Promise<void> {
    const cleanupPromises = resources.map(async (resource) => {
      try {
        await Promise.race([
          resource.cleanup(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cleanup timeout')), this.config.cleanupTimeout)
          )
        ]);
      } catch (error) {
        console.warn(`Failed to cleanup resource ${resource.type}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
  }

  async manageProcesses(processes: ChildProcess[]): Promise<ProcessResult> {
    const results: ProcessResult = {
      started: [],
      failed: [],
      cleaned: []
    };

    for (const process of processes) {
      try {
        if (process.pid) {
          results.started.push(process.pid);
        } else {
          results.failed.push('Process failed to start');
        }
      } catch (error) {
        results.failed.push(`Process error: ${error}`);
      }
    }

    return results;
  }

  async validateIsolation(): Promise<IsolationValidation> {
    const validation: IsolationValidation = {
      environmentCount: this.environments.size,
      isolatedDirectories: [],
      activeProcesses: 0,
      memoryUsage: process.memoryUsage(),
      issues: []
    };

    // Check each environment
    for (const [id, env] of this.environments) {
      try {
        // Validate directory isolation
        const exists = await fs.promises.access(env.tempDirectory).then(() => true).catch(() => false);
        if (exists) {
          validation.isolatedDirectories.push(env.tempDirectory);
        } else {
          validation.issues.push(`Environment ${id} directory missing: ${env.tempDirectory}`);
        }

        // Count active processes
        validation.activeProcesses += env.processes.filter(p => !p.killed).length;

        // Check for resource leaks
        if (env.resources.length > 0) {
          validation.issues.push(`Environment ${id} has ${env.resources.length} uncleaned resources`);
        }
      } catch (error) {
        validation.issues.push(`Environment ${id} validation error: ${error}`);
      }
    }

    return validation;
  }

  async cleanup(environmentId?: string): Promise<void> {
    if (environmentId) {
      const environment = this.environments.get(environmentId);
      if (environment) {
        await this.cleanupEnvironment(environment);
        this.environments.delete(environmentId);
      }
    } else {
      // Cleanup all environments
      const cleanupPromises = Array.from(this.environments.values()).map(env => 
        this.cleanupEnvironment(env)
      );
      await Promise.allSettled(cleanupPromises);
      this.environments.clear();
    }
  }

  private async cleanupEnvironment(environment: TestEnvironment): Promise<void> {
    // Cleanup processes
    await this.cleanupProcesses(environment);

    // Cleanup resources
    await this.cleanupResources(environment.resources);

    // Cleanup directories
    await this.cleanupDirectory(environment.tempDirectory);
  }

  private async cleanupProcesses(environment: TestEnvironment): Promise<void> {
    const killPromises = environment.processes.map(async (process) => {
      if (!process.killed && process.pid) {
        try {
          process.kill('SIGTERM');
          
          // Wait for graceful shutdown, then force kill if needed
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
    });

    await Promise.allSettled(killPromises);
    environment.processes = [];
  }

  private async cleanupDirectory(dirPath: string): Promise<void> {
    try {
      if (await fs.promises.access(dirPath).then(() => true).catch(() => false)) {
        await fs.promises.rm(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Failed to cleanup directory ${dirPath}:`, error);
    }
  }

  private async cleanupOldestEnvironment(): Promise<void> {
    let oldestEnv: TestEnvironment | null = null;
    let oldestTime = Date.now();

    for (const env of this.environments.values()) {
      if (env.startTime < oldestTime) {
        oldestTime = env.startTime;
        oldestEnv = env;
      }
    }

    if (oldestEnv) {
      await this.cleanupEnvironment(oldestEnv);
      this.environments.delete(oldestEnv.id);
    }
  }

  getEnvironment(id: string): TestEnvironment | undefined {
    return this.environments.get(id);
  }

  getAllEnvironments(): TestEnvironment[] {
    return Array.from(this.environments.values());
  }
}

export interface ProcessResult {
  started: number[];
  failed: string[];
  cleaned: number[];
}

export interface IsolationValidation {
  environmentCount: number;
  isolatedDirectories: string[];
  activeProcesses: number;
  memoryUsage: NodeJS.MemoryUsage;
  issues: string[];
}

export class StateResetHandler {
  private resetHandlers: Map<string, () => Promise<void>> = new Map();

  registerResetHandler(name: string, handler: () => Promise<void>): void {
    this.resetHandlers.set(name, handler);
  }

  async resetAll(): Promise<void> {
    const resetPromises = Array.from(this.resetHandlers.entries()).map(async ([name, handler]) => {
      try {
        await handler();
      } catch (error) {
        console.warn(`Failed to reset ${name}:`, error);
      }
    });

    await Promise.allSettled(resetPromises);
  }

  async reset(name: string): Promise<void> {
    const handler = this.resetHandlers.get(name);
    if (handler) {
      await handler();
    }
  }

  unregisterResetHandler(name: string): void {
    this.resetHandlers.delete(name);
  }
}

export class ResourceCleanupManager {
  private resources: TestResource[] = [];

  addResource(resource: TestResource): void {
    this.resources.push(resource);
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = this.resources.map(async (resource) => {
      try {
        await resource.cleanup();
      } catch (error) {
        console.warn(`Failed to cleanup ${resource.type} resource:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    this.resources = [];
  }

  async cleanupByType(type: TestResource['type']): Promise<void> {
    const typeResources = this.resources.filter(r => r.type === type);
    const cleanupPromises = typeResources.map(async (resource) => {
      try {
        await resource.cleanup();
      } catch (error) {
        console.warn(`Failed to cleanup ${resource.type} resource:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
    this.resources = this.resources.filter(r => r.type !== type);
  }

  getResourceCount(): number {
    return this.resources.length;
  }

  getResourcesByType(type: TestResource['type']): TestResource[] {
    return this.resources.filter(r => r.type === type);
  }
}