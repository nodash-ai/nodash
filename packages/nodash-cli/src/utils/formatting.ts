import chalk from 'chalk';

export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
}

export interface FormatOptions {
  format?: 'json' | 'table';
  colors?: boolean;
  verbose?: boolean;
}

export class OutputFormatter {
  private colors: boolean;

  constructor(colors: boolean = true) {
    this.colors = colors;
  }

  // Format data as JSON
  formatJSON(data: any): string {
    return JSON.stringify(data, null, 2);
  }

  // Format data as a table
  formatTable(data: Record<string, any>[], columns: TableColumn[]): string {
    if (data.length === 0) {
      return this.colors ? chalk.gray('No data to display') : 'No data to display';
    }

    const output: string[] = [];
    
    // Calculate column widths
    const widths = columns.map(col => {
      const headerWidth = col.header.length;
      const dataWidth = Math.max(...data.map(row => String(row[col.key] || '').length));
      return Math.max(headerWidth, dataWidth, col.width || 0);
    });

    // Header row
    const headerRow = columns.map((col, i) => 
      this.padString(col.header, widths[i], col.align || 'left')
    ).join(' │ ');
    
    output.push(this.colors ? chalk.bold(headerRow) : headerRow);
    
    // Separator row
    const separator = widths.map(width => '─'.repeat(width)).join('─┼─');
    output.push(this.colors ? chalk.gray(separator) : separator);
    
    // Data rows
    data.forEach(row => {
      const dataRow = columns.map((col, i) => {
        const value = String(row[col.key] || '');
        return this.padString(value, widths[i], col.align || 'left');
      }).join(' │ ');
      
      output.push(dataRow);
    });

    return output.join('\n');
  }

  // Format key-value pairs
  formatKeyValue(data: Record<string, any>, options: { maskSensitive?: boolean } = {}): string {
    const output: string[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      let displayValue = String(value);
      
      // Mask sensitive values
      if (options.maskSensitive && this.isSensitiveKey(key)) {
        displayValue = this.maskValue(displayValue);
      }
      
      const formattedKey = this.colors ? chalk.bold(key.padEnd(15)) : key.padEnd(15);
      const formattedValue = this.colors ? chalk.cyan(displayValue) : displayValue;
      
      output.push(`${formattedKey}: ${formattedValue}`);
    });

    return output.join('\n');
  }

  // Format status indicators
  formatStatus(status: 'success' | 'error' | 'warning' | 'info', message: string): string {
    if (!this.colors) {
      return `[${status.toUpperCase()}] ${message}`;
    }

    switch (status) {
      case 'success':
        return chalk.green(`✅ ${message}`);
      case 'error':
        return chalk.red(`❌ ${message}`);
      case 'warning':
        return chalk.yellow(`⚠️  ${message}`);
      case 'info':
        return chalk.blue(`ℹ️  ${message}`);
      default:
        return message;
    }
  }

  // Format progress indicators
  formatProgress(current: number, total: number, message?: string): string {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    
    const statusText = message ? ` ${message}` : '';
    const progressText = `${current}/${total} (${percentage}%)`;
    
    if (!this.colors) {
      return `[${progressBar}] ${progressText}${statusText}`;
    }

    return `${chalk.blue(progressBar)} ${chalk.cyan(progressText)}${chalk.gray(statusText)}`;
  }

  // Format section headers
  formatHeader(title: string, level: 1 | 2 | 3 = 1): string {
    if (!this.colors) {
      return `\n${title}\n${'='.repeat(title.length)}`;
    }

    switch (level) {
      case 1:
        return `\n${chalk.bold.blue(title)}\n${chalk.gray('─'.repeat(title.length))}`;
      case 2:
        return `\n${chalk.bold.cyan(title)}`;
      case 3:
        return `\n${chalk.bold(title)}`;
      default:
        return title;
    }
  }

  // Format lists
  formatList(items: string[], options: { numbered?: boolean; indent?: number } = {}): string {
    const indent = ' '.repeat(options.indent || 0);
    
    return items.map((item, index) => {
      const prefix = options.numbered ? `${index + 1}. ` : '• ';
      const formattedPrefix = this.colors ? chalk.cyan(prefix) : prefix;
      return `${indent}${formattedPrefix}${item}`;
    }).join('\n');
  }

  // Format code blocks
  formatCode(code: string, language?: string): string {
    if (!this.colors) {
      return `\`\`\`${language || ''}\n${code}\n\`\`\``;
    }

    const header = language ? chalk.gray(`// ${language}`) : '';
    const formattedCode = chalk.dim(code);
    
    return `${header}\n${chalk.gray('─'.repeat(40))}\n${formattedCode}`;
  }

  // Helper methods
  private padString(str: string, width: number, align: 'left' | 'right' | 'center'): string {
    if (str.length >= width) return str;
    
    const padding = width - str.length;
    
    switch (align) {
      case 'right':
        return ' '.repeat(padding) + str;
      case 'center':
        const leftPad = Math.floor(padding / 2);
        const rightPad = padding - leftPad;
        return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
      default:
        return str + ' '.repeat(padding);
    }
  }

  private createProgressBar(percentage: number, width: number = 20): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = ['token', 'password', 'secret', 'key', 'auth'];
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  private maskValue(value: string): string {
    if (value.length <= 8) {
      return '***';
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
}

// Utility functions for common formatting tasks
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)}${units[unitIndex]}`;
}

export function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString();
}

export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
}

// Create a default formatter instance
export const defaultFormatter = new OutputFormatter();