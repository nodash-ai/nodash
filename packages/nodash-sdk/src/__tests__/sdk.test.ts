import { NodashSDK } from '../core/sdk';

describe('NodashSDK', () => {
  test('initializes without error', () => {
    const sdk = new NodashSDK();
    sdk.init('test-token');
    expect(sdk).toBeDefined();
  });
}); 