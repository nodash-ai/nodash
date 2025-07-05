# Quick Start Guide

Get up and running with Nodash analytics in under 5 minutes.

## 1. Installation

```bash
npm install @nodash/sdk
```

## 2. Initialize

```typescript
import { nodash } from '@nodash/sdk';

nodash.init('your-project-token', {
  apiUrl: 'http://localhost:3001'
});
```

## 3. Track Your First Event

```typescript
// Track a simple event
nodash.track('Button Click', { button: 'signup' });

// Identify a user
nodash.identify('user-123', { 
  name: 'John Doe', 
  email: 'john@example.com' 
});

// Track a page view
nodash.page('Home');
```

## 4. Common Patterns

### E-commerce Tracking

```typescript
// Product viewed
nodash.track('Product Viewed', {
  product_id: 'abc-123',
  product_name: 'Wireless Headphones',
  price: 199.99,
  category: 'Electronics'
});

// Purchase completed
nodash.track('Order Completed', {
  order_id: 'order-789',
  total: 299.97,
  currency: 'USD'
});
```

### User Journey

```typescript
// User signs up
nodash.identify('user-123', { email: 'john@example.com' });
nodash.track('User Registered', { method: 'email' });

// User completes onboarding
nodash.track('Onboarding Completed', { 
  steps_completed: 5,
  time_to_complete: 180 
});

// User upgrades plan
nodash.track('Plan Upgraded', { 
  from_plan: 'free',
  to_plan: 'pro',
  price: 29.99 
});
```

## 5. Framework Integration

### React

```tsx
import { useEffect } from 'react';
import { nodash } from '@nodash/sdk';

function App() {
  useEffect(() => {
    nodash.init('your-token', {
      apiUrl: 'http://localhost:3001'
    });
  }, []);

  return (
    <button onClick={() => nodash.track('Button Click', { button: 'cta' })}>
      Sign Up
    </button>
  );
}
```

### Vue.js

```vue
<template>
  <button @click="trackClick">Sign Up</button>
</template>

<script>
import { nodash } from '@nodash/sdk';

export default {
  mounted() {
    nodash.init('your-token', {
      apiUrl: 'http://localhost:3001'
    });
  },
  methods: {
    trackClick() {
      nodash.track('Button Click', { button: 'cta' });
    }
  }
};
</script>
```

## 6. Debugging

Enable debug mode to see what's happening:

```typescript
nodash.init('your-token', {
  apiUrl: 'http://localhost:3001',
  debug: true  // See events in console
});
```

## Next Steps

- [Read the full API documentation](../README.md)
- [Check out advanced usage patterns](./advanced-usage.md)
- [Learn about event specification](./event-specification.md)
- [See framework-specific guides](./framework-guides.md) 