/**
 * @nodash/sdk - Analytics SDK for event tracking
 * 
 * Industry-standard analytics SDK with support for:
 * - Event tracking with properties
 * - User identification and profiles  
 * - Page view tracking
 * - Group analytics
 * - Session management
 * - Automatic batching and retry
 * - TypeScript support
 * 
 * @example
 * ```typescript
 * import { nodash } from '@nodash/sdk';
 * 
 * // Initialize (uses https://api.nodash.ai by default)
 * nodash.init('your-project-token', {
 *   debug: true
 * });
 * 
 * // Or override for local development
 * nodash.init('your-project-token', {
 *   apiUrl: 'http://localhost:3001',
 *   debug: true
 * });
 * 
 * // Track events
 * nodash.track('Page View', { page: 'home' });
 * 
 * // Identify users
 * nodash.identify('user-123', { name: 'John Doe', email: 'john@example.com' });
 * 
 * // Page tracking
 * nodash.page('Home Page', { section: 'marketing' });
 * ```
 */

import { NodashSDK } from './core/sdk.js';

// Export types
export * from './types.js';

// Create singleton instance
const sdk = new NodashSDK();

// Export singleton instance
export const nodash = sdk;

// Export class for advanced usage
export { NodashSDK };

// Default export
export default nodash; 