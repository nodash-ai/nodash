export class HttpClient {
  private baseUrl: string;
  private apiToken?: string;
  private tenantId?: string;
  private customHeaders?: Record<string, string>;

  constructor(baseUrl: string, apiToken?: string, customHeaders?: Record<string, string>) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.apiToken = apiToken;
    this.customHeaders = customHeaders;
    
    // Auto-derive tenantId from API key if available
    if (apiToken) {
      // Extract tenant from API keys like "demo-api-key-tenant1" -> "tenant1"
      const match = apiToken.match(/tenant(\d+)$/);
      if (match) {
        this.tenantId = `tenant${match[1]}`;
      }
    }
  }

  async post(endpoint: string, data: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }

    // Add custom headers
    if (this.customHeaders) {
      Object.assign(headers, this.customHeaders);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async get(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    }

    if (this.tenantId) {
      headers['x-tenant-id'] = this.tenantId;
    }

    // Add custom headers
    if (this.customHeaders) {
      Object.assign(headers, this.customHeaders);
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }
}