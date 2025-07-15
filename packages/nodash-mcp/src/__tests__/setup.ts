// Jest setup file for MCP CLI integration tests

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Only show console output if explicitly enabled
  if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';

// Global mocks for common modules
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

// Helper function to create mock CLI results
global.createMockCLIResult = (overrides = {}) => ({
  success: true,
  output: 'Mock output',
  exitCode: 0,
  executedCommand: 'mock command',
  duration: 100,
  ...overrides
});

// Helper function to create mock commands
global.createMockCommand = (overrides = {}) => ({
  command: 'config',
  args: ['list'],
  options: {},
  ...overrides
});

// Declare global types for TypeScript
declare global {
  function createMockCLIResult(overrides?: any): any;
  function createMockCommand(overrides?: any): any;
}