import { NodashSDK, EventSnapshot, RecordingResult, Event, QueryOptions, UserQueryOptions, QueryResult, UserQueryResult } from '@nodash/sdk';
import { ConfigManager } from './config';
import { FileRecorder } from './file-recorder';
import { getDefaultRecordingPath } from '@nodash/sdk';

export class SDKWrapper {
  private configManager: ConfigManager;
  private sdk?: NodashSDK;
  private fileRecorder: FileRecorder;

  constructor() {
    this.configManager = new ConfigManager();
    this.fileRecorder = new FileRecorder();
  }

  createSDK(): NodashSDK {
    const config = this.configManager.getConfig();
    
    if (!config.baseUrl) {
      throw new Error(
        'No base URL configured. Run "nodash config set baseUrl <url>" first.'
      );
    }

    return new NodashSDK(config.baseUrl, config.apiToken);
  }

  private getSDK(): NodashSDK {
    if (!this.sdk) {
      this.sdk = this.createSDK();
    }
    return this.sdk;
  }

  async track(event: string, properties?: Record<string, any>): Promise<void> {
    // Check if file recording is active
    if (this.fileRecorder.isRecordingActive()) {
      const trackingEvent = {
        event,
        properties: properties || {},
        timestamp: new Date(),
      };
      
      const recordedEvent: Event = {
        type: 'track' as const,
        data: trackingEvent,
        timestamp: new Date()
      };
      
      this.fileRecorder.addEvent(recordedEvent);
      return;
    }

    // Use the persistent SDK instance (for memory recording or regular HTTP)
    const sdk = this.getSDK();
    await sdk.track(event, properties);
  }

  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    // Check if file recording is active
    if (this.fileRecorder.isRecordingActive()) {
      const identifyData = {
        userId,
        traits: traits || {},
        timestamp: new Date(),
      };
      
      const recordedEvent: Event = {
        type: 'identify' as const,
        data: identifyData,
        timestamp: new Date()
      };
      
      this.fileRecorder.addEvent(recordedEvent);
      return;
    }

    // Use the persistent SDK instance (for memory recording or regular HTTP)
    const sdk = this.getSDK();
    await sdk.identify(userId, traits);
  }

  async health() {
    const sdk = this.createSDK();
    return await sdk.health();
  }

  startRecording(maxEvents?: number, useMemory?: boolean): { filePath?: string } {
    if (useMemory) {
      // Use in-memory SDK recording
      const sdk = this.getSDK();
      return sdk.startRecording({ maxEvents, store: 'memory' });
    } else {
      // Use file-based recording
      const filePath = getDefaultRecordingPath();
      this.fileRecorder.startRecording(filePath, maxEvents || 100);
      return { filePath };
    }
  }

  stopRecording(): RecordingResult {
    // Try file recording first
    const fileResult = this.fileRecorder.stopRecording();
    if (fileResult) {
      return fileResult;
    }
    
    // Fall back to SDK memory recording
    const sdk = this.getSDK();
    return sdk.stopRecording();
  }

  async replay(snapshot: EventSnapshot, options?: { url?: string; dryRun?: boolean }): Promise<void> {
    const sdk = this.createSDK();
    await sdk.replay(snapshot, options);
  }

  async queryEvents(options: QueryOptions): Promise<QueryResult> {
    const sdk = this.createSDK();
    return await sdk.queryEvents(options);
  }

  async queryUsers(options: UserQueryOptions): Promise<UserQueryResult> {
    const sdk = this.createSDK();
    return await sdk.queryUsers(options);
  }
}