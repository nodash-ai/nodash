import * as path from 'path';
import * as fs from 'fs';

export function getDefaultRecordingsDir(): string {
  const projectRoot = findProjectRoot() || process.cwd();
  const recordingsDir = path.join(projectRoot, '.nodash', 'recordings');
  
  try {
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true, mode: 0o755 });
    }
  } catch (error) {
    // If directory creation fails, fall back to temp directory
    const tempDir = path.join(require('os').tmpdir(), 'nodash-recordings');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
    }
    return tempDir;
  }
  
  return recordingsDir;
}

export function generateRecordingFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/g, 'T').replace(/Z$/, 'Z');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${randomSuffix}.json`;
}

export function getDefaultRecordingPath(): string {
  const dir = getDefaultRecordingsDir();
  const filename = generateRecordingFilename();
  return path.join(dir, filename);
}

export function findProjectRoot(startPath: string = process.cwd()): string | null {
  let currentPath = startPath;
  
  while (currentPath !== path.dirname(currentPath)) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  
  return null;
}