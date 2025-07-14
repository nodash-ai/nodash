# Quick Start Guide

Get up and running with Nodash analytics in under 5 minutes.

## 1. Installation

```bash
npm install @nodash/sdk
```

## 2. Initialize

```typescript
import NodashSDK from '@nodash/sdk';

// Create SDK instance (uses https://api.nodash.ai by default)
const nodash = new NodashSDK('your-project-token');

// Or override baseUrl for local development
const nodashLocal = new NodashSDK('your-project-token', {
  baseUrl: 'http://localhost:3001'
});
```

## 3. Track Your First Event

Follow these simple steps to track events - keep it minimal and add properties only as needed:

```typescript
// Track a simple event
nodash.track('Button Click', { button: 'signup' });

// Identify a user using special event
nodash.track('user_identified', { 
  userId: 'user-123',
  name: 'John Doe', 
  email: 'john@example.com' 
});

// Track a page view
nodash.track('page_view', { path: 'Home' });
```

## 3.1 Simple Usage in Components

Here are minimal examples for using the SDK in components - import once and track easily:

### React Example
```tsx
import nodash from '@nodash/sdk';

function SimpleButton() {
  const handleClick = () => {
    nodash.track('simple_button_clicked');
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### Vue Example
```vue
<template>
  <button @click="trackClick">Click Me</button>
</template>

<script>
import nodash from '@nodash/sdk';

export default {
  methods: {
    trackClick() {
      nodash.track('simple_button_clicked');
    }
  }
};
</script>
```

**Tip for Agents:** Start with these basics; expand with properties as your app grows. No complex setup required!

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
import NodashSDK from '@nodash/sdk';

const nodash = new NodashSDK('your-token', {
  baseUrl: 'http://localhost:3001'
});

function App() {
  useEffect(() => {
    // Initialization is done outside, but you can track here
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
import NodashSDK from '@nodash/sdk';

const nodash = new NodashSDK('your-token', {
  baseUrl: 'http://localhost:3001'
});

export default {
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

**Common Pitfalls and Fixes:**
- **Events not sending?** Check if the SDK is instantiated correctly and your server is running.
- **CORS issues?** Ensure your server allows your app's origin.
- **Debug tips:** Use browser console to inspect network requests for nodash events and add console.log around track calls.

## Next Steps

- [Read the full API documentation](../README.md)
- [Check out advanced usage patterns](./advanced-usage.md)
- [Learn about event specification](./event-specification.md)
- [See framework-specific guides](./framework-guides.md) 