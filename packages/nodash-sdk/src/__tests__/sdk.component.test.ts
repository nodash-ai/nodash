/**
 * @vitest-environment happy-dom
 */

import { NodashSDK } from '../index';
import { vi, describe, it, expect, beforeEach } from 'vitest';

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
    ok: true,
    status: 200,
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic',
    url: '',
    clone: () => this,
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    text: () => Promise.resolve(''),
  } as unknown as Response)
);

describe('NodashSDK Component Test', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockClear();
  });

  it('should initialize with a token', () => {
    const sdk = new NodashSDK('test-token');
    expect(sdk).toBeInstanceOf(NodashSDK);
  });

  it('should throw an error if token is missing', () => {
    // @ts-ignore
    expect(() => new NodashSDK(null)).toThrow('Nodash SDK: Missing authentication token');
  });

  it('should make a request to the correct endpoint when track is called', async () => {
    const sdk = new NodashSDK('test-token', { baseUrl: 'http://localhost:3001' });
    await sdk.track('test_event', { foo: 'bar' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const url = fetchCall[0].toString();
    const options = fetchCall[1];

    expect(url).toBe('http://localhost:3001/api-server/events');
    expect(options?.method).toBe('POST');
    expect((options?.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
    
    if (!options?.body) {
      throw new Error('Request body is missing');
    }
    const body = JSON.parse(options.body as string);
    expect(body.event).toBe('test_event');
    expect(body.properties).toEqual({ foo: 'bar' });
  });
}); 