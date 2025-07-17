import { NodashTestServer } from '../test-server';

let testServer: NodashTestServer;

export async function setup() {
  console.log('Setting up E2E test server...');
  testServer = new NodashTestServer({ 
    port: 0, // Use dynamic port allocation
    enableLogging: true 
  });
  await testServer.start();
  console.log(`E2E test server started on port ${testServer.getPort()}`);
}

export async function teardown() {
  if (testServer) {
    await testServer.stop();
    console.log('E2E test server stopped');
  }
}

export function getTestServer(): NodashTestServer {
  if (!testServer) {
    throw new Error('Test server not initialized. Make sure setup() has been called.');
  }
  return testServer;
}