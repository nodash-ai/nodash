import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analytics server base URL for API calls
export const ANALYTICS_SERVER_URL = process.env.ANALYTICS_SERVER_URL || 'http://localhost:3001';

// SDK documentation paths (relative to SDK package)
export const SDK_DOCS_BASE = path.resolve(__dirname, '../../../nodash-sdk');

// Project analysis cache configuration
export const ANALYSIS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Server configuration
export const SERVER_CONFIG = {
  name: 'nodash-mcp-server',
  version: '1.0.0',
} as const;

// Resource URIs (documentation only - no user-specific data)
export const RESOURCE_URIS = {
  SDK_README: 'nodash://sdk/readme',
  SDK_QUICK_START: 'nodash://sdk/quick-start',
  SDK_FRAMEWORK_GUIDES: 'nodash://sdk/framework-guides',
  SDK_API_REFERENCE: 'nodash://sdk/api-reference',
} as const; 