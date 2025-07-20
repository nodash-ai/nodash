#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from './config';
import { SDKWrapper } from './sdk-wrapper';

const program = new Command();
const configManager = new ConfigManager();
const sdkWrapper = new SDKWrapper();

program
  .name('nodash')
  .description('Nodash CLI - Developer tools for the nodash ecosystem')
  .version('0.1.0');

// Config command
program
  .command('config')
  .description('Manage configuration')
  .argument('<action>', 'Action to perform (get, set)')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action(async (action: string, key?: string, value?: string) => {
    try {
      if (action === 'get') {
        if (key) {
          const configValue = configManager.getConfigValue(key as any);
          if (configValue) {
            console.log(`${key}: ${configValue}`);
          } else {
            console.log(`${key}: not set`);
          }
        } else {
          const config = configManager.getConfig();
          console.log('Current configuration:');
          console.log(JSON.stringify(config, null, 2));
        }
      } else if (action === 'set') {
        if (!key || !value) {
          console.error('Usage: nodash config set <key> <value>');
          process.exit(1);
        }
        configManager.setConfigValue(key as any, value);
        console.log(`✅ Set ${key} = ${value}`);
      } else {
        console.error('Unknown action. Use "get" or "set"');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Config error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Track command
program
  .command('track')
  .description('Track an event')
  .argument('<event>', 'Event name')
  .option('-p, --properties <json>', 'Event properties as JSON')
  .action(async (event: string, options: { properties?: string }) => {
    try {
      let properties: Record<string, any> | undefined;
      
      if (options.properties) {
        try {
          properties = JSON.parse(options.properties);
        } catch {
          console.error('❌ Invalid JSON in properties');
          process.exit(1);
        }
      }

      await sdkWrapper.track(event, properties);
      console.log(`✅ Tracked event: ${event}`);
    } catch (error) {
      console.error('❌ Track error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('Check server health')
  .action(async () => {
    try {
      const health = await sdkWrapper.health();
      console.log('🏥 Server Health Status:');
      console.log(`Status: ${health.status}`);
      console.log(`Version: ${health.version}`);
      console.log(`Uptime: ${health.uptime}s`);
      
      if (health.checks && health.checks.length > 0) {
        console.log('\nHealth Checks:');
        health.checks.forEach((check: any) => {
          const icon = check.status === 'pass' ? '✅' : '❌';
          console.log(`  ${icon} ${check.name}: ${check.status}`);
          if (check.message) {
            console.log(`     ${check.message}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Health check failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize nodash configuration')
  .option('-u, --url <url>', 'Base URL for the nodash server')
  .option('-t, --token <token>', 'API token (optional)')
  .action(async (options: { url?: string; token?: string }) => {
    try {
      console.log('🚀 Initializing Nodash CLI...');
      
      if (options.url) {
        configManager.setConfigValue('baseUrl', options.url);
        console.log(`✅ Set base URL: ${options.url}`);
      }
      
      if (options.token) {
        configManager.setConfigValue('apiToken', options.token);
        console.log('✅ Set API token');
      }
      
      if (!options.url && !options.token) {
        console.log('No configuration provided. Use --url and/or --token options.');
        console.log('Example: nodash init --url https://api.nodash.com --token your-token');
      }
      
      console.log('\n🎉 Nodash CLI is ready to use!');
      console.log('Try: nodash health');
    } catch (error) {
      console.error('❌ Init error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Record command group
const recordCommand = program
  .command('record')
  .description('Record events for testing and debugging');

recordCommand
  .command('start')
  .description('Start recording events')
  .option('--max-events <number>', 'Maximum number of events to record (default: 100)', '100')
  .action(async (options: { maxEvents: string }) => {
    try {
      const maxEvents = parseInt(options.maxEvents, 10);
      if (isNaN(maxEvents) || maxEvents <= 0) {
        console.error('❌ Invalid max-events value. Must be a positive number.');
        process.exit(1);
      }

      sdkWrapper.startRecording(maxEvents);
      console.log(`📹 Started recording events (max: ${maxEvents})`);
    } catch (error) {
      console.error('❌ Record start error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

recordCommand
  .command('stop')
  .description('Stop recording and output session data')
  .option('--out <file>', 'Output file path (default: stdout)')
  .action(async (options: { out?: string }) => {
    try {
      const snapshot = sdkWrapper.stopRecording();
      const output = JSON.stringify(snapshot, null, 2);

      if (options.out) {
        const fs = await import('fs');
        fs.writeFileSync(options.out, output);
        console.log(`✅ Session saved to ${options.out}`);
        console.log(`📊 Recorded ${snapshot.totalEvents} events`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('❌ Record stop error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Replay command
program
  .command('replay')
  .description('Replay events from a saved session')
  .argument('<file>', 'Path to session JSON file')
  .option('--url <url>', 'Override base URL for replay')
  .option('--dry-run', 'Log events without sending HTTP requests')
  .action(async (file: string, options: { url?: string; dryRun?: boolean }) => {
    try {
      const fs = await import('fs');
      
      // Check if file exists
      if (!fs.existsSync(file)) {
        console.error(`❌ File not found: ${file}`);
        process.exit(1);
      }

      // Read and parse JSON file
      let snapshot;
      try {
        const fileContent = fs.readFileSync(file, 'utf8');
        snapshot = JSON.parse(fileContent);
      } catch (error) {
        console.error(`❌ Invalid JSON file: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }

      // Validate snapshot structure
      if (!snapshot.events || !Array.isArray(snapshot.events)) {
        console.error('❌ Invalid session file format: missing events array');
        process.exit(1);
      }

      console.log(`🔄 Replaying ${snapshot.totalEvents || snapshot.events.length} events...`);
      
      if (options.dryRun) {
        console.log('🧪 Dry run mode - no HTTP requests will be sent');
      }
      
      if (options.url) {
        console.log(`🎯 Using custom URL: ${options.url}`);
      }

      await sdkWrapper.replay(snapshot, {
        url: options.url,
        dryRun: options.dryRun
      });

      console.log('✅ Replay completed successfully');
    } catch (error) {
      console.error('❌ Replay error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();