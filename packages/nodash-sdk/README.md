# @nodash/sdk

The Nodash SDK is the foundation client library for the Nodash analytics ecosystem. It provides a minimal, type-safe interface for event tracking, user identification, and server health monitoring. The SDK is designed for both human developers and AI agents, offering comprehensive functionality with a simple API surface.

## Installation

```bash
npm install @nodash/sdk
```

### Node.js / CommonJS
```javascript
const { NodashSDK } = require('@nodash/sdk');

const nodash = new NodashSDK('https://your-server.com', 'your-optional-token');
```

### ES Modules / Web
```typescript
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK('https://your-server.com', 'your-optional-token');
```

### Browser (via CDN)
```html
<script type="module">
  import { NodashSDK } from 'https://unpkg.com/@nodash/sdk/dist/index.esm.js';
  
  const nodash = new NodashSDK('https://your-server.com', 'your-optional-token');
</script>
```

### Usage Examples

```typescript
// Track events
await nodash.track('user_signed_up', { 
  plan: 'premium',
  source: 'website' 
});

// Identify users
await nodash.identify('user-123', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Check server health
const health = await nodash.health();
console.log('Server status:', health.status);
```

## Architecture

The Nodash SDK serves as the foundation layer of the Nodash ecosystem:

```
┌─────────────────┐
│   @nodash/mcp   │  ← AI Agent Layer
│  (AI Agents)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/cli   │  ← Developer Layer
│  (Developer)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/sdk   │  ← Foundation Layer (this package)
│   (Foundation)  │
└─────────────────┘
```

The SDK provides:
- **Minimal API Surface**: Core methods for tracking, identification, and health monitoring
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Error Handling**: Clear, structured error messages for debugging
- **Multi-tenant Support**: Automatic tenant derivation from API tokens

## Authentication and Multi-tenancy

### API Token Format

The SDK supports different API token formats for various authentication scenarios:

```typescript
// Single-tenant token (standard format)
const sdk = new NodashSDK('https://api.com', 'sk-your-secret-token');

// Multi-tenant token (tenant auto-derived)
const sdk = new NodashSDK('https://api.com', 'demo-api-key-tenant1');
// Tenant 'tenant1' is automatically extracted from the token
```

### Tenant Derivation

For multi-tenant servers, the SDK automatically derives the tenant from the API token pattern:

- Token format: `{prefix}-{suffix}-{tenant}`
- Example: `demo-api-key-tenant1` → tenant: `tenant1`
- Example: `prod-key-company-abc` → tenant: `company-abc`

### Custom Headers

You can provide custom headers for additional authentication or configuration:

```typescript
const sdk = new NodashSDK('https://api.com', 'your-token', {
  headers: {
    'X-Custom-Auth': 'additional-auth-token',
    'X-Environment': 'production',
    'X-Client-Version': '1.0.0'
  }
});
```

### Environment-based Configuration

```typescript
const sdk = new NodashSDK(
  process.env.NODASH_URL!,
  process.env.NODASH_TOKEN,
  {
    headers: {
      'X-Environment': process.env.NODE_ENV || 'development'
    }
  }
);
```

### AI Agent Integration

```typescript
const sdk = new NodashSDK(process.env.NODASH_URL!, process.env.NODASH_TOKEN);

// Track AI interactions with structured data
await sdk.track('ai_interaction', {
  model: 'gpt-4',
  tokens_used: 1337,
  user_satisfaction: 'high',
  response_time_ms: 250
});
```

## API Reference

### Constructor

```typescript
new NodashSDK(baseUrl: string, apiToken?: string)
```

**Parameters:**
- `baseUrl` (required): Your server URL. Must be a valid URL.
- `apiToken` (optional): Authentication token. For multi-tenant servers, tenant information is automatically derived from the token pattern (e.g., `demo-api-key-tenant1` → `tenant1`).

**Example:**
```typescript
// With token (tenant auto-derived for multi-tenant servers)
const sdk = new NodashSDK('https://api.yourserver.com', 'demo-api-key-tenant1');

// With token only (for single-tenant servers)
const sdk = new NodashSDK('https://api.yourserver.com', 'sk-your-secret-token');

// Without token (for servers that don't require authentication)
const sdk = new NodashSDK('https://your-local-server.com');
```

### track(event, properties?)

Track events that happen in your application.

```typescript
await sdk.track(event: string, properties?: Record<string, any>): Promise<void>
```

**Parameters:**
- `event`: Event name describing what happened
- `properties`: Additional event data (optional)

**Examples:**
```typescript
// Simple event
await sdk.track('button_clicked');

// Event with context
await sdk.track('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  items: ['product_1', 'product_2', 'product_3']
});
```

### identify(userId, traits?)

Identify users and associate traits with them.

```typescript
await sdk.identify(userId: string, traits?: Record<string, any>): Promise<void>
```

**Parameters:**
- `userId`: Unique identifier for the user
- `traits`: User attributes (optional)

**Examples:**
```typescript
// Basic identification
await sdk.identify('user-123');

// With user traits
await sdk.identify('user-456', {
  email: 'developer@example.com',
  plan: 'pro',
  role: 'developer'
});
```

