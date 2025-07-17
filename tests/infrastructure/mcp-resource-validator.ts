import { MCPServerManager } from './mcp-server-manager';

export interface MCPResourceValidationConfig {
  timeout?: number;
  enableLogging?: boolean;
  validateContent?: boolean;
  validateMimeTypes?: boolean;
}

export interface MCPResourceValidationResult {
  valid: boolean;
  uri: string;
  exists: boolean;
  accessible: boolean;
  contentValid?: boolean;
  mimeTypeValid?: boolean;
  content?: string;
  mimeType?: string;
  size?: number;
  errors: string[];
  duration: number;
}

export interface MCPResourceListResult {
  success: boolean;
  resources: Array<{
    uri: string;
    name: string;
    description: string;
    mimeType: string;
  }>;
  count: number;
  errors: string[];
  duration: number;
}

export interface MCPRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPResourceValidator {
  private serverManager: MCPServerManager;
  private config: MCPResourceValidationConfig;
  private messageId: number = 1;

  constructor(serverManager: MCPServerManager, config: Partial<MCPResourceValidationConfig> = {}) {
    this.serverManager = serverManager;
    this.config = {
      timeout: 30000,
      enableLogging: false,
      validateContent: true,
      validateMimeTypes: true,
      ...config
    };
  }

  async listResources(serverId: string): Promise<MCPResourceListResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.sendRequest(serverId, 'resources/list');
      const duration = Date.now() - startTime;

      if (response.error) {
        return {
          success: false,
          resources: [],
          count: 0,
          errors: [response.error.message],
          duration
        };
      }

      const resources = response.result?.resources || [];
      
