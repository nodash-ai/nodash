import * as fs from 'fs';
import { Event, EventSnapshot } from '@nodash/sdk';
import { RecordingStateManager } from './recording-state';

export class FileRecorder {
  private stateManager: RecordingStateManager;

  constructor() {
    this.stateManager = new RecordingStateManager();
  }

  startRecording(filePath: string, maxEvents: number): void {
    this.stateManager.setActiveRecording(filePath, maxEvents);
    
    // Initialize the JSON file with empty events array
    const initialContent = {
      events: [],
      recordedAt: new Date().toISOString(),
      totalEvents: 0
    };
    
    fs.writeFileSync(filePath, JSON.stringify(initialContent, null, 2));
  }

  stopRecording(): { snapshot: EventSnapshot; filePath: string } | null {
    const activeRecording = this.stateManager.getActiveRecording();
    if (!activeRecording) {
      return null;
    }

    // Read the final file
    const fileContent = fs.readFileSync(activeRecording.filePath, 'utf8');
    const snapshot = JSON.parse(fileContent) as EventSnapshot;
    
    // Update final timestamp
    snapshot.recordedAt = new Date();
    fs.writeFileSync(activeRecording.filePath, JSON.stringify(snapshot, null, 2));

    this.stateManager.clearActiveRecording();
    
    return {
      snapshot,
      filePath: activeRecording.filePath
    };
  }

  addEvent(event: Event): boolean {
    const activeRecording = this.stateManager.getActiveRecording();
    if (!activeRecording) {
      return false;
    }

    try {
      // Read current file
      const fileContent = fs.readFileSync(activeRecording.filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      // Add event with ring-buffer behavior
      data.events.push(event);
      if (data.events.length > activeRecording.maxEvents) {
        data.events.shift();
      }
      
      data.totalEvents = data.events.length;
      data.recordedAt = new Date().toISOString();
      
      // Write back
      fs.writeFileSync(activeRecording.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  isRecordingActive(): boolean {
    return this.stateManager.isRecordingActive();
  }

  getActiveRecordingPath(): string | null {
    const activeRecording = this.stateManager.getActiveRecording();
    return activeRecording?.filePath || null;
  }
}