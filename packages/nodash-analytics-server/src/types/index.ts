export interface EventSchema {
  properties: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface EventData {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  source?: string;
}

export interface SchemaDefinition {
  event_name: string;
  properties: Record<string, any>;
  description?: string;
}

export interface BatchEventRequest {
  events: EventData[];
}

export interface TrackEventRequest {
  event_name: string;
  data?: Record<string, any>;
} 