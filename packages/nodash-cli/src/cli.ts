#!/usr/bin/env node

import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze.js';

async function main() {
  const program = new Command();
  
  program
    .name('nodash')
    .description('Nodash CLI for AI-assisted analytics setup')
    .version('1.0.0');

  // Add commands
  program.addCommand(createAnalyzeCommand());

  // Parse arguments
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
}); 