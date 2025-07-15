import { Framework, Language, IntegrationComplexity } from '../types.js';

export interface ImplementationStep {
  id: string;
  title: string;
  description: string;
  files: {
    path: string;
    action: 'create' | 'modify' | 'check';
    purpose: string;
  }[];
  codePatterns?: {
    pattern: string;
    explanation: string;
    context: string;
  }[];
  validation: string[];
  dependencies?: string[];
}

export interface ImplementationGuide {
  framework: Framework;
  language: Language;
  complexity: IntegrationComplexity;
  overview: string;
  prerequisites: string[];
  steps: ImplementationStep[];
  testingStrategy: string[];
  troubleshooting: {
    issue: string;
    solution: string;
  }[];
  nextSteps: string[];
}

export class ImplementationGuideService {
  generateImplementationGuide(
    framework: Framework,
    language: Language = 'typescript',
    complexity: IntegrationComplexity = 'basic'
  ): ImplementationGuide {
    const guide = this.createBaseGuide(framework, language, complexity);
    
    // Add framework-specific steps
    switch (framework) {
      case 'react':
        return this.addReactSteps(guide);
      case 'nextjs':
        return this.addNextJsSteps(guide);
      case 'vue':
        return this.addVueSteps(guide);
      case 'express':
        return this.addExpressSteps(guide);
      case 'angular':
        return this.addAngularSteps(guide);
      default:
        return this.addVanillaSteps(guide);
    }
  }

  private createBaseGuide(
    framework: Framework,
    language: Language,
    complexity: IntegrationComplexity
  ): ImplementationGuide {
    return {
      framework,
      language,
      complexity,
      overview: `Step-by-step guide for integrating Nodash analytics into your ${framework} project using ${language}.`,
      prerequisites: [
        'Node.js and npm/yarn/pnpm installed',
        'Project already initialized',
        'Basic understanding of your framework structure'
      ],
      steps: [],
      testingStrategy: [
        'Verify analytics events are being sent',
        'Check browser network tab for outgoing requests',
        'Test user identification and session tracking',
        'Validate event data structure'
      ],
      troubleshooting: [
        {
          issue: 'Events not appearing in analytics',
          solution: 'Check network requests, verify API key, ensure analytics server is running'
        },
        {
          issue: 'TypeScript compilation errors',
          solution: 'Ensure proper type definitions are imported and configured'
        }
      ],
      nextSteps: [
        'Set up analytics dashboard',
        'Configure event filtering and aggregation',
        'Add custom event tracking for business-specific actions',
        'Set up alerts and monitoring'
      ]
    };
  }

