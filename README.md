# Nodash Analytics Platform

Zero-configuration analytics with intelligent MCP integration. Track user behavior, analyze patterns, and get AI-powered insights for your applications.

## 🚀 Quick Start

### 1. Install the SDK

```bash
npm install @nodash/sdk
```

### 2. Initialize Analytics

```typescript
import { nodash } from '@nodash/sdk';

// Uses https://api.nodash.ai by default
nodash.init('your-project-token');

// Or override for local development
nodash.init('your-project-token', {
  apiUrl: 'http://localhost:3001'
});
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

## 📦 Packages

### [@nodash/sdk](packages/nodash-sdk)
Analytics SDK for tracking events, users, and page views.

```bash
npm install @nodash/sdk
```

### [@nodash/cli](packages/nodash-cli)
CLI tool for project analysis and setup guidance.

```bash
npx @nodash/cli analyze .
```

### [@nodash/mcp-server](packages/nodash-mcp-server)
MCP server for AI-powered analytics implementation guidance.

```bash
npx @nodash/mcp-server
```

## 🔧 Configuration

### Production (Default)
The SDK uses `https://api.nodash.ai` by default - no configuration needed.

### Local Development
Override the API URL for local development:

```typescript
nodash.init('your-project-token', {
  apiUrl: 'http://localhost:3001',
  debug: true
});
```

## 🌟 Features

- **Zero Configuration**: Works out of the box with sensible defaults
- **TypeScript Support**: Full type safety and IntelliSense
- **Framework Agnostic**: Works with React, Vue, Angular, and vanilla JS
- **AI-Powered Analysis**: CLI and MCP server provide intelligent insights
- **Privacy First**: GDPR compliant with user consent management
- **Real-time Analytics**: Live dashboards and event streaming
- **Automatic Batching**: Optimized network usage with intelligent batching

## 📊 Tracking Capabilities

### User Analytics
- User identification and profiles
- Session tracking and duration
- User journey mapping
- Cohort analysis

### Event Tracking
- Custom events with properties
- E-commerce tracking
- Form interactions
- Button clicks and navigation

### Performance Insights
- Page load times
- User engagement metrics
- Feature usage analytics
- Error tracking

## 🛠️ Development

### Local Setup

```bash
# Clone the repository
git clone https://github.com/nodash/nodash.git
cd nodash

# Install dependencies
npm install

# Build all packages
npm run build

# Start local analytics server
npm run start-analytics
```

### Running Tests

```bash
npm test
```

## 📚 Documentation

- **SDK Documentation**: [packages/nodash-sdk/README.md](packages/nodash-sdk/README.md)
- **CLI Documentation**: [packages/nodash-cli/README.md](packages/nodash-cli/README.md)
- **MCP Server Documentation**: [packages/nodash-mcp-server/README.md](packages/nodash-mcp-server/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [npm packages](https://www.npmjs.com/org/nodash)
- [Documentation](https://docs.nodash.ai)
- [API Reference](https://api.nodash.ai/docs)
- [Support](https://support.nodash.ai) 