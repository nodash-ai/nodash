import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface CLIExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  command: string;
  args: string[];
}

export interface CLIExecutionOptions {
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  input?: string;
  expectFailure?: boolean;
}

export interface ServerHealthCheck {
  url: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  expectedStatus?: number;
}

export interface ProcessWaitOptions {
  timeout?: number;
  expectedExitCode?: number;
  killSignal?: string;
}

/**
 * CLI execution utilities for testing command-line interfaces
 */
export class CLITestHelper {
  private static defaultTimeout = 30000; // 30 seconds

  /**
   * Execute a CLI command and return the result
   */
  static async executeCommand(
    command: string,
    args: string[] = [],
    options: CLIExecutionOptions = {}
  ): Promise<CLIExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.defaultTimeout;

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...options.env
        },
        cwd: options.cwd || process.cwd()
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          child.kill('SIGKILL');
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim() + '\n[TIMEOUT]',
            exitCode: 124, // Standard timeout exit code
            duration: Date.now() - startTime,
            command,
            args
          });
        }
      }, timeout);

      // Collect output
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      child.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code || 0,
            duration: Date.now() - startTime,
            command,
            args
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
            duration: Date.now() - startTime,
            command,
            args
          });
        }
      });

      // Send input if provided
      if (options.input && child.stdin) {
        child.stdin.write(options.input);
        child.stdin.end();
      }
    });
  }

  /**
   * Execute a Node.js CLI script
   */
  static async executeNodeCLI(
    scriptPath: string,
    args: string[] = [],
    options: CLIExecutionOptions = {}
  ): Promise<CLIExecutionResult> {
    return this.executeCommand('node', [scriptPath, ...args], options);
  }

  /**
   * Execute the Nodash CLI with given arguments
   */
  static async executeNodashCLI(
    args: string[] = [],
    options: CLIExecutionOptions = {}
  ): Promise<CLIExecutionResult> {
    const cliPath = path.resolve(__dirname, '../../packages/nodash-cli/dist/cli.js');
    return this.executeNodeCLI(cliPath, args, options);
  }

  /**
   * Validate CLI execution result
   */
  static validateResult(
    result: CLIExecutionResult,
    expectations: {
      exitCode?: number;
      stdoutContains?: string[];
      stderrContains?: string[];
      stdoutNotContains?: string[];
      stderrNotContains?: string[];
      maxDuration?: number;
    }
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check exit code
    if (expectations.exitCode !== undefined && result.exitCode !== expectations.exitCode) {
      errors.push(`Expected exit code ${expectations.exitCode}, got ${result.exitCode}`);
    }

    // Check stdout contains
    if (expectations.stdoutContains) {
      for (const text of expectations.stdoutContains) {
        if (!result.stdout.includes(text)) {
          errors.push(`Expected stdout to contain "${text}"`);
        }
      }
    }

    // Check stderr contains
    if (expectations.stderrContains) {
      for (const text of expectations.stderrContains) {
        if (!result.stderr.includes(text)) {
          errors.push(`Expected stderr to contain "${text}"`);
        }
      }
    }

    // Check stdout does not contain
    if (expectations.stdoutNotContains) {
      for (const text of expectations.stdoutNotContains) {
        if (result.stdout.includes(text)) {
          errors.push(`Expected stdout to not contain "${text}"`);
        }
      }
    }

    // Check stderr does not contain
    if (expectations.stderrNotContains) {
      for (const text of expectations.stderrNotContains) {
        if (result.stderr.includes(text)) {
          errors.push(`Expected stderr to not contain "${text}"`);
        }
      }
    }

    // Check duration
    if (expectations.maxDuration !== undefined && result.duration > expectations.maxDuration) {
      errors.push(`Expected duration <= ${expectations.maxDuration}ms, got ${result.duration}ms`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Server testing utilities
 */
export class ServerTestHelper {
  /**
   * Wait for a server to become healthy
   */
  static async waitForServerHealth(options: ServerHealthCheck): Promise<boolean> {
    const {
      url,
      timeout = 30000,
      retries = 30,
      retryDelay = timeout / retries,
      expectedStatus = 200
    } = options;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (response.status === expectedStatus) {
          return true;
        }
      } catch (error) {
        // Server not ready yet, continue retrying
      }

      if (i < retries - 1) {
        await this.delay(retryDelay);
      }
    }

    return false;
  }

  /**
   * Check server health and return detailed information
   */
  static async checkServerHealth(url: string): Promise<{
    healthy: boolean;
    status?: number;
    response?: any;
    error?: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      const responseData = await response.json();
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.ok,
        status: response.status,
        response: responseData,
        responseTime
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test server endpoint with various HTTP methods
   */
  static async testEndpoint(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      expectedStatus?: number;
      timeout?: number;
    } = {}
  ): Promise<{
    success: boolean;
    status: number;
    headers: Record<string, string>;
    body: any;
    responseTime: number;
    error?: string;
  }> {
    const {
      method = 'GET',
      headers = {},
      body,
      expectedStatus,
      timeout = 10000
    } = options;

    const startTime = Date.now();

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: AbortSignal.timeout(timeout)
      };

      if (body && method !== 'GET') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const responseBody = await response.json().catch(() => null);
      const responseTime = Date.now() - startTime;

      const success = expectedStatus ? response.status === expectedStatus : response.ok;

      return {
        success,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        responseTime
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        headers: {},
        body: null,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Process management utilities
 */
export class ProcessTestHelper {
  /**
   * Wait for a process to exit with optional timeout
   */
  static async waitForProcessExit(
    process: ChildProcess,
    options: ProcessWaitOptions = {}
  ): Promise<{
    exitCode: number | null;
    signal: string | null;
    timedOut: boolean;
  }> {
    const { timeout = 10000, expectedExitCode, killSignal = 'SIGTERM' } = options;

    return new Promise((resolve) => {
      let resolved = false;

      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (!process.killed && process.pid) {
            process.kill(killSignal);
          }
          resolve({
            exitCode: null,
            signal: 'TIMEOUT',
            timedOut: true
          });
        }
      }, timeout);

      process.on('exit', (code, signal) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            exitCode: code,
            signal,
            timedOut: false
          });
        }
      });

      process.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve({
            exitCode: 1,
            signal: 'ERROR',
            timedOut: false
          });
        }
      });
    });
  }

  /**
   * Kill a process tree (process and all its children)
   */
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
}

