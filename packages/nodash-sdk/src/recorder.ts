import { Event, EventSnapshot } from './types';

export class Recorder {
  private events: Event[] = [];
  private maxEvents: number = 100;
  private isRecording: boolean = false;

  start(maxEvents: number = 100): void {
    this.isRecording = true;
    this.maxEvents = maxEvents;
    this.events = [];
  }

  stop(): EventSnapshot {
    this.isRecording = false;
    const snapshot: EventSnapshot = {
      events: [...this.events],
      recordedAt: new Date(),
      totalEvents: this.events.length
    };
    return snapshot;
  }

  addEvent(event: Event): void {
    if (!this.isRecording) {
      return;
    }

    // Ring-buffer behavior: remove oldest event if at capacity
    if (this.events.length >= this.maxEvents) {
      this.events.shift();
    }

    this.events.push(event);
  }

  isActive(): boolean {
    return this.isRecording;
  }
}