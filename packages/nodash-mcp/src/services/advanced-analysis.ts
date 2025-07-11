import fs from 'fs/promises';
import path from 'path';

export interface AdvancedAnalysis {
  codePatterns: CodePattern[];
  securityIssues: SecurityIssue[];
  performanceIssues: PerformanceIssue[];
  architectureRecommendations: ArchitectureRecommendation[];
  eventOpportunities: EventOpportunity[];
  integrationComplexity: 'low' | 'medium' | 'high';
  estimatedImplementationTime: string;
}

export interface CodePattern {
  type: 'component' | 'hook' | 'service' | 'utility' | 'route' | 'middleware';
  name: string;
  file: string;
  line: number;
  trackingOpportunity: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SecurityIssue {
  type: 'dependency' | 'code' | 'configuration';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file?: string;
  recommendation: string;
}

export interface PerformanceIssue {
  type: 'bundle' | 'runtime' | 'network' | 'memory';
  impact: 'high' | 'medium' | 'low';
  description: string;
  file?: string;
  recommendation: string;
}

export interface ArchitectureRecommendation {
  category: 'structure' | 'patterns' | 'dependencies' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  benefits: string[];
}

export interface EventOpportunity {
  eventName: string;
  description: string;
  businessValue: 'high' | 'medium' | 'low';
  implementationLocation: string;
  suggestedProperties: Record<string, string>;
  businessGoal: 'acquisition' | 'engagement' | 'retention' | 'monetization';
}

export class AdvancedAnalysisService {
  async performAdvancedAnalysis(projectPath?: string): Promise<AdvancedAnalysis> {
    const basePath = projectPath || process.cwd();
    
    const [
      codePatterns,
      securityIssues,
      performanceIssues,
      architectureRecommendations,
      eventOpportunities
    ] = await Promise.all([
      this.analyzeCodePatterns(basePath),
      this.analyzeSecurityIssues(basePath),
      this.analyzePerformanceIssues(basePath),
      this.generateArchitectureRecommendations(basePath),
      this.identifyEventOpportunities(basePath)
    ]);

    const integrationComplexity = this.assessIntegrationComplexity(codePatterns, architectureRecommendations);
    const estimatedImplementationTime = this.estimateImplementationTime(integrationComplexity, eventOpportunities.length);

    return {
      codePatterns,
      securityIssues,
      performanceIssues,
      architectureRecommendations,
      eventOpportunities,
      integrationComplexity,
      estimatedImplementationTime
    };
  }

  private async analyzeCodePatterns(basePath: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    
    await this.scanDirectory(basePath, async (filePath: string, content: string) => {
      const relativePath = path.relative(basePath, filePath);
      const ext = path.extname(filePath);
      
      if (!['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte'].includes(ext)) return;
      
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // React component patterns
        if (line.includes('function ') && (line.includes('Component') || line.includes('Page'))) {
          patterns.push({
            type: 'component',
            name: this.extractFunctionName(line),
            file: relativePath,
            line: index + 1,
            trackingOpportunity: 'Track component renders and user interactions',
            priority: 'medium'
          });
        }
        
        // API route patterns
        if (line.includes('app.') && (line.includes('get(') || line.includes('post(') || line.includes('put(') || line.includes('delete('))) {
          patterns.push({
            type: 'route',
            name: this.extractRouteName(line),
            file: relativePath,
            line: index + 1,
            trackingOpportunity: 'Track API endpoint usage and performance',
            priority: 'high'
          });
        }
        
        // Form submission patterns
        if (line.includes('onSubmit') || line.includes('handleSubmit')) {
          patterns.push({
            type: 'component',
            name: 'Form submission',
            file: relativePath,
            line: index + 1,
            trackingOpportunity: 'Track form submissions and conversion rates',
            priority: 'high'
          });
        }
        
        // Button click patterns
        if (line.includes('onClick') && (line.includes('button') || line.includes('Button'))) {
          patterns.push({
            type: 'component',
            name: 'Button interaction',
            file: relativePath,
            line: index + 1,
            trackingOpportunity: 'Track button clicks and user engagement',
            priority: 'medium'
          });
        }
      });
    });
    
