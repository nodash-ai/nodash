import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import type { ProjectAnalysis } from '../types.js';
import { fileExists } from '../utils/file-utils.js';

export interface CodeExample {
  framework: string;
  filename: string;
  code: string;
  description: string;
}

export interface SetupValidation {
  hasSDK: boolean;
  hasConfig: boolean;
  issues: string[];
  recommendations: string[];
}

export class EnhancedProjectAnalyzer {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  generateSDKExamples(analysis: ProjectAnalysis): CodeExample[] {
    const examples: CodeExample[] = [];
    
    switch (analysis.framework) {
      case 'Next.js':
        examples.push({
          framework: 'Next.js',
          filename: 'app/layout.tsx',
          description: 'Initialize Nodash in your root layout for App Router',
          code: `'use client';

import { NodashSDK } from '@nodash/sdk';
import { useEffect } from 'react';

// Initialize Nodash SDK
const nodash = new NodashSDK(process.env.NEXT_PUBLIC_NODASH_TOKEN!);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Track page views
    nodash.track('page_view', {
      path: window.location.pathname,
      referrer: document.referrer
    });
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`
        });
        
        examples.push({
          framework: 'Next.js',
          filename: 'components/TrackingButton.tsx',
          description: 'Example component with event tracking',
          code: `'use client';

import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.NEXT_PUBLIC_NODASH_TOKEN!);

export function TrackingButton() {
  const handleClick = async () => {
    await nodash.track('button_click', {
      component: 'TrackingButton',
      timestamp: new Date().toISOString()
    });
    
    // Your button logic here
  };

  return (
    <button onClick={handleClick}>
      Click me (tracked)
    </button>
  );
}`
        });
        break;

      case 'React':
        examples.push({
          framework: 'React',
          filename: 'src/App.tsx',
          description: 'Initialize Nodash in your main App component',
          code: `import { useEffect } from 'react';
import { NodashSDK } from '@nodash/sdk';

// Initialize Nodash SDK
const nodash = new NodashSDK(process.env.REACT_APP_NODASH_TOKEN!);

function App() {
  useEffect(() => {
    // Track app initialization
    nodash.track('app_initialized', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}

export default App;`
        });
        
        examples.push({
          framework: 'React',
          filename: 'src/hooks/useTracking.ts',
          description: 'Custom hook for tracking events',
          code: `import { useCallback } from 'react';
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.REACT_APP_NODASH_TOKEN!);

export function useTracking() {
  const track = useCallback(async (event: string, properties?: Record<string, any>) => {
    try {
      await nodash.track(event, {
        ...properties,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Tracking error:', error);
    }
  }, []);

  const trackMetric = useCallback(async (name: string, value: number, options?: any) => {
    try {
      await nodash.sendMetric(name, value, options);
    } catch (error) {
      console.error('Metric error:', error);
    }
  }, []);

  return { track, trackMetric };
}`
        });
        break;

      case 'Vue':
        examples.push({
          framework: 'Vue',
          filename: 'src/main.ts',
          description: 'Initialize Nodash in your Vue app',
          code: `import { createApp } from 'vue';
import { NodashSDK } from '@nodash/sdk';
import App from './App.vue';

// Initialize Nodash SDK
const nodash = new NodashSDK(process.env.VUE_APP_NODASH_TOKEN!);

const app = createApp(App);

// Make Nodash available globally
app.config.globalProperties.$nodash = nodash;

// Track app initialization
nodash.track('app_initialized', {
  framework: 'Vue',
  timestamp: new Date().toISOString()
});

app.mount('#app');`
        });
        
        examples.push({
          framework: 'Vue',
          filename: 'src/composables/useTracking.ts',
          description: 'Vue composable for tracking',
          code: `import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.VUE_APP_NODASH_TOKEN!);

export function useTracking() {
  const track = async (event: string, properties?: Record<string, any>) => {
    try {
      await nodash.track(event, {
        ...properties,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Tracking error:', error);
    }
  };

  const trackMetric = async (name: string, value: number, options?: any) => {
    try {
      await nodash.sendMetric(name, value, options);
    } catch (error) {
      console.error('Metric error:', error);
    }
  };

  return { track, trackMetric };
}`
        });
        break;

      case 'Express':
        examples.push({
          framework: 'Express',
          filename: 'src/middleware/tracking.ts',
          description: 'Express middleware for automatic request tracking',
          code: `import { Request, Response, NextFunction } from 'express';
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.NODASH_TOKEN!);

export function trackingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Track request
  nodash.track('api_request', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Track response when finished
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    nodash.sendMetric('response_time', responseTime, {
      unit: 'ms',
      tags: {
        method: req.method,
        path: req.path,
        status: res.statusCode.toString()
      }
    });
  });

  next();
}`
        });
        
        examples.push({
          framework: 'Express',
          filename: 'src/app.ts',
          description: 'Express app with Nodash integration',
          code: `import express from 'express';
import { NodashSDK } from '@nodash/sdk';
import { trackingMiddleware } from './middleware/tracking';

const app = express();
const nodash = new NodashSDK(process.env.NODASH_TOKEN!);

// Use tracking middleware
app.use(trackingMiddleware);

// Example route with custom tracking
app.get('/api/users', async (req, res) => {
  try {
    // Your business logic here
    const users = await getUsersFromDatabase();
    
    // Track successful operation
    await nodash.track('users_fetched', {
      count: users.length,
      timestamp: new Date().toISOString()
    });
    
    res.json(users);
  } catch (error) {
    // Track errors
    await nodash.track('users_fetch_error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default app;`
        });
        break;

      default:
        // Generic JavaScript/TypeScript example
        examples.push({
          framework: 'Generic',
          filename: 'src/analytics.ts',
          description: 'Basic Nodash SDK setup',
          code: `import { NodashSDK } from '@nodash/sdk';

// Initialize Nodash SDK
const nodash = new NodashSDK(process.env.NODASH_TOKEN!);

// Track events
export async function trackEvent(event: string, properties?: Record<string, any>) {
  try {
    await nodash.track(event, {
      ...properties,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Tracking error:', error);
  }
}

// Send metrics
export async function sendMetric(name: string, value: number, options?: any) {
  try {
    await nodash.sendMetric(name, value, options);
  } catch (error) {
    console.error('Metric error:', error);
  }
}

// Check health
export async function checkHealth() {
  try {
    return await nodash.monitoring.getHealth();
  } catch (error) {
    console.error('Health check error:', error);
    return null;
  }
}

export default nodash;`
        });
        break;
    }

