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
  .option('--memory', 'Use memory-based recording instead of file-based')
  .action(async (options: { maxEvents: string; memory?: boolean }) => {
    try {
      const maxEvents = parseInt(options.maxEvents, 10);
      if (isNaN(maxEvents) || maxEvents <= 0) {
        console.error('❌ Invalid max-events value. Must be a positive number.');
        process.exit(1);
      }

      const result = sdkWrapper.startRecording(maxEvents, options.memory);
      console.log(`📹 Started recording events (max: ${maxEvents})`);
      if (result.filePath) {
        console.log(`📁 Recording to: ${result.filePath}`);
      } else if (options.memory) {
        console.log(`💾 Recording to memory`);
      }
    } catch (error) {
      console.error('❌ Record start error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

recordCommand
  .command('stop')
  .description('Stop recording and output session data')
  .option('--out <file>', 'Output file path (default: uses default file if available, otherwise stdout)')
  .action(async (options: { out?: string }) => {
    try {
      const result = sdkWrapper.stopRecording();
      const { snapshot, filePath } = result;

      if (options.out) {
        // User specified output file
        const fs = await import('fs');
        const output = JSON.stringify(snapshot, null, 2);
        fs.writeFileSync(options.out, output);
        console.log(`✅ Session saved to ${options.out}`);
        console.log(`📊 Recorded ${snapshot.totalEvents} events`);
      } else if (filePath) {
        // File was already written during recording
        console.log(`✅ Session saved to ${filePath}`);
        console.log(`📊 Recorded ${snapshot.totalEvents} events`);
      } else {
        // Memory mode, output to stdout
        console.log(JSON.stringify(snapshot, null, 2));
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

// Query command group
const queryCommand = program
  .command('query')
  .description('Query events and users');

queryCommand
  .command('events')
  .description('Query events with filters')
  .option('--type <types>', 'Event types (comma-separated)')
  .option('--user-id <userId>', 'Filter by user ID')
  .option('--start <date>', 'Start date (ISO 8601)')
  .option('--end <date>', 'End date (ISO 8601)')
  .option('--properties <json>', 'Property filters as JSON')
  .option('--sort-by <field>', 'Sort by field (timestamp, eventName, userId)')
  .option('--sort-order <order>', 'Sort order (asc, desc)')
  .option('--limit <number>', 'Maximum number of results', '100')
  .option('--offset <number>', 'Number of results to skip', '0')
  .option('--format <format>', 'Output format (json, table)', 'json')
  .action(async (options: {
    type?: string;
    userId?: string;
    start?: string;
    end?: string;
    properties?: string;
    sortBy?: string;
    sortOrder?: string;
    limit: string;
    offset: string;
    format: string;
  }) => {
    try {
      const queryOptions: any = {};

      // Parse event types
      if (options.type) {
        queryOptions.eventTypes = options.type.split(',').map(t => t.trim());
      }

      // Parse user ID
      if (options.userId) {
        queryOptions.userId = options.userId;
      }

      // Parse dates
      if (options.start) {
        queryOptions.startDate = new Date(options.start);
        if (isNaN(queryOptions.startDate.getTime())) {
          console.error('❌ Invalid start date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)');
          process.exit(1);
        }
      }

      if (options.end) {
        queryOptions.endDate = new Date(options.end);
        if (isNaN(queryOptions.endDate.getTime())) {
          console.error('❌ Invalid end date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)');
          process.exit(1);
        }
      }

      // Parse properties
      if (options.properties) {
        try {
          queryOptions.properties = JSON.parse(options.properties);
        } catch {
          console.error('❌ Invalid properties JSON');
          process.exit(1);
        }
      }

      // Parse sorting
      if (options.sortBy) {
        if (!['timestamp', 'eventName', 'userId'].includes(options.sortBy)) {
          console.error('❌ Invalid sortBy. Must be one of: timestamp, eventName, userId');
          process.exit(1);
        }
        queryOptions.sortBy = options.sortBy;
      }

      if (options.sortOrder) {
        if (!['asc', 'desc'].includes(options.sortOrder)) {
          console.error('❌ Invalid sortOrder. Must be either "asc" or "desc"');
          process.exit(1);
        }
        queryOptions.sortOrder = options.sortOrder;
      }

      // Parse pagination
      const limit = parseInt(options.limit, 10);
      if (isNaN(limit) || limit <= 0) {
        console.error('❌ Invalid limit. Must be a positive integer');
        process.exit(1);
      }
      queryOptions.limit = limit;

      const offset = parseInt(options.offset, 10);
      if (isNaN(offset) || offset < 0) {
        console.error('❌ Invalid offset. Must be a non-negative integer');
        process.exit(1);
      }
      queryOptions.offset = offset;

      // Parse format
      if (!['json', 'table'].includes(options.format)) {
        console.error('❌ Invalid format. Must be either "json" or "table"');
        process.exit(1);
      }
      queryOptions.format = options.format;

      const result = await sdkWrapper.queryEvents(queryOptions);

      if (options.format === 'table') {
        console.log(`📊 Found ${result.totalCount} events (showing ${result.events.length})`);
        console.log('');
        
        if (result.events.length === 0) {
          console.log('No events found matching the criteria.');
        } else {
          // Simple table format
          console.log('Event Name'.padEnd(20) + 'User ID'.padEnd(15) + 'Timestamp'.padEnd(25) + 'Properties');
          console.log('-'.repeat(80));
          
          for (const event of result.events) {
            const eventName = event.eventName.padEnd(20);
            const userId = (event.userId || '').padEnd(15);
            const timestamp = event.timestamp.toISOString().padEnd(25);
            const properties = JSON.stringify(event.properties);
            
            console.log(`${eventName}${userId}${timestamp}${properties}`);
          }
        }
        
        console.log('');
        console.log(`📄 Page: ${Math.floor(result.pagination.offset / result.pagination.limit) + 1}`);
        console.log(`⏱️  Query time: ${result.executionTime}ms`);
        
        if (result.hasMore) {
          console.log(`➡️  Use --offset ${result.pagination.nextOffset} for next page`);
        }
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('❌ Query events error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

queryCommand
  .command('users')
  .description('Query users with filters')
  .option('--user-id <userId>', 'Filter by user ID')
  .option('--active-since <date>', 'Filter users active since date (ISO 8601)')
  .option('--active-until <date>', 'Filter users active until date (ISO 8601)')
  .option('--properties <json>', 'Property filters as JSON')
  .option('--sort-by <field>', 'Sort by field (firstSeen, lastSeen, eventCount, sessionCount)')
  .option('--sort-order <order>', 'Sort order (asc, desc)')
  .option('--limit <number>', 'Maximum number of results', '100')
  .option('--offset <number>', 'Number of results to skip', '0')
  .option('--format <format>', 'Output format (json, table)', 'json')
  .action(async (options: {
    userId?: string;
    activeSince?: string;
    activeUntil?: string;
    properties?: string;
    sortBy?: string;
    sortOrder?: string;
    limit: string;
    offset: string;
    format: string;
  }) => {
    try {
      const queryOptions: any = {};

      // Parse user ID
      if (options.userId) {
        queryOptions.userId = options.userId;
      }

      // Parse dates
      if (options.activeSince) {
        queryOptions.activeSince = new Date(options.activeSince);
        if (isNaN(queryOptions.activeSince.getTime())) {
          console.error('❌ Invalid activeSince date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)');
          process.exit(1);
        }
      }

      if (options.activeUntil) {
        queryOptions.activeUntil = new Date(options.activeUntil);
        if (isNaN(queryOptions.activeUntil.getTime())) {
          console.error('❌ Invalid activeUntil date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)');
          process.exit(1);
        }
      }

      // Parse properties
      if (options.properties) {
        try {
          queryOptions.properties = JSON.parse(options.properties);
        } catch {
          console.error('❌ Invalid properties JSON');
          process.exit(1);
        }
      }

      // Parse sorting
      if (options.sortBy) {
        if (!['firstSeen', 'lastSeen', 'eventCount', 'sessionCount'].includes(options.sortBy)) {
          console.error('❌ Invalid sortBy. Must be one of: firstSeen, lastSeen, eventCount, sessionCount');
          process.exit(1);
        }
        queryOptions.sortBy = options.sortBy;
      }

      if (options.sortOrder) {
        if (!['asc', 'desc'].includes(options.sortOrder)) {
          console.error('❌ Invalid sortOrder. Must be either "asc" or "desc"');
          process.exit(1);
        }
        queryOptions.sortOrder = options.sortOrder;
      }

      // Parse pagination
      const limit = parseInt(options.limit, 10);
      if (isNaN(limit) || limit <= 0) {
        console.error('❌ Invalid limit. Must be a positive integer');
        process.exit(1);
      }
      queryOptions.limit = limit;

      const offset = parseInt(options.offset, 10);
      if (isNaN(offset) || offset < 0) {
        console.error('❌ Invalid offset. Must be a non-negative integer');
        process.exit(1);
      }
      queryOptions.offset = offset;

      // Parse format
      if (!['json', 'table'].includes(options.format)) {
        console.error('❌ Invalid format. Must be either "json" or "table"');
        process.exit(1);
      }
      queryOptions.format = options.format;

      const result = await sdkWrapper.queryUsers(queryOptions);

      if (options.format === 'table') {
        console.log(`👥 Found ${result.totalCount} users (showing ${result.users.length})`);
        console.log('');
        
        if (result.users.length === 0) {
          console.log('No users found matching the criteria.');
        } else {
          // Simple table format
          console.log('User ID'.padEnd(20) + 'First Seen'.padEnd(25) + 'Last Seen'.padEnd(25) + 'Events'.padEnd(10) + 'Sessions');
          console.log('-'.repeat(90));
          
          for (const user of result.users) {
            const userId = user.userId.padEnd(20);
            const firstSeen = user.firstSeen.toISOString().padEnd(25);
            const lastSeen = user.lastSeen.toISOString().padEnd(25);
            const eventCount = user.eventCount.toString().padEnd(10);
            const sessionCount = user.sessionCount.toString();
            
            console.log(`${userId}${firstSeen}${lastSeen}${eventCount}${sessionCount}`);
          }
        }
        
        console.log('');
        console.log(`📄 Page: ${Math.floor(result.pagination.offset / result.pagination.limit) + 1}`);
        console.log(`⏱️  Query time: ${result.executionTime}ms`);
        
        if (result.hasMore) {
          console.log(`➡️  Use --offset ${result.pagination.nextOffset} for next page`);
        }
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('❌ Query users error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();