import { NodashSDK } from '../index';
import { describe, test, expect } from 'vitest';

describe('NodashSDK', () => {
  test('initializes without error', () => {
    const sdk = new NodashSDK('test-token');
    expect(sdk).toBeDefined();
  });
}); 