      return {
        success: true,
        resources: resources.map((r: any) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        })),
        count: resources.length,
        errors: [],
        duration
      };
    } catch (error) {
      return {
        success: false,
        resources: [],
        count: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        duration: Date.now() - startTime
      };
    }
  }

  async validateResource(serverId: string, uri: string): Promise<MCPResourceValidationResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.sendRequest(serverId, 'resources/read', { uri });
      const duration = Date.now() - startTime;

      if (response.error) {
        return {
          valid: false,
          uri,
          exists: false,
          accessible: false,
          errors: [response.error.message],
          duration
        };
      }

      const contents = response.result?.contents || [];
      if (contents.length === 0) {
        return {
          valid: false,
          uri,
          exists: true,
          accessible: false,
          errors: ['No content returned'],
          duration
        };
      }

      const content = contents[0];
      const result: MCPResourceValidationResult = {
        valid: true,
        uri,
        exists: true,
        accessible: true,
        content: content.text,
        mimeType: content.mimeType,
        size: content.text?.length || 0,
        errors: [],
        duration
      };

      // Validate content if enabled
      if (this.config.validateContent) {
        const contentValidation = this.validateResourceContent(uri, content.text, content.mimeType);
        result.contentValid = contentValidation.valid;
        if (!contentValidation.valid) {
          result.errors.push(...contentValidation.errors);
          result.valid = false;
        }
      }

      // Validate MIME type if enabled
      if (this.config.validateMimeTypes) {
        const mimeTypeValidation = this.validateMimeType(uri, content.mimeType);
        result.mimeTypeValid = mimeTypeValidation.valid;
        if (!mimeTypeValidation.valid) {
          result.errors.push(...mimeTypeValidation.errors);
          result.valid = false;
        }
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        uri,
        exists: false,
        accessible: false,
        errors: [error instanceof Error ? error.message : String(error)],
        duration: Date.now() - startTime
      };
    }
  }

  async validateAllResources(serverId: string): Promise<{
    overall: boolean;
    resources: MCPResourceValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      accessible: number;
      inaccessible: number;
    };
  }> {
    // First, list all resources
    const resourceList = await this.listResources(serverId);
    
    if (!resourceList.success) {
      return {
        overall: false,
        resources: [],
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          accessible: 0,
          inaccessible: 0
        }
      };
    }

    // Validate each resource
    const validationPromises = resourceList.resources.map(resource => 
      this.validateResource(serverId, resource.uri)
    );

    const validationResults = await Promise.all(validationPromises);

    const summary = {
      total: validationResults.length,
      valid: validationResults.filter(r => r.valid).length,
      invalid: validationResults.filter(r => !r.valid).length,
      accessible: validationResults.filter(r => r.accessible).length,
      inaccessible: validationResults.filter(r => !r.accessible).length
    };

    return {
      overall: summary.valid === summary.total && summary.total > 0,
      resources: validationResults,
      summary
    };
  }

  async validateDocumentationResources(serverId: string): Promise<{
    sdkDocs: MCPResourceValidationResult;
    cliDocs: MCPResourceValidationResult;
    overall: boolean;
  }> {
    const [sdkResult, cliResult] = await Promise.all([
      this.validateResource(serverId, 'nodash://docs/sdk'),
      this.validateResource(serverId, 'nodash://docs/cli')
    ]);

    return {
      sdkDocs: sdkResult,
      cliDocs: cliResult,
      overall: sdkResult.valid && cliResult.valid
    };
  }

  async validateResourceUriFormats(serverId: string): Promise<{
    validUris: Array<{ uri: string; result: MCPResourceValidationResult }>;
    invalidUris: Array<{ uri: string; result: MCPResourceValidationResult }>;
    overall: boolean;
  }> {
    const testUris = [
      // Valid URIs
      'nodash://docs/sdk',
      'nodash://docs/cli',
      
      // Invalid URIs
      'nodash://docs/invalid',
      'invalid://scheme/test',
      'nodash://invalid/path',
      '',
      'not-a-uri',
      'nodash://',
      'nodash://docs/',
    ];

    const validationPromises = testUris.map(async (uri) => ({
      uri,
      result: await this.validateResource(serverId, uri)
    }));

    const results = await Promise.all(validationPromises);

    const validUris = results.filter(r => r.result.valid);
    const invalidUris = results.filter(r => !r.result.valid);

    return {
      validUris,
      invalidUris,
      overall: validUris.length >= 2 && invalidUris.length >= 5 // Expect at least 2 valid, 5+ invalid
    };
  }

  async testResourcePerformance(serverId: string, iterations: number = 10): Promise<{
    listResources: { averageTime: number; minTime: number; maxTime: number };
    readResource: { averageTime: number; minTime: number; maxTime: number };
    overall: boolean;
  }> {
    const listTimes: number[] = [];
    const readTimes: number[] = [];

    // Test list resources performance
    for (let i = 0; i < iterations; i++) {
      const result = await this.listResources(serverId);
      listTimes.push(result.duration);
    }

    // Test read resource performance
    for (let i = 0; i < iterations; i++) {
      const result = await this.validateResource(serverId, 'nodash://docs/sdk');
      readTimes.push(result.duration);
    }

    const listStats = this.calculateStats(listTimes);
    const readStats = this.calculateStats(readTimes);

    return {
      listResources: listStats,
      readResource: readStats,
      overall: listStats.averageTime < 5000 && readStats.averageTime < 5000 // Under 5 seconds
    };
  }

  private async sendRequest(
    serverId: string, 
    method: string, 
    params?: any
  ): Promise<MCPResponse> {
    const server = this.serverManager.getServer(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method,
      params: params || {}
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      let responseData = '';

      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        try {
          const lines = responseData.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              server.process.stdout?.off('data', onData);
              resolve(response);
              return;
            }
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      server.process.stdout?.on('data', onData);
      
      if (server.process.stdin) {
        server.process.stdin.write(JSON.stringify(request) + '\n');
      } else {
        clearTimeout(timeout);
        reject(new Error('Server stdin not available'));
      }
    });
  }

  private validateResourceContent(uri: string, content: string, mimeType: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic content validation
    if (!content || content.trim().length === 0) {
      errors.push('Content is empty');
    }

    // URI-specific validation
    if (uri.includes('docs/sdk')) {
      if (!content.includes('@nodash/sdk')) {
        errors.push('SDK documentation should contain @nodash/sdk');
      }
      if (!content.includes('NodashSDK')) {
        errors.push('SDK documentation should contain NodashSDK class reference');
      }
    } else if (uri.includes('docs/cli')) {
      if (!content.includes('@nodash/cli')) {
        errors.push('CLI documentation should contain @nodash/cli');
      }
      if (!content.includes('nodash')) {
        errors.push('CLI documentation should contain nodash command references');
      }
    }

    // MIME type specific validation
    if (mimeType === 'text/markdown') {
      if (!content.includes('#')) {
        errors.push('Markdown content should contain headers');
      }
    }

    // Content size validation
    if (content.length < 100) {
      errors.push('Content seems too short for documentation');
    }

    if (content.length > 1000000) { // 1MB
      errors.push('Content seems too large');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateMimeType(uri: string, mimeType: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Expected MIME types for documentation
    const expectedMimeTypes = ['text/markdown', 'text/plain', 'application/json'];

    if (!mimeType) {
      errors.push('MIME type is missing');
    } else if (!expectedMimeTypes.includes(mimeType)) {
      errors.push(`Unexpected MIME type: ${mimeType}. Expected one of: ${expectedMimeTypes.join(', ')}`);
    }

    // URI-specific MIME type validation
    if (uri.includes('docs/')) {
      if (mimeType !== 'text/markdown') {
        errors.push('Documentation resources should have text/markdown MIME type');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private calculateStats(times: number[]): { averageTime: number; minTime: number; maxTime: number } {
    if (times.length === 0) {
      return { averageTime: 0, minTime: 0, maxTime: 0 };
    }

    const sum = times.reduce((a, b) => a + b, 0);
    return {
      averageTime: Math.round(sum / times.length),
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }
}