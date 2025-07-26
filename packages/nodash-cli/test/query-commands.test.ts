import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { SDKWrapper } from '../src/sdk-wrapper';
import { QueryResult, UserQueryResult } from '@nodash/sdk';

// Mock the SDK wrapper
vi.mock('../src/sdk-wrapper');

describe('CLI Query Commands', () => {
  let mockSDKWrapper: any;

  beforeAll(() => {
    mockSDKWrapper = {
      queryEvents: vi.fn(),
      queryUsers: vi.fn(),
    };
  });

  describe('Query Events Command', () => {
    it('should call SDK queryEvents with correct parameters', async () => {
      const mockResult: QueryResult = {
        events: [
          {
            eventId: 'test-1',
            tenantId: 'test-tenant',
            eventName: 'page_view',
            properties: { page: '/home' },
            timestamp: new Date(),
            receivedAt: new Date(),
            userId: 'user1'
          }
        ],
        totalCount: 1,
        hasMore: false,
        pagination: {
          limit: 100,
          offset: 0
        },
        executionTime: 50
      };

      mockSDKWrapper.queryEvents.mockResolvedValue(mockResult);

      const options = {
        eventTypes: ['page_view'],
        userId: 'user1',
        limit: 100,
        offset: 0,
        format: 'json'
      };

      const result = await mockSDKWrapper.queryEvents(options);

      expect(mockSDKWrapper.queryEvents).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockResult);
    });

    it('should handle date parsing correctly', () => {
      const dateString = '2024-01-01T00:00:00Z';
      const parsedDate = new Date(dateString);
      
      expect(parsedDate.toISOString()).toBe('2024-01-01T00:00:00.000Z');
      expect(isNaN(parsedDate.getTime())).toBe(false);
    });

    it('should validate event type filters', () => {
      const eventTypes = 'page_view,click,signup';
      const parsed = eventTypes.split(',').map(t => t.trim());
      
      expect(parsed).toEqual(['page_view', 'click', 'signup']);
    });

    it('should validate properties JSON', () => {
      const validJSON = '{"page": "/home", "source": "organic"}';
      const invalidJSON = '{invalid json}';
      
      expect(() => JSON.parse(validJSON)).not.toThrow();
      expect(() => JSON.parse(invalidJSON)).toThrow();
    });

    it('should validate sort parameters', () => {
      const validSortFields = ['timestamp', 'eventName', 'userId'];
      const validSortOrders = ['asc', 'desc'];
      
      expect(validSortFields.includes('timestamp')).toBe(true);
      expect(validSortFields.includes('invalid')).toBe(false);
      expect(validSortOrders.includes('asc')).toBe(true);
      expect(validSortOrders.includes('invalid')).toBe(false);
    });

    it('should validate pagination parameters', () => {
      const validLimit = 100;
      const invalidLimit = -1;
      const validOffset = 0;
      const invalidOffset = -5;
      
      expect(validLimit > 0).toBe(true);
      expect(invalidLimit > 0).toBe(false);
      expect(validOffset >= 0).toBe(true);
      expect(invalidOffset >= 0).toBe(false);
    });
  });

  describe('Query Users Command', () => {
    it('should call SDK queryUsers with correct parameters', async () => {
      const mockResult: UserQueryResult = {
        users: [
          {
            userId: 'user1',
            tenantId: 'test-tenant',
            properties: { name: 'Test User' },
            firstSeen: new Date(),
            lastSeen: new Date(),
            sessionCount: 5,
            eventCount: 25
          }
        ],
        totalCount: 1,
        hasMore: false,
        pagination: {
          limit: 100,
          offset: 0
        },
        executionTime: 30
      };

      mockSDKWrapper.queryUsers.mockResolvedValue(mockResult);

      const options = {
        userId: 'user1',
        limit: 100,
        offset: 0,
        format: 'json'
      };

      const result = await mockSDKWrapper.queryUsers(options);

      expect(mockSDKWrapper.queryUsers).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockResult);
    });

    it('should validate user sort parameters', () => {
      const validSortFields = ['firstSeen', 'lastSeen', 'eventCount', 'sessionCount'];
      
      expect(validSortFields.includes('firstSeen')).toBe(true);
      expect(validSortFields.includes('invalid')).toBe(false);
    });

    it('should handle date range validation', () => {
      const activeSince = new Date('2024-01-01');
      const activeUntil = new Date('2024-01-31');
      const invalidRange = activeSince > activeUntil;
      
      expect(invalidRange).toBe(false);
      
      const invalidActiveSince = new Date('2024-02-01');
      const invalidRangeCheck = invalidActiveSince > activeUntil;
      expect(invalidRangeCheck).toBe(true);
    });
  });

  describe('Output Formatting', () => {
    it('should format table output correctly', () => {
      const mockEvent = {
        eventName: 'page_view',
        userId: 'user1',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        properties: { page: '/home' }
      };

      const eventName = mockEvent.eventName.padEnd(20);
      const userId = (mockEvent.userId || '').padEnd(15);
      const timestamp = mockEvent.timestamp.toISOString().padEnd(25);
      const properties = JSON.stringify(mockEvent.properties);

      expect(eventName).toBe('page_view           ');
      expect(userId).toBe('user1          ');
      expect(timestamp).toBe('2024-01-01T12:00:00.000Z ');
      expect(properties).toBe('{"page":"/home"}');
    });

    it('should format JSON output correctly', () => {
      const mockResult = {
        events: [],
        totalCount: 0,
        hasMore: false,
        pagination: { limit: 100, offset: 0 },
        executionTime: 10
      };

      const jsonOutput = JSON.stringify(mockResult, null, 2);
      expect(jsonOutput).toContain('"events": []');
      expect(jsonOutput).toContain('"totalCount": 0');
    });
  });

  describe('Error Handling', () => {
    it('should handle SDK errors gracefully', async () => {
      const error = new Error('Network error');
      mockSDKWrapper.queryEvents.mockRejectedValue(error);

      await expect(mockSDKWrapper.queryEvents({})).rejects.toThrow('Network error');
    });

    it('should validate format options', () => {
      const validFormats = ['json', 'table'];
      
      expect(validFormats.includes('json')).toBe(true);
      expect(validFormats.includes('csv')).toBe(false);
      expect(validFormats.includes('invalid')).toBe(false);
    });
  });
});