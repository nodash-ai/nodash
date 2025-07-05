import { readFile, access } from 'fs/promises';
import { join } from 'path';
import type { PackageJson } from '../types.js';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function readPackageJson(projectRoot: string): Promise<PackageJson | null> {
  const packageJsonPath = join(projectRoot, 'package.json');
  return readJsonFile<PackageJson>(packageJsonPath);
}

export async function detectPackageManager(projectRoot: string): Promise<string> {
  // Check for lock files to determine package manager
  if (await fileExists(join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }
  if (await fileExists(join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (await fileExists(join(projectRoot, 'package-lock.json'))) {
    return 'npm';
  }
  
  // Default to npm if package.json exists
  if (await fileExists(join(projectRoot, 'package.json'))) {
    return 'npm';
  }
  
  return 'unknown';
} 