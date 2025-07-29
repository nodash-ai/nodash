import { HttpClient } from './http-client';
import { NodashConfig, HealthStatus, TrackingEvent, IdentifyData, Event, EventSnapshot, ReplayOptions, RecordingOptions, RecordingResult, QueryOptions, UserQueryOptions, QueryResult, UserQueryResult } from './types';
import { Recorder } from './recorder';

export class NodashSDK {
  private client: HttpClient;
  private config: NodashConfig;
  private recorder: Recorder = new Recorder();

  constructor(baseUrl: string, apiToken?: string, options?: { headers?: Record<string, string> }) {
    // Validate baseUrl
    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('baseUrl is required and must be a string');
    }

    // Validate apiToken
    if (apiToken !== undefined && (!apiToken || typeof apiToken !== 'string')) {
      throw new Error('apiToken is required and must be a string');
    }

    // Basic URL validation
    try {
      new URL(baseUrl);
    } catch {
      throw new Error('baseUrl must be a valid URL');
    }

    // Normalize baseUrl by removing trailing slash
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const customHeaders = options?.headers;

    this.config = {
      baseUrl: normalizedBaseUrl,
      apiToken,
      customHeaders,
    };

    this.client = new HttpClient(normalizedBaseUrl, apiToken, customHeaders);
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
  async track(event: string, properties?: Record<string, any>, userId?: string): Promise<any> {
    if (!event || typeof event !== 'string') {
      throw new Error('event name is required and must be a string');
    }

    const trackingEvent: TrackingEvent = {
      event,
      properties: properties || {},
      timestamp: new Date(),
      ...(userId && { userId }),
    };

    // If recording is active, add to buffer instead of sending HTTP request
    if (this.recorder.isActive()) {
      const recordedEvent: Event = {
        type: 'track',
        data: trackingEvent,
        timestamp: new Date()
      };
      this.recorder.addEvent(recordedEvent);
      return { success: true, recorded: true };
    }

    const response = await this.client.post('/track', trackingEvent);
    
    // Normalize API response format for consistent SDK interface
    if (response && typeof response === 'object') {
      return {
        success: response.success,
        id: response.eventId || response.id,
        message: response.message || 'Event tracked successfully',
        timestamp: response.timestamp,
        requestId: response.requestId
      };
    }
    
    return response;
  }

  /**
   * Identify a user
   */
  async identify(userId: string, traits?: Record<string, any>): Promise<any> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId is required and must be a string');
    }

    const identifyData: IdentifyData = {
      userId,
      traits: traits || {},
      timestamp: new Date(),
    };

    // If recording is active, add to buffer instead of sending HTTP request
    if (this.recorder.isActive()) {
      const recordedEvent: Event = {
        type: 'identify',
        data: identifyData,
        timestamp: new Date()
      };
      this.recorder.addEvent(recordedEvent);
      return { success: true, recorded: true };
    }

    return await this.client.post('/identify', identifyData);
  }

  /**
   * Check server health
   */
  async health(): Promise<HealthStatus> {
    return await this.client.get('/health');
  }

  /**
   * Check if recording is currently active
   */
  isRecording(): boolean {
    return this.recorder.isActive();
  }

  /**
   * Start recording events
   */
  startRecording(options: RecordingOptions = {}): { filePath?: string } {
    // Default to file-based recording if no store specified
    if (!options.store) {
      options.store = 'default';
    }
    return this.recorder.start(options);
  }

  /**
   * Stop recording and return captured events
   */
  stopRecording(): RecordingResult {
    return this.recorder.stop();
  }

  /**
   * Replay events from a snapshot or file
   */
  async replay(snapshotOrPath: EventSnapshot | string, options?: ReplayOptions): Promise<any[]> {
    const results: any[] = [];
    
    // If string is provided, read from file
    let snapshot: EventSnapshot;
    if (typeof snapshotOrPath === 'string') {
      const fs = await import('fs');
      const fileContent = fs.readFileSync(snapshotOrPath, 'utf8');
      snapshot = JSON.parse(fileContent);
    } else {
      snapshot = snapshotOrPath;
    }
    
    for (const event of snapshot.events) {
      try {
        if (options?.dryRun) {
          // Log event without sending HTTP request
          console.log(`[DRY RUN] ${event.type}:`, event.data);
          results.push({ success: true, replayed: true, dryRun: true });
          continue;
        }

        // Create temporary client with custom URL if provided
        const client = options?.url 
          ? new HttpClient(options.url, this.config.apiToken, this.config.customHeaders)
          : this.client;

        let result;
        if (event.type === 'track') {
          result = await client.post('/track', event.data);
        } else if (event.type === 'identify') {
          result = await client.post('/identify', event.data);
        }
        
        results.push({ ...result, replayed: true });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          replayed: false 
        });
      }
    }

    return results;
  }

  /**
   * Query events with filters
   */
  async queryEvents(options: QueryOptions = {}): Promise<QueryResult> {
    const queryParams = new URLSearchParams();

    // Add filtering parameters
    if (options.eventTypes && options.eventTypes.length > 0) {
      queryParams.append('eventTypes', options.eventTypes.join(','));
    }

    if (options.userId) {
      queryParams.append('userId', options.userId);
    }

    if (options.startDate) {
      queryParams.append('startDate', options.startDate.toISOString());
    }

    if (options.endDate) {
      queryParams.append('endDate', options.endDate.toISOString());
    }

    if (options.properties) {
      queryParams.append('properties', JSON.stringify(options.properties));
    }

    // Add sorting parameters
    if (options.sortBy) {
      queryParams.append('sortBy', options.sortBy);
    }

    if (options.sortOrder) {
      queryParams.append('sortOrder', options.sortOrder);
    }

    // Add pagination parameters
    if (options.limit) {
      queryParams.append('limit', options.limit.toString());
    }

    if (options.offset) {
      queryParams.append('offset', options.offset.toString());
    }

    // Add formatting parameters
    if (options.format) {
      queryParams.append('format', options.format);
    }

    const url = `/v1/events/query?${queryParams.toString()}`;
    const response = await this.client.get(url);
    
    return response.data;
  }

  /**
   * Query users with filters
   */
  async queryUsers(options: UserQueryOptions = {}): Promise<UserQueryResult> {
    const queryParams = new URLSearchParams();

    // Add filtering parameters
    if (options.userId) {
      queryParams.append('userId', options.userId);
    }

    if (options.activeSince) {
      queryParams.append('activeSince', options.activeSince.toISOString());
    }

    if (options.activeUntil) {
      queryParams.append('activeUntil', options.activeUntil.toISOString());
    }

    if (options.properties) {
      queryParams.append('properties', JSON.stringify(options.properties));
    }

    // Add sorting parameters
    if (options.sortBy) {
      queryParams.append('sortBy', options.sortBy);
    }

    if (options.sortOrder) {
      queryParams.append('sortOrder', options.sortOrder);
    }

    // Add pagination parameters
    if (options.limit) {
      queryParams.append('limit', options.limit.toString());
    }

    if (options.offset) {
      queryParams.append('offset', options.offset.toString());
    }

    // Add formatting parameters
    if (options.format) {
      queryParams.append('format', options.format);
    }

    const url = `/v1/users/query?${queryParams.toString()}`;
    const response = await this.client.get(url);
    
    return response.data;
  }
}