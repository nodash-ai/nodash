# Nodash

**Zero-configuration analytics with intelligent MCP integration**

Nodash provides intelligent analytics guidance through AI assistants via the Model Context Protocol (MCP). Get personalized implementation recommendations, event discovery, and framework-specific guidance powered by AI.

## 🎯 **What is Nodash?**

Nodash is an analytics platform that combines:
- **Zero-configuration SDK** for instant event tracking
- **AI-powered guidance** through MCP integration  
- **Intelligent event discovery** from your codebase
- **Framework-specific recommendations** for React, Vue, Angular, and more

## 🤖 **MCP Integration**

The Nodash MCP server provides AI assistants with deep analytics knowledge:

- **Project analysis** - Understand your codebase structure
- **Event opportunity discovery** - Find 100+ trackable events automatically  
- **Implementation guidance** - Get step-by-step setup instructions
- **Framework expertise** - Tailored advice for your tech stack

### Quick MCP Setup

1. **Install the MCP server**:
   ```bash
   npm install -g @nodash/mcp-server
   ```

2. **Add to your AI assistant** (Claude Desktop, etc.):
   ```json
   {
     "mcpServers": {
       "nodash": {
         "command": "nodash-mcp-server",
         "args": []
       }
     }
   }
   ```

3. **Ask your AI assistant**:
   - "Analyze my project for analytics opportunities"
   - "How should I implement user tracking in React?"
   - "What events should I track for my e-commerce app?"

## 📦 **SDK Usage**

Install the Nodash SDK for runtime analytics:

```bash
npm install @nodash/sdk
```

```typescript
import { nodash } from '@nodash/sdk';

// Initialize with your project token
nodash.init('your-project-token');

// Track user actions
nodash.track('Button Click', { 
  button: 'signup',
  page: 'landing' 
});

// Identify users  
nodash.identify('user-123', {
  name: 'John Doe',
  plan: 'pro'
});

// Track page views
nodash.page('Home Page');
```

## 🔧 **CLI Tools**

Use the Nodash CLI for project analysis:

```bash
npm install -g @nodash/cli

# Analyze your project
nodash analyze

# Get framework-specific guidance  
nodash guide --framework react

# Discover trackable events
nodash discover
```

## 🏗️ **Architecture**

Nodash follows a **server-driven architecture**:

- **Public Repository** (this repo): MCP server, examples, documentation
- **Private Infrastructure**: Analytics servers, SDK generation, data processing
- **Published Packages**: SDK and CLI tools available via npm

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Assistant  │───▶│  Nodash MCP      │───▶│  Analytics      │
│  (Claude, etc.) │    │     Server       │    │   Platform      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Your Project   │
                       │  + Nodash SDK    │
                       └──────────────────┘
```

## 🌟 **Key Features**

✅ **Zero Configuration** - Start tracking events in minutes  
✅ **AI-Powered Guidance** - Get personalized implementation advice  
✅ **Automatic Event Discovery** - Find 100+ trackable events in your code  
✅ **Framework Agnostic** - Works with React, Vue, Angular, Node.js, etc.  
✅ **Privacy-First** - Your code analysis stays local  
✅ **Production Ready** - Reliable event tracking and data collection  

## 📚 **Documentation**

- [**MCP Server Guide**](./packages/nodash-mcp-server/README.md) - Set up AI integration
- [**SDK Documentation**](https://docs.nodash.ai/sdk) - Runtime event tracking  
- [**CLI Reference**](https://docs.nodash.ai/cli) - Project analysis tools
- [**API Reference**](https://docs.nodash.ai/api) - Server endpoints

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 **License**

MIT License - see [LICENSE](./LICENSE) for details.

---

**Get started with AI-powered analytics guidance in minutes!**

Try asking your AI assistant: *"Help me set up analytics for my React app using Nodash"* 