  private addReactSteps(guide: ImplementationGuide): ImplementationGuide {
    const isTypeScript = guide.language === 'typescript';
    const ext = isTypeScript ? 'tsx' : 'jsx';
    
    guide.steps = [
      {
        id: 'install-dependencies',
        title: 'Install Nodash SDK',
        description: 'Add the Nodash analytics SDK to your project dependencies',
        files: [
          {
            path: 'package.json',
            action: 'modify',
            purpose: 'Add @nodash/sdk dependency'
          }
        ],
        validation: [
          'Verify @nodash/sdk appears in package.json dependencies',
          'Run npm/yarn/pnpm install successfully'
        ],
        dependencies: ['@nodash/sdk']
      },
      {
        id: 'create-analytics-hook',
        title: 'Create Analytics Hook',
        description: 'Create a custom React hook for analytics operations',
        files: [
          {
            path: `src/hooks/useAnalytics.${isTypeScript ? 'ts' : 'js'}`,
            action: 'create',
            purpose: 'Centralized analytics hook for React components'
          }
        ],
        codePatterns: [
          {
            pattern: 'Custom hook with useCallback for memoization',
            explanation: 'Prevents unnecessary re-renders when passing analytics functions to child components',
            context: 'React performance optimization'
          },
          {
            pattern: 'Error boundary integration',
            explanation: 'Gracefully handle analytics failures without breaking the UI',
            context: 'Production reliability'
          }
        ],
        validation: [
          'Hook exports track, identify, and page functions',
          'Functions are properly memoized',
          'Error handling is implemented'
        ]
      },
      {
        id: 'create-analytics-provider',
        title: 'Create Analytics Provider',
        description: 'Set up React Context for analytics configuration',
        files: [
          {
            path: `src/providers/AnalyticsProvider.${ext}`,
            action: 'create',
            purpose: 'Provide analytics context to the entire app'
          }
        ],
        codePatterns: [
          {
            pattern: 'React Context with provider pattern',
            explanation: 'Makes analytics instance available throughout component tree',
            context: 'React state management'
          },
          {
            pattern: 'Environment-based configuration',
            explanation: 'Different settings for development/production environments',
            context: 'Configuration management'
          }
        ],
        validation: [
          'Provider wraps app root',
          'Context provides analytics instance',
          'Environment variables are properly loaded'
        ]
      },
      {
        id: 'integrate-app-root',
        title: 'Integrate with App Root',
        description: 'Wrap your app with the analytics provider',
        files: [
          {
            path: `src/App.${ext}`,
            action: 'modify',
            purpose: 'Enable analytics throughout the application'
          }
        ],
        codePatterns: [
          {
            pattern: 'Provider wrapping pattern',
            explanation: 'Wrap existing app content with AnalyticsProvider',
            context: 'React component composition'
          }
        ],
        validation: [
          'AnalyticsProvider wraps main app component',
          'No existing functionality is broken',
          'Analytics context is available in child components'
        ]
      },
      {
        id: 'add-page-tracking',
        title: 'Add Page Tracking',
        description: 'Track page views automatically',
        files: [
          {
            path: 'src/hooks/usePageTracking.ts',
            action: 'create',
            purpose: 'Automatic page view tracking'
          }
        ],
        codePatterns: [
          {
            pattern: 'useEffect with dependency array',
            explanation: 'Track page changes when location changes',
            context: 'React lifecycle management'
          },
          {
            pattern: 'React Router integration',
            explanation: 'Listen to route changes for SPA page tracking',
            context: 'Single Page Application routing'
          }
        ],
        validation: [
          'Page views are tracked on route changes',
          'No duplicate events on re-renders',
          'Works with your routing solution'
        ]
      }
    ];

    if (guide.complexity === 'advanced' || guide.complexity === 'enterprise') {
      guide.steps.push({
        id: 'add-event-tracking',
        title: 'Add Event Tracking',
        description: 'Implement tracking for user interactions',
        files: [
          {
            path: 'src/utils/analytics-events.ts',
            action: 'create',
            purpose: 'Centralized event tracking utilities'
          }
        ],
        codePatterns: [
          {
            pattern: 'Event factory functions',
            explanation: 'Consistent event structure across the application',
            context: 'Data consistency and type safety'
          },
          {
            pattern: 'Component-specific tracking',
            explanation: 'Track interactions within specific components',
            context: 'Granular user behavior analysis'
          }
        ],
        validation: [
          'Events have consistent structure',
          'All major user interactions are tracked',
          'Event data includes relevant context'
        ]
      });
    }

    return guide;
  }

