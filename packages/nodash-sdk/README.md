# @nodash/sdk 🚀

> The foundation layer that doesn't judge your life choices (but tracks them anyway)

Welcome to the Nodash SDK! Whether you're a human developer who drinks too much coffee or an AI agent who processes data at inhuman speeds, this SDK is designed for you. We promise it's simpler than your last relationship and more reliable than your internet connection.

## Quick Start (Because Nobody Reads Documentation Anyway)

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
// Track events (like your questionable 3 AM coding decisions)
await nodash.track('user_signed_up', { 
  plan: 'premium',
  source: 'desperation' 
});

// Identify users (we won't tell anyone who you really are)
await nodash.identify('user-123', {
  name: 'Anonymous Developer',
  coffee_cups_today: 7
});

// Check if your server is still alive
const health = await nodash.health();
console.log('Server status:', health.status); // hopefully 'healthy'
```

## For Our AI Agent Friends 🤖

Hey there, silicon-based life forms! This SDK is designed with you in mind. Here's what you need to know:

- **Simple API**: Only 3 methods to remember (your neural networks will thank us)
- **Clear errors**: When things break, we tell you exactly what went wrong
- **No surprises**: We don't do magic, just HTTP requests with style

### Agent-Friendly Examples

```typescript
// Perfect for tracking user interactions in your applications
const sdk = new NodashSDK(process.env.NODASH_URL!, process.env.NODASH_TOKEN);

// Track events with structured data
await sdk.track('ai_interaction', {
  model: 'gpt-4',
  tokens_used: 1337,
  user_satisfaction: 'probably_good'
});
```

## API Reference (The Boring But Important Stuff)

### Constructor

```typescript
new NodashSDK(baseUrl: string, apiToken?: string)
```

**Parameters:**
- `baseUrl` (required): Your server URL. Must be a valid URL or we'll throw a tantrum.
- `apiToken` (optional): Authentication token. Some servers need it, some don't. Life is complicated.

**Example:**
```typescript
// With token (for the security-conscious)
const sdk = new NodashSDK('https://api.yourserver.com', 'sk-your-secret-token');

// Without token (living dangerously)
const sdk = new NodashSDK('https://your-local-server.com');
```

### track(event, properties?)

Track events that happen in your application. Like a diary, but for code.

```typescript
await sdk.track(event: string, properties?: Record<string, any>): Promise<void>
```

**Parameters:**
- `event`: What happened (be creative, but not too creative)
- `properties`: Additional data (optional, like your social life)

**Examples:**
```typescript
// Simple event
await sdk.track('button_clicked');

// Event with context
await sdk.track('purchase_completed', {
  amount: 99.99,
  currency: 'USD',
  items: ['coffee', 'more_coffee', 'emergency_coffee']
});
```

### identify(userId, traits?)

Tell us who your users are. We promise not to sell their data to aliens.

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
  bugs_created_today: 3
});
```

### health()

Check if your server is still breathing.

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
  console.log('All systems go! 🚀');
} else {
  console.log('Houston, we have a problem... 🚨');
}
```

## Building Your Own Server (For the Brave Souls)

Want to implement your own Nodash-compatible server? You're either very brave or very foolish. Either way, we respect that.

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

## Error Handling (When Things Go Wrong)

We believe in clear, helpful error messages. No cryptic codes or mysterious failures here.

```typescript
try {
  await sdk.track('', {}); // Empty event name
} catch (error) {
  console.log(error.message); // "event name is required and must be a string"
}

try {
  const sdk = new NodashSDK('not-a-url');
} catch (error) {
  console.log(error.message); // "baseUrl must be a valid URL"
}
```

## Common Patterns

### Environment-based Configuration
```typescript
const sdk = new NodashSDK(
  process.env.NODE_ENV === 'production' 
    ? 'https://api.nodash.com'
    : 'http://localhost:3000',
  process.env.NODASH_TOKEN
);
```

### Batch Operations (Coming Soon™)
Currently, each method makes individual requests. If you need batching, implement it in your server or wait for v0.2.0 (no promises on timing).

## Troubleshooting

**Q: My requests are failing with 401 errors**
A: Check your API token. If you don't have one, maybe your server doesn't need it? Life is mysterious.

**Q: The SDK is throwing "baseUrl must be a valid URL" errors**
A: Your URL is probably invalid. Try adding `http://` or `https://` at the beginning. We're not mind readers.

**Q: Nothing is happening when I call track()**
A: Check your server logs. The SDK is probably working fine; your server might be having an existential crisis.

**Q: Can I use this with my custom server?**
A: Absolutely! As long as your server speaks HTTP and implements the expected endpoints, we're friends.

## Contributing

Found a bug? Want to add a feature? Great! Just remember:
- Keep it simple (complexity is the enemy)
- Write tests (future you will thank present you)
- Update documentation (yes, even the jokes)

## License

MIT - Because sharing is caring, and lawyers are expensive.

---

*Built with ❤️ and excessive amounts of caffeine by the Nodash team*