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
    
    // Write initial JSON structure
    this.fileStream = fs.createWriteStream(this.filePath, { flags: 'w' });
    this.fileStream.write('{"events":[\n');
  }

  stop(): { snapshot: EventSnapshot; filePath?: string } {
    this.isRecording = false;
    
    if (this.fileStream && this.filePath) {
      // Finalize the file
      this.finalizeFileStream();
      
      // Read back the completed file for snapshot
      const fileContent = fs.readFileSync(this.filePath, 'utf8');
      const snapshot = JSON.parse(fileContent) as EventSnapshot;
      const result = { snapshot, filePath: this.filePath };
      
      // Cleanup
      this.fileStream = undefined;
      const filePath = this.filePath;
      this.filePath = undefined;
      
      return result;
    } else {
      // Memory mode
      const snapshot: EventSnapshot = {
        events: [...this.events],
        recordedAt: new Date(),
        totalEvents: this.events.length
      };
      return { snapshot };
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