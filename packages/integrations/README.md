# @nodash/integrations

**Framework-specific integrations and utilities for Nodash analytics**

> ⚠️ **Note**: This package is automatically generated and published from our private infrastructure. The source code is maintained in a private repository while providing you with production-ready framework integrations.

## 🚀 Quick Start

```bash
npm install @nodash/integrations
```

## 🌐 Framework Support

### React Integration

```typescript
import { useNodash, NodashProvider } from '@nodash/integrations/react';

// Provider setup
function App() {
  return (
    <NodashProvider token="your-token">
      <YourApp />
    </NodashProvider>
  );
}

// Hook usage
function Button() {
  const { track } = useNodash();
  
  return (
    <button onClick={() => track('Button Click', { component: 'hero' })}>
      Sign Up
    </button>
  );
}
```

### Vue Integration

```typescript
import { createApp } from 'vue';
import { NodashPlugin, useNodash } from '@nodash/integrations/vue';

// Plugin setup
const app = createApp(App);
app.use(NodashPlugin, { token: 'your-token' });

// Composition API usage
export default {
  setup() {
    const { track } = useNodash();
    
    const handleClick = () => {
      track('Button Click', { component: 'hero' });
    };
    
    return { handleClick };
  }
};
```

### Angular Integration

```typescript
import { NgModule } from '@angular/core';
import { NodashModule, NodashService } from '@nodash/integrations/angular';

// Module setup
@NgModule({
  imports: [
    NodashModule.forRoot({ token: 'your-token' })
  ]
})
export class AppModule {}

// Service usage
@Component({})
export class ButtonComponent {
  constructor(private nodash: NodashService) {}
  
  onClick() {
    this.nodash.track('Button Click', { component: 'hero' });
  }
}
```

### Next.js Integration

```typescript
import { NodashProvider, withNodash } from '@nodash/integrations/nextjs';

// _app.tsx
export default function App({ Component, pageProps }) {
  return (
    <NodashProvider token="your-token">
      <Component {...pageProps} />
    </NodashProvider>
  );
}

// Automatic page tracking
export default withNodash(function HomePage() {
  return <div>Home Page</div>;
});
```

### Express Integration

```typescript
import express from 'express';
import { nodashMiddleware } from '@nodash/integrations/express';

const app = express();

// Middleware setup
app.use(nodashMiddleware({ token: 'your-token' }));

// Route tracking
app.get('/api/users', (req, res) => {
  req.nodash.track('API Request', { 
    endpoint: '/api/users',
    method: 'GET' 
  });
  
  res.json({ users: [] });
});
```

## 📚 Available Integrations

| Framework | Package | Features |
|-----------|---------|----------|
| **React** | `@nodash/integrations/react` | Hooks, Provider, HOCs, automatic component tracking |
| **Vue** | `@nodash/integrations/vue` | Plugin, Composition API, automatic route tracking |
| **Angular** | `@nodash/integrations/angular` | Module, Service, Directives, automatic navigation tracking |
| **Next.js** | `@nodash/integrations/nextjs` | SSR support, automatic page tracking, API route middleware |
| **Express** | `@nodash/integrations/express` | Middleware, automatic request tracking, error tracking |
| **Nuxt** | `@nodash/integrations/nuxt` | Plugin, SSR/SSG support, automatic page tracking |

## 🔧 Features

### Automatic Tracking
- **Page Views** - Automatic navigation and route tracking
- **Component Interactions** - Button clicks, form submissions
- **API Requests** - Server-side endpoint tracking
- **Error Boundaries** - Automatic error capture and reporting

### Developer Experience
- **TypeScript Support** - Full type safety with auto-generated types
- **Hot Reload** - Development-friendly with fast refresh support
- **DevTools** - Browser extensions for debugging tracking
- **Performance** - Minimal bundle size impact

### Privacy & Compliance
- **GDPR Ready** - Built-in consent management
- **Data Minimization** - Only track what you need
- **User Control** - Easy opt-out mechanisms
- **Anonymization** - Automatic PII detection and removal

## 📖 Framework Guides

### React Best Practices

```typescript
// Track user interactions
const { track, identify, page } = useNodash();

// Component-level tracking
function ProductCard({ product }) {
  const trackPurchase = () => {
    track('Product Purchase', {
      productId: product.id,
      price: product.price,
      category: product.category
    });
  };
  
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={trackPurchase}>Buy Now</button>
    </div>
  );
}
```

### Vue Reactive Tracking

```typescript
// Reactive analytics with Vue
export default {
  setup() {
    const { track } = useNodash();
    const searchQuery = ref('');
    
    // Track search queries reactively
    watchEffect(() => {
      if (searchQuery.value) {
        track('Search Query', { 
          query: searchQuery.value,
          length: searchQuery.value.length
        });
      }
    });
    
    return { searchQuery };
  }
};
```

## 🤖 AI Integration

All integrations work seamlessly with our [MCP server](../nodash-mcp-server):

```bash
# Ask your AI assistant:
# "How do I track user registration in React?"
# "Show me Vue analytics patterns"
# "What events should I track in my Express API?"
```

## 📖 Documentation

- [**React Guide**](https://docs.nodash.ai/integrations/react) - Complete React integration
- [**Vue Guide**](https://docs.nodash.ai/integrations/vue) - Vue.js patterns and best practices
- [**Angular Guide**](https://docs.nodash.ai/integrations/angular) - Angular services and modules
- [**Next.js Guide**](https://docs.nodash.ai/integrations/nextjs) - SSR and static generation
- [**Express Guide**](https://docs.nodash.ai/integrations/express) - Server-side tracking

## 🤝 Support

- [**GitHub Issues**](https://github.com/nodash-ai/nodash/issues) - Bug reports and feature requests
- [**Documentation**](https://docs.nodash.ai) - Comprehensive guides and tutorials
- [**Community Discord**](https://discord.gg/nodash) - Community support and discussions

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Need setup help?** Use our [CLI tools](../nodash-cli) or [MCP integration](../nodash-mcp-server) for guided implementation! 