  private addNextJsSteps(guide: ImplementationGuide): ImplementationGuide {
    const isTypeScript = guide.language === 'typescript';
    const ext = isTypeScript ? 'tsx' : 'jsx';
    
    guide.steps = [
      {
        id: 'install-dependencies',
        title: 'Install Nodash SDK',
        description: 'Add the Nodash analytics SDK to your Next.js project',
        files: [
          {
            path: 'package.json',
            action: 'modify',
            purpose: 'Add @nodash/sdk dependency'
          }
        ],
        validation: [
          'Verify @nodash/sdk appears in package.json dependencies'
        ],
        dependencies: ['@nodash/sdk']
      },
      {
        id: 'create-analytics-config',
        title: 'Create Analytics Configuration',
        description: 'Set up analytics configuration for Next.js',
        files: [
          {
            path: `lib/analytics.${isTypeScript ? 'ts' : 'js'}`,
            action: 'create',
            purpose: 'Analytics configuration and initialization'
          }
        ],
        codePatterns: [
          {
            pattern: 'Singleton pattern for analytics instance',
            explanation: 'Ensure single analytics instance across client and server',
            context: 'Next.js SSR/SSG considerations'
          },
          {
            pattern: 'Environment variable configuration',
            explanation: 'Different settings for development/production',
            context: 'Next.js environment handling'
          }
        ],
        validation: [
          'Analytics instance is properly initialized',
          'Configuration works in both SSR and client environments',
          'Environment variables are loaded correctly'
        ]
      },
      {
        id: 'integrate-app-component',
        title: 'Integrate with _app Component',
        description: 'Add analytics to your Next.js _app component',
        files: [
          {
            path: `pages/_app.${ext}`,
            action: 'modify',
            purpose: 'Initialize analytics for the entire application'
          }
        ],
        codePatterns: [
          {
            pattern: 'useEffect for client-side initialization',
            explanation: 'Initialize analytics only on client side',
            context: 'Next.js hydration and SSR'
          },  
          {
            pattern: 'Router event listeners',
            explanation: 'Track page changes in Next.js router',
            context: 'Next.js routing system'
          }
        ],
        validation: [
          'Analytics initializes on client side only',
          'Page views are tracked on route changes',
          'No hydration mismatches occur'
        ]
      },
      {
        id: 'add-page-tracking',
        title: 'Add Automatic Page Tracking',
        description: 'Track page views automatically with Next.js router',
        files: [
          {
            path: `hooks/usePageTracking.${isTypeScript ? 'ts' : 'js'}`,
            action: 'create',
            purpose: 'Automatic page view tracking for Next.js'
          }
        ],
        codePatterns: [
          {
            pattern: 'Next.js router event handling',
            explanation: 'Listen to routeChangeComplete events',
            context: 'Next.js routing lifecycle'
          },
          {
            pattern: 'Query parameter handling',
            explanation: 'Include relevant query parameters in page tracking',
            context: 'Next.js dynamic routing'
          }
        ],
        validation: [
          'Page views tracked on all route changes',
          'Dynamic routes are handled correctly',
          'Query parameters are included when relevant'
        ]
      }
    ];

    if (guide.complexity === 'advanced' || guide.complexity === 'enterprise') {
      guide.steps.push({
        id: 'add-api-route-tracking',
        title: 'Add API Route Tracking',
        description: 'Track API endpoint usage and performance',
        files: [
          {
            path: 'middleware.ts',
            action: 'create',
            purpose: 'Track API route usage with Next.js middleware'
          }
        ],
        codePatterns: [
          {
            pattern: 'Next.js middleware pattern',
            explanation: 'Intercept requests to track API usage',
            context: 'Next.js middleware system'
          },
          {
            pattern: 'Performance timing',
            explanation: 'Track API response times and errors',
            context: 'API performance monitoring'
          }
        ],
        validation: [
          'API routes are tracked automatically',
          'Performance metrics are captured',
          'Error tracking is implemented'
        ]
      });
    }

    return guide;
  }

  private addVueSteps(guide: ImplementationGuide): ImplementationGuide {
    guide.steps = [
      {
        id: 'install-dependencies',
        title: 'Install Nodash SDK',
        description: 'Add the Nodash analytics SDK to your Vue project',
        files: [
          {
            path: 'package.json',
            action: 'modify',
            purpose: 'Add @nodash/sdk dependency'
          }
        ],
        validation: [
          'Verify @nodash/sdk appears in package.json dependencies'
        ],
        dependencies: ['@nodash/sdk']
      },
      {
        id: 'create-analytics-plugin',
        title: 'Create Analytics Plugin',
        description: 'Create a Vue plugin for analytics integration',
        files: [
          {
            path: 'src/plugins/analytics.ts',
            action: 'create',
            purpose: 'Vue plugin for analytics integration'
          }
        ],
        codePatterns: [
          {
            pattern: 'Vue plugin pattern',
            explanation: 'Create reusable plugin for Vue app integration',
            context: 'Vue.js plugin system'
          },
          {
            pattern: 'Global properties injection',
            explanation: 'Make analytics available in all components',
            context: 'Vue.js global properties'
          }
        ],
        validation: [
          'Plugin is properly structured',
          'Analytics is available globally',
          'TypeScript types are correct'
        ]
      },
      {
        id: 'integrate-main-app',
        title: 'Integrate with Main App',
        description: 'Add analytics plugin to your Vue app',
        files: [
          {
            path: 'src/main.ts',
            action: 'modify',
            purpose: 'Register analytics plugin with Vue app'
          }
        ],
        codePatterns: [
          {
            pattern: 'Vue app.use() pattern',
            explanation: 'Register plugin with Vue application',
            context: 'Vue.js app initialization'
          }
        ],
        validation: [
          'Plugin is registered with app',
          'Analytics is available in components',
          'No initialization errors occur'
        ]
      },
      {
        id: 'add-router-tracking',
        title: 'Add Router Tracking',
        description: 'Track page views with Vue Router',
        files: [
          {
            path: 'src/router/index.ts',
            action: 'modify',
            purpose: 'Add navigation tracking to Vue Router'
          }
        ],
        codePatterns: [
          {
            pattern: 'Vue Router navigation guards',
            explanation: 'Use afterEach guard to track page views',
            context: 'Vue Router lifecycle'
          }
        ],
        validation: [
          'Page views are tracked on route changes',
          'Route metadata is included',
          'No performance impact on navigation'
        ]
      }
    ];

    return guide;
  }

