# Framework Integration Guides

Comprehensive guides for integrating Nodash SDK with popular frameworks.

## React

### Basic Setup

```tsx
// src/analytics.ts
import { nodash } from '@nodash/sdk';

export const initAnalytics = () => {
  nodash.init(process.env.REACT_APP_NODASH_TOKEN!, {
    apiUrl: process.env.REACT_APP_NODASH_API_URL || 'http://localhost:3001',
    debug: process.env.NODE_ENV === 'development'
  });
};

export { nodash };
```

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { initAnalytics } from './analytics';

function App() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return <div>Your App</div>;
}
```

### Custom Hook

```tsx
// src/hooks/useAnalytics.ts
import { useCallback } from 'react';
import { nodash } from '@nodash/sdk';

export const useAnalytics = () => {
  const track = useCallback((event: string, properties?: any) => {
    nodash.track(event, properties);
  }, []);

  const identify = useCallback((userId: string, traits?: any) => {
    nodash.identify(userId, traits);
  }, []);

  const page = useCallback((name?: string, category?: string, properties?: any) => {
    nodash.page(name, category, properties);
  }, []);

  return { track, identify, page };
};
```

### React Router Integration

```tsx
// src/components/AnalyticsProvider.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { nodash } from '@nodash/sdk';

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    // Track page views on route changes
    nodash.page(location.pathname);
  }, [location]);

  return <>{children}</>;
};
```

### E-commerce Example

```tsx
// src/components/ProductCard.tsx
import { useAnalytics } from '../hooks/useAnalytics';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const ProductCard = ({ product }: { product: Product }) => {
  const { track } = useAnalytics();

  const handleView = () => {
    track('Product Viewed', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.category
    });
  };

  const handleAddToCart = () => {
    track('Product Added', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      category: product.category,
      quantity: 1
    });
  };

  useEffect(() => {
    handleView();
  }, []);

  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
};
```

## Vue.js

### Plugin Setup

```typescript
// src/plugins/analytics.ts
import { App } from 'vue';
import { nodash } from '@nodash/sdk';

export default {
  install(app: App, options: { token: string; apiUrl: string }) {
    nodash.init(options.token, {
      apiUrl: options.apiUrl,
      debug: process.env.NODE_ENV === 'development'
    });

    app.config.globalProperties.$analytics = nodash;
    app.provide('analytics', nodash);
  }
};
```

```typescript
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import analyticsPlugin from './plugins/analytics';

const app = createApp(App);

app.use(analyticsPlugin, {
  token: process.env.VUE_APP_NODASH_TOKEN!,
  apiUrl: process.env.VUE_APP_NODASH_API_URL || 'http://localhost:3001'
});

app.mount('#app');
```

### Composition API

```vue
<template>
  <div>
    <button @click="trackButtonClick">Track Event</button>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import type { NodashSDK } from '@nodash/sdk';

const analytics = inject<NodashSDK>('analytics')!;

const trackButtonClick = () => {
  analytics.track('Button Click', { 
    button: 'header-cta',
    page: 'home' 
  });
};
</script>
```

### Router Integration

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { nodash } from '@nodash/sdk';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // your routes
  ]
});

router.afterEach((to) => {
  nodash.page(to.name as string, to.meta.category as string);
});

export default router;
```

## Next.js

### App Router (Next.js 13+)

```tsx
// app/providers.tsx
'use client';

import { useEffect } from 'react';
import { nodash } from '@nodash/sdk';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    nodash.init(process.env.NEXT_PUBLIC_NODASH_TOKEN!, {
      apiUrl: process.env.NEXT_PUBLIC_NODASH_API_URL || 'http://localhost:3001',
      debug: process.env.NODE_ENV === 'development'
    });
  }, []);

  return <>{children}</>;
}
```

```tsx
// app/layout.tsx
import { AnalyticsProvider } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider>
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

### Pages Router (Next.js 12 and below)

```tsx
// pages/_app.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { nodash } from '@nodash/sdk';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    nodash.init(process.env.NEXT_PUBLIC_NODASH_TOKEN!, {
      apiUrl: process.env.NEXT_PUBLIC_NODASH_API_URL || 'http://localhost:3001',
      debug: process.env.NODE_ENV === 'development'
    });
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      nodash.page(url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  return <Component {...pageProps} />;
}
```

### Server-Side Tracking

```typescript
// pages/api/signup.ts
import { NodashSDK } from '@nodash/sdk';
import type { NextApiRequest, NextApiResponse } from 'next';

