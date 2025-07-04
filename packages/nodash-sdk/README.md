# @nodash/sdk

Industry-standard analytics SDK for event tracking with support for user identification, page views, groups, sessions, and more.

## Quick Start

```bash
npm install @nodash/sdk
```

```typescript
import { nodash } from '@nodash/sdk';

// Initialize (uses https://api.nodash.ai by default)
nodash.init('your-project-token', {
  debug: true
});

// Or override for local development
nodash.init('your-project-token', {
  apiUrl: 'http://localhost:3001',
  debug: true
});

// Track events
nodash.track('Button Click', { button: 'signup' });

// Identify users
nodash.identify('user-123', { name: 'John Doe', email: 'john@example.com' });
```

## Installation

### NPM/Yarn

```bash
npm install @nodash/sdk
# or
yarn add @nodash/sdk
```

### CDN

```html
<script src="https://unpkg.com/@nodash/sdk@latest/dist/index.js"></script>
<script>
  // Uses https://api.nodash.ai by default
  nodash.init('your-project-token');
  
  // Or override for local development
  // nodash.init('your-project-token', { apiUrl: 'http://localhost:3001' });
</script>
```

## Initialization

Initialize the SDK with your project token and configuration:

```typescript
import { nodash } from '@nodash/sdk';

// Uses https://api.nodash.ai by default
nodash.init('your-project-token', {
  debug: true,
  batchSize: 20,
  flushInterval: 10000
});

// Override for local development
nodash.init('your-project-token', {
  apiUrl: 'http://localhost:3001',
  debug: true,
  batchSize: 20,
  flushInterval: 10000
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | `https://api.nodash.ai` | Analytics server endpoint |
| `token` | string | - | Project authentication token |
| `debug` | boolean | false | Enable debug logging |
| `batchSize` | number | 10 | Events per batch |
| `flushInterval` | number | 10000 | Auto-flush interval (ms) |
| `maxRetries` | number | 3 | Max retry attempts |
| `disablePageViews` | boolean | false | Disable auto page tracking |
| `disableSessions` | boolean | false | Disable session tracking |
| `persistence` | string | 'localStorage' | Storage method |
| `cookieDomain` | string | - | Cookie domain |
| `cookieExpiration` | number | 365 | Cookie expiration (days) |

## Core Methods

### track(eventName, properties)

Track custom events with optional properties.

```typescript
// Simple event
nodash.track('Page View');

// Event with properties
nodash.track('Purchase', {
  product: 'Pro Plan',
  amount: 99.99,
  currency: 'USD',
  category: 'subscription'
});

// E-commerce tracking
nodash.track('Product Added', {
  product_id: 'abc-123',
  product_name: 'Wireless Headphones',
  category: 'Electronics',
  price: 199.99,
  quantity: 1
});
```

**Parameters:**
- `eventName` (string): Name of the event
- `properties` (object, optional): Event properties

### identify(userId, traits)

Identify users and set user properties.

```typescript
// Basic identification
nodash.identify('user-123');

// With user traits
nodash.identify('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'pro',
  company: 'Acme Corp',
  created_at: '2023-01-15T10:30:00Z'
});

// Update user traits
nodash.identify('user-123', {
  last_login: new Date().toISOString(),
  feature_flags: ['beta_ui', 'advanced_analytics']
});
```

**Parameters:**
- `userId` (string): Unique user identifier
- `traits` (object, optional): User properties

### page(name, category, properties)

Track page views with optional categorization.

```typescript
// Auto-detect current page
nodash.page();

// Named page
nodash.page('Home');

// Page with category
nodash.page('Product Details', 'E-commerce');

// Page with full context
nodash.page('Checkout', 'E-commerce', {
  product_count: 3,
  cart_value: 299.97,
  step: 'payment'
});
```

**Parameters:**
- `name` (string, optional): Page name
- `category` (string, optional): Page category
- `properties` (object, optional): Page properties

### group(groupId, traits)

Associate users with groups (companies, teams, etc.).

```typescript
// Basic group association
nodash.group('company-123');

// With group traits
nodash.group('company-123', {
  name: 'Acme Corp',
  plan: 'enterprise',
  employees: 500,
  industry: 'Technology',
  mrr: 50000
});
```

**Parameters:**
- `groupId` (string): Unique group identifier
- `traits` (object, optional): Group properties

