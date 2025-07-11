import { NodashSDK } from '../index';

describe('NodashSDK', () => {
  test('initializes without error', () => {
    const sdk = new NodashSDK('test-token', {
      baseUrl: 'https://api.nodash.ai'
    });
    expect(sdk).toBeDefined();
  });
}); 