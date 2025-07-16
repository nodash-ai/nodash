# Getting Started with Nodash 🚀

> From zero to tracking in 5 minutes (or your coffee is free)

This guide will walk you through setting up the complete Nodash ecosystem, from SDK to CLI to MCP integration. Whether you're a human developer or an AI agent, we've got you covered.

## Prerequisites

- Node.js 18+ (because we live in the future)
- npm or yarn (your choice, we don't judge)
- A sense of humor (optional but recommended)

## Step 1: Choose Your Adventure

### Option A: I Want Everything (Recommended)

Install all packages for the full experience:

```bash
# Install globally for CLI access
npm install -g @nodash/cli @nodash/mcp

# Install SDK for your projects
npm install @nodash/sdk
```

### Option B: SDK Only (Minimalist)

Just the core SDK for your application:

```bash
npm install @nodash/sdk
```

### Option C: CLI Only (Developer)

Just the CLI for command-line usage:

```bash
npm install -g @nodash/cli
```

## Step 2: Set Up Your Server

You have two options: use an existing Nodash-compatible server or create your own.

### Option A: Create Your Own Server (5 minutes)

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json());

// Track events
app.post('/track', (req, res) => {
  const { event, properties, timestamp } = req.body;
  console.log(`📊 Event: ${event}`, properties);
  
  // Here you'd save to your database
  // For now, we'll just log it
  
  res.json({ success: true, message: 'Event tracked' });
});

