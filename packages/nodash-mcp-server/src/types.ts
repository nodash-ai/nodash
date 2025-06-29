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