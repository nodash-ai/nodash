#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createConfigCommand } from './commands/config.js';
import { createTrackCommand } from './commands/track.js';
import { createMetricCommand } from './commands/metric.js';
import { createHealthCommand } from './commands/health.js';
import { CLIErrorHandler } from './utils/error-handler.js';

async function main() {
  const program = new Command();
  
  program
    .name('nodash')
    .description('Nodash CLI for analytics and monitoring operations')
    .version('1.0.1');

  // Global options
  program
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Enable verbose logging')
    .option('--format <format>', 'Output format (json, table)', 'table');

  // Add commands
  program.addCommand(createAnalyzeCommand());
  program.addCommand(createConfigCommand());
  program.addCommand(createTrackCommand());
  program.addCommand(createMetricCommand());
  program.addCommand(createHealthCommand());

  // Handle global options
  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    
    // Disable colors if requested
    if (opts.noColor) {
      chalk.level = 0;
    }
    
    // Set verbose mode
    if (opts.verbose) {
      process.env.NODASH_VERBOSE = 'true';
    }
  });

  // Custom help
  program.on('--help', () => {
    console.log('');
    console.log(chalk.bold.blue('Examples:'));
    console.log('  $ nodash config set token your-api-token');
    console.log('  $ nodash track signup --properties \'{"plan": "pro"}\'');
    console.log('  $ nodash metric response_time 150 --unit ms');
    console.log('  $ nodash health');
    console.log('  $ nodash analyze --setup');
    console.log('');
    console.log(chalk.bold.blue('Getting Started:'));
    console.log('  1. Set your API token: nodash config set token <token>');
    console.log('  2. Test connectivity: nodash health');
    console.log('  3. Analyze your project: nodash analyze');
    console.log('');
    console.log(chalk.gray('For more information, visit: https://docs.nodash.ai/cli'));
  });

  // Parse arguments
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      CLIErrorHandler.handle(error, 'cli');
    } else {
      console.error(chalk.red('❌ Unexpected error:'), error);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ Uncaught Exception:'));
  console.error(chalk.red(error.message));
  if (process.env.NODASH_VERBOSE) {
    console.error(chalk.gray(error.stack));
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('❌ Unhandled Promise Rejection:'));
  console.error(chalk.red(reason instanceof Error ? reason.message : String(reason)));
  if (process.env.NODASH_VERBOSE && reason instanceof Error) {
    console.error(chalk.gray(reason.stack));
  }
  process.exit(1);
});

main().catch((error) => {
  console.error(chalk.red('❌ CLI Error:'), error instanceof Error ? error.message : error);
  if (process.env.NODASH_VERBOSE && error instanceof Error) {
    console.error(chalk.gray(error.stack));
  }
  process.exit(1);
}); 