import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodashSDK } from '../dist/index';
import { EventSnapshot } from '../dist/types';

// Mock server responses
const mockHealthResponse = {
  status: 'healthy',
  version: '1.0.0',
  uptime: 3600,
  checks: [
    { name: 'database', status: 'pass' },
    { name: 'redis', status: 'pass' }
  ]
};

const mockSuccessResponse = { success: true, id: 'event-123' };

describe('NodashSDK Component Tests', () => {
  let sdk: NodashSDK;
  const mockFetch = vi.mocked(fetch);

  beforeEach(() => {
    sdk = new NodashSDK('https://api.example.com', 'test-token');
    mockFetch.mockClear();
  });

  describe('Constructor', () => {
    it('should create SDK instance with required baseUrl', () => {
      const testSdk = new NodashSDK('https://test.com');
      expect(testSdk).toBeInstanceOf(NodashSDK);
      expect(testSdk.getConfig().baseUrl).toBe('https://test.com');
    });

    it('should create SDK instance with baseUrl and token', () => {
      const testSdk = new NodashSDK('https://test.com', 'my-token');
      expect(testSdk.getConfig().baseUrl).toBe('https://test.com');
      expect(testSdk.getConfig().apiToken).toBe('my-token');
    });

    it('should normalize baseUrl by removing trailing slash', () => {
      const testSdk = new NodashSDK('https://test.com/');
      expect(testSdk.getConfig().baseUrl).toBe('https://test.com');
    });

    it('should throw error for invalid baseUrl', () => {
      expect(() => new NodashSDK('')).toThrow('baseUrl is required and must be a string');
      expect(() => new NodashSDK('invalid-url')).toThrow('baseUrl must be a valid URL');
    });
  });

  describe('track() method', () => {
    it('should track event with properties', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      await sdk.track('user_signup', { plan: 'pro', source: 'web' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/track',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: expect.stringContaining('"event":"user_signup"')
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.event).toBe('user_signup');
      expect(callBody.properties).toEqual({ plan: 'pro', source: 'web' });
      expect(callBody.timestamp).toBeDefined();
    });

    it('should track event without properties', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      await sdk.track('page_view');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.event).toBe('page_view');
      expect(callBody.properties).toEqual({});
    });

    it('should throw error for invalid event name', async () => {
      await expect(sdk.track('')).rejects.toThrow('event name is required and must be a string');
      await expect(sdk.track(null as any)).rejects.toThrow('event name is required and must be a string');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(sdk.track('test_event')).rejects.toThrow('Request failed: HTTP 400: Bad Request');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sdk.track('test_event')).rejects.toThrow('Request failed: Network error');
    });
  });

  describe('identify() method', () => {
    it('should identify user with traits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      await sdk.identify('user-123', { name: 'John Doe', email: 'john@example.com' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/identify',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.userId).toBe('user-123');
      expect(callBody.traits).toEqual({ name: 'John Doe', email: 'john@example.com' });
      expect(callBody.timestamp).toBeDefined();
    });

    it('should identify user without traits', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      await sdk.identify('user-456');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.userId).toBe('user-456');
      expect(callBody.traits).toEqual({});
    });

    it('should throw error for invalid userId', async () => {
      await expect(sdk.identify('')).rejects.toThrow('userId is required and must be a string');
      await expect(sdk.identify(null as any)).rejects.toThrow('userId is required and must be a string');
    });
  });

  describe('health() method', () => {
    it('should return health status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      } as Response);

      const health = await sdk.health();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        })
      );

      expect(health).toEqual(mockHealthResponse);
    });

    it('should work without authentication token', async () => {
      const unauthSdk = new NodashSDK('https://api.example.com');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealthResponse,
      } as Response);

      await unauthSdk.health();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/health',
        expect.objectContaining({
          method: 'GET',
          headers: {} // No Authorization header
        })
      );
    });
  });

  describe('Real-world usage scenarios', () => {
    it('should handle complete user journey', async () => {
      // Mock all responses
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockHealthResponse } as Response) // health check
        .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response) // identify
        .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response) // track signup
        .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response); // track action

      // 1. Check server health
      const health = await sdk.health();
      expect(health.status).toBe('healthy');

      // 2. Identify user
      await sdk.identify('user-789', {
        name: 'Jane Smith',
        email: 'jane@example.com',
        plan: 'premium'
      });

      // 3. Track signup event
      await sdk.track('user_signed_up', {
        plan: 'premium',
        source: 'organic',
        campaign: 'summer2024'
      });

      // 4. Track user action
      await sdk.track('feature_used', {
        feature: 'dashboard',
        duration: 120
      });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should handle error recovery', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response);

      // First attempt should fail
      await expect(sdk.track('test_event')).rejects.toThrow('Request failed: Network timeout');

      // Second attempt should succeed
      await expect(sdk.track('test_event')).resolves.not.toThrow();
    });

    it('should work with different server configurations', async () => {
      const configs = [
        { baseUrl: 'https://analytics.myapp.com', token: 'prod-token' },
        { baseUrl: 'http://localhost:3000', token: undefined },
        { baseUrl: 'https://staging-api.example.com', token: 'staging-token' }
      ];

      for (const config of configs) {
        const testSdk = new NodashSDK(config.baseUrl, config.token);
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        } as Response);

        await testSdk.track('config_test');

        const expectedHeaders: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (config.token) {
          expectedHeaders['Authorization'] = `Bearer ${config.token}`;
        }

        expect(mockFetch).toHaveBeenCalledWith(
          `${config.baseUrl}/track`,
          expect.objectContaining({
            headers: expectedHeaders
          })
        );
      }
    });
  });

  describe('Event Recording', () => {
    describe('startRecording() and stopRecording()', () => {
      it('should start and stop recording', () => {
        sdk.startRecording();
        const snapshot = sdk.stopRecording();
        
        expect(snapshot).toEqual({
          events: [],
          recordedAt: expect.any(Date),
          totalEvents: 0
        });
      });

      it('should start recording with custom max events', () => {
        sdk.startRecording(50);
        // Recording should be active but we can't directly test the limit without internal access
        const snapshot = sdk.stopRecording();
        expect(snapshot.totalEvents).toBe(0);
      });
    });

    describe('track/identify behavior during recording', () => {
      it('should capture track events during recording instead of sending HTTP', async () => {
        sdk.startRecording();
        
        await sdk.track('test_event', { prop: 'value' });
        
        // No HTTP request should be made
        expect(mockFetch).not.toHaveBeenCalled();
        
        const snapshot = sdk.stopRecording();
        expect(snapshot.events).toHaveLength(1);
        expect(snapshot.events[0].type).toBe('track');
        expect(snapshot.events[0].data).toEqual({
          event: 'test_event',
          properties: { prop: 'value' },
          timestamp: expect.any(Date)
        });
      });

      it('should capture identify events during recording instead of sending HTTP', async () => {
        sdk.startRecording();
        
        await sdk.identify('user-123', { name: 'John' });
        
        // No HTTP request should be made
        expect(mockFetch).not.toHaveBeenCalled();
        
        const snapshot = sdk.stopRecording();
        expect(snapshot.events).toHaveLength(1);
        expect(snapshot.events[0].type).toBe('identify');
        expect(snapshot.events[0].data).toEqual({
          userId: 'user-123',
          traits: { name: 'John' },
          timestamp: expect.any(Date)
        });
      });

      it('should capture multiple events during recording', async () => {
        sdk.startRecording();
        
        await sdk.track('event1');
        await sdk.identify('user-1');
        await sdk.track('event2', { prop: 'test' });
        
        expect(mockFetch).not.toHaveBeenCalled();
        
        const snapshot = sdk.stopRecording();
        expect(snapshot.events).toHaveLength(3);
        expect(snapshot.events[0].type).toBe('track');
        expect(snapshot.events[1].type).toBe('identify');
        expect(snapshot.events[2].type).toBe('track');
      });

      it('should resume normal HTTP behavior after stopping recording', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        } as Response);

        sdk.startRecording();
        await sdk.track('recorded_event');
        sdk.stopRecording();
        
        // This should make HTTP request
        await sdk.track('normal_event');
        
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('replay()', () => {
      it('should replay events with dry-run mode', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        const snapshot: EventSnapshot = {
          events: [
            {
              type: 'track',
              data: { event: 'test_event', properties: { prop: 'value' }, timestamp: new Date() },
              timestamp: new Date()
            },
            {
              type: 'identify',
              data: { userId: 'user-123', traits: { name: 'John' }, timestamp: new Date() },
              timestamp: new Date()
            }
          ],
          recordedAt: new Date(),
          totalEvents: 2
        };

        await sdk.replay(snapshot, { dryRun: true });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('[DRY RUN] track:', snapshot.events[0].data);
        expect(consoleSpy).toHaveBeenCalledWith('[DRY RUN] identify:', snapshot.events[1].data);
        
        consoleSpy.mockRestore();
      });

      it('should replay events to default endpoint', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response)
          .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response);

        const snapshot: EventSnapshot = {
          events: [
            {
              type: 'track',
              data: { event: 'test_event', properties: {}, timestamp: new Date() },
              timestamp: new Date()
            },
            {
              type: 'identify',
              data: { userId: 'user-123', traits: {}, timestamp: new Date() },
              timestamp: new Date()
            }
          ],
          recordedAt: new Date(),
          totalEvents: 2
        };

        await sdk.replay(snapshot);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/track',
          expect.objectContaining({ method: 'POST' })
        );
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/identify',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should replay events to custom URL', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response);

        const snapshot: EventSnapshot = {
          events: [
            {
              type: 'track',
              data: { event: 'test_event', properties: {}, timestamp: new Date() },
              timestamp: new Date()
            }
          ],
          recordedAt: new Date(),
          totalEvents: 1
        };

        await sdk.replay(snapshot, { url: 'https://custom.example.com' });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://custom.example.com/track',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should continue processing events when errors occur', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        mockFetch
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessResponse } as Response);

        const snapshot: EventSnapshot = {
          events: [
            {
              type: 'track',
              data: { event: 'failing_event', properties: {}, timestamp: new Date() },
              timestamp: new Date()
            },
            {
              type: 'track',
              data: { event: 'success_event', properties: {}, timestamp: new Date() },
              timestamp: new Date()
            }
          ],
          recordedAt: new Date(),
          totalEvents: 2
        };

        await sdk.replay(snapshot);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Replay completed with 1 errors');
        
        consoleWarnSpy.mockRestore();
      });
    });
  });
});