# Nodash Usage Guide

After publishing to npm, here's how users will use Nodash:

## 🚀 For End Users

### 1. Install SDK
```bash
npm install @nodash/sdk
```

### 2. Initialize (Production)
```typescript
import { nodash } from '@nodash/sdk';

// Uses https://api.nodash.ai by default
nodash.init('your-project-token');
```

### 3. Track Events
```typescript
// Track user actions
nodash.track('Button Click', { button: 'signup' });

// Identify users
nodash.identify('user-123', { name: 'John Doe' });

// Track page views
nodash.page('Home Page');
```

## 🛠️ For Development

### Local Development Setup
```typescript
// Override API URL for local development
nodash.init('your-project-token', {
  apiUrl: 'http://localhost:3001',
  debug: true
});
```

### CLI Analysis
```bash
# Analyze project for analytics opportunities
npx @nodash/cli analyze .

# Get framework-specific guidance
npx @nodash/cli analyze . --framework react
```

### MCP Server Setup
```bash
# Start MCP server for AI guidance
npx @nodash/mcp-server
```

## 📋 Configuration Options

```typescript
nodash.init('your-project-token', {
  apiUrl: 'https://api.nodash.ai',  // Default: https://api.nodash.ai
  debug: false,                     // Default: false
  batchSize: 10,                    // Default: 10
  flushInterval: 10000,             // Default: 10000ms
  maxRetries: 3                     // Default: 3
});
```

## 🔗 Package URLs

After publishing:
- SDK: https://www.npmjs.com/package/@nodash/sdk
- CLI: https://www.npmjs.com/package/@nodash/cli
- MCP: https://www.npmjs.com/package/@nodash/mcp-server 