### alias(userId, previousId)

Link user identities together.

```typescript
// Link anonymous user to identified user
nodash.alias('user-123', 'anonymous-456');

// Link old user ID to new user ID
nodash.alias('new-user-id', 'old-user-id');
```

**Parameters:**
- `userId` (string): New user identifier
- `previousId` (string): Previous user identifier

### reset()

Reset user state (call on logout).

```typescript
// Clear user data on logout
nodash.reset();
```

### flush()

Manually flush queued events.

```typescript
// Force immediate send
await nodash.flush();
```

## Advanced Usage

### User Information

Get current user state:

```typescript
const user = nodash.user();
console.log(user.userId);      // Current user ID
console.log(user.traits);     // User traits
console.log(user.anonymousId); // Anonymous ID
```

### Group Information

Get current group state:

```typescript
const group = nodash.getGroup();
console.log(group.groupId);    // Current group ID
console.log(group.traits);     // Group traits
```

### Session Information

Get current session data:

```typescript
const session = nodash.session();
console.log(session.sessionId);   // Session ID
console.log(session.startTime);   // Session start timestamp
console.log(session.duration);    // Session duration (ms)
```

## Framework Integration

### React

```typescript
import { useEffect } from 'react';
import { nodash } from '@nodash/sdk';

function App() {
  useEffect(() => {
    nodash.init('your-token', {
      apiUrl: 'http://localhost:3001'
    });
  }, []);

  const handleSignup = (user) => {
    nodash.identify(user.id, {
      name: user.name,
      email: user.email
    });
    nodash.track('User Signed Up', {
      plan: user.plan
    });
  };

  return <div>Your App</div>;
}
```

### Vue.js

```typescript
import { createApp } from 'vue';
import { nodash } from '@nodash/sdk';

const app = createApp({
  mounted() {
    nodash.init('your-token', {
      apiUrl: 'http://localhost:3001'
    });
  },
  methods: {
    trackPurchase(product) {
      nodash.track('Purchase', {
        product_id: product.id,
        amount: product.price
      });
    }
  }
});
```

### Express.js (Server-side)

```typescript
import express from 'express';
import { NodashSDK } from '@nodash/sdk';

const app = express();
const analytics = new NodashSDK();

analytics.init('your-token', {
  apiUrl: 'http://localhost:3001'
});

app.post('/api/signup', (req, res) => {
  const { userId, email, name } = req.body;
  
  analytics.identify(userId, { email, name });
  analytics.track('User Signed Up', {
    source: 'api',
    plan: 'free'
  });
  
  res.json({ success: true });
});
```

## Event Specification

### Standard Events

#### E-commerce

```typescript
// Product viewed
nodash.track('Product Viewed', {
  product_id: 'abc-123',
  product_name: 'Wireless Headphones',
  category: 'Electronics',
  price: 199.99,
  currency: 'USD'
});

// Product added to cart
nodash.track('Product Added', {
  product_id: 'abc-123',
  product_name: 'Wireless Headphones',
  category: 'Electronics',
  price: 199.99,
  quantity: 1,
  cart_id: 'cart-456'
});

// Purchase completed
nodash.track('Order Completed', {
  order_id: 'order-789',
  total: 299.97,
  currency: 'USD',
  products: [
    {
      product_id: 'abc-123',
      product_name: 'Wireless Headphones',
      price: 199.99,
      quantity: 1
    }
  ]
});
```

#### User Lifecycle

```typescript
// User registration
nodash.track('User Registered', {
  method: 'email',
  plan: 'free'
});

// User login
nodash.track('User Logged In', {
  method: 'password'
});

// Feature usage
nodash.track('Feature Used', {
  feature_name: 'export_data',
  feature_category: 'productivity'
});
```

### Property Naming

Follow these conventions for consistent data:

- Use snake_case for property names
- Use descriptive, clear names
- Include units for numeric values
- Use ISO 8601 for timestamps
- Use consistent categories

```typescript
// Good
nodash.track('Video Played', {
  video_id: 'vid-123',
  video_title: 'Getting Started',
  video_duration_seconds: 180,
  video_category: 'tutorial',
  playback_position_seconds: 45
});

// Avoid
nodash.track('videoPlayed', {
  id: 'vid-123',
  title: 'Getting Started',
  duration: 180, // unclear units
  pos: 45
});
```

