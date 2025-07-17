import express from 'express';
import { Server } from 'http';

export interface TestServerConfig {
  port: number;
  enableLogging: boolean;
  mockResponses: Record<string, any>;
}

export interface TestServer {
  start(port?: number): Promise<void>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  getUrl(): string;
}

export class NodashTestServer implements TestServer {
  private app: express.Application;
  private server: Server | null = null;
  private config: TestServerConfig;
  private analytics: any[] = [];
  private configurations: Record<string, any> = {};

  constructor(config: Partial<TestServerConfig> = {}) {
    this.config = {
      port: 3001,
      enableLogging: false,
      mockResponses: {},
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());

    if (this.config.enableLogging) {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`, req.body);
        next();
      });
    }

    // CORS for testing
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '0.1.0-test'
      });
    });

    // Analytics endpoints
    this.app.post('/analytics/track', (req, res) => {
      const event = {
        ...req.body,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };

      this.analytics.push(event);

      res.json({
        success: true,
        eventId: event.id,
        message: 'Event tracked successfully'
      });
    });

    // SDK-compatible track endpoint (maps to analytics/track)
    this.app.post('/track', (req, res) => {
      const event = {
        ...req.body,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      };

      this.analytics.push(event);

      res.json({
        success: true,
        eventId: event.id,
        message: 'Event tracked successfully'
      });
    });

    this.app.get('/analytics/events', (req, res) => {
      res.json({
        events: this.analytics,
        count: this.analytics.length
      });
    });

    this.app.post('/analytics/batch', (req, res) => {
      const events = req.body.events || [];
      const processedEvents = events.map((event: any) => ({
        ...event,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      }));

      this.analytics.push(...processedEvents);

      res.json({
        success: true,
        processed: processedEvents.length,
        message: 'Batch events tracked successfully'
      });
    });

    // Configuration endpoints
    this.app.get('/config', (req, res) => {
      res.json(this.configurations);
    });

    this.app.post('/config', (req, res) => {
      this.configurations = { ...this.configurations, ...req.body };
      res.json({
        success: true,
        config: this.configurations,
        message: 'Configuration updated'
      });
    });

    this.app.get('/config/:key', (req, res) => {
      const key = req.params.key;
      const value = this.configurations[key];

      if (value !== undefined) {
        res.json({ key, value });
      } else {
        res.status(404).json({ error: 'Configuration key not found' });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      res.json({
        analytics: {
          totalEvents: this.analytics.length,
          recentEvents: this.analytics.slice(-10)
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    });

    // Mock response handler for custom test scenarios
    this.app.all('/mock/:endpoint', (req, res) => {
      const endpoint = req.params.endpoint;
      const mockResponse = this.config.mockResponses[endpoint];

      if (mockResponse) {
        if (typeof mockResponse === 'function') {
          mockResponse(req, res);
        } else {
          res.json(mockResponse);
        }
      } else {
        res.status(404).json({ error: 'Mock endpoint not configured' });
      }
    });

    // Error simulation endpoint
    this.app.post('/simulate/error', (req, res) => {
      const { type, code = 500, message = 'Simulated error' } = req.body;

      switch (type) {
        case 'timeout':
          // Don't respond to simulate timeout
          return;
        case 'network':
          res.destroy();
          return;
        default:
          res.status(code).json({ error: message, type });
      }
    });

    // Catch-all for undefined routes
    this.app.all('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
      });
    });
  }

  async start(port?: number): Promise<void> {
    const serverPort = port || this.config.port;

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(serverPort, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          // Update the actual port if using dynamic allocation
          if (serverPort === 0) {
            const address = this.server!.address();
            if (address && typeof address === 'object') {
              this.config.port = address.port;
            }
          }
          if (this.config.enableLogging) {
            console.log(`Test server started on port ${this.config.port}`);
          }
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        if (this.config.enableLogging) {
          console.log('Test server stopped');
        }
        this.server = null;
        resolve();
      });
    });
  }

  async reset(): Promise<void> {
    this.analytics = [];
    this.configurations = {};

    if (this.config.enableLogging) {
      console.log('Test server data reset');
    }
  }

  getUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  getPort(): number {
    return this.config.port;
  }

  // Test utilities
  getAnalytics() {
    return [...this.analytics];
  }

  getConfigurations() {
    return { ...this.configurations };
  }

  setMockResponse(endpoint: string, response: any) {
    this.config.mockResponses[endpoint] = response;
  }
}