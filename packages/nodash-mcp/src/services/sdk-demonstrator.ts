import { NodashSDK } from '@nodash/sdk';

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: 'typescript' | 'javascript' | 'json' | 'bash' | 'text' | 'markdown';
  framework?: string;
}

export class SDKDemonstratorService {
  /**
   * Demonstrate proper SDK initialization patterns
   */
  demonstrateInitialization(): CodeExample[] {
    return [
      {
        title: 'Basic SDK Initialization',
        description: 'Simple SDK setup with token and basic configuration',
        language: 'typescript',
        code: `import { NodashSDK } from '@nodash/sdk';

// Initialize with token from environment
const nodash = new NodashSDK(process.env.NODASH_TOKEN!, {
  baseUrl: 'https://api.nodash.ai',
  debug: process.env.NODE_ENV === 'development'
});

// Verify initialization
console.log('Nodash SDK initialized successfully');`
      },
      {
        title: 'Advanced SDK Configuration',
        description: 'SDK setup with custom configuration and error handling',
        language: 'typescript',
        code: `import { NodashSDK } from '@nodash/sdk';

// Advanced configuration
const nodash = new NodashSDK(process.env.NODASH_TOKEN!, {
  baseUrl: process.env.NODASH_API_URL || 'https://api.nodash.ai',
  timeout: 5000,
  retries: 3,
  debug: process.env.NODE_ENV === 'development',
  batchSize: 50,
  flushInterval: 10000
});

// Handle initialization errors
try {
  await nodash.initialize();
  console.log('SDK ready for tracking');
} catch (error) {
  console.error('Failed to initialize SDK:', error);
}`
      },
      {
        title: 'React SDK Integration',
        description: 'SDK initialization in React application',
        language: 'typescript',
        framework: 'react',
        code: `import React, { createContext, useContext, useEffect, useState } from 'react';
import { NodashSDK } from '@nodash/sdk';

const NodashContext = createContext<NodashSDK | null>(null);

export function NodashProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<NodashSDK | null>(null);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const nodash = new NodashSDK(process.env.REACT_APP_NODASH_TOKEN!, {
          baseUrl: process.env.REACT_APP_NODASH_API_URL,
          debug: process.env.NODE_ENV === 'development'
        });
        
        await nodash.initialize();
        setSdk(nodash);
      } catch (error) {
        console.error('Failed to initialize Nodash SDK:', error);
      }
    };

    initSDK();
  }, []);

  return (
    <NodashContext.Provider value={sdk}>
      {children}
    </NodashContext.Provider>
  );
}

export function useNodash() {
  const sdk = useContext(NodashContext);
  if (!sdk) {
    throw new Error('useNodash must be used within NodashProvider');
  }
  return sdk;
}`
      }
    ];
  }

  /**
   * Demonstrate proper event tracking patterns
   */
  demonstrateEventTracking(): CodeExample[] {
    return [
      {
        title: 'Basic Event Tracking',
        description: 'Simple event tracking with properties',
        language: 'typescript',
        code: `// Track a simple event
await nodash.track('button_click', {
  buttonName: 'Subscribe',
  page: 'homepage',
  timestamp: new Date().toISOString()
});

// Track user action with context
await nodash.track('user_signup', {
  email: user.email,
  source: 'organic',
  plan: 'free'
}, {
  userId: user.id
});`
      },
      {
        title: 'E-commerce Event Tracking',
        description: 'Product and purchase tracking patterns',
        language: 'typescript',
        code: `// Track product view
await nodash.track('product_viewed', {
  productId: 'prod_123',
  productName: 'Wireless Headphones',
  category: 'Electronics',
  price: 99.99,
  currency: 'USD'
}, {
  userId: user?.id,
  sessionId: session.id
});

// Track purchase
await nodash.track('purchase_completed', {
  orderId: 'order_456',
  total: 199.98,
  currency: 'USD',
  items: [
    { productId: 'prod_123', quantity: 2, price: 99.99 }
  ],
  paymentMethod: 'credit_card'
}, {
  userId: user.id
});`
      },
      {
        title: 'Page View Tracking',
        description: 'Automatic and manual page view tracking',
        language: 'typescript',
        code: `// Manual page tracking
await nodash.page('Product Details', {
  path: '/products/wireless-headphones',
  title: 'Wireless Headphones - Best Audio',
  referrer: document.referrer,
  loadTime: performance.now()
});

// Automatic page tracking with React Router
import { useLocation } from 'react-router-dom';

function usePageTracking() {
  const location = useLocation();
  const nodash = useNodash();

  useEffect(() => {
    nodash.page(document.title, {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer
    });
  }, [location, nodash]);
}`
      }
    ];
  }

