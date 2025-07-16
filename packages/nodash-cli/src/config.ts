import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CliConfig {
  baseUrl?: string;
  apiToken?: string;
  environment?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.nodash');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

  getConfig(): CliConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const content = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      // If config is corrupted, return empty config
    }
    return {};
  }

  setConfig(config: Partial<CliConfig>): void {
    this.ensureConfigDir();
    const currentConfig = this.getConfig();
    const newConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
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