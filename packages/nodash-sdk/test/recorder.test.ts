import { describe, it, expect, beforeEach } from 'vitest';
import { Recorder } from '../src/recorder';
import { Event } from '../src/types';

describe('Recorder', () => {
  let recorder: Recorder;

  beforeEach(() => {
    recorder = new Recorder();
  });

  describe('start/stop recording functionality', () => {
    it('should start recording with default max events', () => {
      expect(recorder.isActive()).toBe(false);
      
      recorder.start();
      
      expect(recorder.isActive()).toBe(true);
    });

    it('should start recording with custom max events', () => {
      recorder.start(50);
      
      expect(recorder.isActive()).toBe(true);
    });

    it('should stop recording and return snapshot', () => {
      recorder.start();
      
      const event: Event = {
        type: 'track',
        data: { event: 'test', properties: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      recorder.addEvent(event);
      
      const snapshot = recorder.stop();
      
      expect(recorder.isActive()).toBe(false);
      expect(snapshot.events).toHaveLength(1);
      expect(snapshot.events[0]).toEqual(event);
      expect(snapshot.totalEvents).toBe(1);
      expect(snapshot.recordedAt).toBeInstanceOf(Date);
    });

    it('should return empty snapshot when no events recorded', () => {
      recorder.start();
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(0);
      expect(snapshot.totalEvents).toBe(0);
    });
  });

  describe('buffer limit enforcement (ring-buffer)', () => {
    it('should enforce default buffer limit of 100 events', () => {
      recorder.start(); // Default 100 events
      
      // Add 150 events
      for (let i = 0; i < 150; i++) {
        const event: Event = {
          type: 'track',
          data: { event: `test-${i}`, properties: {}, timestamp: new Date() },
          timestamp: new Date()
        };
        recorder.addEvent(event);
      }
      
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(100);
      expect(snapshot.totalEvents).toBe(100);
      // Should contain the last 100 events (50-149)
      expect(snapshot.events[0].data).toEqual(
        expect.objectContaining({ event: 'test-50' })
      );
      expect(snapshot.events[99].data).toEqual(
        expect.objectContaining({ event: 'test-149' })
      );
    });

    it('should enforce custom buffer limit', () => {
      recorder.start(5); // Custom limit of 5
      
      // Add 8 events
      for (let i = 0; i < 8; i++) {
        const event: Event = {
          type: 'track',
          data: { event: `test-${i}`, properties: {}, timestamp: new Date() },
          timestamp: new Date()
        };
        recorder.addEvent(event);
      }
      
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(5);
      expect(snapshot.totalEvents).toBe(5);
      // Should contain the last 5 events (3-7)
      expect(snapshot.events[0].data).toEqual(
        expect.objectContaining({ event: 'test-3' })
      );
      expect(snapshot.events[4].data).toEqual(
        expect.objectContaining({ event: 'test-7' })
      );
    });

    it('should handle buffer limit of 1', () => {
      recorder.start(1);
      
      const event1: Event = {
        type: 'track',
        data: { event: 'first', properties: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      const event2: Event = {
        type: 'identify',
        data: { userId: 'user-1', traits: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      
      recorder.addEvent(event1);
      recorder.addEvent(event2);
      
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(1);
      expect(snapshot.events[0]).toEqual(event2);
    });
  });

  describe('event capture during recording', () => {
    it('should capture track events', () => {
      recorder.start();
      
      const trackEvent: Event = {
        type: 'track',
        data: {
          event: 'user_signup',
          properties: { plan: 'pro' },
          timestamp: new Date()
        },
        timestamp: new Date()
      };
      
      recorder.addEvent(trackEvent);
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(1);
      expect(snapshot.events[0]).toEqual(trackEvent);
    });

    it('should capture identify events', () => {
      recorder.start();
      
      const identifyEvent: Event = {
        type: 'identify',
        data: {
          userId: 'user-123',
          traits: { name: 'John' },
          timestamp: new Date()
        },
        timestamp: new Date()
      };
      
      recorder.addEvent(identifyEvent);
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(1);
      expect(snapshot.events[0]).toEqual(identifyEvent);
    });

    it('should capture mixed event types', () => {
      recorder.start();
      
      const trackEvent: Event = {
        type: 'track',
        data: { event: 'page_view', properties: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      
      const identifyEvent: Event = {
        type: 'identify',
        data: { userId: 'user-456', traits: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      
      recorder.addEvent(trackEvent);
      recorder.addEvent(identifyEvent);
      
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(2);
      expect(snapshot.events[0]).toEqual(trackEvent);
      expect(snapshot.events[1]).toEqual(identifyEvent);
    });

    it('should not capture events when not recording', () => {
      const event: Event = {
        type: 'track',
        data: { event: 'test', properties: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      
      recorder.addEvent(event); // Not recording
      
      recorder.start();
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(0);
    });

    it('should not capture events after stopping', () => {
      recorder.start();
      recorder.stop();
      
      const event: Event = {
        type: 'track',
        data: { event: 'test', properties: {}, timestamp: new Date() },
        timestamp: new Date()
      };
      
      recorder.addEvent(event); // After stopping
      
      recorder.start();
      const snapshot = recorder.stop();
      
      expect(snapshot.events).toHaveLength(0);
    });
  });
});