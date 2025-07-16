import { HttpClient } from './http-client';
import { NodashConfig, HealthStatus, TrackingEvent } from './types';

export class NodashSDK {
  private client: HttpClient;
  private config: NodashConfig;

  constructor(baseUrl: string, apiToken?: string) {
    // Validate baseUrl
    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('baseUrl is required and must be a string');
    }

    // Basic URL validation
    try {
      new URL(baseUrl);
    } catch {
      throw new Error('baseUrl must be a valid URL');
    }

    // Normalize baseUrl by removing trailing slash
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    this.config = {
      baseUrl: normalizedBaseUrl,
      apiToken,
    };

    this.client = new HttpClient(normalizedBaseUrl, apiToken);
  }

  /**
   * Get the current configuration
   */
  getConfig(): NodashConfig {
    return { ...this.config };
  }

  /**
   * Track an event
   */
  async track(event: string, properties?: Record<string, any>): Promise<void> {
    if (!event || typeof event !== 'string') {
      throw new Error('event name is required and must be a string');
    }

    const trackingEvent: TrackingEvent = {
      event,
      properties: properties || {},
      timestamp: new Date(),
    };

    await this.client.post('/track', trackingEvent);
  }

  /**
   * Identify a user
   */
  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required and must be a string');
    }

    const identifyData = {
      userId,
      traits: traits || {},
      timestamp: new Date(),
    };

    await this.client.post('/identify', identifyData);
  }

  /**
   * Check server health
   */
  async health(): Promise<HealthStatus> {
    return await this.client.get('/health');
  }
}