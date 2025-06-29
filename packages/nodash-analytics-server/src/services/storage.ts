import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { EventSchema, EventData } from '../types/index.js';

const DATA_DIR = '.nodash';
const EVENTS_SCHEMA_FILE = join(DATA_DIR, 'events_schema.json');
const EVENTS_DATA_FILE = join(DATA_DIR, 'events_data.jsonl');

export class StorageService {
  async ensureDataDir(): Promise<void> {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
  }

  async loadEventsSchema(): Promise<Record<string, EventSchema>> {
    try {
      const data = await readFile(EVENTS_SCHEMA_FILE, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveEventsSchema(schema: Record<string, EventSchema>): Promise<void> {
    await writeFile(EVENTS_SCHEMA_FILE, JSON.stringify(schema, null, 2));
  }

  async appendEventData(event: EventData): Promise<void> {
    const line = JSON.stringify(event) + '\n';
    await writeFile(EVENTS_DATA_FILE, line, { flag: 'a' });
  }

  async loadEventsData(eventName?: string, limit = 100): Promise<EventData[]> {
    try {
      const data = await readFile(EVENTS_DATA_FILE, 'utf8');
      const lines = data.trim().split('\n').filter(line => line.trim());
      
      let events = lines.map(line => JSON.parse(line));
      
      // Filter by event name if provided
      if (eventName) {
        events = events.filter(event => event.event === eventName);
      }
      
      // Limit results
      return events.slice(-limit);
    } catch {
      return [];
    }
  }
} 