## Privacy & Compliance

### Opt-out Tracking

```typescript
// Check if user has opted out
if (userHasOptedOut) {
  // Don't initialize or use a no-op version
  return;
}

nodash.init('your-token', config);
```

### Data Minimization

Only track necessary data:

```typescript
// Good - minimal, purposeful data
nodash.track('Feature Used', {
  feature_name: 'export',
  user_plan: 'pro'
});

// Avoid - excessive personal data
nodash.track('Feature Used', {
  feature_name: 'export',
  user_email: 'user@example.com', // unnecessary
  user_ip: '192.168.1.1',         // sensitive
  user_full_name: 'John Doe'      // unnecessary
});
```

### GDPR Compliance

```typescript
// Allow users to request data deletion
function handleDataDeletion(userId) {
  // Call your backend to delete user data
  await deleteUserData(userId);
  
  // Reset local tracking
  nodash.reset();
}
```

## Debugging

### Debug Mode

Enable debug logging to see what's being tracked:

```typescript
nodash.init('your-token', {
  apiUrl: 'http://localhost:3001',
  debug: true  // Enable debug logs
});

// Console will show:
// [Nodash] SDK initialized
// [Nodash] Event tracked: { event: "Button Click", ... }
// [Nodash] User identified: { userId: "user-123", ... }
```

### Testing Events

Use browser developer tools to inspect network requests:

1. Open DevTools → Network tab
2. Filter by "batch" or your API URL
3. Trigger events in your app
4. Inspect the request payload

### Common Issues

**Events not sending:**
- Check network connectivity
- Verify API URL is correct
- Check console for error messages
- Ensure `init()` was called

**User identification not working:**
- Call `identify()` after `init()`
- Check that user ID is a string
- Verify user traits format

**Page views not tracking:**
- Check if `disablePageViews: true` is set
- Ensure running in browser environment
- Verify page navigation triggers

## TypeScript Support

Full TypeScript support with proper types:

```typescript
import { nodash, EventProperties, UserTraits } from '@nodash/sdk';

interface CustomEventProperties extends EventProperties {
  product_id: string;
  amount: number;
  currency: string;
}

interface CustomUserTraits extends UserTraits {
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}

// Type-safe tracking
nodash.track('Purchase', {
  product_id: 'abc-123',
  amount: 99.99,
  currency: 'USD'
} as CustomEventProperties);

// Type-safe identification
nodash.identify('user-123', {
  name: 'John Doe',
  email: 'john@example.com',
  plan: 'pro'
} as CustomUserTraits);
```

## Performance

### Batching

Events are automatically batched for efficiency:

```typescript
// These events will be batched together
nodash.track('Event 1');
nodash.track('Event 2');
nodash.track('Event 3');
// Batch sent when batchSize reached or flushInterval elapsed
```

### Memory Usage

The SDK maintains minimal memory footprint:

- Events are queued temporarily before sending
- Failed events are retried with exponential backoff
- Old events are discarded after max retries
- User state is persisted to localStorage

### Network Optimization

- Automatic retry with exponential backoff
- Gzip compression support
- Minimal payload size
- Configurable batch sizes

## Migration Guide

### From Google Analytics

```typescript
// GA4
gtag('event', 'purchase', {
  transaction_id: '12345',
  value: 25.42,
  currency: 'USD'
});

// Nodash equivalent
nodash.track('Purchase', {
  order_id: '12345',
  total: 25.42,
  currency: 'USD'
});
```

### From Mixpanel

```typescript
// Mixpanel
mixpanel.track('Page View', { page: 'home' });
mixpanel.identify('user-123');
mixpanel.people.set({ name: 'John' });

// Nodash equivalent
nodash.page('Home');
nodash.identify('user-123', { name: 'John' });
```

### From Segment

```typescript
// Segment
analytics.track('Button Clicked', { button: 'signup' });
analytics.identify('user-123', { email: 'john@example.com' });
analytics.page('Home');

// Nodash equivalent (same API!)
nodash.track('Button Clicked', { button: 'signup' });
nodash.identify('user-123', { email: 'john@example.com' });
nodash.page('Home');
```

## Support

- **Documentation**: Full API reference and guides
- **GitHub**: Report issues and contribute
- **Community**: Join our developer community
- **Enterprise**: Contact for enterprise support

## License

MIT License - see LICENSE file for details. 