  private addExpressSteps(guide: ImplementationGuide): ImplementationGuide {
    guide.steps = [
      {
        id: 'install-dependencies',
        title: 'Install Nodash SDK',
        description: 'Add the Nodash analytics SDK to your Express project',
        files: [
          {
            path: 'package.json',
            action: 'modify',
            purpose: 'Add @nodash/sdk dependency'
          }
        ],
        validation: [
          'Verify @nodash/sdk appears in package.json dependencies'
        ],
        dependencies: ['@nodash/sdk']
      },
      {
        id: 'create-analytics-middleware',
        title: 'Create Analytics Middleware',
        description: 'Create Express middleware for request tracking',
        files: [
          {
            path: 'middleware/analytics.js',
            action: 'create',
            purpose: 'Express middleware for automatic request tracking'
          }
        ],
        codePatterns: [
          {
            pattern: 'Express middleware pattern',
            explanation: 'Standard Express middleware with req, res, next',
            context: 'Express.js middleware system'
          },
          {
            pattern: 'Request timing and metadata',
            explanation: 'Track request duration and relevant metadata',
            context: 'API performance monitoring'
          }
        ],
        validation: [
          'Middleware follows Express conventions',
          'Request tracking is implemented',
          'Performance impact is minimal'
        ]
      },
      {
        id: 'integrate-app-server',
        title: 'Integrate with Express App',
        description: 'Add analytics middleware to your Express app',
        files: [
          {
            path: 'app.js',
            action: 'modify',
            purpose: 'Register analytics middleware with Express app'
          }
        ],
        codePatterns: [
          {
            pattern: 'app.use() middleware registration',
            explanation: 'Register middleware for all routes',
            context: 'Express.js app configuration'
          }
        ],
        validation: [
          'Middleware is registered correctly',
          'All routes are tracked',
          'Existing functionality is not affected'
        ]
      },
      {
        id: 'add-error-tracking',
        title: 'Add Error Tracking',
        description: 'Track server errors and exceptions',
        files: [
          {
            path: 'middleware/error-tracking.js',
            action: 'create',
            purpose: 'Error tracking middleware for Express'
          }
        ],
        codePatterns: [
          {
            pattern: 'Express error handling middleware',
            explanation: 'Four-parameter error middleware pattern',
            context: 'Express.js error handling'
          }
        ],
        validation: [
          'Errors are tracked and logged',
          'Error middleware is registered last',
          'Client receives appropriate error responses'
        ]
      }
    ];

    return guide;
  }

