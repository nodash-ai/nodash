import { describe, expect, test } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

describe('MCP Server', () => {
  test('initializes without error', () => {
    const server = new Server({ name: 'test', version: '1.0' }, { capabilities: { tools: {} } });
    expect(server).toBeDefined();
  });
}); 