### health()

Check server health status.

```typescript
await sdk.health(): Promise<HealthStatus>
```

**Returns:**
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: HealthCheck[];
}
```

**Example:**
```typescript
const health = await sdk.health();
if (health.status === 'healthy') {
  console.log('Server is operational');
} else {
  console.log('Server health check failed');
}
```

### getConfig()

Get the current SDK configuration.

```typescript
sdk.getConfig(): NodashConfig
```

**Returns:**
```typescript
interface NodashConfig {
  baseUrl: string;
  apiToken?: string;
  environment?: string;
  customHeaders?: Record<string, string>;
}
```

**Example:**
```typescript
const config = sdk.getConfig();
console.log('Base URL:', config.baseUrl);
```

### queryEvents(options?)

Query events with filtering and pagination.

```typescript
sdk.queryEvents(options?: QueryOptions): Promise<QueryResult>
```

**Parameters:**
```typescript
interface QueryOptions {
  eventTypes?: string[];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  properties?: Record<string, any>;
  sortBy?: 'timestamp' | 'eventName' | 'userId';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  format?: 'json' | 'csv';
}
```

**Returns:**
```typescript
interface QueryResult {
  events: AnalyticsEvent[];
  totalCount: number;
  hasMore: boolean;
  pagination: PaginationInfo;
  executionTime: number;
}

interface AnalyticsEvent {
  eventId: string;
  tenantId: string;
  userId?: string;
  eventName: string;
  properties: Record<string, any>;
  timestamp: Date;
  receivedAt: Date;
  sessionId?: string;
  deviceId?: string;
}
```

**Example:**
```typescript
const result = await sdk.queryEvents({
  eventTypes: ['user_signup', 'purchase'],
  startDate: new Date('2024-01-01'),
  limit: 100
});

console.log(`Found ${result.totalCount} events`);
result.events.forEach(event => {
  console.log(`${event.eventName} at ${event.timestamp}`);
});
```

### queryUsers(options?)

Query users with filtering and pagination.

```typescript
sdk.queryUsers(options?: UserQueryOptions): Promise<UserQueryResult>
```

**Parameters:**
```typescript
interface UserQueryOptions {
  userId?: string;
  activeSince?: Date;
  activeUntil?: Date;
  properties?: Record<string, any>;
  sortBy?: 'firstSeen' | 'lastSeen' | 'eventCount' | 'sessionCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  format?: 'json' | 'csv';
}
```

**Returns:**
```typescript
interface UserQueryResult {
  users: UserRecord[];
  totalCount: number;
  hasMore: boolean;
  pagination: PaginationInfo;
  executionTime: number;
}

interface UserRecord {
  userId: string;
  tenantId: string;
  properties: Record<string, any>;
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
  eventCount: number;
}
```

**Example:**
```typescript
const result = await sdk.queryUsers({
  activeSince: new Date('2024-01-01'),
  sortBy: 'lastSeen',
  limit: 50
});

