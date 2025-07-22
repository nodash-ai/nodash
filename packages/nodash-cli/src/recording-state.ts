import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from '@nodash/sdk';

interface ActiveRecording {
  filePath: string;
  maxEvents: number;
  startedAt: Date;
}

export class RecordingStateManager {
  private stateFilePath: string;

  constructor() {
    const stateDir = this.getStateDir();
    this.stateFilePath = path.join(stateDir, 'active-recording.json');
  }

  private getStateDir(): string {
    const projectRoot = findProjectRoot() || process.cwd();
    const stateDir = path.join(projectRoot, '.nodash', 'state');
    
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true, mode: 0o755 });
    }
    
    return stateDir;
  }

  setActiveRecording(filePath: string, maxEvents: number): void {
    const recording: ActiveRecording = {
      filePath,
      maxEvents,
      startedAt: new Date()
    };
    
    fs.writeFileSync(this.stateFilePath, JSON.stringify(recording, null, 2));
  }

  getActiveRecording(): ActiveRecording | null {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return null;
      }
      
      const content = fs.readFileSync(this.stateFilePath, 'utf8');
      const recording = JSON.parse(content);
      
      // Convert string date back to Date object
      recording.startedAt = new Date(recording.startedAt);
      
      return recording;
    } catch {
      return null;
    }
  }

  clearActiveRecording(): void {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        fs.unlinkSync(this.stateFilePath);
      }
    } catch {
      // Ignore errors when clearing
    }
  }

  isRecordingActive(): boolean {
    return this.getActiveRecording() !== null;
  }
}