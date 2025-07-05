# Nodash Analytics Platform

**Zero-configuration analytics platform with intelligent AI integration**

Nodash provides a comprehensive analytics solution that combines powerful data collection, intelligent insights, and seamless AI integration through the Model Context Protocol (MCP).

## 🏗️ Architecture Overview

This repository follows a **selective open source model** inspired by BetterStack:

### 🌟 Public Components (This Repository)
- **SDK** (`@nodash/sdk`) - Client library for all analytics operations
- **CLI** (`@nodash/cli`) - Command-line interface using the SDK
- **MCP Server** (`@nodash/mcp-server`) - AI integration server using the SDK
- **Framework Integrations** - React, Vue, Angular, Next.js examples
- **Developer Tools** - Debugging and validation utilities

### 🔒 Private Infrastructure
- Analytics processing servers
- Data pipelines and storage
- AI/ML models and algorithms
- Business intelligence features
- Enterprise-specific functionality

## 📦 Packages

### Core SDK (`@nodash/sdk`)
The main client library that provides:
- **Event Tracking** - Custom events, page views, user identification
- **Error Monitoring** - Automatic error reporting and context capture
- **Performance Metrics** - Custom metrics and performance monitoring
- **Business Intelligence** - Dashboard and report generation
- **Health Monitoring** - Service status and health checks

```typescript
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK('your-token', {
  baseUrl: 'https://api.nodash.ai'
});

// Track events
await nodash.track('user_signup', { plan: 'pro' });

// Identify users
await nodash.identify('user-123', { email: 'user@example.com' });

// Report errors
await nodash.reportError(error, { context: 'checkout' });

// Submit metrics
await nodash.submitMetric('response_time', 150, 'ms');
```

### CLI Tool (`@nodash/cli`)
Command-line interface built on the SDK:

```bash
# Install globally
npm install -g @nodash/cli

# Track events from command line
nodash analytics track "deployment_completed" --properties '{"version": "1.2.3"}'

# Identify users
nodash analytics identify user-123 --traits '{"plan": "enterprise"}'

# Health check
nodash analytics health

# Project analysis
nodash analyze
```

### MCP Server (`@nodash/mcp-server`)
AI integration server for Claude and other LLMs:

```bash
# Install and run
npm install -g @nodash/mcp-server
nodash-mcp-server

# Use with Claude Desktop
# Add to your MCP configuration
```

## 🚀 Quick Start

### 1. Install the SDK

```bash
npm install @nodash/sdk
```

### 2. Initialize in Your App

```typescript
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.NODASH_TOKEN);

// Start tracking
await nodash.track('app_started');
```

### 3. Framework-Specific Setup

#### React
```tsx
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.REACT_APP_NODASH_TOKEN);

function App() {
  useEffect(() => {
    nodash.page('Home');
  }, []);
  
  return <div>Your app</div>;
}
```

#### Vue
```vue
<script setup>
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.VUE_APP_NODASH_TOKEN);

onMounted(() => {
  nodash.page('Home');
});
</script>
```

#### Next.js
```typescript
// pages/_app.tsx
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK(process.env.NEXT_PUBLIC_NODASH_TOKEN);

export default function App({ Component, pageProps }) {
  useEffect(() => {
    nodash.page(router.pathname);
  }, [router.pathname]);
  
  return <Component {...pageProps} />;
}
```

## 🔧 Development

### Project Structure
```
nodash/
├── packages/
│   ├── nodash-sdk/           # Core SDK (uses shared interfaces)
│   ├── nodash-cli/           # CLI tool (uses SDK)
│   ├── nodash-mcp-server/    # MCP server (uses SDK)
│   └── nodash-analytics-server/ # Server interfaces
├── examples/                 # Framework examples
│   ├── react/
│   ├── vue/
│   ├── angular/
│   ├── nextjs/
│   ├── express/
│   └── vanilla-js/
├── tools/                    # Developer utilities
└── docs/                     # Documentation
```

### Architecture Principles

1. **SDK-First Design**: All components use the core SDK
2. **Shared Interfaces**: Common API contracts between SDK and servers
3. **Type Safety**: Full TypeScript support throughout
4. **Framework Agnostic**: Works with any JavaScript framework
5. **AI Integration**: Built-in MCP support for LLM interactions

### Building from Source

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

## 📖 Documentation

- [SDK Documentation](./packages/nodash-sdk/README.md)
- [CLI Documentation](./packages/nodash-cli/README.md)
- [MCP Server Documentation](./packages/nodash-mcp-server/README.md)
- [Framework Guides](./docs/framework-guides.md)
- [API Reference](./docs/api-reference.md)

## 🤝 Contributing

We welcome contributions to the public components of Nodash! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### What You Can Contribute To:
- SDK improvements and bug fixes
- CLI features and commands
- MCP server enhancements
- Framework integrations
- Documentation and examples
- Developer tools

### Development Workflow:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- [Website](https://nodash.ai)
- [Documentation](https://docs.nodash.ai)
- [Support](https://support.nodash.ai)
- [Status Page](https://status.nodash.ai)

## 🏢 About

Nodash is built with a selective open source model:
- **Client libraries and tools** are open source for community benefit
- **Core infrastructure** remains private for competitive advantage
- **AI integrations** are open source to drive adoption and innovation

This approach allows us to provide value to the developer community while maintaining a sustainable business model. 