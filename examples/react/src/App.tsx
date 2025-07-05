import React, { useEffect, useState } from 'react';
import { NodashSDK } from '@nodash/sdk';

// Initialize Nodash SDK
const nodash = new NodashSDK(process.env.REACT_APP_NODASH_TOKEN || 'demo-token', {
  baseUrl: process.env.REACT_APP_NODASH_API_URL || 'https://api.nodash.ai',
  debug: process.env.NODE_ENV === 'development'
});

function App() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    // Track page view on app load
    nodash.page('App', {
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer
    });

    // Simulate user login
    const simulateLogin = async () => {
      const userId = 'user-' + Math.random().toString(36).substr(2, 9);
      const userName = 'Demo User';
      
      setUser({ id: userId, name: userName });
      
      // Identify the user
      await nodash.identify(userId, {
        name: userName,
        email: `${userId}@example.com`,
        plan: 'free',
        signupDate: new Date().toISOString()
      });
      
      setEvents(prev => [...prev, `User identified: ${userName} (${userId})`]);
    };

    setTimeout(simulateLogin, 1000);
  }, []);

  const trackCustomEvent = async () => {
    try {
      await nodash.track('button_click', {
        buttonName: 'Custom Event Button',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }, {
        userId: user?.id
      });
      
      setEvents(prev => [...prev, 'Custom event tracked: button_click']);
    } catch (error) {
      console.error('Failed to track event:', error);
      setEvents(prev => [...prev, 'Error tracking event']);
    }
  };

  const trackError = async () => {
    try {
      const error = new Error('Demo error for testing');
      await nodash.reportError(error, {
        userId: user?.id,
        page: 'App',
        action: 'demo_error_button_click'
      });
      
      setEvents(prev => [...prev, 'Error reported successfully']);
    } catch (error) {
      console.error('Failed to report error:', error);
      setEvents(prev => [...prev, 'Error reporting error']);
    }
  };

  const submitMetric = async () => {
    try {
      await nodash.submitMetric('page_load_time', Math.random() * 1000, 'ms', {
        page: 'App',
        browser: navigator.userAgent.includes('Chrome') ? 'chrome' : 'other'
      });
      
      setEvents(prev => [...prev, 'Performance metric submitted']);
    } catch (error) {
      console.error('Failed to submit metric:', error);
      setEvents(prev => [...prev, 'Error submitting metric']);
    }
  };

  const checkHealth = async () => {
    try {
      const health = await nodash.healthCheck();
      const healthStatus = Object.entries(health)
        .map(([service, status]) => {
          if ('error' in status) {
            return `${service}: unhealthy`;
          }
          return `${service}: ${(status as any).status}`;
        })
        .join(', ');
      
      setEvents(prev => [...prev, `Health check: ${healthStatus}`]);
    } catch (error) {
      console.error('Health check failed:', error);
      setEvents(prev => [...prev, 'Health check failed']);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Nodash React Example</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>User Status</h3>
        {user ? (
          <p>✅ Logged in as: <strong>{user.name}</strong> ({user.id})</p>
        ) : (
          <p>⏳ Simulating login...</p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Analytics Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={trackCustomEvent}
            style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Track Custom Event
          </button>
          
          <button 
            onClick={trackError}
            style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Report Error
          </button>
          
          <button 
            onClick={submitMetric}
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Submit Metric
          </button>
          
          <button 
            onClick={checkHealth}
            style={{ padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Health Check
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Event Log</h3>
        <div style={{ height: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', backgroundColor: '#f8f9fa' }}>
          {events.length === 0 ? (
            <p style={{ color: '#6c757d', fontStyle: 'italic' }}>No events yet...</p>
          ) : (
            events.map((event, index) => (
              <div key={index} style={{ marginBottom: '5px', fontSize: '14px' }}>
                <span style={{ color: '#6c757d' }}>[{new Date().toLocaleTimeString()}]</span> {event}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#6c757d' }}>
        <p>This example demonstrates the Nodash SDK integration with React.</p>
        <p>Check your browser's developer console for additional logging.</p>
      </div>
    </div>
  );
}

export default App; 