/**
 * File system utilities for testing
 */
export class FileSystemTestHelper {
  /**
   * Create a temporary file with content
   */
  static async createTempFile(
    content: string,
    options: {
      prefix?: string;
      suffix?: string;
      directory?: string;
    } = {}
  ): Promise<string> {
    const { prefix = 'test-', suffix = '.tmp', directory } = options;
    const tempDir = directory || path.join(process.cwd(), 'temp');
    
    // Ensure temp directory exists
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    const filename = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 8)}${suffix}`;
    const filepath = path.join(tempDir, filename);
    
    await fs.promises.writeFile(filepath, content);
    return filepath;
  }

  /**
   * Create a temporary directory structure
   */
  static async createTempDirectory(
    structure: Record<string, string | Record<string, any>>,
    baseDir?: string
  ): Promise<string> {
    const tempDir = baseDir || await fs.promises.mkdtemp(
      path.join(process.cwd(), 'temp', 'test-dir-')
    );

    await fs.promises.mkdir(tempDir, { recursive: true });

    for (const [name, content] of Object.entries(structure)) {
      const itemPath = path.join(tempDir, name);

      if (typeof content === 'string') {
        // It's a file
        await fs.promises.writeFile(itemPath, content);
      } else {
        // It's a directory
        await fs.promises.mkdir(itemPath, { recursive: true });
        await this.createTempDirectory(content, itemPath);
      }
    }

    return tempDir;
  }

  /**
   * Verify file exists and has expected content
   */
  static async verifyFileContent(
    filepath: string,
    expectedContent: string | RegExp
  ): Promise<{ exists: boolean; matches: boolean; actualContent?: string; error?: string }> {
    try {
      const actualContent = await fs.promises.readFile(filepath, 'utf-8');
      const matches = typeof expectedContent === 'string' 
        ? actualContent === expectedContent
        : expectedContent.test(actualContent);

      return {
        exists: true,
        matches,
        actualContent
      };
    } catch (error) {
      return {
        exists: false,
        matches: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Clean up temporary files and directories
   */
  static async cleanup(paths: string[]): Promise<void> {
    const cleanupPromises = paths.map(async (path) => {
      try {
        await fs.promises.rm(path, { recursive: true, force: true });
      } catch (error) {
        console.warn(`Failed to cleanup ${path}:`, error);
      }
    });

    await Promise.allSettled(cleanupPromises);
  }
}

/**
 * Timing and performance utilities
 */
export class TimingTestHelper {
  /**
   * Measure execution time of an async function
   */
  static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  /**
   * Wait for a condition to become true with timeout
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      timeoutMessage?: string;
    } = {}
  ): Promise<boolean> {
    const {
      timeout = 10000,
      interval = 100,
      timeoutMessage = 'Condition timeout'
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return true;
        }
      } catch (error) {
        // Condition check failed, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error(timeoutMessage);
  }

  /**
   * Create a delay promise
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Convenience exports
export const cli = CLITestHelper;
export const server = ServerTestHelper;
export const process = ProcessTestHelper;
export const fs = FileSystemTestHelper;
export const timing = TimingTestHelper;