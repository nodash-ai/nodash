import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../services/config-manager.js';

export function createConfigCommand(): Command {
  const command = new Command('config');
  
  command
    .description('Manage Nodash CLI configuration');

  // config set command
  command
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key to set')
    .argument('<value>', 'Configuration value to set')
    .action(async (key: string, value: string) => {
      try {
        const configManager = new ConfigManager();
        await configManager.set(key, value);
        
        console.log(chalk.green(`✅ Configuration updated: ${key} = ${value}`));
        
        // Show validation warnings if any
        const validation = await configManager.validate();
        if (validation.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          validation.warnings.forEach(warning => {
            console.log(chalk.yellow(`   ${warning}`));
          });
        }
        
      } catch (error) {
        console.error(chalk.red('❌ Failed to set configuration:'));
        console.error(chalk.red(`   ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
    });

  // config get command
  command
    .command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key to get')
    .action(async (key: string) => {
      try {
        const configManager = new ConfigManager();
        const value = await configManager.get(key);
        
        if (value === undefined) {
          console.log(chalk.yellow(`Configuration key '${key}' is not set`));
        } else {
          // Mask sensitive values
          const config = await configManager.getAll();
          const masked = configManager.getMaskedConfig(config);
          console.log(`${key}: ${masked[key] || value}`);
        }
        
      } catch (error) {
        console.error(chalk.red('❌ Failed to get configuration:'));
        console.error(chalk.red(`   ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
    });

  // config list command
  command
    .command('list')
    .description('List all configuration values')
    .option('--format <format>', 'Output format (table, json)', 'table')
    .action(async (options: { format: string }) => {
      try {
        const configManager = new ConfigManager();
        const config = await configManager.getAll();
        const masked = configManager.getMaskedConfig(config);
        
        if (options.format === 'json') {
          console.log(JSON.stringify(masked, null, 2));
        } else {
          // Table format
          console.log(chalk.bold.blue('📋 Nodash CLI Configuration'));
          console.log(chalk.gray('─'.repeat(50)));
          
          if (Object.keys(config).length === 0) {
            console.log(chalk.gray('No configuration set'));
            console.log(chalk.yellow('💡 Set your API token: nodash config set token <your-token>'));
          } else {
            Object.entries(masked).forEach(([key, value]) => {
              if (value) {
                console.log(`${chalk.bold(key.padEnd(15))}: ${chalk.cyan(value)}`);
              }
            });
          }
        }
        
        // Show validation status
        const validation = await configManager.validate();
        if (!validation.valid || validation.warnings.length > 0) {
          console.log('');
          
          if (validation.errors.length > 0) {
            console.log(chalk.red('❌ Configuration Errors:'));
            validation.errors.forEach(error => {
              console.log(chalk.red(`   ${error}`));
            });
          }
          
          if (validation.warnings.length > 0) {
            console.log(chalk.yellow('⚠️  Configuration Warnings:'));
            validation.warnings.forEach(warning => {
              console.log(chalk.yellow(`   ${warning}`));
            });
          }
        } else {
          console.log(chalk.green('\n✅ Configuration is valid'));
        }
        
      } catch (error) {
        console.error(chalk.red('❌ Failed to list configuration:'));
        console.error(chalk.red(`   ${error instanceof Error ? error.message : error}`));
        process.exit(1);
      }
    });

  return command;
}