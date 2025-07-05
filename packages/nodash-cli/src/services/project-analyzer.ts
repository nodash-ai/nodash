import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import type { ProjectAnalysis } from '../types.js';
import { readPackageJson, detectPackageManager, fileExists } from '../utils/file-utils.js';
import { FrameworkDetector } from './framework-detector.js';

export class ProjectAnalyzer {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  async analyze(): Promise<ProjectAnalysis> {
    console.log('🔍 Analyzing project structure...');
    
    // Check if this is a Node.js project
    const packageJson = await readPackageJson(this.projectRoot);
    
    if (!packageJson) {
      throw new Error('No package.json found. Currently only Node.js projects are supported.');
    }

    console.log('📦 Node.js project detected');

    // Detect framework
    const frameworkResult = FrameworkDetector.detectFramework(packageJson);
    let framework: string | undefined;
    
    if (frameworkResult.detected) {
      // Find which framework matches the evidence
      for (const [frameworkName, patterns] of Object.entries(FrameworkDetector['FRAMEWORK_PATTERNS'])) {
        if (patterns.some((pattern: string) => frameworkResult.evidence.includes(pattern))) {
          framework = frameworkName;
          break;
        }
      }
    }

    // Detect analytics libraries
    const analyticsLibraries = FrameworkDetector.detectAnalyticsLibraries(packageJson);

    // Detect language
    const language = FrameworkDetector.detectLanguage(packageJson);

    // Detect package manager
    const packageManager = await detectPackageManager(this.projectRoot);

    // Generate recommendations
    const recommendations = this.generateRecommendations(framework, analyticsLibraries.length > 0, packageJson, packageManager);

    const analysis: ProjectAnalysis = {
      language,
      framework,
      packageManager,
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {},
      hasAnalyticsSDK: analyticsLibraries.length > 0,
      analyticsLibraries,
      recommendations,
      projectRoot: this.projectRoot,
      analyzedAt: new Date().toISOString()
    };

    console.log(`✅ Analysis complete: ${language}${framework ? ` with ${framework}` : ''}`);
    
    return analysis;
  }

  async saveAnalysis(analysis: ProjectAnalysis): Promise<void> {
    const nodashDir = join(this.projectRoot, '.nodash');
    const analysisFile = join(nodashDir, 'project-analysis.json');

    // Ensure .nodash directory exists
    if (!await fileExists(nodashDir)) {
      await mkdir(nodashDir, { recursive: true });
      console.log('📁 Created .nodash directory');
    }

    // Save analysis
    await writeFile(analysisFile, JSON.stringify(analysis, null, 2));
    console.log('💾 Project analysis saved to .nodash/project-analysis.json');
  }

  async loadAnalysis(): Promise<ProjectAnalysis | null> {
    const analysisFile = join(this.projectRoot, '.nodash', 'project-analysis.json');
    
    if (!await fileExists(analysisFile)) {
      return null;
    }

    try {
      const content = await readFile(analysisFile, 'utf-8');
      return JSON.parse(content) as ProjectAnalysis;
    } catch {
      return null;
    }
  }

  async analyzeAndSave(): Promise<ProjectAnalysis> {
    const analysis = await this.analyze();
    await this.saveAnalysis(analysis);
    return analysis;
  }

  private generateRecommendations(framework: string | undefined, hasExistingAnalytics: boolean, packageJson: any, packageManager: string): string[] {
    const recommendations: string[] = [];
    
    // Installation recommendation
    const installCmd = packageManager === 'yarn' ? 'yarn add' : 
                      packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
    recommendations.push(`Install via ${packageManager}: ${installCmd} @nodash/sdk`);
    
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
      case 'angular':
        recommendations.push('Use Angular service injection for clean integration');
        recommendations.push('Initialize in your main.ts or app.module.ts');
        break;
      default:
        recommendations.push('Initialize early in your application startup');
    }
    
    // Migration recommendations
    if (hasExistingAnalytics) {
      recommendations.push('Consider gradual migration from existing analytics');
      recommendations.push('Use dual tracking during transition period');
    } else {
      recommendations.push('Start with basic page views and user actions');
      recommendations.push('Add custom events for business-critical actions');
    }
    
    return recommendations;
  }
} 