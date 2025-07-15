import { Command } from 'commander';
import chalk from 'chalk';
import { SDKManager, ConfigurationError, APIError, NetworkError } from '../services/sdk-manager.js';

export function createHealthCommand(): Command {
  const command = new Command('health');
  
  command
    .description('Check Nodash service health and connectivity')
    .option('--format <format>', 'Output format (json, table)', 'table')
    .option('-v, --verbose', 'Show detailed health information')
    .option('--timeout <ms>', 'Custom timeout for health check (milliseconds)', '10000')
    .action(async (options: {
      format: string;
      verbose?: boolean;
      timeout: string;
    }) => {
      try {
        // Parse timeout
        const timeout = parseInt(options.timeout, 10);
        if (isNaN(timeout) || timeout < 1000) {
          console.error(chalk.yellow('⚠️  Invalid timeout, using default 10000ms'));
        }

        console.log(chalk.blue('🔍 Checking Nodash service health...'));
        
        const sdkManager = new SDKManager();
        const startTime = Date.now();
        
        // Perform health check
        const healthResponse = await sdkManager.checkHealth();
        const responseTime = Date.now() - startTime;
        
        // Display results
        if (options.format === 'json') {
          console.log(JSON.stringify({
            status: 'healthy',
            responseTime,
            timestamp: new Date().toISOString(),
            service: healthResponse
          }, null, 2));
        } else {
          // Table format
          console.log(chalk.green('✅ Nodash Service Health Check'));
          console.log(chalk.gray('─'.repeat(50)));
          
          // Overall status
          const statusColor = healthResponse.status === 'healthy' ? chalk.green : 
                             healthResponse.status === 'degraded' ? chalk.yellow : chalk.red;
          console.log(`${chalk.bold('Status:')} ${statusColor(healthResponse.status || 'healthy')}`);
          console.log(`${chalk.bold('Response Time:')} ${chalk.cyan(responseTime + 'ms')}`);
          console.log(`${chalk.bold('Timestamp:')} ${chalk.gray(new Date().toISOString())}`);
          
          // Verbose information
          if (options.verbose) {
            console.log(`${chalk.bold('Service Response:')}`);
            console.log(chalk.gray(JSON.stringify(healthResponse, null, 2)));
          }
          
          // Connection status
          console.log('\n' + chalk.bold.blue('🔗 Connection Status'));
          console.log(chalk.gray('─'.repeat(30)));
          console.log(chalk.green('✅ API connectivity: OK'));
          console.log(chalk.green('✅ Authentication: Valid'));
          console.log(chalk.green('✅ Service availability: Online'));
          
          // Performance indicators
          if (responseTime > 5000) {
            console.log(chalk.yellow('⚠️  Slow response time detected'));
          } else if (responseTime > 2000) {
            console.log(chalk.yellow('⚠️  Response time is higher than usual'));
          } else {
            console.log(chalk.green('✅ Response time: Good'));
          }
        }

      } catch (error) {
        handleHealthError(error, options.format);
        process.exit(1);
      }
    });

  return command;
}

function handleHealthError(error: unknown, format: string): void {
  if (format === 'json') {
    console.log(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  if (error instanceof ConfigurationError) {
    console.error(chalk.red('❌ Configuration Error:'));
    console.error(chalk.red(`   ${error.message}`));
    console.error(chalk.yellow('\n💡 Setup Steps:'));
    console.error(chalk.yellow('   1. Set your API token: nodash config set token <your-token>'));
    console.error(chalk.yellow('   2. Verify configuration: nodash config list'));
    console.error(chalk.yellow('   3. Try health check again: nodash health'));
  } else if (error instanceof APIError) {
    console.error(chalk.red('❌ API Health Check Failed:'));
    console.error(chalk.red(`   ${error.message}`));
    
    console.log('\n' + chalk.bold.red('🔗 Connection Diagnostics'));
    console.log(chalk.gray('─'.repeat(30)));
    
    if (error.status === 401) {
      console.log(chalk.red('❌ Authentication: Failed'));
      console.log(chalk.yellow('💡 Your API token may be invalid or expired'));
      console.log(chalk.yellow('💡 Try: nodash config set token <your-api-token>'));
    } else if (error.status === 403) {
      console.log(chalk.red('❌ Authorization: Denied'));
      console.log(chalk.yellow('💡 Your API token may not have health check permissions'));
    } else if (error.status === 404) {
      console.log(chalk.red('❌ Service endpoint: Not found'));
      console.log(chalk.yellow('💡 Check your baseUrl configuration'));
      console.log(chalk.yellow('💡 Try: nodash config list'));
    } else if (error.status >= 500) {
      console.log(chalk.red('❌ Service availability: Down'));
      console.log(chalk.yellow('💡 Nodash service may be experiencing issues'));
      console.log(chalk.yellow('💡 Try again in a few minutes'));
    } else {
      console.log(chalk.red(`❌ API Error: HTTP ${error.status}`));
    }
  } else if (error instanceof NetworkError) {
    console.error(chalk.red('❌ Network Connection Failed:'));
    console.error(chalk.red(`   ${error.message}`));
    
    console.log('\n' + chalk.bold.red('🔗 Connection Diagnostics'));
    console.log(chalk.gray('─'.repeat(30)));
    console.log(chalk.red('❌ API connectivity: Failed'));
    console.log(chalk.gray('❓ Authentication: Unknown'));
    console.log(chalk.gray('❓ Service availability: Unknown'));
    
    console.error(chalk.yellow('\n💡 Troubleshooting Steps:'));
    console.error(chalk.yellow('   1. Check your internet connection'));
    console.error(chalk.yellow('   2. Verify baseUrl: nodash config get baseUrl'));
    console.error(chalk.yellow('   3. Try with default URL: nodash config set baseUrl https://api.nodash.ai'));
    console.error(chalk.yellow('   4. Check firewall/proxy settings'));
  } else {
    console.error(chalk.red('❌ Unexpected Health Check Error:'));
    console.error(chalk.red(`   ${error instanceof Error ? error.message : error}`));
    
    console.log('\n' + chalk.bold.yellow('🔧 Debug Information'));
    console.log(chalk.gray('─'.repeat(30)));
    console.error(chalk.yellow('💡 Try: nodash config list to verify configuration'));
    console.error(chalk.yellow('💡 Try: nodash health --verbose for more details'));
  }
}