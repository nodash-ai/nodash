import { vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Create a temporary directory for test config files
const testConfigDir = path.join(os.tmpdir(), 'nodash-cli-test');

beforeEach(() => {
  // Clean up any existing test config
  if (fs.existsSync(testConfigDir)) {
    fs.rmSync(testConfigDir, { recursive: true });
  }
  fs.mkdirSync(testConfigDir, { recursive: true });
  
  // Mock the config directory to use our test directory
  vi.stubEnv('HOME', testConfigDir);
});