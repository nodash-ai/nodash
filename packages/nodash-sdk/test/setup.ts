import { vi } from 'vitest';

// Mock fetch for testing
global.fetch = vi.fn();

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});