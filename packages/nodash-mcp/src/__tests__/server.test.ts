import { describe, test, expect, vi, beforeEach } from 'vitest';
import { handleToolCall } from '../server';
import { NodashSDK } from '@nodash/sdk';

// Mock the entire NodashSDK module
vi.mock('@nodash/sdk');

describe('MCP Server Tool Handling', () => {
  let mockTrack: vi.Mock;
  let mockSendMetric: vi.Mock;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    mockTrack = vi.fn();
    mockSendMetric = vi.fn();
    
    const MockNodashSDK = NodashSDK as vi.MockedClass<typeof NodashSDK>;
    MockNodashSDK.mockImplementation(() => {
      return {
        track: mockTrack,
        sendMetric: mockSendMetric,
        // Add any other methods that might be called
      } as any;
    });
  });

  test('should call NodashSDK.track with correct parameters on nodash_track_event tool call', async () => {
    // Manually set a token for the SDK to initialize
    process.env.NODASH_TOKEN = 'test-token';

    const request = {
      toolName: 'nodash_track_event',
      input: {
        event: 'test_event',
        properties: { foo: 'bar' },
      },
    };

    const result = await handleToolCall(request);

    expect(result.status).toBe('success');
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('test_event', { foo: 'bar' });
  });
}); 