  private addAngularSteps(guide: ImplementationGuide): ImplementationGuide {
    guide.steps = [
      {
        id: 'install-dependencies',
        title: 'Install Nodash SDK',
        description: 'Add the Nodash analytics SDK to your Angular project',
        files: [
          {
            path: 'package.json',
            action: 'modify',
            purpose: 'Add @nodash/sdk dependency'
          }
        ],
        validation: [
          'Verify @nodash/sdk appears in package.json dependencies'
        ],
        dependencies: ['@nodash/sdk']
      },
      {
        id: 'create-analytics-service',
        title: 'Create Analytics Service',
        description: 'Create an Angular service for analytics operations',
        files: [
          {
            path: 'src/app/services/analytics.service.ts',
            action: 'create',
            purpose: 'Angular service for analytics integration'
          }
        ],
        codePatterns: [
          {
            pattern: 'Angular service with @Injectable',
            explanation: 'Standard Angular service pattern with dependency injection',
            context: 'Angular dependency injection system'
          },
          {
            pattern: 'Observable patterns for async operations',
            explanation: 'Use RxJS for handling analytics operations',
            context: 'Angular reactive programming'
          }
        ],
        validation: [
          'Service is properly decorated with @Injectable',
          'Analytics methods are implemented',
          'Error handling is included'
        ]
      },
      {
        id: 'integrate-app-module',
        title: 'Integrate with App Module',
        description: 'Add analytics service to your Angular app module',
        files: [
          {
            path: 'src/app/app.module.ts',
            action: 'modify',
            purpose: 'Register analytics service with Angular app'
          }
        ],
        codePatterns: [
          {
            pattern: 'Angular providers array',
            explanation: 'Add service to providers for dependency injection',
            context: 'Angular module system'
          }
        ],
        validation: [
          'Service is provided in app module',
          'Service can be injected into components',
          'No circular dependencies exist'
        ]
      },
      {
        id: 'add-router-tracking',
        title: 'Add Router Tracking',
        description: 'Track page views with Angular Router',
        files: [
          {
            path: 'src/app/app.component.ts',
            action: 'modify',
            purpose: 'Add navigation tracking to Angular Router'
          }
        ],
        codePatterns: [
          {
            pattern: 'Angular Router events subscription',
            explanation: 'Subscribe to NavigationEnd events for page tracking',
            context: 'Angular Router lifecycle'
          },
          {
            pattern: 'OnDestroy lifecycle hook',
            explanation: 'Clean up subscriptions to prevent memory leaks',
            context: 'Angular component lifecycle'
          }
        ],
        validation: [
          'Page views are tracked on route changes',
          'Subscriptions are properly cleaned up',
          'No memory leaks occur'
        ]
      }
    ];

    return guide;
  }

  private addVanillaSteps(guide: ImplementationGuide): ImplementationGuide {
    guide.steps = [
      {
        id: 'install-dependencies',
        title: 'Install Nodash SDK',
        description: 'Add the Nodash analytics SDK to your project',
        files: [
          {
            path: 'package.json',
            action: 'modify',
            purpose: 'Add @nodash/sdk dependency'
          }
        ],
        validation: [
          'Verify @nodash/sdk appears in package.json dependencies'
        ],
        dependencies: ['@nodash/sdk']
      },
      {
        id: 'create-analytics-module',
        title: 'Create Analytics Module',
        description: 'Create a module for analytics operations',
        files: [
          {
            path: 'src/analytics.js',
            action: 'create',
            purpose: 'Analytics module for vanilla JavaScript'
          }
        ],
        codePatterns: [
          {
            pattern: 'Module pattern with IIFE',
            explanation: 'Encapsulate analytics functionality in a module',
            context: 'JavaScript module patterns'
          },
          {
            pattern: 'Event delegation for dynamic content',
            explanation: 'Track events on dynamically added elements',
            context: 'DOM event handling'
          }
        ],
        validation: [
          'Module is properly structured',
          'Analytics functions are exposed',
          'No global namespace pollution'
        ]
      },
      {
        id: 'integrate-html',
        title: 'Integrate with HTML',
        description: 'Add analytics to your HTML pages',
        files: [
          {
            path: 'index.html',
            action: 'modify',
            purpose: 'Include analytics script in HTML'
          }
        ],
        codePatterns: [
          {
            pattern: 'Script tag with defer attribute',
            explanation: 'Load analytics script without blocking page render',
            context: 'HTML script loading optimization'
          }
        ],
        validation: [
          'Analytics script is loaded correctly',
          'Page load performance is not affected',
          'Analytics initializes after DOM is ready'
        ]
      },
      {
        id: 'add-event-tracking',
        title: 'Add Event Tracking',
        description: 'Track user interactions with vanilla JavaScript',
        files: [
          {
            path: 'src/event-tracking.js',
            action: 'create',
            purpose: 'Event tracking utilities for vanilla JavaScript'
          }
        ],
        codePatterns: [
          {
            pattern: 'addEventListener with event delegation',
            explanation: 'Efficient event handling for multiple elements',
            context: 'DOM event management'
          },
          {
            pattern: 'Data attributes for tracking configuration',
            explanation: 'Use data-* attributes to configure tracking',
            context: 'HTML5 data attributes'
          }
        ],
        validation: [
          'Events are tracked correctly',
          'Event delegation works for dynamic content',
          'No memory leaks from event listeners'
        ]
      }
    ];

    return guide;
  }
}