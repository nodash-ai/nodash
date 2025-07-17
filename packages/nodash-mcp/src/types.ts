export interface ProjectConfig {
  baseUrl: string;
  apiToken?: string;
  environment?: string;
}

export interface SetupStep {
  description: string;
  status: 'running' | 'completed' | 'failed';
  output?: string;
  error?: string;
}

export interface SetupResult {
  success: boolean;
  message: string;
  config?: ProjectConfig;
  steps?: SetupStep[];
  error?: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  command?: string;
}

export interface Documentation {
  component: 'sdk' | 'cli';
  content: string;
  examples: string[];
  lastUpdated: Date;
}