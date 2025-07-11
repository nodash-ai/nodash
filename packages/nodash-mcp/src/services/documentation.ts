import fs from 'fs/promises';
import path from 'path';
import { SDK_DOCS_BASE } from '../utils/constants.js';

export class DocumentationService {
  async readSDKDoc(docPath: string): Promise<string> {
    try {
      const fullPath = path.join(SDK_DOCS_BASE, docPath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read SDK documentation: ${docPath}`);
    }
  }

  async generateAPIReference(): Promise<any> {
    // Generate API reference from SDK source
    return {
      version: '1.0.0',
      methods: {
        init: {
          description: 'Initialize the SDK with configuration',
          parameters: [
            { name: 'token', type: 'string', required: true },
            { name: 'config', type: 'object', required: false },
          ],
          example: "nodash.init('token', { apiUrl: 'http://localhost:3001' })",
        },
        track: {
          description: 'Track custom events',
          parameters: [
            { name: 'eventName', type: 'string', required: true },
            { name: 'properties', type: 'object', required: false },
          ],
          example: "nodash.track('Button Click', { button: 'signup' })",
        },
        identify: {
          description: 'Identify users',
          parameters: [
            { name: 'userId', type: 'string', required: true },
            { name: 'traits', type: 'object', required: false },
          ],
          example: "nodash.identify('user-123', { email: 'user@example.com' })",
        },
        page: {
          description: 'Track page views',
          parameters: [
            { name: 'name', type: 'string', required: false },
            { name: 'category', type: 'string', required: false },
            { name: 'properties', type: 'object', required: false },
          ],
          example: "nodash.page('Home', 'Marketing')",
        },
        group: {
          description: 'Associate users with groups',
          parameters: [
            { name: 'groupId', type: 'string', required: true },
            { name: 'traits', type: 'object', required: false },
          ],
          example: "nodash.group('company-123', { name: 'Acme Corp' })",
        },
        alias: {
          description: 'Link user identities',
          parameters: [
            { name: 'userId', type: 'string', required: true },
            { name: 'previousId', type: 'string', required: true },
          ],
          example: "nodash.alias('user-123', 'anonymous-456')",
        },
        reset: {
          description: 'Reset user state',
          parameters: [],
          example: 'nodash.reset()',
        },
        flush: {
          description: 'Force send queued events',
          parameters: [],
          example: 'nodash.flush()',
        },
      },
      configuration: {
        apiUrl: {
          type: 'string',
          default: 'http://localhost:3001',
          description: 'Analytics server URL',
        },
        debug: {
          type: 'boolean',
          default: false,
          description: 'Enable debug logging',
        },
        batchSize: {
          type: 'number',
          default: 10,
          description: 'Number of events to batch before sending',
        },
        flushInterval: {
          type: 'number',
          default: 10000,
          description: 'Interval in milliseconds to flush events',
        },
        maxRetries: {
          type: 'number',
          default: 3,
          description: 'Maximum number of retry attempts',
        },
      },
    };
  }
} 