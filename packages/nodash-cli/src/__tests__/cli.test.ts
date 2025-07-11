import { describe, expect, test } from '@jest/globals';
import { Command } from 'commander';

describe('CLI', () => {
  test('parses analyze command', () => {
    const program = new Command();
    program.command('analyze');
    expect(program.commands.length).toBe(1);
  });
}); 