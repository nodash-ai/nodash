#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { StorageService } from './services/storage.js';
import { EventsService } from './services/events.js';
import { createEventsRouter } from './routes/events.js';
import { createHealthRouter } from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Services
const storageService = new StorageService();
const eventsService = new EventsService(storageService);

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, url, headers, body } = req;
  
  console.log(`[${timestamp}] ${method} ${url}`);
  
  if (method !== 'GET' && Object.keys(body || {}).length > 0) {
    console.log(`[${timestamp}] Request body:`, JSON.stringify(body, null, 2));
  }
  
  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${timestamp}] Response ${res.statusCode}:`, 
      typeof data === 'string' ? data.substring(0, 200) + (data.length > 200 ? '...' : '') 
      : JSON.stringify(data).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : '')
    );
    return originalSend.call(this, data);
  };
  
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', createHealthRouter());
app.use('/events', createEventsRouter(eventsService));

// Start server
async function startServer() {
  console.log('🚀 Starting Nodash Analytics Server...');
  console.log(`📁 Ensuring data directory exists...`);
  await storageService.ensureDataDir();
  console.log(`📊 Services initialized`);
  
  app.listen(PORT, () => {
    console.log(`✅ Nodash Analytics Server running on http://localhost:${PORT}`);
    console.log(`📊 Data stored in: .nodash/`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`📝 Events schema: http://localhost:${PORT}/events/schema`);
    console.log(`🔍 Events data: http://localhost:${PORT}/events/data`);
    console.log(`📊 Track events: POST http://localhost:${PORT}/events/track`);
    console.log(`📦 Batch events: POST http://localhost:${PORT}/events/batch`);
    console.log('');
    console.log('🎯 Server ready to receive requests!');
  });
}

startServer().catch(console.error);

export default app; 