import { Command } from 'commander';
import chalk from 'chalk';
import { SDKManager, ConfigurationError, APIError, NetworkError, ValidationError } from '../services/sdk-manager.js';

export function createTrackCommand(): Command {
  const command = new Command('track');
  
  command
    .description('Track an analytics event')
    .argument('<event>', 'Event name to track')
    .option('-p, --properties <json>', 'Event properties as JSON string')
    .option('-u, --user-id <id>', 'User ID for the event')
    .option('-s, --session-id <id>', 'Session ID for the event')
    .option('--dry-run', 'Show what would be sent without actually sending')
    .option('--format <format>', 'Output format (json, table)', 'table')
    .action(async (event: string, options: {
      properties?: string;
      userId?: string;
      sessionId?: string;
      dryRun?: boolean;
      format: string;
    }) => {
      try {
        // Validate event name
        if (!event || event.trim().length === 0) {
          throw new ValidationError('Event name cannot be empty', 'track');
        }

        // Parse properties if provided
        let properties: Record<string, any> = {};
        if (options.properties) {
          try {
            properties = JSON.parse(options.properties);
            if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
              throw new Error('Properties must be a JSON object');
            }
          } catch (parseError) {
            throw new ValidationError(
              `Invalid JSON in properties: ${parseError instanceof Error ? parseError.message : parseError}`,
              'track'
            );
          }
        }

        // Add user and session IDs if provided
        if (options.userId) {
          properties.userId = options.userId;
        }
        if (options.sessionId) {
          properties.sessionId = options.sessionId;
        }

        // Prepare event data
        const eventData = {
          event: event.trim(),
          properties,
          timestamp: new Date().toISOString()
        };

        // Dry run mode - show what would be sent
        if (options.dryRun) {
          console.log(chalk.yellow('🔍 Dry Run Mode - Event would be sent:'));
          console.log(chalk.gray('─'.repeat(50)));
          
          if (options.format === 'json') {
            console.log(JSON.stringify(eventData, null, 2));
          } else {
            console.log(`${chalk.bold('Event:')} ${chalk.cyan(eventData.event)}`);
            console.log(`${chalk.bold('Timestamp:')} ${chalk.gray(eventData.timestamp)}`);
            
            if (Object.keys(properties).length > 0) {
              console.log(`${chalk.bold('Properties:')}`);
              Object.entries(properties).forEach(([key, value]) => {
                console.log(`  ${chalk.cyan(key)}: ${chalk.white(JSON.stringify(value))}`);
              });
            } else {
              console.log(`${chalk.bold('Properties:')} ${chalk.gray('None')}`);
            }
          }
          
          console.log(chalk.yellow('\n💡 Remove --dry-run to actually send this event'));
          return;
        }

        // Actually send the event
        const sdkManager = new SDKManager();
        
        console.log(chalk.blue('📤 Sending event...'));
        const response = await sdkManager.trackEvent(event.trim(), properties);
        
        // Display success
        if (options.format === 'json') {
          console.log(JSON.stringify({
            success: true,
            event: eventData.event,
            properties: eventData.properties,
            response: response
          }, null, 2));
        } else {
          console.log(chalk.green('✅ Event tracked successfully!'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.bold('Event:')} ${chalk.cyan(eventData.event)}`);
          console.log(`${chalk.bold('Timestamp:')} ${chalk.gray(eventData.timestamp)}`);
          
          if (Object.keys(properties).length > 0) {
            console.log(`${chalk.bold('Properties:')}`);
            Object.entries(properties).forEach(([key, value]) => {
              console.log(`  ${chalk.cyan(key)}: ${chalk.white(JSON.stringify(value))}`);
            });
          }
        }

      } catch (error) {
        handleTrackError(error);
        process.exit(1);
      }
    });

  return command;
}

function handleTrackError(error: unknown): void {
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
      console.error(chalk.yellow('💡 Check your event name and properties format'));
      console.error(chalk.yellow('💡 Example: nodash track signup --properties \'{"plan": "pro"}\''));
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
    console.error(chalk.yellow('💡 Example: nodash track signup --properties \'{"plan": "pro", "email": "user@example.com"}\''));
  } else {
    console.error(chalk.red('❌ Unexpected Error:'));
    console.error(chalk.red(`   ${error instanceof Error ? error.message : error}`));
    console.error(chalk.yellow('💡 Try: nodash config list to verify your configuration'));
  }
}