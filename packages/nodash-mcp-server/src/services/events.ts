import { EventDefinition, EventData } from '../types.js';
import { ANALYTICS_SERVER_URL } from '../utils/constants.js';

export class EventsService {
  async getEventsSchema(): Promise<any> {
    try {
      const response = await fetch(`${ANALYTICS_SERVER_URL}/events/schema`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return { 
        error: 'Failed to fetch events schema', 
        message: 'Ensure analytics server is running on ' + ANALYTICS_SERVER_URL,
        schema: {} 
      };
    }
  }

  async setEventDefinition(args: any): Promise<any> {
    const { event_name, properties, description } = args || {};
    
    if (!event_name || !properties) {
      throw new Error('event_name and properties are required');
    }

    try {
      const response = await fetch(`${ANALYTICS_SERVER_URL}/events/schema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_name,
          properties,
          description: description || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        event: event_name,
        message: 'Event definition saved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to save event definition - ensure analytics server is running'
      };
    }
  }

  async queryEvents(args: any): Promise<any> {
    const { event_name, limit = 100 } = args || {};
    
    try {
      const params = new URLSearchParams();
      if (event_name) params.append('event_name', event_name);
      params.append('limit', limit.toString());
      
      const response = await fetch(`${ANALYTICS_SERVER_URL}/events/data?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return { 
        error: 'Failed to query events', 
        events: [],
        message: 'Ensure analytics server is running on ' + ANALYTICS_SERVER_URL
      };
    }
  }

  async getEventsData(): Promise<any> {
    return this.queryEvents({ limit: 100 });
  }

  async trackEvent(args: any): Promise<any> {
    const { event_name, properties } = args || {};
    
    if (!event_name) {
      throw new Error('event_name is required');
    }

    try {
      const response = await fetch(`${ANALYTICS_SERVER_URL}/events/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_name,
          data: properties || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        event: event_name,
        properties: properties || {},
        message: 'Event tracked successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to track event - ensure analytics server is running'
      };
    }
  }
} 