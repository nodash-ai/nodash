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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', createHealthRouter());
app.use('/events', createEventsRouter(eventsService));

// Start server
async function startServer() {
  await storageService.ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`🚀 Nodash Analytics Server running on http://localhost:${PORT}`);
    console.log(`📊 Data stored in: .nodash/`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch(console.error);

export default app; 