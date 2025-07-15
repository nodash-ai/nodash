import { APIResponse, SDKConfig } from './types/index.js';

class NodashSDK {
  private config: Omit<SDKConfig, 'token'>;
  private token: string;
  private apiBaseUrl: string;

  constructor(token: string, config: Partial<Omit<SDKConfig, 'token'>> = {}) {
    if (!token) {
      throw new Error('Nodash SDK: Missing authentication token');
    }
    
    this.token = token;
    
    this.config = {
      timeout: 30000,
      retries: 3,
      ...config
    };

    this.apiBaseUrl = this.config.baseUrl || 'https://api.nodash.ai';
  }

  private async request(endpoint: string, method: 'GET' | 'POST', body?: Record<string, any>): Promise<any> {
    const url = `${this.apiBaseUrl}/api-server${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Nodash API Error: ${errorData.message || response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Nodash SDK Error:', error);
      throw error;
    }
  }

  /**
   * Tracks a single event.
   * @param event The name of the event.
   * @param properties A dictionary of properties for the event.
   */
  public async track(event: string, properties: Record<string, any> = {}): Promise<APIResponse<{ success: boolean }>> {
    const payload = {
      event,
      properties,
      timestamp: new Date().toISOString(),
    };
    return this.request('/events', 'POST', payload);
  }

  public async sendMetric(name: string, value: number, options: { unit?: string; tags?: Record<string, string> } = {}): Promise<APIResponse<{ success: boolean }>> {
    const metricData = {
      name,
      value,
      unit: options.unit,
      tags: options.tags,
      timestamp: new Date().toISOString()
    };
    return this.request('/metrics', 'POST', metricData);
  }
  
  public get monitoring() {
    // This is a simplified getter for now.
    // In a real scenario, this would interact with a monitoring client.
    return {
      getHealth: async (): Promise<{ status: string }> => {
        return this.request('/health', 'GET');
      }
    };
  }
}

export { NodashSDK };
export * from './types/index.js';
