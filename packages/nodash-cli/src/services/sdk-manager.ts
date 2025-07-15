import { NodashSDK, NodashAPIError, APIResponse } from '@nodash/sdk';
import { ConfigManager } from './config-manager.js';

export class SDKManager {
  private sdk: NodashSDK | null = null;
  private configManager: ConfigManager;

  constructor(configManager?: ConfigManager) {
    this.configManager = configManager || new ConfigManager();
  }

  async getSDK(): Promise<NodashSDK> {
    if (!this.sdk) {
      try {
        const config = await this.configManager.getSDKConfig();
        this.sdk = new NodashSDK(config.token, {
          baseUrl: config.baseUrl,
          timeout: config.timeout,
          retries: config.retries
        });
      } catch (error) {
        throw new ConfigurationError(
          error instanceof Error ? error.message : 'Failed to initialize SDK'
        );
      }
    }
    return this.sdk;
  }

  async trackEvent(
    event: string, 
    properties: Record<string, any> = {}
  ): Promise<APIResponse<{ success: boolean }>> {
    try {
      const sdk = await this.getSDK();
      return await sdk.track(event, properties);
    } catch (error) {
      throw this.transformError(error, 'tracking event');
    }
  }

  async sendMetric(
    name: string, 
    value: number, 
    options: { unit?: string; tags?: Record<string, string> } = {}
  ): Promise<APIResponse<{ success: boolean }>> {
    try {
      const sdk = await this.getSDK();
      return await sdk.sendMetric(name, value, options);
    } catch (error) {
      throw this.transformError(error, 'sending metric');
    }
  }

  async checkHealth(): Promise<{ status: string }> {
    try {
      const sdk = await this.getSDK();
      return await sdk.monitoring.getHealth();
    } catch (error) {
      throw this.transformError(error, 'checking health');
    }
  }

  // Transform SDK errors into CLI-friendly errors with helpful messages
  private transformError(error: unknown, context: string): Error {
    if (error instanceof NodashAPIError) {
      return new APIError(error.message, error.status || 500, context);
    } else if (error instanceof Error) {
      // Check for common network errors
      if (error.message.includes('fetch')) {
        return new NetworkError(
          'Unable to connect to Nodash API. Check your internet connection and baseUrl configuration.',
          context
        );
      }
      return new CLIError(error.message, context);
    } else {
      return new CLIError(`Unknown error occurred while ${context}`, context);
    }
  }

  // Reset SDK instance (useful for config changes)
  reset(): void {
    this.sdk = null;
  }
}

// Custom error classes for better error handling
export class CLIError extends Error {
  constructor(message: string, public context: string) {
    super(message);
    this.name = 'CLIError';
  }
}

export class ConfigurationError extends CLIError {
  constructor(message: string) {
    super(message, 'configuration');
    this.name = 'ConfigurationError';
  }
}

export class APIError extends CLIError {
  constructor(message: string, public status: number, context: string) {
    super(message, context);
    this.name = 'APIError';
  }
}

export class NetworkError extends CLIError {
  constructor(message: string, context: string) {
    super(message, context);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, context: string) {
    super(message, context);
    this.name = 'ValidationError';
  }
}