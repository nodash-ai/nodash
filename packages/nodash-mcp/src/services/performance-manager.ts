import { CLICommand, CLIResult } from './cli-executor.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface PerformanceMetrics {
  commandExecutions: number;
  cacheHits: number;
  cacheMisses: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  activeConnections: number;
  queuedOperations: number;
}

export interface AsyncOperation {
  id: string;
  command: CLICommand;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  result?: CLIResult;
  error?: string;
}

/**
 * Command result cache with TTL support
 */
export class CommandCache {
  private cache = new Map<string, CacheEntry<CLIResult>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100;

  constructor(maxSize?: number, defaultTTL?: number) {
    if (maxSize) this.maxSize = maxSize;
    if (defaultTTL) this.defaultTTL = defaultTTL;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  get(command: CLICommand): CLIResult | null {
    const key = this.generateKey(command);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count
    entry.hits++;
    return entry.data;
  }

  set(command: CLICommand, result: CLIResult, ttl?: number): void {
    const key = this.generateKey(command);
    const actualTTL = ttl || this.getTTLForCommand(command);
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl: actualTTL,
      hits: 0
    });
  }

  invalidate(pattern: string): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp
    }));
    
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const totalRequests = totalHits + entries.length; // Approximation
    
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      entries: entries.sort((a, b) => b.hits - a.hits)
    };
  }

  private generateKey(command: CLICommand): string {
    // Create a cache key based on command and relevant options
    const keyParts = [
      command.command,
      ...command.args,
      command.options.format || 'default',
      command.options.dryRun ? 'dry' : 'live'
    ];
    
    return keyParts.join(':');
  }

  private getTTLForCommand(command: CLICommand): number {
    // Different commands have different cache lifetimes
    switch (command.command) {
      case 'config':
        return 10 * 60 * 1000; // 10 minutes - config changes less frequently
      case 'analyze':
        return 5 * 60 * 1000;  // 5 minutes - project structure changes occasionally
      case 'health':
        return 30 * 1000;      // 30 seconds - health status changes frequently
      case 'track':
      case 'metric':
        return 0;              // Never cache actual tracking/metrics
      default:
        return this.defaultTTL;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

/**
 * Async execution manager for long-running CLI operations
 */
export class AsyncExecutionManager {
  private operations = new Map<string, AsyncOperation>();
  private maxConcurrent = 5;
  private queue: AsyncOperation[] = [];
  private running = new Set<string>();

  constructor(maxConcurrent?: number) {
    if (maxConcurrent) this.maxConcurrent = maxConcurrent;
  }

  async executeAsync(command: CLICommand, executor: (cmd: CLICommand) => Promise<CLIResult>): Promise<string> {
    const id = this.generateId();
    const operation: AsyncOperation = {
      id,
      command,
      status: 'pending',
      startTime: Date.now()
    };
    
    this.operations.set(id, operation);
    
    if (this.running.size < this.maxConcurrent) {
      this.startOperation(operation, executor);
    } else {
      this.queue.push(operation);
    }
    
    return id;
  }

  getStatus(executionId: string): AsyncOperation | null {
    return this.operations.get(executionId) || null;
  }

  async getResult(executionId: string): Promise<CLIResult | null> {
    const operation = this.operations.get(executionId);
    if (!operation) {
      return null;
    }
    
    if (operation.status === 'completed') {
      return operation.result || null;
    }
    
    if (operation.status === 'failed') {
      throw new Error(operation.error || 'Operation failed');
    }
    
    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const op = this.operations.get(executionId);
        if (!op) {
          reject(new Error('Operation not found'));
          return;
        }
        
        if (op.status === 'completed') {
          resolve(op.result || null);
        } else if (op.status === 'failed') {
          reject(new Error(op.error || 'Operation failed'));
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      
      checkStatus();
    });
  }

  async cancel(executionId: string): Promise<boolean> {
    const operation = this.operations.get(executionId);
    if (!operation) {
      return false;
    }
    
    if (operation.status === 'pending') {
      // Remove from queue
      const queueIndex = this.queue.findIndex(op => op.id === executionId);
      if (queueIndex >= 0) {
        this.queue.splice(queueIndex, 1);
      }
      operation.status = 'cancelled';
      return true;
    }
    
    if (operation.status === 'running') {
      // Mark as cancelled - actual process cancellation would need more complex handling
      operation.status = 'cancelled';
      this.running.delete(executionId);
      this.processQueue();
      return true;
    }
    
    return false;
  }

  getQueueStatus(): {
    running: number;
    queued: number;
    completed: number;
    failed: number;
  } {
    const operations = Array.from(this.operations.values());
    
    return {
      running: operations.filter(op => op.status === 'running').length,
      queued: operations.filter(op => op.status === 'pending').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length
    };
  }

  cleanup(maxAge: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge;
    let removed = 0;
    
    for (const [id, operation] of this.operations.entries()) {
      if (operation.startTime < cutoff && 
          (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled')) {
        this.operations.delete(id);
        removed++;
      }
    }
    
    return removed;
  }

  private async startOperation(operation: AsyncOperation, executor: (cmd: CLICommand) => Promise<CLIResult>): Promise<void> {
    operation.status = 'running';
    this.running.add(operation.id);
    
    try {
      const result = await executor(operation.command);
      operation.result = result;
      operation.status = 'completed';
      operation.endTime = Date.now();
    } catch (error) {
      operation.error = error instanceof Error ? error.message : String(error);
      operation.status = 'failed';
      operation.endTime = Date.now();
    } finally {
      this.running.delete(operation.id);
      this.processQueue();
    }
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const operation = this.queue.shift();
      if (operation && operation.status === 'pending') {
        // This would need the executor function - simplified for now
        console.log(`Processing queued operation: ${operation.id}`);
      }
    }
  }

  private generateId(): string {
    return `async_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Connection pool for CLI process management
 */
export class ConnectionPool {
  private connections: Array<{ id: string; inUse: boolean; lastUsed: number }> = [];
  private maxConnections = 3;
  private connectionTimeout = 30000;

  constructor(maxConnections?: number, connectionTimeout?: number) {
    if (maxConnections) this.maxConnections = maxConnections;
    if (connectionTimeout) this.connectionTimeout = connectionTimeout;
  }

  async acquireConnection(): Promise<string> {
    // Find available connection
    const available = this.connections.find(conn => !conn.inUse);
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available.id;
    }
    
    // Create new connection if under limit
    if (this.connections.length < this.maxConnections) {
      const connection = {
        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        inUse: true,
        lastUsed: Date.now()
      };
      this.connections.push(connection);
      return connection.id;
    }
    
    // Wait for connection to become available
    return new Promise((resolve) => {
      const checkForConnection = () => {
        const available = this.connections.find(conn => !conn.inUse);
        if (available) {
          available.inUse = true;
          available.lastUsed = Date.now();
          resolve(available.id);
        } else {
          setTimeout(checkForConnection, 100);
        }
      };
      checkForConnection();
    });
  }

  releaseConnection(connectionId: string): void {
    const connection = this.connections.find(conn => conn.id === connectionId);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  getPoolStatus(): {
    total: number;
    inUse: number;
    available: number;
    connections: Array<{ id: string; inUse: boolean; idleTime: number }>;
  } {
    const now = Date.now();
    return {
      total: this.connections.length,
      inUse: this.connections.filter(conn => conn.inUse).length,
      available: this.connections.filter(conn => !conn.inUse).length,
      connections: this.connections.map(conn => ({
        id: conn.id,
        inUse: conn.inUse,
        idleTime: now - conn.lastUsed
      }))
    };
  }

  cleanup(): number {
    const cutoff = Date.now() - this.connectionTimeout;
    const initialLength = this.connections.length;
    
    this.connections = this.connections.filter(conn => 
      conn.inUse || conn.lastUsed > cutoff
    );
    
    return initialLength - this.connections.length;
  }
}

/**
 * Performance monitoring and metrics collection
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    commandExecutions: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    activeConnections: 0,
    queuedOperations: 0
  };
  
  private executionTimes: number[] = [];
  private maxHistorySize = 100;

  recordCommandExecution(duration: number): void {
    this.metrics.commandExecutions++;
    this.metrics.totalExecutionTime += duration;
    
    this.executionTimes.push(duration);
    if (this.executionTimes.length > this.maxHistorySize) {
      this.executionTimes.shift();
    }
    
    this.metrics.averageExecutionTime = 
      this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  updateActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  updateQueuedOperations(count: number): void {
    this.metrics.queuedOperations = count;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? this.metrics.cacheHits / total : 0;
  }

  getPerformanceSummary(): {
    metrics: PerformanceMetrics;
    cacheHitRate: number;
    recentExecutionTimes: number[];
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    if (this.getCacheHitRate() < 0.3) {
      recommendations.push('Consider increasing cache TTL for better performance');
    }
    
    if (this.metrics.averageExecutionTime > 5000) {
      recommendations.push('Commands are taking longer than expected - check system resources');
    }
    
    if (this.metrics.queuedOperations > 10) {
      recommendations.push('High queue depth detected - consider increasing concurrent execution limit');
    }
    
    return {
      metrics: this.getMetrics(),
      cacheHitRate: this.getCacheHitRate(),
      recentExecutionTimes: [...this.executionTimes],
      recommendations
    };
  }

  reset(): void {
    this.metrics = {
      commandExecutions: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      activeConnections: 0,
      queuedOperations: 0
    };
    this.executionTimes = [];
  }
}