    return examples;
  }

  async generateSetupFiles(analysis: ProjectAnalysis, outputDir: string): Promise<void> {
    const examples = this.generateSDKExamples(analysis);
    
    console.log(chalk.blue('📁 Generating setup files...'));
    
    // Create setup directory
    const setupDir = join(outputDir, '.nodash', 'setup');
    if (!await fileExists(setupDir)) {
      await mkdir(setupDir, { recursive: true });
    }

    // Generate files for each example
    for (const example of examples) {
      const filePath = join(setupDir, example.filename.replace('/', '_'));
      const content = `// ${example.description}
// Generated by Nodash CLI for ${example.framework}

${example.code}`;
      
      await writeFile(filePath, content);
      console.log(chalk.green(`✅ Created: ${filePath}`));
    }

    // Generate environment file template
    const envPath = join(setupDir, '.env.example');
    const envContent = this.generateEnvTemplate(analysis);
    await writeFile(envPath, envContent);
    console.log(chalk.green(`✅ Created: ${envPath}`));

    console.log(chalk.yellow('\n💡 Setup files generated in .nodash/setup/'));
    console.log(chalk.yellow('💡 Copy the relevant files to your project and update with your API token'));
  }

  async validateExistingSetup(): Promise<SetupValidation> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if SDK is installed
    const hasSDK = await fileExists(join(this.projectRoot, 'node_modules', '@nodash', 'sdk'));
    if (!hasSDK) {
      issues.push('@nodash/sdk is not installed');
      recommendations.push('Install the SDK: npm install @nodash/sdk');
    }

    // Check if config exists
    const hasConfig = await fileExists(join(this.projectRoot, '.nodash', 'config.json'));
    if (!hasConfig) {
      issues.push('No Nodash configuration found');
      recommendations.push('Set up configuration: nodash config set token <your-token>');
    }

    return {
      hasSDK,
      hasConfig,
      issues,
      recommendations
    };
  }

  private generateEnvTemplate(analysis: ProjectAnalysis): string {
    const prefix = analysis.framework === 'Next.js' ? 'NEXT_PUBLIC_' :
                   analysis.framework === 'React' ? 'REACT_APP_' :
                   analysis.framework === 'Vue' ? 'VUE_APP_' : '';

    return `# Nodash Configuration
# Get your API token from https://dashboard.nodash.ai
${prefix}NODASH_TOKEN=your_api_token_here

# Optional: Custom API base URL
# ${prefix}NODASH_BASE_URL=https://api.nodash.ai

# Optional: Request timeout (milliseconds)
# ${prefix}NODASH_TIMEOUT=30000

# Optional: Number of retries
# ${prefix}NODASH_RETRIES=3`;
  }
}