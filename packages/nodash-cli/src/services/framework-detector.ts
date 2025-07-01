import type { PackageJson, DetectionResult } from '../types.js';

export class FrameworkDetector {
  private static readonly FRAMEWORK_PATTERNS = {
    'Express': ['express'],
    'Next.js': ['next'],
    'Nuxt': ['nuxt'],
    'React': ['react', 'react-dom'],
    'Vue': ['vue'],
    'Angular': ['@angular/core'],
    'Svelte': ['svelte'],
    'Fastify': ['fastify'],
    'Koa': ['koa'],
    'NestJS': ['@nestjs/core'],
    'Gatsby': ['gatsby'],
    'Remix': ['@remix-run/node', '@remix-run/react']
  };

  private static readonly ANALYTICS_PATTERNS = [
    'posthog-js',
    'posthog-node',
    '@segment/analytics-node',
    'analytics-node',
    'mixpanel',
    'amplitude-js',
    'gtag',
    'google-analytics',
    '@google-analytics/data',
    'hotjar',
    'fullstory',
    '@nodash/sdk'
  ];

  static detectFramework(packageJson: PackageJson): DetectionResult {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    for (const [framework, patterns] of Object.entries(this.FRAMEWORK_PATTERNS)) {
      const matches = patterns.filter(pattern => allDeps[pattern]);
      if (matches.length > 0) {
        return {
          detected: true,
          confidence: matches.length / patterns.length,
          evidence: matches
        };
      }
    }

    return {
      detected: false,
      confidence: 0,
      evidence: []
    };
  }

  static detectAnalyticsLibraries(packageJson: PackageJson): string[] {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    return this.ANALYTICS_PATTERNS.filter(pattern => allDeps[pattern]);
  }

  static detectLanguage(packageJson: PackageJson): string {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Check for TypeScript
    if (allDeps['typescript'] || allDeps['@types/node']) {
      return 'TypeScript';
    }

    // Default to JavaScript for Node.js projects
    return 'JavaScript';
  }
} 