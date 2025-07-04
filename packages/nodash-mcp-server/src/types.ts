// Simple types for Nodash MCP Server

export interface ProjectAnalysis {
  framework: string;
  sourceFiles: number;
  hasExistingAnalytics: boolean;
  packageManager: string;
  recommendations: string[];
}

export interface EventDefinition {
  name: string;
  properties: Record<string, any>;
  description?: string;
}

export interface EventData {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  source?: string;
}

// Framework and implementation types
export type Framework = 'react' | 'nextjs' | 'vue' | 'express' | 'angular' | 'vanilla';
export type Language = 'javascript' | 'typescript';
export type IntegrationComplexity = 'basic' | 'advanced' | 'enterprise'; 