// Identify users
app.post('/identify', (req, res) => {
  const { userId, traits, timestamp } = req.body;
  console.log(`👤 User: ${userId}`, traits);
  
  // Here you'd update user profile
  // For now, we'll just log it
  
  res.json({ success: true, message: 'User identified' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    checks: [
      { name: 'server', status: 'pass', message: 'Server is running' },
      { name: 'memory', status: 'pass', message: 'Memory usage normal' }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Nodash server running on http://localhost:${PORT}`);
  console.log('Ready to receive events!');
});
```

Start your server:
```bash
node server.js
```

### Option B: Use Existing Server

If you already have a Nodash-compatible server, just note down its URL and API token (if required).

## Step 3: SDK Integration

### Basic Usage

```typescript
// app.ts
import { NodashSDK } from '@nodash/sdk';

// Initialize (replace with your server URL)
const nodash = new NodashSDK('http://localhost:3000');

async function main() {
  try {
    // Check if server is healthy
    const health = await nodash.health();
    console.log('✅ Server is', health.status);
    
    // Track an event
    await nodash.track('app_started', {
      version: '1.0.0',
      environment: 'development'
    });
    
    // Identify a user
    await nodash.identify('user-123', {
      name: 'John Developer',
      email: 'john@example.com',
      plan: 'pro'
    });
    
    console.log('🎉 All operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
```

### Advanced Usage with Error Handling

```typescript
import { NodashSDK, HealthStatus } from '@nodash/sdk';

class AnalyticsService {
  private nodash: NodashSDK;
  
  constructor(baseUrl: string, apiToken?: string) {
    this.nodash = new NodashSDK(baseUrl, apiToken);
  }
  
  async trackUserAction(userId: string, action: string, properties: any = {}) {
    try {
      await this.nodash.track(action, {
        userId,
        ...properties,
        timestamp: new Date().toISOString()
      });
      console.log(`📊 Tracked: ${action} for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to track ${action}:`, error.message);
      // Implement your error handling strategy here
      // Maybe queue for retry, log to error service, etc.
    }
  }
  
  async identifyUser(userId: string, traits: any) {
    try {
      await this.nodash.identify(userId, traits);
      console.log(`👤 Identified user: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to identify user ${userId}:`, error.message);
    }
  }
  
  async checkHealth(): Promise<boolean> {
    try {
      const health = await this.nodash.health();
      return health.status === 'healthy';
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }
}

// Usage
const analytics = new AnalyticsService('http://localhost:3000');

// Track user actions
await analytics.trackUserAction('user-123', 'button_clicked', {
  button: 'signup',
  page: '/landing'
});

// Identify users
await analytics.identifyUser('user-123', {
  name: 'Jane Doe',
  email: 'jane@example.com',
  signupDate: new Date().toISOString()
});
```

## Step 4: CLI Setup

### Initialize CLI

```bash
# Configure your CLI
nodash init --url http://localhost:3000

# Or with authentication
nodash init --url https://api.yourserver.com --token your-api-token
```

### Basic CLI Usage

```bash
# Check server health
nodash health

# Track events from command line
nodash track "deployment_completed" --properties '{"version": "1.2.3", "success": true}'

# View current configuration
nodash config get

# Update configuration
nodash config set baseUrl https://new-server.com
```

### CLI in Scripts

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Starting deployment..."

# Track deployment start
nodash track "deployment_started" --properties '{
  "version": "'$VERSION'",
  "environment": "'$ENVIRONMENT'",
  "commit": "'$GIT_COMMIT'"
}'

# Your deployment logic here
if deploy_application; then
  echo "✅ Deployment successful"
  nodash track "deployment_completed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "success": true,
    "duration": "'$SECONDS'"
  }'
else
  echo "❌ Deployment failed"
  nodash track "deployment_failed" --properties '{
    "version": "'$VERSION'",
    "environment": "'$ENVIRONMENT'",
    "success": false,
    "error": "Deployment script failed"
  }'
  exit 1
fi
```

## Step 5: MCP Integration (For AI Agents)

### Start MCP Server

```bash
# Start the MCP server
nodash-mcp
```

### Configure in Your MCP Client

Add to your MCP configuration (e.g., in Kiro):

```json
{
  "mcpServers": {
    "nodash": {
      "command": "nodash-mcp",
      "args": []
    }
  }
}
```

### Available MCP Tools

Once connected, AI agents can use these tools:

1. **setup_project**: Configure nodash for optimal usage
2. **run_cli_command**: Execute CLI commands
3. **get_documentation**: Access latest docs and examples

### Example Agent Interaction

```
Agent: I need to set up nodash tracking for this project.

MCP Tool: setup_project
Parameters: {
  "baseUrl": "https://api.example.com",
  "apiToken": "sk-your-token",
  "environment": "production"
}

Result: ✅ Project setup completed successfully! Server is healthy and ready to use.
```

## Step 6: Real-World Examples

### E-commerce Application

```typescript
import { NodashSDK } from '@nodash/sdk';

const analytics = new NodashSDK('https://analytics.mystore.com', process.env.NODASH_TOKEN);

// Track product views
await analytics.track('product_viewed', {
  productId: 'prod-123',
  category: 'electronics',
  price: 299.99,
  userId: currentUser.id
});

// Track purchases
await analytics.track('purchase_completed', {
  orderId: 'order-456',
  total: 599.98,
  items: [
    { productId: 'prod-123', quantity: 2, price: 299.99 }
  ],
  paymentMethod: 'credit_card'
});

// Identify customers
await analytics.identify(currentUser.id, {
  email: currentUser.email,
  name: currentUser.name,
  totalOrders: currentUser.orderCount,
  lifetimeValue: currentUser.totalSpent
});
```

### SaaS Application

```typescript
import { NodashSDK } from '@nodash/sdk';

const nodash = new NodashSDK('https://analytics.mysaas.com');

// Track feature usage
await nodash.track('feature_used', {
  feature: 'advanced_reporting',
  userId: user.id,
  plan: user.subscription.plan,
  sessionId: session.id
});

// Track subscription events
await nodash.track('subscription_upgraded', {
  userId: user.id,
  fromPlan: 'basic',
  toPlan: 'pro',
  revenue: 29.99
});

// Update user profiles
await nodash.identify(user.id, {
  email: user.email,
  company: user.company,
  plan: user.subscription.plan,
  mrr: user.subscription.monthlyRevenue
});
```

### Development Workflow

```bash
# In your package.json scripts
{
  "scripts": {
    "deploy:staging": "nodash track 'deploy_started' --properties '{\"env\":\"staging\"}' && npm run build && npm run deploy:staging:actual",
    "deploy:prod": "nodash track 'deploy_started' --properties '{\"env\":\"production\"}' && npm run build && npm run deploy:prod:actual",
    "test": "nodash track 'tests_started' && npm run test:actual && nodash track 'tests_completed' --properties '{\"success\":true}'"
  }
}
```

## Troubleshooting

### Common Issues

**Q: "No base URL configured" error**
```bash
# Solution: Initialize your CLI
nodash init --url https://your-server.com
```

**Q: Connection refused errors**
```bash
# Check if your server is running
curl http://localhost:3000/health

# Or use the CLI
nodash health
```

**Q: Authentication errors**
```bash
# Check your token
nodash config get apiToken

# Set a new token
nodash config set apiToken your-new-token
```

**Q: MCP server not connecting**
```bash
# Make sure it's running
nodash-mcp

# Check your MCP client configuration
```

### Debug Mode

Enable debug logging by setting environment variables:

```bash
export DEBUG=nodash:*
export NODASH_LOG_LEVEL=debug

# Now run your application or CLI commands
nodash health
```

## Next Steps

### For Developers
1. Integrate the SDK into your application
2. Set up CLI for deployment tracking
3. Create custom events for your business logic
4. Monitor with health checks

### For AI Agents
1. Configure MCP integration
2. Use setup_project tool for optimal configuration
3. Leverage documentation tools for learning
4. Execute CLI commands through MCP

### For Teams
1. Set up a shared Nodash server
2. Define standard events and properties
3. Create deployment scripts with tracking
4. Monitor application health across environments

## Getting Help

- **Documentation**: Check the README files in each package
- **Examples**: Look at the code examples in this guide
- **Issues**: Create issues in the GitHub repository
- **Community**: Join our discussions (coming soon)

## What's Next?

This clean restart is just the beginning. Future enhancements will include:

- Real-time dashboards
- Advanced analytics
- More MCP tools
- Plugin system
- Performance optimizations

But remember: we'll always prioritize simplicity over complexity. Less code, more value.

---

*Happy tracking! 🎉*