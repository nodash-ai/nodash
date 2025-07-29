export interface NodashConfig {
  baseUrl: string;
  apiToken?: string;
  environment?: string;
  customHeaders?: Record<string, string>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
}

export interface TrackingEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
}

export interface IdentifyData {
  userId: string;
  traits?: Record<string, any>;
  timestamp?: Date;
}

export interface Event {
  type: 'track' | 'identify';
  data: TrackingEvent | IdentifyData;
  timestamp: Date;
}

export interface EventSnapshot {
  events: Event[];
  recordedAt: Date;
  totalEvents: number;
}

export interface ReplayOptions {
  url?: string;
  dryRun?: boolean;
}

export interface RecordingOptions {
  maxEvents?: number;
  store?: string; // 'memory' or file path
}

export interface RecordingResult {
  events: Event[];
  recordedAt: Date;
  totalEvents: number;
  filePath?: string;
}

// Query types
export interface QueryOptions {
  // Filtering
  eventTypes?: string[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  properties?: Record<string, any>;
  
  // Sorting
  sortBy?: 'timestamp' | 'eventName' | 'userId';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Output formatting
  format?: 'json' | 'table' | 'csv';
}

export interface UserQueryOptions {
  // Filtering
  userId?: string;
  activeSince?: Date;
  activeUntil?: Date;
  properties?: Record<string, any>;
  
  // Sorting
  sortBy?: 'firstSeen' | 'lastSeen' | 'eventCount' | 'sessionCount';
  sortOrder?: 'asc' | 'desc';
  
  // Pagination
  limit?: number;
  offset?: number;
  
  // Output formatting
  format?: 'json' | 'table' | 'csv';
}

export interface AnalyticsEvent {
  eventId: string;
  tenantId: string;
  userId?: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  receivedAt: Date;
  sessionId?: string;
  deviceId?: string;
}

export interface UserRecord {
  userId: string;
  tenantId: string;
  properties: Record<string, any>;
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
  eventCount: number;
}

export interface PaginationInfo {
  limit: number;
  offset: number;
  nextOffset?: number;
}

export interface QueryResult {
  events: AnalyticsEvent[];
  totalCount: number;
  hasMore: boolean;
  pagination: PaginationInfo;
  executionTime: number;
}

export interface UserQueryResult {
  users: UserRecord[];
  totalCount: number;
  hasMore: boolean;
  pagination: PaginationInfo;
  executionTime: number;
}