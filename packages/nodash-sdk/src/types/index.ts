/**
 * Local type definitions for Nodash SDK
 * These replace the dependency on @nodash/api-interfaces
 */

// Base API configuration
export interface SDKConfig {
  token: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Standard API response wrapper
export interface APIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  timestamp: string;
}

// Standard error response
export interface APIError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
}

// Core event data structures
export interface EventData {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  source?: string;
}

// Core monitoring data structures
export interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  unit?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, {
    status: 'pass' | 'fail';
    message?: string;
    duration?: number;
  }>;
}

// Request options for all API calls
export interface RequestOptions {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

// Default configurations
export const DEFAULT_CONFIG: Partial<SDKConfig> = {
  baseUrl: 'https://api.nodash.ai',
  timeout: 30000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Nodash-SDK/1.0.0'
  }
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

// Error classes
export class NodashError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = 'NodashError';
  }
}

export class NodashAPIError extends NodashError {
  constructor(message: string, status: number, code?: string) {
    super(message, code || 'API_ERROR', status);
    this.name = 'NodashAPIError';
  }
}