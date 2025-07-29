import { Event, EventSnapshot } from './types';
import * as fs from 'fs';
import { getDefaultRecordingPath } from './file-utils';

export class Recorder {
  private events: Event[] = [];
  private maxEvents: number = 100;
  private isRecording: boolean = false;
  private filePath?: string;
  private fileStream?: fs.WriteStream;

  start(options: { maxEvents?: number; store?: string } = {}): { filePath?: string } {
    this.isRecording = true;
    this.maxEvents = options.maxEvents || 100;
    this.events = [];
    
    if (options.store && options.store !== 'memory') {
      // File streaming mode
      this.filePath = options.store === 'default' ? getDefaultRecordingPath() : options.store;
      this.initializeFileStream();
      return { filePath: this.filePath };
    } else {
      // Memory mode (existing behavior)
      this.filePath = undefined;
      return {};
    }
  }

  private initializeFileStream(): void {
    if (!this.filePath) return;
    
    try {
      // Ensure directory exists
      const dir = require('path').dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write initial JSON structure
      this.fileStream = fs.createWriteStream(this.filePath, { flags: 'w' });
      this.fileStream.write('{"events":[\n');
    } catch (error) {
      // If file creation fails, fall back to memory mode
      console.warn('Failed to create recording file, falling back to memory mode:', error);
      this.filePath = undefined;
      this.fileStream = undefined;
    }
  }

  stop(): { events: Event[]; recordedAt: Date; totalEvents: number; filePath?: string } {
    this.isRecording = false;
    
    const events = [...this.events];
    const recordedAt = new Date();
    const totalEvents = this.events.length;
    
    if (this.fileStream && this.filePath) {
      // For file mode, save to file
      const snapshot: EventSnapshot = {
        events,
        recordedAt,
        totalEvents
      };
      
      // Write complete file synchronously
      try {
        const fileContent = JSON.stringify(snapshot, null, 2);
        fs.writeFileSync(this.filePath, fileContent, 'utf8');
      } catch (error) {
        console.warn('Failed to write recording file:', error);
      }
      
      // Close the stream properly
      this.fileStream.end();
      
      const result = { events, recordedAt, totalEvents, filePath: this.filePath };
      
      // Cleanup
      this.fileStream = undefined;
      const filePath = this.filePath;
      this.filePath = undefined;
      
      return result;
    } else {
      // Memory mode
      return { events, recordedAt, totalEvents };
    }
  }

  private finalizeFileStream(): void {
    if (!this.fileStream) return;
    
    // Complete the JSON structure
    this.fileStream.write('\n],\n');
    this.fileStream.write(`"recordedAt":"${new Date().toISOString()}",\n`);
    this.fileStream.write(`"totalEvents":${this.events.length}\n`);
    this.fileStream.write('}\n');
    this.fileStream.end();
  }


  addEvent(event: Event): void {
    if (!this.isRecording) {
      return;
    }

    if (this.fileStream) {
      // File streaming mode
      const eventJson = JSON.stringify(event);
      const prefix = this.events.length > 0 ? ',\n' : '';
      this.fileStream.write(`${prefix}${eventJson}`);
      
      // Still keep in memory for ring-buffer behavior
      if (this.events.length >= this.maxEvents) {
        this.events.shift();
      }
      this.events.push(event);
    } else {
      // Memory mode (existing behavior)
      if (this.events.length >= this.maxEvents) {
        this.events.shift();
      }
      this.events.push(event);
    }
  }

  isActive(): boolean {
    return this.isRecording;
  }
}