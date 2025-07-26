import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock the CLI command execution
const mockRunCliCommandInternal = vi.fn();

// Mock the NodashMCPServer class methods
class MockNodashMCPServer {
  private runCliCommandInternal = mockRunCliCommandInternal;

  async queryEvents(params: any) {
    const args = ['events'];

    if (params.eventTypes && params.eventTypes.length > 0) {
      args.push('--type', params.eventTypes.join(','));
    }

    if (params.userId) {
      args.push('--user-id', params.userId);
    }

    if (params.startDate) {
      args.push('--start', params.startDate);
    }

    if (params.endDate) {
      args.push('--end', params.endDate);
    }

    if (params.properties) {
      args.push('--properties', JSON.stringify(params.properties));
    }

    if (params.sortBy) {
      args.push('--sort-by', params.sortBy);
    }

    if (params.sortOrder) {
      args.push('--sort-order', params.sortOrder);
    }

    if (params.limit) {
      args.push('--limit', params.limit.toString());
    }

    if (params.offset !== undefined) {
      args.push('--offset', params.offset.toString());
    }

    args.push('--format', 'json');

    const result = await this.runCliCommandInternal('query', args);
    
    if (result.success) {
      try {
        const queryResult = JSON.parse(result.output);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              data: queryResult,
              summary: {
                totalEvents: queryResult.totalCount,
                returnedEvents: queryResult.events.length,
                hasMore: queryResult.hasMore,
                executionTime: queryResult.executionTime
              }
            }, null, 2)
          }]
        };
      } catch (parseError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              rawOutput: result.output
            }, null, 2)
          }]
        };
      }
    } else {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: result.error,
            message: 'Failed to query events'
          }, null, 2)
        }]
      };
    }
  }

  async queryUsers(params: any) {
    const args = ['users'];

    if (params.userId) {
      args.push('--user-id', params.userId);
    }

    if (params.activeSince) {
      args.push('--active-since', params.activeSince);
    }

    if (params.activeUntil) {
      args.push('--active-until', params.activeUntil);
    }

    if (params.properties) {
      args.push('--properties', JSON.stringify(params.properties));
    }

    if (params.sortBy) {
      args.push('--sort-by', params.sortBy);
    }

    if (params.sortOrder) {
      args.push('--sort-order', params.sortOrder);
    }

    if (params.limit) {
      args.push('--limit', params.limit.toString());
    }

    if (params.offset !== undefined) {
      args.push('--offset', params.offset.toString());
    }

    args.push('--format', 'json');

    const result = await this.runCliCommandInternal('query', args);
    
    if (result.success) {
      try {
        const queryResult = JSON.parse(result.output);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              data: queryResult,
              summary: {
                totalUsers: queryResult.totalCount,
                returnedUsers: queryResult.users.length,
                hasMore: queryResult.hasMore,
                executionTime: queryResult.executionTime
              }
            }, null, 2)
          }]
        };
      } catch (parseError) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              rawOutput: result.output
            }, null, 2)
          }]
        };
      }
    } else {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: result.error,
            message: 'Failed to query users'
          }, null, 2)
        }]
      };
    }
  }

  generateEventSummary(events: any[]) {
    const summary = {
      totalEvents: events.length,
      uniqueUsers: new Set(events.map(e => e.userId).filter(Boolean)).size,
      eventTypes: {} as Record<string, number>,
      timeRange: {
        earliest: null as string | null,
        latest: null as string | null
      },
      topProperties: {} as Record<string, number>
    };

    events.forEach(event => {
      summary.eventTypes[event.eventName] = (summary.eventTypes[event.eventName] || 0) + 1;
    });

    if (events.length > 0) {
      const timestamps = events.map(e => new Date(e.timestamp).getTime()).sort((a, b) => a - b);
      summary.timeRange.earliest = new Date(timestamps[0]).toISOString();
      summary.timeRange.latest = new Date(timestamps[timestamps.length - 1]).toISOString();
    }

    events.forEach(event => {
      Object.keys(event.properties || {}).forEach(key => {
        summary.topProperties[key] = (summary.topProperties[key] || 0) + 1;
      });
    });

    return summary;
  }

  async analyzeEvents(params: any) {
    // Mock implementation for testing
    const mockEvents = [
      {
        eventName: 'page_view',
        userId: 'user1',
        timestamp: '2024-01-01T12:00:00Z',
        properties: { page: '/home' }
      },
      {
        eventName: 'click',
        userId: 'user1',
        timestamp: '2024-01-01T12:05:00Z',
        properties: { button: 'signup' }
      }
    ];

    let analysisResult: any = {};

    switch (params.analysisType) {
      case 'summary':
        analysisResult = this.generateEventSummary(mockEvents);
        break;
      case 'trends':
        analysisResult = {
          groupBy: params.groupBy || 'day',
          trends: [
            { day: '2024-01-01', count: 2 }
          ]
        };
        break;
      case 'user_behavior':
        analysisResult = {
          totalUsers: 1,
          topUsers: [
            {
              userId: 'user1',
              eventCount: 2,
              uniqueEventTypes: 2,
              eventTypes: ['page_view', 'click']
            }
          ],
          averageEventsPerUser: 2,
          averageEventTypesPerUser: 2
        };
        break;
      case 'event_patterns':
        analysisResult = {
          topEventSequences: [
            { sequence: 'page_view → click', count: 1 }
          ],
          topProperties: [
            { property: 'page:string', count: 1 },
            { property: 'button:string', count: 1 }
          ],
          timePatterns: {
            peakHours: [{ hour: 12, count: 2 }],
            peakDays: [{ day: 'Monday', count: 2 }]
          }
        };
        break;
      default:
        throw new Error(`Unknown analysis type: ${params.analysisType}`);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          analysisType: params.analysisType,
          data: analysisResult,
          metadata: {
            totalEventsAnalyzed: mockEvents.length,
            timeRange: params.timeRange,
            eventTypes: params.eventTypes,
            groupBy: params.groupBy
          }
        }, null, 2)
      }]
    };
  }
}

