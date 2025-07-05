export interface EventProperties {
  [key: string]: any;
}

export interface UserTraits {
  [key: string]: any;
}

export interface GroupTraits {
  [key: string]: any;
}

export interface PageProperties {
  url?: string;
  title?: string;
  path?: string;
  referrer?: string;
  [key: string]: any;
}

export interface NodashConfig {
  /** API endpoint URL for the analytics server */
  apiUrl: string;
  /** Project token for authentication */
  token?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Batch size for events (default: 10) */
  batchSize?: number;
  /** Flush interval in milliseconds (default: 10000) */
  flushInterval?: number;
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Disable automatic page view tracking */
  disablePageViews?: boolean;
  /** Disable automatic session tracking */
  disableSessions?: boolean;
  /** Custom user agent */
  userAgent?: string;
  /** Persistence method: 'localStorage', 'sessionStorage', 'cookie', 'memory' */
  persistence?: 'localStorage' | 'sessionStorage' | 'cookie' | 'memory';
  /** Cookie domain for cross-subdomain tracking */
  cookieDomain?: string;
  /** Cookie expiration in days (default: 365) */
  cookieExpiration?: number;
}

export interface Event {
  event: string;
  properties: EventProperties;
  timestamp: string;
  messageId: string;
  anonymousId?: string;
  userId?: string;
  sessionId?: string;
  context: {
    library: {
      name: string;
      version: string;
    };
    page?: PageProperties;
    userAgent?: string;
    ip?: string;
    locale?: string;
    timezone?: string;
  };
}

export interface IdentifyCall {
  type: 'identify';
  userId: string;
  traits: UserTraits;
  timestamp: string;
  messageId: string;
  anonymousId?: string;
  sessionId?: string;
  context: Event['context'];
}

export interface PageCall {
  type: 'page';
  name?: string;
  category?: string;
  properties: PageProperties;
  timestamp: string;
  messageId: string;
  anonymousId?: string;
  userId?: string;
  sessionId?: string;
  context: Event['context'];
}

export interface GroupCall {
  type: 'group';
  groupId: string;
  traits: GroupTraits;
  timestamp: string;
  messageId: string;
  anonymousId?: string;
  userId?: string;
  sessionId?: string;
  context: Event['context'];
}

export interface AliasCall {
  type: 'alias';
  userId: string;
  previousId: string;
  timestamp: string;
  messageId: string;
  context: Event['context'];
}

export type AnalyticsCall = Event | IdentifyCall | PageCall | GroupCall | AliasCall; 