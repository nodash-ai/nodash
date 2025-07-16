export interface ProjectConfig {
  baseUrl: string;
  apiToken?: string;
  environment?: string;
}

export interface SetupResult {
  success: boolean;
  message: string;
  config?: ProjectConfig;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export interface Documentation {
  component: 'sdk' | 'cli';
  content: string;
  examples: string[];
  lastUpdated: Date;
}