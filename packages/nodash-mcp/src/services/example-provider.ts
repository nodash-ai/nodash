import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExampleFile {
  path: string;
  name: string;
  content: string;
  language: string;
  description: string;
}

export interface FrameworkExample {
  framework: string;
  name: string;
  description: string;
  files: ExampleFile[];
  readme: string;
  setupInstructions: string[];
  keyFeatures: string[];
}

export class ExampleProviderService {
  private examplesBasePath: string;

  constructor() {
    // Get the examples directory path relative to the MCP server
    this.examplesBasePath = path.resolve(process.cwd(), '../../examples');
  }

  /**
   * Get all available framework examples
   */
  async getAvailableExamples(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.examplesBasePath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => entry.name);
    } catch (error) {
      console.warn('Failed to read examples directory:', error);
      return [];
    }
  }

  /**
   * Get a specific framework example with all its files
   */
  async getFrameworkExample(framework: string): Promise<FrameworkExample | null> {
    try {
      const frameworkPath = path.join(this.examplesBasePath, framework);
      
      // Check if framework directory exists
      try {
        await fs.access(frameworkPath);
      } catch {
        return null;
      }

      // Read README
      const readme = await this.readExampleFile(framework, 'README.md');
      
      // Get all source files
      const files = await this.getExampleFiles(frameworkPath, framework);
      
      // Parse setup instructions and features from README
      const { setupInstructions, keyFeatures } = this.parseReadmeContent(readme);

      return {
        framework,
        name: `${framework.charAt(0).toUpperCase() + framework.slice(1)} Example`,
        description: this.getFrameworkDescription(framework),
        files,
        readme,
        setupInstructions,
        keyFeatures
      };
    } catch (error) {
      console.error(`Failed to load ${framework} example:`, error);
      return null;
    }
  }

  /**
   * Get a specific file from an example
   */
  async getExampleFile(framework: string, filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.examplesBasePath, framework, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read example file ${framework}/${filePath}: ${error}`);
    }
  }

  /**
   * Read and format example file with explanation
   */
  async readExampleFile(framework: string, filePath: string): Promise<string> {
    try {
      const content = await this.getExampleFile(framework, filePath);
      return content;
    } catch (error) {
      return `Error reading ${filePath}: ${error}`;
    }
  }

  /**
   * Get all source files from an example directory
   */
  private async getExampleFiles(frameworkPath: string, framework: string): Promise<ExampleFile[]> {
    const files: ExampleFile[] = [];
    
    const scanDirectory = async (dirPath: string, relativePath: string = '') => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
            continue;
          }
          
          const fullPath = path.join(dirPath, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath, relativeFilePath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            
            // Include source files and important config files
            if (this.isImportantFile(entry.name, ext)) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                files.push({
                  path: relativeFilePath,
                  name: entry.name,
                  content,
                  language: this.getLanguageFromExtension(ext),
                  description: this.getFileDescription(entry.name, ext)
                });
              } catch (error) {
                console.warn(`Failed to read file ${relativeFilePath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to scan directory ${dirPath}:`, error);
      }
    };
    
    await scanDirectory(frameworkPath);
    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Check if a file should be included in the example
   */
  private isImportantFile(fileName: string, ext: string): boolean {
    // Source files
    if (['.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss'].includes(ext)) {
      return true;
    }
    
    // Configuration files
    const configFiles = [
      'package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js',
      'next.config.js', 'next.config.ts', 'nuxt.config.js', 'nuxt.config.ts',
      'vue.config.js', 'angular.json', 'svelte.config.js',
      '.env.example', 'README.md'
    ];
    
    return configFiles.includes(fileName);
  }

  /**
   * Get programming language from file extension
   */
  private getLanguageFromExtension(ext: string): string {
    const languageMap: { [key: string]: string } = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascriptreact',
      '.tsx': 'typescriptreact',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.md': 'markdown'
    };
    
    return languageMap[ext] || 'text';
  }

  /**
   * Get description for a file based on its name and extension
   */
  private getFileDescription(fileName: string, ext: string): string {
    if (fileName === 'package.json') return 'Project dependencies and scripts';
    if (fileName === 'tsconfig.json') return 'TypeScript configuration';
    if (fileName === 'README.md') return 'Project documentation and setup instructions';
    if (fileName.includes('config')) return 'Framework configuration file';
    if (fileName === 'index.html') return 'Main HTML entry point';
    if (fileName.includes('App.')) return 'Main application component';
    if (fileName.includes('main.')) return 'Application entry point';
    if (ext === '.css' || ext === '.scss') return 'Stylesheet for component styling';
    
    return 'Source file';
  }

  /**
   * Get framework description
   */
  private getFrameworkDescription(framework: string): string {
    const descriptions: { [key: string]: string } = {
      'react': 'Complete React application with hooks, context, and component tracking patterns',
      'vue': 'Vue.js application with composition API and reactive analytics patterns',
      'angular': 'Angular application with services, modules, and dependency injection',
      'nextjs': 'Next.js application with SSR, static generation, and API routes',
      'express': 'Express.js server with middleware, API tracking, and server-side analytics',
      'vanilla': 'Pure JavaScript integration without frameworks'
    };
    
    return descriptions[framework] || `${framework} integration example`;
  }

  /**
   * Parse README content to extract setup instructions and key features
   */
  private parseReadmeContent(readme: string): { setupInstructions: string[]; keyFeatures: string[] } {
    const setupInstructions: string[] = [];
    const keyFeatures: string[] = [];
    
    const lines = readme.split('\n');
    let inSetupSection = false;
    let inFeaturesSection = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect sections
      if (trimmed.toLowerCase().includes('quick start') || 
          trimmed.toLowerCase().includes('getting started') ||
          trimmed.toLowerCase().includes('installation')) {
        inSetupSection = true;
        inFeaturesSection = false;
        continue;
      }
      
      if (trimmed.toLowerCase().includes('features') ||
          trimmed.toLowerCase().includes('what\'s included')) {
        inFeaturesSection = true;
        inSetupSection = false;
        continue;
      }
      
      // Stop at next major section
      if (trimmed.startsWith('##') && !trimmed.toLowerCase().includes('quick start') &&
          !trimmed.toLowerCase().includes('features') && !trimmed.toLowerCase().includes('installation')) {
        inSetupSection = false;
        inFeaturesSection = false;
      }
      
      // Extract content
      if (inSetupSection && (trimmed.startsWith('-') || trimmed.match(/^\d+\./))) {
        setupInstructions.push(trimmed.replace(/^[-\d.]\s*/, ''));
      }
      
      if (inFeaturesSection && (trimmed.startsWith('-') || trimmed.startsWith('✅'))) {
        keyFeatures.push(trimmed.replace(/^[-✅]\s*/, ''));
      }
    }
    
    return { setupInstructions, keyFeatures };
  }

  /**
   * Get example overview with all available frameworks
   */
  async getExamplesOverview(): Promise<{
    totalExamples: number;
    frameworks: Array<{
      name: string;
      description: string;
      hasReadme: boolean;
      fileCount: number;
    }>;
    quickStart: string[];
  }> {
    const availableFrameworks = await this.getAvailableExamples();
    const frameworks = [];
    
    for (const framework of availableFrameworks) {
      try {
        const frameworkPath = path.join(this.examplesBasePath, framework);
        const files = await this.getExampleFiles(frameworkPath, framework);
        
        // Check if README exists
        let hasReadme = false;
        try {
          await fs.access(path.join(frameworkPath, 'README.md'));
          hasReadme = true;
        } catch {
          // README doesn't exist
        }
        
        frameworks.push({
          name: framework,
          description: this.getFrameworkDescription(framework),
          hasReadme,
          fileCount: files.length
        });
      } catch (error) {
        console.warn(`Failed to analyze ${framework} example:`, error);
      }
    }
    
    const quickStart = [
      'Browse available examples by framework',
      'Copy example code to your project',
      'Follow setup instructions in each example README',
      'Customize tracking events for your use case',
      'Test analytics integration in development'
    ];
    
    return {
      totalExamples: frameworks.length,
      frameworks,
      quickStart
    };
  }

  /**
   * Search for specific patterns or features across examples
   */
  async searchExamples(query: string): Promise<Array<{
    framework: string;
    file: string;
    matches: Array<{
      line: number;
      content: string;
      context: string;
    }>;
  }>> {
    const results = [];
    const availableFrameworks = await this.getAvailableExamples();
    
    for (const framework of availableFrameworks) {
      try {
        const example = await this.getFrameworkExample(framework);
        if (!example) continue;
        
        for (const file of example.files) {
          const lines = file.content.split('\n');
          const matches = [];
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              matches.push({
                line: i + 1,
                content: lines[i].trim(),
                context: this.getLineContext(lines, i)
              });
            }
          }
          
          if (matches.length > 0) {
            results.push({
              framework,
              file: file.path,
              matches
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to search ${framework} example:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get context around a line for search results
   */
  private getLineContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(lines.length, lineIndex + 3);
    return lines.slice(start, end).join('\n');
  }
}