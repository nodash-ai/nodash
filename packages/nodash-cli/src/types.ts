export interface ProjectAnalysis {
  language: string;
  framework?: string;
  packageManager?: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  hasAnalyticsSDK: boolean;
  analyticsLibraries: string[];
  recommendations?: string[];
  projectRoot: string;
  analyzedAt: string;
}

export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface DetectionResult {
  detected: boolean;
  confidence: number;
  evidence: string[];
} 