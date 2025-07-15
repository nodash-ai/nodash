import { spawn } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';

export interface CLIEnvironment {
  cliPath: string;
  version: string | null;
  available: boolean;
  installationPath?: string;
  nodeVersion?: string;
  npmVersion?: string;
}

export interface EnvironmentConfig {
  cliPath?: string;
  timeout?: number;
  maxRetries?: number;
  environment?: 'development' | 'staging' | 'production';
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export interface CompatibilityCheck {
  compatible: boolean;
  version: string | null;
  requiredVersion: string;
  issues: string[];
  recommendations: string[];
}

export class EnvironmentManager {
  private cliEnvironment: CLIEnvironment | null = null;
  private config: EnvironmentConfig;
  private readonly REQUIRED_CLI_VERSION = '1.0.0';
  private readonly REQUIRED_NODE_VERSION = '18.0.0';

  constructor(config: EnvironmentConfig = {}) {
    this.config = {
      cliPath: config.cliPath || 'nodash',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      environment: config.environment || 'development',
      logLevel: config.logLevel || 'info',
      ...config
    };
  }

  async initializeEnvironment(): Promise<CLIEnvironment> {
    if (this.cliEnvironment) {
      return this.cliEnvironment;
    }

    this.log('info', 'Initializing CLI environment...');

    const environment: CLIEnvironment = {
      cliPath: this.config.cliPath!,
      version: null,
      available: false
    };

    try {
      // Check if CLI is available
      const available = await this.checkCLIAvailability();
      environment.available = available;

      if (available) {
        // Get CLI version
        environment.version = await this.getCLIVersion();

        // Get installation path
        environment.installationPath = await this.getCLIPath();

        // Get Node.js version
        environment.nodeVersion = await this.getNodeVersion();

        // Get npm version
        environment.npmVersion = await this.getNpmVersion();

        this.log('info', `CLI environment initialized: ${environment.version} at ${environment.installationPath}`);
      } else {
        this.log('warn', 'CLI not available in environment');
      }
    } catch (error) {
      this.log('error', `Failed to initialize CLI environment: ${error}`);
      environment.available = false;
    }

    this.cliEnvironment = environment;
    return environment;
  }

  async checkCompatibility(): Promise<CompatibilityCheck> {
    const environment = await this.initializeEnvironment();
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!environment.available) {
      issues.push('Nodash CLI is not installed or not accessible');
      recommendations.push('Install CLI: npm install -g @nodash/cli');

      return {
        compatible: false,
        version: null,
        requiredVersion: this.REQUIRED_CLI_VERSION,
        issues,
        recommendations
      };
    }

    // Check CLI version
    if (environment.version) {
      const compatible = this.isVersionCompatible(environment.version, this.REQUIRED_CLI_VERSION);
      if (!compatible) {
        issues.push(`CLI version ${environment.version} is below required ${this.REQUIRED_CLI_VERSION}`);
        recommendations.push('Update CLI: npm update -g @nodash/cli');
      }
    } else {
      issues.push('Could not determine CLI version');
      recommendations.push('Reinstall CLI: npm install -g @nodash/cli');
    }

    // Check Node.js version
    if (environment.nodeVersion) {
      const nodeCompatible = this.isVersionCompatible(environment.nodeVersion, this.REQUIRED_NODE_VERSION);
      if (!nodeCompatible) {
        issues.push(`Node.js version ${environment.nodeVersion} is below required ${this.REQUIRED_NODE_VERSION}`);
        recommendations.push('Update Node.js to version 18 or higher');
      }
    }

    return {
      compatible: issues.length === 0,
      version: environment.version,
      requiredVersion: this.REQUIRED_CLI_VERSION,
      issues,
      recommendations
    };
  }

  async detectCLIPath(): Promise<string[]> {
    const possiblePaths = [
      'nodash',
      join(homedir(), '.npm-global', 'bin', 'nodash'),
      join(homedir(), '.local', 'bin', 'nodash'),
      '/usr/local/bin/nodash',
      '/usr/bin/nodash'
    ];

    const availablePaths: string[] = [];

    for (const path of possiblePaths) {
      try {
        const available = await this.testCLIPath(path);
        if (available) {
          availablePaths.push(path);
        }
      } catch {
        // Path not available, continue
      }
    }

    return availablePaths;
  }

  async validateEnvironment(): Promise<{
    valid: boolean;
    environment: CLIEnvironment;
    compatibility: CompatibilityCheck;
    issues: string[];
    recommendations: string[];
  }> {
    const environment = await this.initializeEnvironment();
    const compatibility = await this.checkCompatibility();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Collect all issues
    if (!environment.available) {
      issues.push('CLI not available');
    }

    issues.push(...compatibility.issues);
    recommendations.push(...compatibility.recommendations);

    // Additional environment checks
    if (environment.available && !environment.version) {
      issues.push('CLI version could not be determined');
      recommendations.push('Reinstall CLI to ensure proper installation');
    }

    return {
      valid: issues.length === 0,
      environment,
      compatibility,
      issues,
      recommendations
    };
  }

  getEnvironment(): CLIEnvironment | null {
    return this.cliEnvironment;
  }