console.log(`Found ${result.totalCount} users`);
result.users.forEach(user => {
  console.log(`User ${user.userId}: ${user.eventCount} events`);
});
```

## Server Implementation

To implement a Nodash-compatible server, your server must support the following endpoints:

Your server needs to implement these endpoints:

### POST /track
Accept tracking events:
```json
{
  "event": "user_action",
  "properties": { "key": "value" },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### POST /identify
Accept user identification:
```json
{
  "userId": "user-123",
  "traits": { "name": "John Doe" },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /health
Return server status:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": [
    { "name": "database", "status": "pass" },
    { "name": "redis", "status": "pass" }
  ]
}
```

## Error Handling

The SDK provides comprehensive error handling with clear, structured error messages for debugging and troubleshooting.

### Constructor Errors

```typescript
// Invalid baseUrl
try {
  const sdk = new NodashSDK('not-a-url');
} catch (error) {
  console.log(error.message); // "baseUrl must be a valid URL"
}

// Missing baseUrl
try {
  const sdk = new NodashSDK('');
} catch (error) {
  console.log(error.message); // "baseUrl is required and must be a string"
}

// Invalid apiToken
try {
  const sdk = new NodashSDK('https://api.com', '');
} catch (error) {
  console.log(error.message); // "apiToken is required and must be a string"
}
```

### Method Validation Errors

```typescript
// Track method errors
try {
  await sdk.track('', {}); // Empty event name
} catch (error) {
  console.log(error.message); // "event name is required and must be a string"
}

try {
  await sdk.track(null); // Invalid event type
} catch (error) {
  console.log(error.message); // "event name is required and must be a string"
}

// Identify method errors
try {
  await sdk.identify(''); // Empty userId
} catch (error) {
  console.log(error.message); // "userId is required and must be a string"
}

try {
  await sdk.identify(null); // Invalid userId type
} catch (error) {
  console.log(error.message); // "userId is required and must be a string"
}
```

### Network and Server Errors

```typescript
try {
  await sdk.track('user_action', { test: true });
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.log('Server is not reachable');
  } else if (error.status === 401) {
    console.log('Authentication failed - check your API token');
  } else if (error.status === 429) {
    console.log('Rate limit exceeded - please retry later');
  } else if (error.status >= 500) {
    console.log('Server error - please try again');
  } else {
    console.log('Request failed:', error.message);
  }
}
```

### Error Response Format

When server requests fail, the SDK throws errors with the following structure:

```typescript
interface SDKError extends Error {
  status?: number;        // HTTP status code
  code?: string;          // Error code (e.g., 'ECONNREFUSED')
  response?: any;         // Server response body
  requestId?: string;     // Request ID for debugging
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| `baseUrl must be a valid URL` | Invalid URL format | Ensure URL includes protocol (http/https) |
| `event name is required` | Empty or null event name | Provide a non-empty string for event name |
| `userId is required` | Empty or null userId | Provide a non-empty string for userId |
| `401 Unauthorized` | Invalid or missing API token | Check your API token configuration |
| `429 Too Many Requests` | Rate limit exceeded | Implement retry logic with backoff |
| `ECONNREFUSED` | Server not reachable | Check server URL and network connectivity |
| `ETIMEDOUT` | Request timeout | Check network connectivity or increase timeout |

### Error Handling Best Practices

```typescript
import { NodashSDK } from '@nodash/sdk';

const sdk = new NodashSDK(process.env.NODASH_URL, process.env.NODASH_TOKEN);

async function trackEventSafely(event: string, properties?: Record<string, any>) {
  try {
    await sdk.track(event, properties);
  } catch (error) {
    // Log error for debugging
    console.error('Failed to track event:', {
      event,
      error: error.message,
      status: error.status,
      requestId: error.requestId
    });
    
    // Handle specific error types
    if (error.status === 429) {
      // Implement retry with exponential backoff
      await retryWithBackoff(() => sdk.track(event, properties));
    } else if (error.status >= 500) {
      // Queue for retry later
      queueForRetry(event, properties);
    }
    
    // Don't throw - allow application to continue
  }
}

async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

## Common Patterns

## Usage Examples

### Environment-based Configuration
```typescript
const sdk = new NodashSDK(
  process.env.NODE_ENV === 'production' 
    ? 'https://api.nodash.com'
    : 'http://localhost:3000',
  process.env.NODASH_TOKEN
);
```

### Web Application Integration
```typescript
import { NodashSDK } from '@nodash/sdk';

const analytics = new NodashSDK('https://api.example.com', 'your-api-token');

// Track page views
await analytics.track('page_view', {
  page: window.location.pathname,
  referrer: document.referrer,
  user_agent: navigator.userAgent
});

// Track user interactions
document.getElementById('signup-button').addEventListener('click', async () => {
  await analytics.track('signup_button_clicked', {
    page: 'landing',
    button_position: 'header'
  });
});
```

### Server-side Integration
```typescript
import { NodashSDK } from '@nodash/sdk';

const analytics = new NodashSDK(process.env.NODASH_URL, process.env.NODASH_TOKEN);

// Track API usage
app.post('/api/users', async (req, res) => {
  // Create user logic...
  
  await analytics.track('user_created', {
    user_id: newUser.id,
    plan: newUser.plan,
    source: req.headers['x-source'] || 'api'
  });
  
  res.json(newUser);
});
```

### AI Agent Integration
```typescript
import { NodashSDK } from '@nodash/sdk';

const analytics = new NodashSDK(process.env.NODASH_URL, process.env.NODASH_TOKEN);

// Track AI interactions
async function trackAIInteraction(interaction: AIInteraction) {
  await analytics.track('ai_interaction', {
    model: interaction.model,
    tokens_used: interaction.tokensUsed,
    response_time_ms: interaction.responseTime,
    user_satisfaction: interaction.satisfaction,
    task_type: interaction.taskType
  });
}

// Track agent performance
await analytics.track('agent_task_completed', {
  task_id: 'task-123',
  duration_ms: 1500,
  success: true,
  error_count: 0
});
```

### Testing and Development
```typescript
import { NodashSDK } from '@nodash/sdk';

const sdk = new NodashSDK('http://localhost:3000');

// Run your test scenarios
await sdk.track('test_event_1', { test: true });
await sdk.identify('test-user', { role: 'tester' });
```

### Batch Operations
Currently, each method makes individual HTTP requests. For batch operations, implement batching logic in your server.

## Troubleshooting

**Q: My requests are failing with 401 errors**
A: Check your API token configuration. Verify that your server requires authentication and that you're providing a valid token.

**Q: The SDK is throwing "baseUrl must be a valid URL" errors**
A: Ensure your URL includes the protocol (http:// or https://) and is properly formatted.

**Q: Nothing is happening when I call track()**
A: Check your server logs and network connectivity. Verify that your server is running and accessible at the configured URL.

**Q: Can I use this with my custom server?**
A: Yes, as long as your server implements the required HTTP endpoints (/track, /identify, /health) with the expected request/response formats.

## Contributing

Contributions are welcome! Please follow these guidelines:
- Keep implementations simple and focused
- Write comprehensive tests for new features
- Update documentation for any API changes

## License

MIT License

---

*Built by the Nodash team*