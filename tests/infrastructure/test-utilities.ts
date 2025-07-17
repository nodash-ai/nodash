import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { TestEnvironment, TestResource } from './test-isolation';

export interface CLITestResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

export interface ServerTestConfig {
  port?: number;
  timeout?: number;
  retries?: number;
  enableLogging?: boolean;
}

export interface TestMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export class CLITestRunner {
  private cliPath: string;
  private defaultEnv: Record<string, string>;

  constructor(cliPath: string, defaultEnv: Record<string, string> = {}) {
    this.cliPath = cliPath;
    this.defaultEnv = defaultEnv;
  }

  async runCommand(
    args: string[], 
    options: {
      env?: Record<string, string>;
      timeout?: number;
      cwd?: string;
    } = {}
  ): Promise<CLITestResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn('node', [this.cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...this.defaultEnv,
          ...options.env
        },
        cwd: options.cwd
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timeout = options.timeout || 30000;
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          child.kill('SIGKILL');
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim() + '\n[TIMEOUT]',
            exitCode: 124, // Standard timeout exit code
            duration: Date.now() - startTime
          });
        }
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            duration: Date.now() - startTime
          });
        }
      });

      child.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            stdout: '',
            stderr: error.message,
            exitCode: 1,
            duration: Date.now() - startTime
          });
        }
      });
    });
  }

  async runCommandWithInput(
    args: string[], 
    input: string,
    options: {
      env?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<CLITestResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn('node', [this.cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...this.defaultEnv,
          ...options.env
        }
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timeout = options.timeout || 30000;
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          child.kill('SIGKILL');
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim() + '\n[TIMEOUT]',
            exitCode: 124,
            duration: Date.now() - startTime
          });
        }
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            duration: Date.now() - startTime
          });
        }
      });

      child.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            stdout: '',
            stderr: error.message,
            exitCode: 1,
            duration: Date.now() - startTime
          });
        }
      });

      // Send input and close stdin
      if (child.stdin) {
        child.stdin.write(input);
        child.stdin.end();
      }
    });
  }
}

