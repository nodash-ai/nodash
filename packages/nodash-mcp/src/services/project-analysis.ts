import fs from 'fs/promises';
import path from 'path';
import { ProjectAnalysis } from '../types.js';
import { ANALYSIS_CACHE_DURATION } from '../utils/constants.js';

export class ProjectAnalysisService {
  private getStoragePath(projectPath: string): string {
    // Store analysis in .nodash directory within the project
    return path.join(projectPath, '.nodash', 'project-analysis.json');
  }

  private async ensureStorageDir(projectPath: string): Promise<void> {
    const storageDir = path.join(projectPath, '.nodash');
    try {
      await fs.access(storageDir);
    } catch {
      await fs.mkdir(storageDir, { recursive: true });
    }
  }

  private async loadCachedAnalysis(projectPath: string): Promise<ProjectAnalysis | null> {
    try {
      const storagePath = this.getStoragePath(projectPath);
      const data = await fs.readFile(storagePath, 'utf-8');
      const cached = JSON.parse(data);
      
      // Check if cache is still valid
      const now = Date.now();
      if (cached.timestamp && (now - cached.timestamp) < ANALYSIS_CACHE_DURATION) {
        return cached.analysis;
      }
    } catch {
      // Cache doesn't exist or is invalid
    }
    return null;
  }