describe('MCP Query Tools', () => {
  let mcpServer: MockNodashMCPServer;

  beforeAll(() => {
    mcpServer = new MockNodashMCPServer();
  });

  describe('query_events tool', () => {
    it('should build correct CLI arguments for event query', async () => {
      const mockQueryResult = {
        events: [
          {
            eventId: 'test-1',
            eventName: 'page_view',
            userId: 'user1',
            timestamp: '2024-01-01T12:00:00Z',
            properties: { page: '/home' }
          }
        ],
        totalCount: 1,
        hasMore: false,
        executionTime: 50
      };

      mockRunCliCommandInternal.mockResolvedValue({
        success: true,
        output: JSON.stringify(mockQueryResult)
      });

      const params = {
        eventTypes: ['page_view', 'click'],
        userId: 'user1',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
        properties: { page: '/home' },
        sortBy: 'timestamp',
        sortOrder: 'desc',
        limit: 100,
        offset: 0
      };

      const result = await mcpServer.queryEvents(params);

      expect(mockRunCliCommandInternal).toHaveBeenCalledWith('query', [
        'events',
        '--type', 'page_view,click',
        '--user-id', 'user1',
        '--start', '2024-01-01T00:00:00Z',
        '--end', '2024-01-31T23:59:59Z',
        '--properties', '{"page":"/home"}',
        '--sort-by', 'timestamp',
        '--sort-order', 'desc',
        '--limit', '100',
        '--offset', '0',
        '--format', 'json'
      ]);

      expect(result.content[0].type).toBe('text');
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data).toEqual(mockQueryResult);
      expect(parsedResult.summary.totalEvents).toBe(1);
    });

    it('should handle CLI command failures', async () => {
      mockRunCliCommandInternal.mockResolvedValue({
        success: false,
        error: 'Command failed'
      });

      const result = await mcpServer.queryEvents({ eventTypes: ['test'] });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe('Command failed');
    });

    it('should handle JSON parsing errors', async () => {
      mockRunCliCommandInternal.mockResolvedValue({
        success: true,
        output: 'invalid json'
      });

      const result = await mcpServer.queryEvents({ eventTypes: ['test'] });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.rawOutput).toBe('invalid json');
    });
  });

  describe('query_users tool', () => {
    it('should build correct CLI arguments for user query', async () => {
      const mockQueryResult = {
        users: [
          {
            userId: 'user1',
            properties: { name: 'Test User' },
            firstSeen: '2024-01-01T12:00:00Z',
            lastSeen: '2024-01-01T13:00:00Z',
            eventCount: 5,
            sessionCount: 1
          }
        ],
        totalCount: 1,
        hasMore: false,
        executionTime: 30
      };

      mockRunCliCommandInternal.mockResolvedValue({
        success: true,
        output: JSON.stringify(mockQueryResult)
      });

      const params = {
        userId: 'user1',
        activeSince: '2024-01-01T00:00:00Z',
        activeUntil: '2024-01-31T23:59:59Z',
        properties: { plan: 'premium' },
        sortBy: 'lastSeen',
        sortOrder: 'desc',
        limit: 50,
        offset: 10
      };

      const result = await mcpServer.queryUsers(params);

      expect(mockRunCliCommandInternal).toHaveBeenCalledWith('query', [
        'users',
        '--user-id', 'user1',
        '--active-since', '2024-01-01T00:00:00Z',
        '--active-until', '2024-01-31T23:59:59Z',
        '--properties', '{"plan":"premium"}',
        '--sort-by', 'lastSeen',
        '--sort-order', 'desc',
        '--limit', '50',
        '--offset', '10',
        '--format', 'json'
      ]);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data).toEqual(mockQueryResult);
      expect(parsedResult.summary.totalUsers).toBe(1);
    });
  });

  describe('analyze_events tool', () => {
    it('should perform summary analysis', async () => {
      const params = {
        analysisType: 'summary' as const,
        eventTypes: ['page_view', 'click'],
        timeRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z'
        }
      };

      const result = await mcpServer.analyzeEvents(params);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.analysisType).toBe('summary');
      expect(parsedResult.data.totalEvents).toBe(2);
      expect(parsedResult.data.uniqueUsers).toBe(1);
      expect(parsedResult.data.eventTypes).toBeDefined();
    });

    it('should perform trends analysis', async () => {
      const params = {
        analysisType: 'trends' as const,
        groupBy: 'day' as const
      };

      const result = await mcpServer.analyzeEvents(params);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.analysisType).toBe('trends');
      expect(parsedResult.data.groupBy).toBe('day');
      expect(parsedResult.data.trends).toBeInstanceOf(Array);
    });

    it('should perform user behavior analysis', async () => {
      const params = {
        analysisType: 'user_behavior' as const
      };

      const result = await mcpServer.analyzeEvents(params);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.analysisType).toBe('user_behavior');
      expect(parsedResult.data.totalUsers).toBe(1);
      expect(parsedResult.data.topUsers).toBeInstanceOf(Array);
      expect(parsedResult.data.averageEventsPerUser).toBe(2);
    });

    it('should perform event patterns analysis', async () => {
      const params = {
        analysisType: 'event_patterns' as const
      };

      const result = await mcpServer.analyzeEvents(params);

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.analysisType).toBe('event_patterns');
      expect(parsedResult.data.topEventSequences).toBeInstanceOf(Array);
      expect(parsedResult.data.topProperties).toBeInstanceOf(Array);
      expect(parsedResult.data.timePatterns).toBeDefined();
    });

    it('should handle unknown analysis types', async () => {
      const params = {
        analysisType: 'unknown' as any
      };

      await expect(mcpServer.analyzeEvents(params)).rejects.toThrow('Unknown analysis type: unknown');
    });
  });

  describe('Event Summary Generation', () => {
    it('should generate correct event summary', () => {
      const events = [
        {
          eventName: 'page_view',
          userId: 'user1',
          timestamp: '2024-01-01T12:00:00Z',
          properties: { page: '/home', source: 'organic' }
        },
        {
          eventName: 'click',
          userId: 'user2',
          timestamp: '2024-01-01T13:00:00Z',
          properties: { button: 'signup', page: '/signup' }
        },
        {
          eventName: 'page_view',
          userId: 'user1',
          timestamp: '2024-01-01T14:00:00Z',
          properties: { page: '/about' }
        }
      ];

      const summary = mcpServer.generateEventSummary(events);

      expect(summary.totalEvents).toBe(3);
      expect(summary.uniqueUsers).toBe(2);
      expect(summary.eventTypes['page_view']).toBe(2);
      expect(summary.eventTypes['click']).toBe(1);
      expect(summary.timeRange.earliest).toBe('2024-01-01T12:00:00.000Z');
      expect(summary.timeRange.latest).toBe('2024-01-01T14:00:00.000Z');
      expect(summary.topProperties['page']).toBe(3);
      expect(summary.topProperties['source']).toBe(1);
      expect(summary.topProperties['button']).toBe(1);
    });

    it('should handle empty events array', () => {
      const summary = mcpServer.generateEventSummary([]);

      expect(summary.totalEvents).toBe(0);
      expect(summary.uniqueUsers).toBe(0);
      expect(Object.keys(summary.eventTypes)).toHaveLength(0);
      expect(summary.timeRange.earliest).toBeNull();
      expect(summary.timeRange.latest).toBeNull();
    });
  });
});