  updateConfig(newConfig: Partial<EnvironmentConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reset environment if CLI path changed
    if (newConfig.cliPath && newConfig.cliPath !== this.config.cliPath) {
      this.cliEnvironment = null;
    }
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  private async checkCLIAvailability(): Promise<boolean> {
    try {
      const result = await this.executeCommand(this.config.cliPath!, ['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  private async getCLIVersion(): Promise<string | null> {
    try {
      const result = await this.executeCommand(this.config.cliPath!, ['--version']);
      if (result.exitCode === 0 && result.stdout) {
        // Extract version from output (e.g., "1.0.1" from "@nodash/cli@1.0.1")
        const versionMatch = result.stdout.match(/(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : null;
      }
    } catch {
      // Version check failed
    }
    return null;
  }

  private async getCLIPath(): Promise<string | undefined> {
    try {
      const result = await this.executeCommand('which', [this.config.cliPath!]);
      return result.exitCode === 0 ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  private async getNodeVersion(): Promise<string | undefined> {
    try {
      const result = await this.executeCommand('node', ['--version']);
      if (result.exitCode === 0 && result.stdout) {
        // Remove 'v' prefix if present
        return result.stdout.trim().replace(/^v/, '');
      }
    } catch {
      // Node version check failed
    }
    return undefined;
  }

  private async getNpmVersion(): Promise<string | undefined> {
    try {
      const result = await this.executeCommand('npm', ['--version']);
      return result.exitCode === 0 ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }

  private async testCLIPath(path: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(path, ['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  private async executeCommand(
    command: string,
    args: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out: ${command} ${args.join(' ')}`));
      }, 5000); // 5 second timeout for environment checks

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private isVersionCompatible(current: string, required: string): boolean {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;

      if (currentPart > requiredPart) {
        return true;
      } else if (currentPart < requiredPart) {
        return false;
      }
    }

    return true; // Versions are equal
  }

  private log(level: string, message: string): void {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.config.logLevel!);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}

/**
 * Configuration migration utilities
 */
export class ConfigurationMigrator {
  private readonly MIGRATION_HISTORY_KEY = 'nodash_mcp_migrations';

  async migrateConfiguration(
    currentVersion: string,
    targetVersion: string,
    configPath: string
  ): Promise<{
    success: boolean;
    migrationsApplied: string[];
    errors: string[];
  }> {
    const migrationsApplied: string[] = [];
    const errors: string[] = [];

    try {
      // Get migration history
      const history = this.getMigrationHistory();

      // Determine which migrations to apply
      const migrations = this.getMigrationsToApply(currentVersion, targetVersion, history);

      for (const migration of migrations) {
        try {
          await this.applyMigration(migration, configPath);
          migrationsApplied.push(migration.version);
          this.recordMigration(migration.version);
        } catch (error) {
          errors.push(`Migration ${migration.version} failed: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        migrationsApplied,
        errors
      };
    } catch (error) {
      return {
        success: false,
        migrationsApplied,
        errors: [`Migration process failed: ${error}`]
      };
    }
  }

  private getMigrationHistory(): string[] {
    try {
      const history = process.env[this.MIGRATION_HISTORY_KEY];
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  private recordMigration(version: string): void {
    const history = this.getMigrationHistory();
    if (!history.includes(version)) {
      history.push(version);
      process.env[this.MIGRATION_HISTORY_KEY] = JSON.stringify(history);
    }
  }

  private getMigrationsToApply(
    currentVersion: string,
    targetVersion: string,
    history: string[]
  ): Array<{ version: string; apply: (configPath: string) => Promise<void> }> {
    // Define available migrations
    const availableMigrations = [
      {
        version: '1.0.1',
        apply: this.migrate_1_0_1.bind(this)
      },
      {
        version: '1.1.0',
        apply: this.migrate_1_1_0.bind(this)
      }
    ];

    // Filter migrations that need to be applied
    return availableMigrations.filter(migration => {
      return !history.includes(migration.version) &&
        this.shouldApplyMigration(migration.version, currentVersion, targetVersion);
    });
  }

  private shouldApplyMigration(migrationVersion: string, currentVersion: string, targetVersion: string): boolean {
    // Simple version comparison - in production this would be more sophisticated
    return migrationVersion > currentVersion && migrationVersion <= targetVersion;
  }

  private async applyMigration(
    migration: { version: string; apply: (configPath: string) => Promise<void> },
    configPath: string
  ): Promise<void> {
    console.log(`Applying migration ${migration.version}...`);
    await migration.apply(configPath);
    console.log(`Migration ${migration.version} completed`);
  }

  private async migrate_1_0_1(configPath: string): Promise<void> {
    // Example migration: Add new configuration fields
    console.log('Migration 1.0.1: Adding performance configuration');
    // Implementation would modify config files
  }

  private async migrate_1_1_0(configPath: string): Promise<void> {
    // Example migration: Update security settings
    console.log('Migration 1.1.0: Updating security configuration');
    // Implementation would modify config files
  }
}

/**
 * Factory function to create environment manager with default settings
 */
export function createEnvironmentManager(config?: EnvironmentConfig): EnvironmentManager {
  return new EnvironmentManager(config);
}

/**
 * Utility function to perform a quick environment check
 */
export async function quickEnvironmentCheck(): Promise<{
  cliAvailable: boolean;
  version: string | null;
  compatible: boolean;
  issues: string[];
}> {
  const manager = createEnvironmentManager();
  const validation = await manager.validateEnvironment();

  return {
    cliAvailable: validation.environment.available,
    version: validation.environment.version,
    compatible: validation.compatibility.compatible,
    issues: validation.issues
  };
}