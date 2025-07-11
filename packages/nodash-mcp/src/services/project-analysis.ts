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
        break;
      case 'react':
        recommendations.push('Use React hooks for component-level tracking');
        recommendations.push('Initialize in your main App component');
        break;
      case 'vue':
        recommendations.push('Use Vue.js plugin setup for global availability');
        recommendations.push('Consider composition API for reactive tracking');
        break;
      case 'express':
        recommendations.push('Use Express middleware for automatic request tracking');
        recommendations.push('Add API endpoint tracking for better insights');
        break;
      default:
        recommendations.push('Initialize early in your application startup');
    }
    
    // Migration recommendations
    if (hasExistingAnalytics) {
      recommendations.push('Consider gradual migration from existing analytics');
      recommendations.push('Use dual tracking during transition period');
    }
    
    return recommendations;
  }
} 