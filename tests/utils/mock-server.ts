import express from 'express';
import { Server } from 'http';
import cors from 'cors';

export interface MockRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: any;
  timestamp: Date;
  id: string;
}

export interface MockResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  delay?: number;
}

export interface RequestExpectation {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
  response: MockResponse;
  matched: boolean;
  matchCount: number;
}

export interface MockServerOptions {
  port?: number;
  enableLogging?: boolean;
  enableCors?: boolean;
  defaultDelay?: number;
}

export class MockServer {
  private app: express.Application;
  private server: Server | null = null;
  private options: Required<MockServerOptions>;
  private requests: MockRequest[] = [];
  private expectations: RequestExpectation[] = [];
  private defaultResponses: Map<string, MockResponse> = new Map();

  constructor(options: MockServerOptions = {}) {
    this.options = {
      port: options.port || 0, // 0 means auto-assign available port
      enableLogging: options.enableLogging || false,
      enableCors: options.enableCors !== false, // Default to true
      defaultDelay: options.defaultDelay || 0
    };

    this.app = express();
    this.setupMiddleware();
    this.setupDefaultRoutes();
  }

  private setupMiddleware(): void {
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS if enabled
    if (this.options.enableCors) {
      this.app.use(cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true
      }));
    }

    // Request logging and capture
    this.app.use((req, res, next) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const mockRequest: MockRequest = {
        method: req.method,
        path: req.path,
        headers: { ...req.headers } as Record<string, string>,
        body: req.body,
        timestamp: new Date(),
        id: requestId
      };

      this.requests.push(mockRequest);

      if (this.options.enableLogging) {
        console.log(`[MockServer] ${req.method} ${req.path}`, {
          headers: req.headers,
          body: req.body
        });
      }

      // Store request ID for response matching
      (req as any).mockRequestId = requestId;
      next();
    });

    // Expectation matching middleware
    this.app.use((req, res, next) => {
      const matchedExpectation = this.findMatchingExpectation(req);
      
      if (matchedExpectation) {
        matchedExpectation.matched = true;
        matchedExpectation.matchCount++;
        
        const response = matchedExpectation.response;
        const delay = response.delay || this.options.defaultDelay;

        const sendResponse = () => {
          // Set headers
          Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });

          res.status(response.status).json(response.body);
        };

        if (delay > 0) {
          setTimeout(sendResponse, delay);
        } else {
          sendResponse();
        }
        return;
      }

      // Check for default responses before proceeding to default routes
      const defaultResponse = this.defaultResponses.get(`${req.method} ${req.path}`);
      
      if (defaultResponse) {
        const delay = defaultResponse.delay || this.options.defaultDelay;

        const sendResponse = () => {
          // Set headers
          Object.entries(defaultResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });

          res.status(defaultResponse.status).json(defaultResponse.body);
        };

        if (delay > 0) {
          setTimeout(sendResponse, delay);
        } else {
          sendResponse();
        }
        return;
      }

      next();
    });
  }

  private setupDefaultRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0-mock',
        uptime: process.uptime(),
        requests: this.requests.length
      });
    });

    // Default track endpoint (Nodash SDK compatible)
    this.app.post('/track', (req, res) => {
      const event = {
        ...req.body,
        timestamp: req.body.timestamp || new Date().toISOString(),
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };

      res.json({
        success: true,
        id: event.id,
        message: 'Event tracked successfully'
      });
    });

    // Default identify endpoint (Nodash SDK compatible)
    this.app.post('/identify', (req, res) => {
      const identification = {
        ...req.body,
        timestamp: req.body.timestamp || new Date().toISOString(),
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };

      res.json({
        success: true,
        id: identification.id,
        message: 'User identified successfully'
      });
    });

    // Catch-all for unmatched requests
    this.app.all('*', (req, res) => {
      const defaultResponse = this.defaultResponses.get(`${req.method} ${req.path}`);
      
      if (defaultResponse) {
        Object.entries(defaultResponse.headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        res.status(defaultResponse.status).json(defaultResponse.body);
      } else {
        res.status(404).json({
          error: 'Not Found',
          message: `No mock configured for ${req.method} ${req.path}`,
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private findMatchingExpectation(req: express.Request): RequestExpectation | null {
    return this.expectations.find(expectation => {
      // Match method and path
      if (expectation.method !== req.method || expectation.path !== req.path) {
        return false;
      }

      // Match headers if specified
      if (expectation.headers) {
        for (const [key, value] of Object.entries(expectation.headers)) {
          if (req.headers[key.toLowerCase()] !== value) {
            return false;
          }
        }
      }

      // Match body if specified
      if (expectation.body) {
        if (JSON.stringify(expectation.body) !== JSON.stringify(req.body)) {
          return false;
        }
      }

      return true;
    }) || null;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.options.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          // Update port if auto-assigned
          if (this.options.port === 0) {
            const address = this.server!.address();
            if (address && typeof address === 'object') {
              this.options.port = address.port;
            }
          }

          if (this.options.enableLogging) {
            console.log(`[MockServer] Started on port ${this.options.port}`);
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
        if (this.options.enableLogging) {
          console.log('[MockServer] Stopped');
        }
        this.server = null;
        resolve();
      });
    });
  }

  getUrl(): string {
    return `http://localhost:${this.options.port}`;
  }

  getPort(): number {
    return this.options.port;
  }

  // Request management
  getRequests(): MockRequest[] {
    return [...this.requests];
  }

  getRequestsForPath(path: string): MockRequest[] {
    return this.requests.filter(req => req.path === path);
  }

  getRequestsForMethod(method: string): MockRequest[] {
    return this.requests.filter(req => req.method === method);
  }

  clearRequests(): void {
    this.requests = [];
  }

  // Expectation management
  expectRequest(method: string, path: string): RequestExpectationBuilder {
    return new RequestExpectationBuilder(method, path, this);
  }

  addExpectation(expectation: RequestExpectation): void {
    this.expectations.push(expectation);
  }

  getExpectations(): RequestExpectation[] {
    return [...this.expectations];
  }

  getUnmatchedExpectations(): RequestExpectation[] {
    return this.expectations.filter(exp => !exp.matched);
  }

  clearExpectations(): void {
    this.expectations = [];
  }

  // Default response management
  setDefaultResponse(method: string, path: string, response: MockResponse): void {
    this.defaultResponses.set(`${method} ${path}`, response);
  }

  removeDefaultResponse(method: string, path: string): void {
    this.defaultResponses.delete(`${method} ${path}`);
  }

  // Utility methods
  reset(): void {
    this.clearRequests();
    this.clearExpectations();
    this.defaultResponses.clear();
  }

  // Verification methods
  verifyAllExpectationsMet(): { success: boolean; unmatched: RequestExpectation[] } {
    const unmatched = this.getUnmatchedExpectations();
    return {
      success: unmatched.length === 0,
      unmatched
    };
  }

  verifyRequestCount(expectedCount: number): boolean {
    return this.requests.length === expectedCount;
  }

  verifyRequestCountForPath(path: string, expectedCount: number): boolean {
    return this.getRequestsForPath(path).length === expectedCount;
  }
}

export class RequestExpectationBuilder {
  private expectation: Partial<RequestExpectation>;
  private mockServer: MockServer;

  constructor(method: string, path: string, mockServer: MockServer) {
    this.expectation = {
      method,
      path,
      matched: false,
      matchCount: 0
    };
    this.mockServer = mockServer;
  }

  withHeaders(headers: Record<string, string>): RequestExpectationBuilder {
    this.expectation.headers = headers;
    return this;
  }

  withBody(body: any): RequestExpectationBuilder {
    this.expectation.body = body;
    return this;
  }

  respondWith(status: number, body: any, headers: Record<string, string> = {}): RequestExpectationBuilder {
    this.expectation.response = {
      status,
      body,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    return this;
  }

  respondWithDelay(delay: number): RequestExpectationBuilder {
    if (this.expectation.response) {
      this.expectation.response.delay = delay;
    }
    return this;
  }

  build(): RequestExpectation {
    if (!this.expectation.response) {
      throw new Error('Response must be configured using respondWith()');
    }

    const expectation = this.expectation as RequestExpectation;
    this.mockServer.addExpectation(expectation);
    return expectation;
  }
}

// Convenience factory function
export function createMockServer(options: MockServerOptions = {}): MockServer {
  return new MockServer(options);
}