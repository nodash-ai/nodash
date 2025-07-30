import { NodashSDK, QueryOptions, UserQueryOptions, QueryResult, UserQueryResult } from '@nodash/sdk';
import { ConfigManager } from './config';

export class SDKWrapper {
  private configManager: ConfigManager;
  private sdk?: NodashSDK;

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

  private getSDK(): NodashSDK {
    if (!this.sdk) {
      this.sdk = this.createSDK();
    }
    return this.sdk;
  }

  async track(event: string, properties?: Record<string, any>): Promise<any> {
    const sdk = this.getSDK();
    return await sdk.track(event, properties);
  }

  async identify(userId: string, traits?: Record<string, any>): Promise<any> {
    const sdk = this.getSDK();
    return await sdk.identify(userId, traits);
  }

  async health(): Promise<any> {
    const sdk = this.createSDK();
    return await sdk.health();
  }



  async queryEvents(options: QueryOptions): Promise<QueryResult> {
    const sdk = this.createSDK();
    return await sdk.queryEvents(options);
  }

  async queryUsers(options: UserQueryOptions): Promise<UserQueryResult> {
    const sdk = this.createSDK();
    return await sdk.queryUsers(options);
  }
}