import { Command } from 'commander';
import chalk from 'chalk';
import { SDKManager, ConfigurationError, APIError, NetworkError, ValidationError } from '../services/sdk-manager.js';

export function createMetricCommand(): Command {
  const command = new Command('metric');
  
  command
    .description('Send a metric to Nodash monitoring')
    .argument('<name>', 'Metric name')
    .argument('<value>', 'Metric value (number)')
    .option('-u, --unit <unit>', 'Metric unit (e.g., ms, bytes, count)')
    .option('-t, --tags <tags>', 'Metric tags as comma-separated key=value pairs')
    .option('--dry-run', 'Show what would be sent without actually sending')
    .option('--format <format>', 'Output format (json, table)', 'table')
    .action(async (name: string, valueStr: string, options: {
      unit?: string;
      tags?: string;
      dryRun?: boolean;
      format: string;
    }) => {
      try {
        // Validate metric name
        if (!name || name.trim().length === 0) {
          throw new ValidationError('Metric name cannot be empty', 'metric');
        }

        // Validate and parse value
        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          throw new ValidationError(`Metric value must be a number, got: ${valueStr}`, 'metric');
        }

        // Parse tags if provided
        let tags: Record<string, string> = {};
        if (options.tags) {
          try {
            const tagPairs = options.tags.split(',');
            for (const pair of tagPairs) {
              const [key, val] = pair.split('=');
              if (!key || !val) {
                throw new Error(`Invalid tag format: ${pair}`);
              }
              tags[key.trim()] = val.trim();
            }
          } catch (parseError) {
            throw new ValidationError(
              `Invalid tags format: ${parseError instanceof Error ? parseError.message : parseError}. Use format: key1=value1,key2=value2`,
              'metric'
            );
          }
        }

        // Prepare metric data
        const metricData = {
          name: name.trim(),
          value,
          unit: options.unit,
          tags: Object.keys(tags).length > 0 ? tags : undefined,
          timestamp: new Date().toISOString()
        };

        // Dry run mode - show what would be sent
        if (options.dryRun) {
          console.log(chalk.yellow('🔍 Dry Run Mode - Metric would be sent:'));
          console.log(chalk.gray('─'.repeat(50)));
          
          if (options.format === 'json') {
            console.log(JSON.stringify(metricData, null, 2));
          } else {
            console.log(`${chalk.bold('Name:')} ${chalk.cyan(metricData.name)}`);
            console.log(`${chalk.bold('Value:')} ${chalk.white(metricData.value)}`);
            console.log(`${chalk.bold('Unit:')} ${chalk.gray(metricData.unit || 'None')}`);
            console.log(`${chalk.bold('Timestamp:')} ${chalk.gray(metricData.timestamp)}`);
            
            if (metricData.tags && Object.keys(metricData.tags).length > 0) {
              console.log(`${chalk.bold('Tags:')}`);
              Object.entries(metricData.tags).forEach(([key, value]) => {
                console.log(`  ${chalk.cyan(key)}: ${chalk.white(value)}`);
              });
            } else {
              console.log(`${chalk.bold('Tags:')} ${chalk.gray('None')}`);
            }
          }
          
          console.log(chalk.yellow('\n💡 Remove --dry-run to actually send this metric'));
          return;
        }

        // Actually send the metric
        const sdkManager = new SDKManager();
        
        console.log(chalk.blue('📊 Sending metric...'));
        const response = await sdkManager.sendMetric(name.trim(), value, {
          unit: options.unit,
          tags
        });
        
        // Display success
        if (options.format === 'json') {
          console.log(JSON.stringify({
            success: true,
            metric: metricData,
            response: response
          }, null, 2));
        } else {
          console.log(chalk.green('✅ Metric sent successfully!'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.bold('Name:')} ${chalk.cyan(metricData.name)}`);
          console.log(`${chalk.bold('Value:')} ${chalk.white(metricData.value)}`);
          console.log(`${chalk.bold('Unit:')} ${chalk.gray(metricData.unit || 'None')}`);
          console.log(`${chalk.bold('Timestamp:')} ${chalk.gray(metricData.timestamp)}`);
          
          if (metricData.tags && Object.keys(metricData.tags).length > 0) {
            console.log(`${chalk.bold('Tags:')}`);
            Object.entries(metricData.tags).forEach(([key, value]) => {
              console.log(`  ${chalk.cyan(key)}: ${chalk.white(value)}`);
            });
          }
        }

      } catch (error) {
        handleMetricError(error);
        process.exit(1);
      }
    });

  return command;
}

function handleMetricError(error: unknown): void {
  if (error instanceof ConfigurationError) {
    console.error(chalk.red('❌ Configuration Error:'));
    console.error(chalk.red(`   ${error.message}`));
    console.error(chalk.yellow('💡 Try: nodash config set token <your-api-token>'));
    console.error(chalk.yellow('💡 Or: nodash config list to see current configuration'));
  } else if (error instanceof APIError) {
    console.error(chalk.red('❌ API Error:'));
    console.error(chalk.red(`   ${error.message}`));
    
    if (error.status === 401) {
      console.error(chalk.yellow('💡 Your API token may be invalid or expired'));
      console.error(chalk.yellow('💡 Try: nodash config set token <your-api-token>'));
    } else if (error.status === 400) {
      console.error(chalk.yellow('💡 Check your metric name, value, and tags format'));
      console.error(chalk.yellow('💡 Example: nodash metric response_time 150 --unit ms --tags service=api,region=us-east'));
    } else if (error.status === 429) {
      console.error(chalk.yellow('💡 Rate limit exceeded. Please wait and try again'));
    }
  } else if (error instanceof NetworkError) {
    console.error(chalk.red('❌ Network Error:'));
    console.error(chalk.red(`   ${error.message}`));
    console.error(chalk.yellow('💡 Check your internet connection'));
    console.error(chalk.yellow('💡 Try: nodash health to test connectivity'));
    console.error(chalk.yellow('💡 Or: nodash config list to verify baseUrl'));
  } else if (error instanceof ValidationError) {
    console.error(chalk.red('❌ Validation Error:'));
    console.error(chalk.red(`   ${error.message}`));
    console.error(chalk.yellow('💡 Example: nodash metric response_time 150 --unit ms --tags service=api,region=us-east'));
    console.error(chalk.yellow('💡 Metric value must be a number'));
    console.error(chalk.yellow('💡 Tags format: key1=value1,key2=value2'));
  } else {
    console.error(chalk.red('❌ Unexpected Error:'));
    console.error(chalk.red(`   ${error instanceof Error ? error.message : error}`));
    console.error(chalk.yellow('💡 Try: nodash config list to verify your configuration'));
  }
}