  private async saveCachedAnalysis(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
    try {
      await this.ensureStorageDir(projectPath);
      const storagePath = this.getStoragePath(projectPath);
      const cacheData = {
        timestamp: Date.now(),
        analysis,
      };
      await fs.writeFile(storagePath, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      // If we can't save cache, continue without it
      console.warn('Failed to save project analysis cache:', error);
    }
  }

  async analyzeProject(projectPath?: string): Promise<ProjectAnalysis> {
    const basePath = projectPath || process.cwd();
    
    // Try to load from persistent cache first
    const cached = await this.loadCachedAnalysis(basePath);
    if (cached) {
      return cached;
    }

    try {
      const packageJsonPath = path.join(basePath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const framework = this.detectFramework(packageJson);
      const sourceFiles = await this.countSourceFiles(basePath);
      const hasExistingAnalytics = this.detectExistingAnalytics(packageJson);
      const packageManager = await this.detectPackageManager(basePath);
      const recommendations = this.generateRecommendations(framework, hasExistingAnalytics, packageJson);

      const analysis: ProjectAnalysis = {
        framework,
        sourceFiles,
        hasExistingAnalytics,
        packageManager,
        recommendations,
      };

      // Save to persistent cache
      await this.saveCachedAnalysis(basePath, analysis);

      return analysis;
    } catch (error) {
      throw new Error(`Project analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private detectFramework(packageJson: any): string {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (dependencies.next) return 'nextjs';
    if (dependencies.nuxt) return 'nuxtjs';
    if (dependencies.react) return 'react';
    if (dependencies.vue) return 'vue';
    if (dependencies.svelte) return 'svelte';
    if (dependencies['@angular/core']) return 'angular';
    if (dependencies.express) return 'express';
    if (dependencies.fastify) return 'fastify';
    
    return 'vanilla';
  }

  private async countSourceFiles(basePath: string): Promise<number> {
    let count = 0;
    
    const countFiles = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await countFiles(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) {
              count++;
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    await countFiles(basePath);
    return count;
  }

  private detectExistingAnalytics(packageJson: any): boolean {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const analyticsPackages = [
      'segment', '@segment/analytics-node', '@segment/analytics-browser',
      'mixpanel', 'mixpanel-browser',
      'amplitude', '@amplitude/analytics-browser', '@amplitude/analytics-node',
      'google-analytics', 'gtag', 'ga-4-react',
      'posthog-js', 'posthog-node'
    ];
    
    return analyticsPackages.some(pkg => dependencies[pkg]);
  }

  private async detectPackageManager(basePath: string): Promise<string> {
    try {
      await fs.access(path.join(basePath, 'yarn.lock'));
      return 'yarn';
    } catch {
      // yarn.lock not found, continue to next check
    }
    
    try {
      await fs.access(path.join(basePath, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {
      // pnpm-lock.yaml not found, continue to npm
    }
    
    return 'npm';
  }

  private generateRecommendations(framework: string, hasExistingAnalytics: boolean, packageJson: any): string[] {
    const recommendations: string[] = [];
    
    // Installation recommendation
    const packageManager = packageJson.packageManager?.startsWith('yarn') ? 'yarn add' : 
                          packageJson.packageManager?.startsWith('pnpm') ? 'pnpm add' : 'npm install';
    recommendations.push(`Install via ${packageManager.split(' ')[0]}: ${packageManager} @nodash/sdk`);
    
    // Framework-specific recommendations
    switch (framework) {
      case 'nextjs':
        recommendations.push('Use Next.js App Router integration pattern');
        recommendations.push('Initialize in app/layout.tsx for global tracking');
        recommendations.push('Add middleware for API route tracking');
        recommendations.push('Use useEffect for client-side page tracking');
        break;
      case 'react':
        recommendations.push('Create a NodashProvider component for context');
        recommendations.push('Use React hooks for component-level tracking');
        recommendations.push('Initialize in your main App component');
        recommendations.push('Add error boundary integration for error tracking');
        break;
      case 'vue':
        recommendations.push('Create a Vue plugin for global SDK access');
        recommendations.push('Use composition API for reactive tracking');
        recommendations.push('Add router guards for page view tracking');
        recommendations.push('Consider Pinia integration for state tracking');
        break;
      case 'angular':
        recommendations.push('Create an Angular service for SDK management');
        recommendations.push('Use dependency injection for component access');
        recommendations.push('Add router event tracking for navigation');
        recommendations.push('Integrate with Angular error handler');
        break;
      case 'express':
        recommendations.push('Use Express middleware for automatic request tracking');
        recommendations.push('Add API endpoint tracking for better insights');
        recommendations.push('Track response times and error rates');
        recommendations.push('Add user session tracking');
        break;
      default:
        recommendations.push('Initialize early in your application startup');
        recommendations.push('Add event listeners for user interactions');
        recommendations.push('Track page navigation manually');
    }
    
    // Migration recommendations
    if (hasExistingAnalytics) {
      recommendations.push('Consider gradual migration from existing analytics');
      recommendations.push('Use dual tracking during transition period');
      recommendations.push('Map existing events to Nodash event schema');
      recommendations.push('Validate data consistency during migration');
    }
    
    // Business-specific recommendations
    const businessType = this.detectBusinessType(packageJson);
    recommendations.push(...this.getBusinessSpecificRecommendations(businessType));
    
    return recommendations;
  }

  /**
   * Detect business type based on dependencies and project structure
   */
  private detectBusinessType(packageJson: any): string {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const name = packageJson.name?.toLowerCase() || '';
    const description = packageJson.description?.toLowerCase() || '';
    
    // E-commerce indicators
    if (dependencies.stripe || dependencies['@stripe/stripe-js'] || 
        dependencies.shopify || dependencies.commerce ||
        name.includes('shop') || name.includes('store') || name.includes('ecommerce') ||
        description.includes('shop') || description.includes('store') || description.includes('ecommerce')) {
      return 'e-commerce';
    }
    
    // SaaS indicators
    if (dependencies.auth0 || dependencies['@auth0/auth0-react'] ||
        dependencies.supabase || dependencies.firebase ||
        name.includes('saas') || name.includes('dashboard') || name.includes('admin') ||
        description.includes('saas') || description.includes('dashboard') || description.includes('platform')) {
      return 'saas';
    }
    
    // Content/Blog indicators
    if (dependencies.contentful || dependencies.strapi || dependencies.sanity ||
        dependencies.gatsby || dependencies.gridsome ||
        name.includes('blog') || name.includes('cms') || name.includes('content') ||
        description.includes('blog') || description.includes('content') || description.includes('news')) {
      return 'content';
    }
    
    return 'general';
  }

  /**
   * Get business-specific analytics recommendations
   */
  private getBusinessSpecificRecommendations(businessType: string): string[] {
    switch (businessType) {
      case 'e-commerce':
        return [
          'Track product views, cart actions, and purchases',
          'Implement funnel analysis for checkout process',
          'Monitor cart abandonment and recovery',
          'Track search queries and filter usage',
          'Measure product recommendation effectiveness'
        ];
      
      case 'saas':
        return [
          'Track feature usage and adoption rates',
          'Monitor user onboarding completion',
          'Measure trial-to-paid conversion',
          'Track subscription lifecycle events',
          'Monitor user engagement and retention'
        ];
      
      case 'content':
        return [
          'Track content engagement and reading time',
          'Monitor search and discovery patterns',
          'Measure content sharing and virality',
          'Track newsletter signups and subscriptions',
          'Monitor comment and interaction rates'
        ];
      
      default:
        return [
          'Track core user actions and page views',
          'Monitor user registration and authentication',
          'Measure feature usage and engagement',
          'Track error rates and performance metrics'
        ];
    }
  }

  /**
   * Suggest analytics integration patterns based on project analysis
   */
  async suggestIntegrationPatterns(projectPath?: string): Promise<{
    patterns: string[];
    codeExamples: { [key: string]: string };
    nextSteps: string[];
  }> {
    const analysis = await this.analyzeProject(projectPath);
    const patterns: string[] = [];
    const codeExamples: { [key: string]: string } = {};
    const nextSteps: string[] = [];

    // Framework-specific patterns
    switch (analysis.framework) {
      case 'react':
        patterns.push('Provider Pattern', 'Custom Hooks', 'Error Boundaries');
        codeExamples['Provider Pattern'] = `// Create NodashProvider.tsx
import React, { createContext, useContext } from 'react';
import { NodashSDK } from '@nodash/sdk';

const NodashContext = createContext<NodashSDK | null>(null);

export function NodashProvider({ children }: { children: React.ReactNode }) {
  const sdk = new NodashSDK(process.env.REACT_APP_NODASH_TOKEN!);
  return <NodashContext.Provider value={sdk}>{children}</NodashContext.Provider>;
}

export const useNodash = () => {
  const sdk = useContext(NodashContext);
  if (!sdk) throw new Error('useNodash must be used within NodashProvider');
  return sdk;
};`;
        nextSteps.push('Wrap your App component with NodashProvider');
        nextSteps.push('Use useNodash hook in components for tracking');
        break;

      case 'vue':
        patterns.push('Plugin Pattern', 'Composition API', 'Router Integration');
        codeExamples['Plugin Pattern'] = `// Create nodash-plugin.ts
import { App } from 'vue';
import { NodashSDK } from '@nodash/sdk';

export default {
  install(app: App, options: { token: string }) {
    const nodash = new NodashSDK(options.token);
    app.config.globalProperties.$nodash = nodash;
    app.provide('nodash', nodash);
  }
};

// Use in components
import { inject } from 'vue';
export function useNodash() {
  return inject('nodash') as NodashSDK;
}`;
        nextSteps.push('Install the plugin in your main.ts');
        nextSteps.push('Use useNodash composable in components');
        break;

      case 'express':
        patterns.push('Middleware Pattern', 'Request Tracking', 'Error Handling');
        codeExamples['Middleware Pattern'] = `// Create analytics middleware
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.NODASH_TOKEN!);

export function analyticsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    nodash.track('api_request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
}`;
        nextSteps.push('Add middleware to your Express app');
        nextSteps.push('Track specific business events in routes');
        break;
    }

    return { patterns, codeExamples, nextSteps };
  }

  /**
   * Generate implementation roadmap based on project analysis
   */
  async generateImplementationRoadmap(projectPath?: string): Promise<{
    phases: Array<{
      name: string;
      description: string;
      tasks: string[];
      estimatedTime: string;
    }>;
    totalEstimate: string;
  }> {
    const analysis = await this.analyzeProject(projectPath);
    
    const phases = [
      {
        name: 'Phase 1: Setup and Basic Tracking',
        description: 'Install SDK and implement basic page view tracking',
        tasks: [
          'Install @nodash/sdk package',
          'Configure environment variables',
          'Initialize SDK in main application file',
          'Add basic page view tracking',
          'Test tracking in development environment'
        ],
        estimatedTime: '2-4 hours'
      },
      {
        name: 'Phase 2: User Identification and Events',
        description: 'Implement user tracking and core business events',
        tasks: [
          'Add user identification on login/signup',
          'Track core user actions (clicks, form submissions)',
          'Implement business-specific events',
          'Add error tracking and reporting',
          'Validate event data structure'
        ],
        estimatedTime: '4-8 hours'
      },
      {
        name: 'Phase 3: Advanced Features',
        description: 'Add performance monitoring and advanced analytics',
        tasks: [
          'Implement performance metric tracking',
          'Add custom event properties and context',
          'Set up batch processing for high-volume events',
          'Add A/B testing event tracking',
          'Implement conversion funnel tracking'
        ],
        estimatedTime: '6-12 hours'
      },
      {
        name: 'Phase 4: Optimization and Monitoring',
        description: 'Optimize implementation and add monitoring',
        tasks: [
          'Optimize event batching and performance',
          'Add comprehensive error handling',
          'Set up analytics dashboard monitoring',
          'Implement data validation and quality checks',
          'Document analytics implementation'
        ],
        estimatedTime: '4-8 hours'
      }
    ];

    // Adjust estimates based on project complexity
    const complexity = analysis.sourceFiles > 100 ? 'high' : 
                      analysis.sourceFiles > 20 ? 'medium' : 'low';
    
    const totalEstimate = complexity === 'high' ? '20-40 hours' :
                         complexity === 'medium' ? '16-32 hours' : '12-24 hours';

    return { phases, totalEstimate };
  }
} 