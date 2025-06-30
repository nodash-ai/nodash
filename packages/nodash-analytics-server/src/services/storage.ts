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
      console.log(`📁 StorageService: Creating data directory: ${DATA_DIR}`);
      await mkdir(DATA_DIR, { recursive: true });
      console.log(`✅ StorageService: Data directory created`);
    } else {
      console.log(`📁 StorageService: Data directory exists: ${DATA_DIR}`);
    }
  }

  async loadEventsSchema(): Promise<Record<string, EventSchema>> {
    try {
      console.log(`📂 StorageService: Loading events schema from ${EVENTS_SCHEMA_FILE}`);
      const data = await readFile(EVENTS_SCHEMA_FILE, 'utf8');
      const schema = JSON.parse(data);
      console.log(`📂 StorageService: Loaded schema with ${Object.keys(schema).length} events`);
      return schema;
    } catch (error) {
      console.log(`📂 StorageService: No existing schema file, returning empty schema`);
      return {};
    }
  }

  async saveEventsSchema(schema: Record<string, EventSchema>): Promise<void> {
    console.log(`💾 StorageService: Saving events schema to ${EVENTS_SCHEMA_FILE}`);
    await writeFile(EVENTS_SCHEMA_FILE, JSON.stringify(schema, null, 2));
    console.log(`✅ StorageService: Schema saved with ${Object.keys(schema).length} events`);
  }

  async appendEventData(event: EventData): Promise<void> {
    console.log(`💾 StorageService: Appending event "${event.event}" to ${EVENTS_DATA_FILE}`);
    const line = JSON.stringify(event) + '\n';
    await writeFile(EVENTS_DATA_FILE, line, { flag: 'a' });
    console.log(`✅ StorageService: Event data appended`);
  }

  async loadEventsData(eventName?: string, limit = 100): Promise<EventData[]> {
    try {
      console.log(`📂 StorageService: Loading events data from ${EVENTS_DATA_FILE}`);
      const data = await readFile(EVENTS_DATA_FILE, 'utf8');
      const lines = data.trim().split('\n').filter(line => line.trim());
      console.log(`📂 StorageService: Found ${lines.length} total events in file`);
      
      let events = lines.map(line => JSON.parse(line));
      
      // Filter by event name if provided
      if (eventName) {
        const beforeFilter = events.length;
        events = events.filter(event => event.event === eventName);
        console.log(`📂 StorageService: Filtered from ${beforeFilter} to ${events.length} events for "${eventName}"`);
      }
      
      // Limit results
      const result = events.slice(-limit);
      console.log(`📂 StorageService: Returning ${result.length} events (limit: ${limit})`);
      return result;
    } catch (error) {
      console.log(`📂 StorageService: No existing events file, returning empty array`);
      return [];
    }
  }
} 