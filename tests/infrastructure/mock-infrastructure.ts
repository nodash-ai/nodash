import * as fs from 'fs';
import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface NetworkCondition {
  type: 'timeout' | 'connection_refused' | 'slow' | 'intermittent' | 'normal';
  delay?: number;
  failureRate?: number;
  timeoutMs?: number;
}

export interface MockConfig {
  network: NetworkCondition;
  filesystem: FilesystemMockConfig;
  process: ProcessMockConfig;
  time: TimeMockConfig;
}

export interface FilesystemMockConfig {
  readDelay?: number;
  writeDelay?: number;
  failureRate?: number;
  permissions?: Record<string, string>;
}

export interface ProcessMockConfig {
  exitCodes?: Record<string, number>;
  outputs?: Record<string, { stdout: string; stderr: string }>;
  delays?: Record<string, number>;
}

export interface TimeMockConfig {
  accelerationFactor?: number;
  fixedTime?: Date;
  delays?: Record<string, number>;
}

export class NetworkMocker {
  private originalFetch: typeof fetch;
  private condition: NetworkCondition;
  private requestLog: Array<{ url: string; timestamp: number; response?: any; error?: any }> = [];

  constructor(condition: NetworkCondition = { type: 'normal' }) {
    this.condition = condition;
    this.originalFetch = global.fetch;
  }

  enable(): void {
    global.fetch = this.mockFetch.bind(this);
  }

  disable(): void {
    global.fetch = this.originalFetch;
  }

  setCondition(condition: NetworkCondition): void {
    this.condition = condition;
  }

  getRequestLog(): typeof this.requestLog {
    return [...this.requestLog];
  }

  clearLog(): void {
    this.requestLog = [];
  }

  private async mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const logEntry = { url, timestamp: Date.now() };

    try {
      // Apply network condition
      switch (this.condition.type) {
        case 'timeout':
          await this.delay(this.condition.timeoutMs || 30000);
          throw new Error('Network timeout');

        case 'connection_refused':
          throw new Error('Connection refused');

        case 'slow':
          await this.delay(this.condition.delay || 5000);
          break;

        case 'intermittent':
          if (Math.random() < (this.condition.failureRate || 0.3)) {
            throw new Error('Intermittent network failure');
          }
          break;

        case 'normal':
        default:
          // No delay or modification
          break;
      }

      // Make actual request
      const response = await this.originalFetch(input, init);
      logEntry.response = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };

      this.requestLog.push(logEntry);
      return response;

    } catch (error) {
      logEntry.error = error;
      this.requestLog.push(logEntry);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class FilesystemMocker {
  private originalMethods: {
    readFile: typeof fs.promises.readFile;
    writeFile: typeof fs.promises.writeFile;
    access: typeof fs.promises.access;
    mkdir: typeof fs.promises.mkdir;
    rm: typeof fs.promises.rm;
  };
  private config: FilesystemMockConfig;
  private operationLog: Array<{ operation: string; path: string; timestamp: number; success: boolean }> = [];

  constructor(config: FilesystemMockConfig = {}) {
    this.config = config;
    this.originalMethods = {
      readFile: fs.promises.readFile,
      writeFile: fs.promises.writeFile,
      access: fs.promises.access,
      mkdir: fs.promises.mkdir,
      rm: fs.promises.rm
    };
  }

  enable(): void {
    fs.promises.readFile = this.mockReadFile.bind(this);
    fs.promises.writeFile = this.mockWriteFile.bind(this);
    fs.promises.access = this.mockAccess.bind(this);
    fs.promises.mkdir = this.mockMkdir.bind(this);
    fs.promises.rm = this.mockRm.bind(this);
  }

  disable(): void {
    fs.promises.readFile = this.originalMethods.readFile;
    fs.promises.writeFile = this.originalMethods.writeFile;
    fs.promises.access = this.originalMethods.access;
    fs.promises.mkdir = this.originalMethods.mkdir;
    fs.promises.rm = this.originalMethods.rm;
  }

  getOperationLog(): typeof this.operationLog {
    return [...this.operationLog];
  }

  clearLog(): void {
    this.operationLog = [];
  }

  private async mockReadFile(filePath: fs.PathLike, options?: any): Promise<any> {
    const pathStr = filePath.toString();
    const logEntry = { operation: 'readFile', path: pathStr, timestamp: Date.now(), success: false };

    try {
      if (this.config.readDelay) {
        await this.delay(this.config.readDelay);
      }

      if (this.config.failureRate && Math.random() < this.config.failureRate) {
        throw new Error('Simulated filesystem read failure');
      }

      const result = await this.originalMethods.readFile(filePath, options);
      logEntry.success = true;
      this.operationLog.push(logEntry);
      return result;
    } catch (error) {
      this.operationLog.push(logEntry);
      throw error;
    }
  }

  private async mockWriteFile(filePath: fs.PathLike, data: any, options?: any): Promise<void> {
    const pathStr = filePath.toString();
    const logEntry = { operation: 'writeFile', path: pathStr, timestamp: Date.now(), success: false };

    try {
      if (this.config.writeDelay) {
        await this.delay(this.config.writeDelay);
      }

      if (this.config.failureRate && Math.random() < this.config.failureRate) {
        throw new Error('Simulated filesystem write failure');
      }

      await this.originalMethods.writeFile(filePath, data, options);
      logEntry.success = true;
      this.operationLog.push(logEntry);
    } catch (error) {
      this.operationLog.push(logEntry);
      throw error;
    }
  }

  private async mockAccess(filePath: fs.PathLike, mode?: number): Promise<void> {
    const pathStr = filePath.toString();
    const logEntry = { operation: 'access', path: pathStr, timestamp: Date.now(), success: false };

    try {
      await this.originalMethods.access(filePath, mode);
      logEntry.success = true;
      this.operationLog.push(logEntry);
    } catch (error) {
      this.operationLog.push(logEntry);
      throw error;
    }
  }

  private async mockMkdir(filePath: fs.PathLike, options?: any): Promise<any> {
    const pathStr = filePath.toString();
    const logEntry = { operation: 'mkdir', path: pathStr, timestamp: Date.now(), success: false };

    try {
      const result = await this.originalMethods.mkdir(filePath, options);
      logEntry.success = true;
      this.operationLog.push(logEntry);
      return result;
    } catch (error) {
      this.operationLog.push(logEntry);
      throw error;
    }
  }

  private async mockRm(filePath: fs.PathLike, options?: any): Promise<void> {
    const pathStr = filePath.toString();
    const logEntry = { operation: 'rm', path: pathStr, timestamp: Date.now(), success: false };

    try {
      await this.originalMethods.rm(filePath, options);
      logEntry.success = true;
      this.operationLog.push(logEntry);
    } catch (error) {
      this.operationLog.push(logEntry);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class ProcessMocker {
  private config: ProcessMockConfig;
  private processLog: Array<{ command: string; args: string[]; timestamp: number; pid?: number }> = [];
  private originalSpawn: typeof spawn;

  constructor(config: ProcessMockConfig = {}) {
    this.config = config;
    this.originalSpawn = spawn;
  }

  enable(): void {
    // Note: This is a simplified mock - in real implementation you'd need to handle more cases
    const originalSpawn = spawn;
    const self = this;

    (global as any).spawn = function(command: string, args: string[] = [], options: any = {}) {
      return self.mockSpawn(command, args, options);
    };
  }

  disable(): void {
    (global as any).spawn = this.originalSpawn;
  }

  getProcessLog(): typeof this.processLog {
    return [...this.processLog];
  }

  clearLog(): void {
    this.processLog = [];
  }

  private mockSpawn(command: string, args: string[] = [], options: any = {}): ChildProcess {
    const logEntry = { command, args, timestamp: Date.now() };
    
    // Create a mock child process
    const mockProcess = new EventEmitter() as ChildProcess;
    mockProcess.pid = Math.floor(Math.random() * 10000) + 1000;
    mockProcess.killed = false;
    mockProcess.exitCode = null;
    mockProcess.signalCode = null;

    logEntry.pid = mockProcess.pid;
    this.processLog.push(logEntry);

    // Mock stdin, stdout, stderr
    mockProcess.stdin = null;
    mockProcess.stdout = new EventEmitter() as any;
    mockProcess.stderr = new EventEmitter() as any;

    // Mock kill method
    mockProcess.kill = (signal?: string | number) => {
      mockProcess.killed = true;
      mockProcess.exitCode = signal === 'SIGKILL' ? 137 : 0;
      setTimeout(() => {
        mockProcess.emit('exit', mockProcess.exitCode, signal);
      }, 10);
      return true;
    };

    // Simulate process behavior
    setTimeout(() => {
      const commandKey = `${command} ${args.join(' ')}`.trim();
      const mockOutput = this.config.outputs?.[commandKey];
      const exitCode = this.config.exitCodes?.[commandKey] || 0;
      const delay = this.config.delays?.[commandKey] || 100;

      setTimeout(() => {
        if (mockOutput) {
          if (mockOutput.stdout) {
            mockProcess.stdout?.emit('data', Buffer.from(mockOutput.stdout));
          }
          if (mockOutput.stderr) {
            mockProcess.stderr?.emit('data', Buffer.from(mockOutput.stderr));
          }
        }

        mockProcess.exitCode = exitCode;
        mockProcess.emit('close', exitCode);
        mockProcess.emit('exit', exitCode);
      }, delay);
    }, 10);

    return mockProcess;
  }
}

export class TimeMocker {
  private config: TimeMockConfig;
  private originalMethods: {
    setTimeout: typeof setTimeout;
    setInterval: typeof setInterval;
    Date: typeof Date;
  };
  private mockTime: number;
  private timeouts: Map<any, { callback: Function; delay: number; startTime: number }> = new Map();

  constructor(config: TimeMockConfig = {}) {
    this.config = config;
    this.mockTime = config.fixedTime ? config.fixedTime.getTime() : Date.now();
    this.originalMethods = {
      setTimeout: global.setTimeout,
      setInterval: global.setInterval,
      Date: global.Date
    };
  }

  enable(): void {
    const self = this;

    // Mock setTimeout
    global.setTimeout = function(callback: Function, delay: number, ...args: any[]) {
      const adjustedDelay = self.config.accelerationFactor 
        ? delay / self.config.accelerationFactor 
        : delay;

      const timeoutId = self.originalMethods.setTimeout(() => {
        self.timeouts.delete(timeoutId);
        callback(...args);
      }, adjustedDelay);

      self.timeouts.set(timeoutId, { callback, delay, startTime: self.mockTime });
      return timeoutId;
    } as any;

    // Mock Date if fixed time is set
    if (this.config.fixedTime) {
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(self.mockTime);
          } else {
            super(...args);
          }
        }

        static now() {
          return self.mockTime;
        }
      } as any;
    }
  }

  disable(): void {
    global.setTimeout = this.originalMethods.setTimeout;
    global.setInterval = this.originalMethods.setInterval;
    global.Date = this.originalMethods.Date;
  }

  advanceTime(ms: number): void {
    this.mockTime += ms;
  }

  setTime(time: Date): void {
    this.mockTime = time.getTime();
  }

  getActiveTimeouts(): number {
    return this.timeouts.size;
  }
}

export class MockInfrastructure {
  private network: NetworkMocker;
  private filesystem: FilesystemMocker;
  private process: ProcessMocker;
  private time: TimeMocker;
  private enabled: boolean = false;

  constructor(config: Partial<MockConfig> = {}) {
    this.network = new NetworkMocker(config.network);
    this.filesystem = new FilesystemMocker(config.filesystem);
    this.process = new ProcessMocker(config.process);
    this.time = new TimeMocker(config.time);
  }

  enableAll(): void {
    this.network.enable();
    this.filesystem.enable();
    this.process.enable();
    this.time.enable();
    this.enabled = true;
  }

  disableAll(): void {
    this.network.disable();
    this.filesystem.disable();
    this.process.disable();
    this.time.disable();
    this.enabled = false;
  }

  getNetwork(): NetworkMocker {
    return this.network;
  }

  getFilesystem(): FilesystemMocker {
    return this.filesystem;
  }

  getProcess(): ProcessMocker {
    return this.process;
  }

  getTime(): TimeMocker {
    return this.time;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  clearAllLogs(): void {
    this.network.clearLog();
    this.filesystem.clearLog();
    this.process.clearLog();
  }

  getAllLogs(): {
    network: any[];
    filesystem: any[];
    process: any[];
  } {
    return {
      network: this.network.getRequestLog(),
      filesystem: this.filesystem.getOperationLog(),
      process: this.process.getProcessLog()
    };
  }
}