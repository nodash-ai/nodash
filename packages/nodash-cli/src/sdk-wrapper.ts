import { NodashSDK } from '@nodash/sdk';
import { ConfigManager } from './config';

export class SDKWrapper {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = new ConfigManager();
  }

  createSDK(): NodashSDK {
    const config = this.configManager.getConfig();
    
    if (!config.baseUrl) {
      throw new Error(
        'No base URL configured. Run "nodash config set baseUrl <url>" first.'
      );
    }

    return new NodashSDK(config.baseUrl, config.apiToken);
  }

  async track(event: string, properties?: Record<string, any>): Promise<void> {
    const sdk = this.createSDK();
    await sdk.track(event, properties);
  }

  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    const sdk = this.createSDK();
    await sdk.identify(userId, traits);
  }

  async health() {
    const sdk = this.createSDK();
    return await sdk.health();
  }
}