export class ServerTestHelper {
  static async waitForServer(
    url: string, 
    config: ServerTestConfig = {}
  ): Promise<boolean> {
    const timeout = config.timeout || 30000;
    const retries = config.retries || 30;
    const retryDelay = timeout / retries;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          if (config.enableLogging) {
            console.log(`Server at ${url} is ready`);
          }
          return true;
        }
      } catch (error) {
        if (config.enableLogging && i === retries - 1) {
          console.warn(`Server at ${url} not ready after ${retries} attempts:`, error);
        }
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    return false;
  }

  static async checkServerHealth(url: string): Promise<{
    healthy: boolean;
    status?: number;
    response?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const responseData = await response.json();

      return {
        healthy: response.ok,
        status: response.status,
        response: responseData
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  static createPortFinder(): {
    getAvailablePort: () => Promise<number>;
    releasePort: (port: number) => void;
  } {
    const usedPorts = new Set<number>();

    return {
      async getAvailablePort(): Promise<number> {
        const net = await import('net');
        
        return new Promise((resolve, reject) => {
          const server = net.createServer();
          
          server.listen(0, () => {
            const address = server.address();
            if (address && typeof address === 'object') {
              const port = address.port;
              server.close(() => {
                if (!usedPorts.has(port)) {
                  usedPorts.add(port);
                  resolve(port);
                } else {
                  // Try again if port is already marked as used
                  this.getAvailablePort().then(resolve).catch(reject);
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
      },

      releasePort(port: number): void {
        usedPorts.delete(port);
      }
    };
  }
}

export class TestMetricsCollector {
  private startMetrics: TestMetrics | null = null;
  private cpuUsageStart: NodeJS.CpuUsage | null = null;

  start(): void {
    this.startMetrics = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryUsage: process.memoryUsage()
    };
    this.cpuUsageStart = process.cpuUsage();
  }

  end(): TestMetrics {
    if (!this.startMetrics) {
      throw new Error('TestMetricsCollector not started');
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const cpuUsageEnd = this.cpuUsageStart ? process.cpuUsage(this.cpuUsageStart) : undefined;

    return {
      startTime: this.startMetrics.startTime,
      endTime,
      duration: endTime - this.startMetrics.startTime,
      memoryUsage: {
        rss: endMemory.rss - this.startMetrics.memoryUsage.rss,
        heapTotal: endMemory.heapTotal - this.startMetrics.memoryUsage.heapTotal,
        heapUsed: endMemory.heapUsed - this.startMetrics.memoryUsage.heapUsed,
        external: endMemory.external - this.startMetrics.memoryUsage.external,
        arrayBuffers: endMemory.arrayBuffers - this.startMetrics.memoryUsage.arrayBuffers
      },
      cpuUsage: cpuUsageEnd
    };
  }

  static formatMetrics(metrics: TestMetrics): string {
    const memoryMB = {
      rss: Math.round(metrics.memoryUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(metrics.memoryUsage.external / 1024 / 1024 * 100) / 100
    };

    let output = `Duration: ${metrics.duration}ms\n`;
    output += `Memory Delta (MB): RSS=${memoryMB.rss}, Heap=${memoryMB.heapUsed}/${memoryMB.heapTotal}, External=${memoryMB.external}`;
    
    if (metrics.cpuUsage) {
      output += `\nCPU Usage: User=${metrics.cpuUsage.user}μs, System=${metrics.cpuUsage.system}μs`;
    }

    return output;
  }
}

export class ConfigurationTestHelper {
  static createTempConfigDir(prefix: string = 'nodash-test'): string {
    const tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);
    return tempDir;
  }

  static async createConfigFile(
    configDir: string, 
    config: Record<string, any>
  ): Promise<string> {
    const fs = await import('fs');
    const configPath = path.join(configDir, 'config.json');
    
    await fs.promises.mkdir(configDir, { recursive: true });
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
    
    return configPath;
  }

  static async readConfigFile(configPath: string): Promise<Record<string, any>> {
    const fs = await import('fs');
    const content = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  }

  static async validateConfigFormat(configPath: string): Promise<{
    valid: boolean;
    errors: string[];
    config?: Record<string, any>;
  }> {
    try {
      const config = await this.readConfigFile(configPath);
      const errors: string[] = [];

      // Basic validation
      if (typeof config !== 'object' || config === null) {
        errors.push('Config must be an object');
      }

      // Add more specific validation as needed
      if (config.baseUrl && typeof config.baseUrl !== 'string') {
        errors.push('baseUrl must be a string');
      }

      if (config.apiToken && typeof config.apiToken !== 'string') {
        errors.push('apiToken must be a string');
      }

      return {
        valid: errors.length === 0,
        errors,
        config: errors.length === 0 ? config : undefined
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to parse config: ${error}`]
      };
    }
  }

  static createEnvironmentVariables(config: Record<string, any>): Record<string, string> {
    const envVars: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      const envKey = `NODASH_${key.toUpperCase()}`;
      envVars[envKey] = String(value);
    }

    return envVars;
  }
}

export class ProcessTestHelper {
  static async killProcessTree(pid: number, signal: string = 'SIGTERM'): Promise<void> {
    try {
      // Try to kill the process group first
      process.kill(-pid, signal);
    } catch (error) {
      // If that fails, try to kill the individual process
      try {
        process.kill(pid, signal);
      } catch (killError) {
        console.warn(`Failed to kill process ${pid}:`, killError);
      }
    }
  }

  static async waitForProcessExit(
    childProcess: ChildProcess, 
    timeout: number = 10000
  ): Promise<{ exitCode: number | null; signal: string | null }> {
    return new Promise((resolve) => {
      let resolved = false;

      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ exitCode: null, signal: 'TIMEOUT' });
        }
      }, timeout);

      childProcess.on('exit', (code, signal) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({ exitCode: code, signal });
        }
      });

      childProcess.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({ exitCode: 1, signal: 'ERROR' });
        }
      });
    });
  }

  static createProcessResource(process: ChildProcess): TestResource {
    return {
      type: 'process',
      process,
      cleanup: async () => {
        if (!process.killed && process.pid) {
          process.kill('SIGTERM');
          await ProcessTestHelper.waitForProcessExit(process, 5000);
          
          if (!process.killed && process.pid) {
            process.kill('SIGKILL');
          }
        }
      }
    };
  }
}

export class TestDataGenerator {
  static generateRandomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateTestEvent(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      event: `test_event_${this.generateRandomString(8)}`,
      timestamp: new Date().toISOString(),
      userId: `user_${this.generateRandomString(6)}`,
      sessionId: `session_${this.generateRandomString(8)}`,
      properties: {
        source: 'test',
        environment: 'test',
        version: '1.0.0-test',
        ...overrides.properties
      },
      ...overrides
    };
  }

  static generateLargePayload(sizeKB: number = 100): Record<string, any> {
    const targetSize = sizeKB * 1024;
    const baseEvent = this.generateTestEvent();
    
    // Add large data field to reach target size
    const dataSize = Math.max(0, targetSize - JSON.stringify(baseEvent).length - 100);
    baseEvent.largeData = this.generateRandomString(dataSize);
    
    return baseEvent;
  }

  static generateTestConfiguration(overrides: Record<string, any> = {}): Record<string, any> {
    return {
      baseUrl: 'http://localhost:3000',
      apiToken: `test_token_${this.generateRandomString(16)}`,
      environment: 'test',
      timeout: 30000,
      retries: 3,
      ...overrides
    };
  }
}