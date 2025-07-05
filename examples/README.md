# Nodash Examples

**Framework-specific examples and demos for Nodash analytics integration**

This directory contains practical examples showing how to integrate Nodash analytics into different frameworks and applications. Each example is production-ready and demonstrates best practices.

## 📁 Available Examples

### Frontend Frameworks

| Framework | Directory | Description |
|-----------|-----------|-------------|
| **React** | [`./react/`](./react/) | Hooks, providers, and component tracking patterns |
| **Vue** | [`./vue/`](./vue/) | Composition API and reactive analytics patterns |
| **Angular** | [`./angular/`](./angular/) | Services, modules, and dependency injection |
| **Next.js** | [`./nextjs/`](./nextjs/) | SSR, static generation, and API routes |
| **Vanilla JS** | [`./vanilla-js/`](./vanilla-js/) | Pure JavaScript integration without frameworks |

### Backend Frameworks

| Framework | Directory | Description |
|-----------|-----------|-------------|
| **Express** | [`./express/`](./express/) | Middleware, API tracking, and server-side analytics |

## 🚀 Quick Start

Each example includes:
- **📦 Complete setup** - Ready to run with `npm install && npm start`
- **📚 Documentation** - Detailed README with implementation notes
- **🎯 Best practices** - Production-ready patterns and configurations
- **🔧 TypeScript** - Full type safety with Nodash SDK
- **🤖 AI integration** - MCP server examples for AI guidance

## 🎯 Example Features

### User Tracking Examples
- User registration and authentication flows
- Profile updates and user journey tracking
- Session management and user identification

### E-commerce Examples
- Product views and search tracking
- Shopping cart and checkout analytics
- Purchase funnel and conversion tracking

### Content Examples
- Page views and content engagement
- Article reading and time tracking
- Media consumption and interaction patterns

### Technical Examples
- Error tracking and performance monitoring
- API usage and endpoint analytics
- Feature flag and A/B testing integration

## 🔧 Running Examples

### Prerequisites
```bash
# Install Nodash packages
npm install @nodash/sdk @nodash/integrations @nodash/cli
```

### React Example
```bash
cd examples/react
npm install
npm start
```

### Vue Example
```bash
cd examples/vue
npm install
npm run dev
```

### Express Example
```bash
cd examples/express
npm install
npm run dev
```

## 🤖 AI-Powered Setup

Use our MCP server with any example:

1. **Install MCP server**:
   ```bash
   npm install -g @nodash/mcp-server
   ```

2. **Ask your AI assistant**:
   - "Help me understand the React analytics example"
   - "Show me how to customize tracking in the Vue example"
   - "What events are tracked in the e-commerce example?"

## 📖 Learning Path

### Beginner
1. Start with [**Vanilla JS**](./vanilla-js/) for basic concepts
2. Try [**React**](./react/) for modern component patterns
3. Explore [**Express**](./express/) for server-side tracking

### Intermediate  
1. Study [**Next.js**](./nextjs/) for full-stack analytics
2. Learn [**Vue**](./vue/) reactive patterns
3. Implement [**Angular**](./angular/) enterprise patterns

### Advanced
1. Combine multiple examples for complex applications
2. Customize tracking for your specific use cases
3. Build your own framework integration

## 🛠️ Customization Guide

### Adding Custom Events
```typescript
// In any example, customize tracking:
import { nodash } from '@nodash/sdk';

// Track custom business events
nodash.track('Custom Event', {
  category: 'business',
  action: 'conversion',
  value: 100
});
```

### Framework-Specific Patterns
Each example demonstrates:
- **Automatic tracking** - Built-in event capture
- **Manual tracking** - Custom event implementation  
- **User identification** - Authentication integration
- **Performance** - Optimized tracking patterns

## 🤝 Contributing

Found an issue or want to add an example?

1. **Report bugs**: [GitHub Issues](https://github.com/nodash-ai/nodash/issues)
2. **Request examples**: Open an issue with `example-request` label
3. **Contribute code**: Submit a PR with new examples or improvements

## 📄 License

All examples are provided under the MIT License - see [LICENSE](../LICENSE) for details.

---

**Ready to implement?** Pick an example that matches your stack and start tracking in minutes! 