const analytics = new NodashSDK();
analytics.init(process.env.NODASH_TOKEN!, {
  apiUrl: process.env.NODASH_API_URL!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, email, name } = req.body;

    // Track server-side
    analytics.identify(userId, { email, name });
    analytics.track('User Signed Up', {
      source: 'api',
      plan: 'free'
    });

    res.json({ success: true });
  }
}
```

## Express.js

### Middleware Setup

```typescript
// src/middleware/analytics.ts
import { NodashSDK } from '@nodash/sdk';
import type { Request, Response, NextFunction } from 'express';

const analytics = new NodashSDK();
analytics.init(process.env.NODASH_TOKEN!, {
  apiUrl: process.env.NODASH_API_URL!
});

export const analyticsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.analytics = analytics;
  next();
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      analytics: NodashSDK;
    }
  }
}
```

```typescript
// src/app.ts
import express from 'express';
import { analyticsMiddleware } from './middleware/analytics';

const app = express();

app.use(analyticsMiddleware);

app.post('/api/users', (req, res) => {
  const { userId, email, name } = req.body;

  // Create user logic...

  req.analytics.identify(userId, { email, name });
  req.analytics.track('User Created', {
    source: 'api',
    plan: 'free'
  });

  res.json({ success: true });
});
```

## Angular

### Service Setup

```typescript
// src/app/services/analytics.service.ts
import { Injectable } from '@angular/core';
import { nodash } from '@nodash/sdk';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor() {
    nodash.init(environment.nodashToken, {
      apiUrl: environment.nodashApiUrl,
      debug: !environment.production
    });
  }

  track(event: string, properties?: any) {
    nodash.track(event, properties);
  }

  identify(userId: string, traits?: any) {
    nodash.identify(userId, traits);
  }

  page(name?: string, category?: string, properties?: any) {
    nodash.page(name, category, properties);
  }
}
```

### Router Integration

```typescript
// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AnalyticsService } from './services/analytics.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private analytics: AnalyticsService
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.analytics.page(event.url);
      });
  }
}
```

## Svelte

### Store Setup

```typescript
// src/lib/analytics.ts
import { writable } from 'svelte/store';
import { nodash } from '@nodash/sdk';

export const analytics = writable(nodash);

export const initAnalytics = () => {
  nodash.init(import.meta.env.VITE_NODASH_TOKEN, {
    apiUrl: import.meta.env.VITE_NODASH_API_URL || 'http://localhost:3001',
    debug: import.meta.env.DEV
  });
};
```

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initAnalytics, analytics } from './lib/analytics';

  onMount(() => {
    initAnalytics();
  });

  const trackClick = () => {
    $analytics.track('Button Click', { button: 'header-cta' });
  };
</script>

<button on:click={trackClick}>Track Event</button>
```

## Best Practices

### Error Handling

```typescript
// Wrap analytics calls in try-catch for production
const safeTrack = (event: string, properties?: any) => {
  try {
    nodash.track(event, properties);
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
};
```

### Environment Configuration

```typescript
// Use environment variables for configuration
const config = {
  token: process.env.REACT_APP_NODASH_TOKEN!,
  apiUrl: process.env.REACT_APP_NODASH_API_URL || 'http://localhost:3001',
  debug: process.env.NODE_ENV === 'development',
  batchSize: process.env.NODE_ENV === 'production' ? 20 : 5,
  flushInterval: process.env.NODE_ENV === 'production' ? 10000 : 2000
};
```

### TypeScript Integration

```typescript
// Define custom event types for better type safety
interface CustomEvents {
  'Button Click': { button: string; page?: string };
  'Page View': { page: string; category?: string };
  'User Signed Up': { method: string; plan: string };
}

const typedTrack = <K extends keyof CustomEvents>(
  event: K,
  properties: CustomEvents[K]
) => {
  nodash.track(event, properties);
};

// Usage with full type safety
typedTrack('Button Click', { button: 'signup', page: 'home' });
``` 