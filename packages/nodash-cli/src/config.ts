import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  baseUrl?: string;
  apiToken?: string;
  environment?: string;
}

export class ConfigManager {
  private getConfigDir(): string {
    return process.env.NODASH_CONFIG_DIR || path.join(os.homedir(), '.nodash');
  }

  private getConfigFile(): string {
    return path.join(this.getConfigDir(), 'config.json');
  }

  private ensureConfigDir(): void {
    const configDir = this.getConfigDir();
    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
      }
    } catch (error) {
      throw new Error(`Failed to create configuration directory '${configDir}': ${error instanceof Error ? error.message : error}`);
    }
  }

  getConfig(): CliConfig {
    try {
      const configFile = this.getConfigFile();
      if (fs.existsSync(configFile)) {
        const content = fs.readFileSync(configFile, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      // If config is corrupted, return empty config
    }
    return {};
  }

  setConfig(config: Partial<CliConfig>): void {
    try {
      this.ensureConfigDir();
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      const configFile = this.getConfigFile();
      fs.writeFileSync(configFile, JSON.stringify(newConfig, null, 2), { mode: 0o600 });
    } catch (error) {
      const configDir = this.getConfigDir();
      throw new Error(`Failed to write configuration to '${configDir}': ${error instanceof Error ? error.message : error}`);
    }
  }

  getConfigValue(key: keyof CliConfig): string | undefined {
    const config = this.getConfig();
    return config[key];
  }

  setConfigValue(key: keyof CliConfig, value: string): void {
    const config = this.getConfig();
    config[key] = value;
    this.setConfig(config);
  }
}