  /**
   * Demonstrate proper error handling patterns
   */
  demonstrateErrorHandling(): CodeExample[] {
    return [
      {
        title: 'Basic Error Reporting',
        description: 'Report application errors with context',
        language: 'typescript',
        code: `// Report JavaScript errors
try {
  // Some operation that might fail
  await riskyOperation();
} catch (error) {
  await nodash.reportError(error, {
    userId: user?.id,
    page: 'checkout',
    action: 'payment_processing',
    additionalContext: {
      paymentMethod: 'credit_card',
      amount: 99.99
    }
  });
  
  // Re-throw or handle as needed
  throw error;
}`
      },
      {
        title: 'React Error Boundary Integration',
        description: 'Integrate error reporting with React error boundaries',
        language: 'typescript',
        framework: 'react',
        code: `import React from 'react';
import { useNodash } from './NodashProvider';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  private nodash: NodashSDK;

  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report error to Nodash
    try {
      await this.nodash?.reportError(error, {
        component: errorInfo.componentStack,
        errorBoundary: true,
        page: window.location.pathname
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh the page.</div>;
    }

    return this.props.children;
  }
}`
      },
      {
        title: 'API Error Handling',
        description: 'Handle and report API errors properly',
        language: 'typescript',
        code: `async function fetchUserData(userId: string) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    
    if (!response.ok) {
      const error = new Error(\`API Error: \${response.status}\`);
      
      // Report API error
      await nodash.reportError(error, {
        userId,
        endpoint: \`/api/users/\${userId}\`,
        statusCode: response.status,
        responseText: await response.text()
      });
      
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    // Report network or parsing errors
    await nodash.reportError(error, {
      userId,
      endpoint: \`/api/users/\${userId}\`,
      errorType: 'network_or_parsing'
    });
    
    throw error;
  }
}`
      }
    ];
  }

  /**
   * Demonstrate advanced SDK usage patterns
   */
  demonstrateAdvancedUsage(): CodeExample[] {
    return [
      {
        title: 'User Identification',
        description: 'Properly identify users and manage sessions',
        language: 'typescript',
        code: `// Identify user on login
await nodash.identify(user.id, {
  email: user.email,
  name: user.name,
  plan: user.subscription?.plan || 'free',
  signupDate: user.createdAt,
  lastLoginDate: new Date().toISOString()
});

// Track login event
await nodash.track('user_logged_in', {
  method: 'email',
  timestamp: new Date().toISOString()
}, {
  userId: user.id
});`
      },
      {
        title: 'Performance Metrics',
        description: 'Track performance metrics and custom measurements',
        language: 'typescript',
        code: `// Track page load performance
const loadTime = performance.now();
await nodash.submitMetric('page_load_time', loadTime, 'ms', {
  page: window.location.pathname,
  browser: navigator.userAgent.includes('Chrome') ? 'chrome' : 'other'
});

// Track custom business metrics
await nodash.submitMetric('conversion_rate', 0.15, 'percentage', {
  campaign: 'summer_sale',
  segment: 'premium_users'
});

// Track API response times
const startTime = Date.now();
await apiCall();
const responseTime = Date.now() - startTime;

await nodash.submitMetric('api_response_time', responseTime, 'ms', {
  endpoint: '/api/products',
  method: 'GET'
});`
      },
      {
        title: 'Batch Processing and Optimization',
        description: 'Optimize tracking with batching and queuing',
        language: 'typescript',
        code: `// Configure SDK for optimal performance
const nodash = new NodashSDK(token, {
  batchSize: 50,           // Send events in batches of 50
  flushInterval: 10000,    // Flush every 10 seconds
  maxQueueSize: 1000,      // Maximum events to queue
  retries: 3,              // Retry failed requests
  timeout: 5000            // Request timeout
});

// Manual flush when needed
await nodash.flush();

// Track multiple events efficiently
const events = [
  { name: 'page_view', properties: { page: '/home' } },
  { name: 'button_click', properties: { button: 'cta' } },
  { name: 'form_submit', properties: { form: 'newsletter' } }
];

// Events will be batched automatically
for (const event of events) {
  await nodash.track(event.name, event.properties);
}`
      }
    ];
  }

  /**
   * Get all SDK examples organized by category
   */
  getAllExamples(): { [category: string]: CodeExample[] } {
    return {
      initialization: this.demonstrateInitialization(),
      eventTracking: this.demonstrateEventTracking(),
      errorHandling: this.demonstrateErrorHandling(),
      advancedUsage: this.demonstrateAdvancedUsage()
    };
  }
}