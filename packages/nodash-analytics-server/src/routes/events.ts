import { Router, Request, Response } from 'express';
import { EventsService } from '../services/events.js';
import { SchemaDefinition, BatchEventRequest, TrackEventRequest } from '../types/index.js';

export function createEventsRouter(eventsService: EventsService): Router {
  const router = Router();

  // Get events schema
  router.get('/schema', async (req: Request, res: Response) => {
    try {
      const schema = await eventsService.getSchema();
      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load schema' });
    }
  });

  // Set event definition
  router.post('/schema', async (req: Request, res: Response) => {
    try {
      const definition = req.body as SchemaDefinition;
      
      if (!definition.event_name || !definition.properties) {
        return res.status(400).json({ error: 'event_name and properties are required' });
      }
      
      await eventsService.setEventDefinition(definition);
      res.json({ success: true, event_name: definition.event_name });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save event definition' });
    }
  });

  // Query events data
  router.get('/data', async (req: Request, res: Response) => {
    try {
      const eventName = req.query.event_name as string;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const events = await eventsService.queryEvents(eventName, limit);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to query events' });
    }
  });

  // Track single event (for testing)
  router.post('/track', async (req: Request, res: Response) => {
    try {
      const { event_name, data } = req.body as TrackEventRequest;
      
      if (!event_name) {
        return res.status(400).json({ error: 'event_name is required' });
      }
      
      await eventsService.trackEvent(event_name, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  // Batch events endpoint (used by SDK)
  router.post('/batch', async (req: Request, res: Response) => {
    try {
      const { events } = req.body as BatchEventRequest;
      
      if (!Array.isArray(events)) {
        return res.status(400).json({ error: 'events must be an array' });
      }
      
      const processed = await eventsService.batchEvents(events);
      
      res.json({ 
        success: true, 
        processed,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Batch processing error:', error);
      res.status(500).json({ error: 'Failed to process batch events' });
    }
  });

  return router;
} 