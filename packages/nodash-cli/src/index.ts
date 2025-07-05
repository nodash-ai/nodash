// Export main services for use by other packages
export { ProjectAnalyzer } from './services/project-analyzer.js';
export { FrameworkDetector } from './services/framework-detector.js';

// Export types
export type { ProjectAnalysis, PackageJson, DetectionResult } from './types.js';

// Export utilities
export * from './utils/file-utils.js'; 