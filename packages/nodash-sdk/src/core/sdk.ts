import { 
  NodashConfig, 
  EventProperties, 
  UserTraits, 
  GroupTraits, 
  PageProperties, 
  AnalyticsCall,
  Event,
  IdentifyCall,
  PageCall,
  GroupCall,
  AliasCall
} from '../types.js';
import { generateId } from '../utils/id-generator.js';
import { getContext } from '../utils/context.js';

export class NodashSDK {
  private config: NodashConfig;
  private queue: AnalyticsCall[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private anonymousId: string;
  private userId: string | undefined = undefined;
  private sessionId: string;
  private userTraits: UserTraits = {};
  private groupId: string | null = null;
  private groupTraits: GroupTraits = {};

  constructor() {
    this.anonymousId = generateId();
    this.sessionId = generateId();
    
    this.config = {
      apiUrl: 'https://api.nodash.ai',
      debug: false,
      batchSize: 10,
      flushInterval: 10000,
      maxRetries: 3,
      disablePageViews: false,
      disableSessions: false,
      persistence: 'localStorage',
      cookieExpiration: 365
    };
  }

  init(token: string, config: Partial<NodashConfig> = {}): void {
    this.config = { ...this.config, ...config, token };
    this.isInitialized = true;
    this.startFlushTimer();
    
    if (this.config.debug) {
      console.log('[Nodash] SDK initialized', { token, config: this.config });
    }
  }

  track(eventName: string, properties: EventProperties = {}): void {
    if (!this.isInitialized) {
      console.warn('[Nodash] SDK not initialized. Call nodash.init() first.');
      return;
    }

    const event: Event = {
      event: eventName,
      properties,
      timestamp: new Date().toISOString(),
      messageId: generateId(),
      anonymousId: this.anonymousId,
      userId: this.userId,
      sessionId: this.sessionId,
      context: getContext()
    };

    this.enqueue(event);
    
    if (this.config.debug) {
      console.log('[Nodash] Event tracked:', event);
    }
  }

  identify(userId: string, traits: UserTraits = {}): void {
    if (!this.isInitialized) {
      console.warn('[Nodash] SDK not initialized. Call nodash.init() first.');
      return;
    }

    this.userId = userId;
    this.userTraits = { ...this.userTraits, ...traits };

    const call: IdentifyCall = {
      type: 'identify',
      userId,
      traits,
      timestamp: new Date().toISOString(),
      messageId: generateId(),
      anonymousId: this.anonymousId,
      sessionId: this.sessionId,
      context: getContext()
    };

    this.enqueue(call);
    
    if (this.config.debug) {
      console.log('[Nodash] User identified:', call);
    }
  }

  page(name?: string, category?: string, properties: PageProperties = {}): void {
    if (!this.isInitialized) {
      console.warn('[Nodash] SDK not initialized. Call nodash.init() first.');
      return;
    }

    const call: PageCall = {
      type: 'page',
      name,
      category,
      properties,
      timestamp: new Date().toISOString(),
      messageId: generateId(),
      anonymousId: this.anonymousId,
      userId: this.userId,
      sessionId: this.sessionId,
      context: getContext()
    };

    this.enqueue(call);
    
    if (this.config.debug) {
      console.log('[Nodash] Page tracked:', call);
    }
  }

  reset(): void {
    this.userId = undefined;
    this.userTraits = {};
    this.groupId = null;
    this.groupTraits = {};
    this.anonymousId = generateId();
    this.sessionId = generateId();
    
    if (this.config.debug) {
      console.log('[Nodash] State reset');
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await this.sendEvents(events);
      
      if (this.config.debug) {
        console.log('[Nodash] Events flushed:', events.length);
      }
    } catch (error) {
      // Re-queue events on failure
      this.queue.unshift(...events);
      throw error;
    }
  }

  private enqueue(call: AnalyticsCall): void {
    this.queue.push(call);
    
    if (this.queue.length >= (this.config.batchSize || 10)) {
      this.flush().catch(error => {
        if (this.config.debug) {
          console.error('[Nodash] Flush error:', error);
        }
      });
    }
  }

  private async sendEvents(events: AnalyticsCall[]): Promise<void> {
    const response = await fetch(`${this.config.apiUrl}/events/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush().catch(error => {
          if (this.config.debug) {
            console.error('[Nodash] Auto-flush error:', error);
          }
        });
      }
    }, this.config.flushInterval || 10000);
  }
} 