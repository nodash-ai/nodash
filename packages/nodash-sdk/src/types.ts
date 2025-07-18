export interface NodashConfig {
  baseUrl: string;
  apiToken?: string;
  environment?: string;
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