import { StorageService } from './storage.js';
import { EventSchema, EventData, SchemaDefinition } from '../types/index.js';

export class EventsService {
  constructor(private storage: StorageService) {}

  async getSchema(): Promise<Record<string, EventSchema>> {
    return this.storage.loadEventsSchema();
  }

  async setEventDefinition(definition: SchemaDefinition): Promise<void> {
    const { event_name, properties, description } = definition;
    
    const schema = await this.storage.loadEventsSchema();
    schema[event_name] = {
      properties,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await this.storage.saveEventsSchema(schema);
  }

  async queryEvents(eventName?: string, limit = 100): Promise<EventData[]> {
    return this.storage.loadEventsData(eventName, limit);
  }

  async trackEvent(eventName: string, data: Record<string, any> = {}): Promise<void> {
    const eventData: EventData = {
      event: eventName,
      properties: data,
      timestamp: new Date().toISOString(),
      source: 'test'
    };
    
    await this.storage.appendEventData(eventData);
  }

  async batchEvents(events: EventData[]): Promise<number> {
    let processed = 0;
    
    for (const event of events) {
      if (!event.event) {
        continue; // Skip invalid events
      }
      
      const eventData: EventData = {
        event: event.event,
        properties: event.properties || {},
        timestamp: event.timestamp || new Date().toISOString(),
        userId: event.userId,
        sessionId: event.sessionId,
        source: 'sdk'
      };
      
      await this.storage.appendEventData(eventData);
      processed++;
    }
    
    return processed;
  }
} 