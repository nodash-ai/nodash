import { Router, Request, Response } from 'express';
import { EventsService } from '../services/events.js';
import { SchemaDefinition, BatchEventRequest, TrackEventRequest } from '../types/index.js';

export function createEventsRouter(eventsService: EventsService): Router {
  const router = Router();

  // Get events schema
  router.get('/schema', async (req: Request, res: Response) => {
    try {
      console.log('📋 Getting events schema...');
      const schema = await eventsService.getSchema();
      console.log(`📋 Schema retrieved with ${Object.keys(schema).length} event types`);
      res.json(schema);
    } catch (error) {
      console.error('❌ Failed to load schema:', error);
      res.status(500).json({ error: 'Failed to load schema' });
    }
  });

  // Set event definition
  router.post('/schema', async (req: Request, res: Response) => {
    try {
      const definition = req.body as SchemaDefinition;
      console.log(`📝 Setting event definition for: ${definition.event_name}`);
      
      if (!definition.event_name || !definition.properties) {
        console.log('❌ Missing required fields: event_name or properties');
        return res.status(400).json({ error: 'event_name and properties are required' });
      }
      
      await eventsService.setEventDefinition(definition);
      console.log(`✅ Event definition saved: ${definition.event_name}`);
      res.json({ success: true, event_name: definition.event_name });
    } catch (error) {
      console.error('❌ Failed to save event definition:', error);
      res.status(500).json({ error: 'Failed to save event definition' });
    }
  });

  // Query events data
  router.get('/data', async (req: Request, res: Response) => {
    try {
      const eventName = req.query.event_name as string;
      const limit = parseInt(req.query.limit as string) || 100;
      
      console.log(`🔍 Querying events - event_name: ${eventName || 'all'}, limit: ${limit}`);
      const events = await eventsService.queryEvents(eventName, limit);
      console.log(`🔍 Found ${events.length} events`);
      res.json(events);
    } catch (error) {
      console.error('❌ Failed to query events:', error);
      res.status(500).json({ error: 'Failed to query events' });
    }
  });

  // Track single event (for testing)
  router.post('/track', async (req: Request, res: Response) => {
    try {
      const { event_name, data } = req.body as TrackEventRequest;
      console.log(`📊 Tracking event: ${event_name}`);
      
      if (!event_name) {
        console.log('❌ Missing event_name in track request');
        return res.status(400).json({ error: 'event_name is required' });
      }
      
      await eventsService.trackEvent(event_name, data);
      console.log(`✅ Event tracked: ${event_name}`);
      res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to track event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  // Batch events endpoint (used by SDK)
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { events } = req.body as BatchEventRequest;
      console.log(`📦 Processing batch of ${events?.length || 0} events`);
      
      if (!Array.isArray(events)) {
        console.log('❌ Invalid batch request: events must be an array');
        return res.status(400).json({ error: 'events must be an array' });
      }
      
      const processed = await eventsService.batchEvents(events);
      console.log(`✅ Batch processed: ${processed} events`);
      
      res.json({ 
        success: true, 
        processed,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Batch processing error:', error);
      res.status(500).json({ error: 'Failed to process batch events' });
    }
  });

  return router;
} 