    return patterns;
  }

  private async analyzeSecurityIssues(basePath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    try {
      // Check package.json for known vulnerable dependencies
      const packageJsonPath = path.join(basePath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      const vulnerableDeps = [
        'lodash', 'moment', 'request', 'node-uuid', 'debug'
      ];
      
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const [dep, version] of Object.entries(allDeps)) {
        if (vulnerableDeps.includes(dep)) {
          issues.push({
            type: 'dependency',
            severity: 'medium',
            description: `Potentially outdated dependency: ${dep}@${version}`,
            recommendation: `Consider updating ${dep} to latest version or find modern alternatives`
          });
        }
      }
    } catch (error) {
      // Package.json not found or invalid
    }
    
    return issues;
  }

  private async analyzePerformanceIssues(basePath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    
    await this.scanDirectory(basePath, async (filePath: string, content: string) => {
      const relativePath = path.relative(basePath, filePath);
      
      // Check for large bundle imports
      if (content.includes('import * as')) {
        issues.push({
          type: 'bundle',
          impact: 'medium',
          description: 'Wildcard imports can increase bundle size',
          file: relativePath,
          recommendation: 'Use specific imports instead of wildcard imports'
        });
      }
      
      // Check for synchronous operations in async contexts
      if (content.includes('fs.readFileSync') || content.includes('fs.writeFileSync')) {
        issues.push({
          type: 'runtime',
          impact: 'high',
          description: 'Synchronous file operations can block the event loop',
          file: relativePath,
          recommendation: 'Use async file operations (fs.promises or fs.readFile with callback)'
        });
      }
    });
    
    return issues;
  }

  private async generateArchitectureRecommendations(basePath: string): Promise<ArchitectureRecommendation[]> {
    const recommendations: ArchitectureRecommendation[] = [];
    
    // Check if there's a proper folder structure
    const hasProperStructure = await this.checkFolderStructure(basePath);
    if (!hasProperStructure) {
      recommendations.push({
        category: 'structure',
        priority: 'medium',
        title: 'Implement organized folder structure',
        description: 'Create a clear separation between components, services, and utilities',
        implementation: 'Create folders: /components, /services, /utils, /types',
        benefits: ['Better maintainability', 'Easier navigation', 'Clearer code organization']
      });
    }
    
    // Check for environment configuration
    const hasEnvConfig = await this.checkEnvironmentConfig(basePath);
    if (!hasEnvConfig) {
      recommendations.push({
        category: 'configuration',
        priority: 'high',
        title: 'Add environment configuration',
        description: 'Set up proper environment variables for different deployment stages',
        implementation: 'Create .env files and use environment-specific configurations',
        benefits: ['Better security', 'Easier deployment', 'Environment isolation']
      });
    }
    
    return recommendations;
  }

  private async identifyEventOpportunities(basePath: string): Promise<EventOpportunity[]> {
    const opportunities: EventOpportunity[] = [];
    
    await this.scanDirectory(basePath, async (filePath: string, content: string) => {
      const relativePath = path.relative(basePath, filePath);
      
      // User authentication events
      if (content.includes('login') || content.includes('signin') || content.includes('auth')) {
        opportunities.push({
          eventName: 'user_login',
          description: 'Track user login events for authentication analytics',
          businessValue: 'high',
          implementationLocation: relativePath,
          suggestedProperties: {
            method: 'string', // email, google, facebook
            success: 'boolean',
            user_id: 'string'
          },
          businessGoal: 'engagement'
        });
      }
      
      // E-commerce events
      if (content.includes('cart') || content.includes('checkout') || content.includes('purchase')) {
        opportunities.push({
          eventName: 'add_to_cart',
          description: 'Track items added to cart for conversion analysis',
          businessValue: 'high',
          implementationLocation: relativePath,
          suggestedProperties: {
            product_id: 'string',
            product_name: 'string',
            price: 'number',
            quantity: 'number'
          },
          businessGoal: 'monetization'
        });
      }
      
      // Feature usage events
      if (content.includes('export') || content.includes('download') || content.includes('share')) {
        opportunities.push({
          eventName: 'feature_used',
          description: 'Track feature usage for product analytics',
          businessValue: 'medium',
          implementationLocation: relativePath,
          suggestedProperties: {
            feature_name: 'string',
            user_id: 'string',
            context: 'string'
          },
          businessGoal: 'engagement'
        });
      }
    });
    
    return opportunities;
  }

  private async scanDirectory(basePath: string, callback: (filePath: string, content: string) => Promise<void>): Promise<void> {
    const scan = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              await callback(fullPath, content);
            } catch (error) {
              // Skip files we can't read
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    await scan(basePath);
  }

  private extractFunctionName(line: string): string {
    const match = line.match(/function\s+([A-Za-z0-9_]+)/);
    return match ? match[1] : 'Unknown function';
  }

  private extractRouteName(line: string): string {
    const match = line.match(/\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/);
    return match ? `${match[1].toUpperCase()} ${match[2]}` : 'Unknown route';
  }

  private assessIntegrationComplexity(patterns: CodePattern[], recommendations: ArchitectureRecommendation[]): 'low' | 'medium' | 'high' {
    const highPriorityItems = patterns.filter(p => p.priority === 'high').length + 
                             recommendations.filter(r => r.priority === 'high').length;
    
    if (highPriorityItems > 10) return 'high';
    if (highPriorityItems > 5) return 'medium';
    return 'low';
  }

  private estimateImplementationTime(complexity: string, eventCount: number): string {
    const baseTime = complexity === 'high' ? 4 : complexity === 'medium' ? 2 : 1;
    const eventTime = Math.ceil(eventCount / 5) * 0.5;
    const totalHours = baseTime + eventTime;
    
    if (totalHours < 2) return '1-2 hours';
    if (totalHours < 4) return '2-4 hours';
    if (totalHours < 8) return '4-8 hours';
    return '1-2 days';
  }

  private async checkFolderStructure(basePath: string): Promise<boolean> {
    const expectedFolders = ['components', 'services', 'utils'];
    let foundFolders = 0;
    
    for (const folder of expectedFolders) {
      try {
        await fs.access(path.join(basePath, folder));
        foundFolders++;
      } catch {
        // Folder doesn't exist
      }
    }
    
    return foundFolders >= 2;
  }

  private async checkEnvironmentConfig(basePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(basePath, '.env'));
      return true;
    } catch {
      return false;
    }
  }
} 