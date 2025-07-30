# @nodash/mcp

The Nodash MCP (Model Context Protocol) server provides AI agents with comprehensive access to the Nodash analytics ecosystem. It automatically consumes CLI and SDK documentation, offers dynamic tool discovery, and enables agents to set up projects, execute commands, and access analytics data programmatically.

## Installation

```bash
npm install -g @nodash/mcp
```

## Quick Start

```bash
# Start the MCP server
nodash-mcp
```

Then configure in your MCP client (e.g., Kiro):

```json
{
  "mcpServers": {
    "nodash": {
      "command": "nodash-mcp"
    }
  }
}
```

## Architecture

The MCP server operates as the AI agent layer in the Nodash ecosystem:

```
┌─────────────────┐
│   @nodash/mcp   │  ← AI Agent Layer (this package)
│  (AI Agents)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/cli   │  ← Developer Layer
│  (Developer)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/sdk   │  ← Foundation Layer
│   (Foundation)  │
└─────────────────┘
```

The MCP server provides:
- **Dynamic Tool Discovery**: Automatically exposes Nodash capabilities as MCP tools
- **Documentation Integration**: Embedded SDK and CLI documentation with examples
- **Project Setup Optimization**: Intelligent configuration and setup assistance
- **Command Execution**: Programmatic access to CLI functionality
- **Analytics Access**: Query and analysis capabilities for AI agents

## Authentication and Multi-tenancy

### Token-based Authentication

The MCP server supports flexible authentication through the underlying CLI and SDK:

**Single-tenant Authentication:**
```typescript
// Setup with single-tenant token
await mcp.callTool('setup_project', {
  baseUrl: 'https://api.example.com',
  apiToken: 'sk-your-secret-token'
});
```

**Multi-tenant Authentication:**
```typescript
// Setup with multi-tenant token (tenant auto-derived)
await mcp.callTool('setup_project', {
  baseUrl: 'https://api.example.com',
  apiToken: 'demo-api-key-tenant1'  // tenant: 'tenant1'
});
```

### Tenant Isolation

For multi-tenant deployments, data isolation is automatically handled:

- **Event Data**: Events are stored with tenant-specific isolation
- **User Data**: User records are scoped to the authenticated tenant
- **Analytics**: Queries return only data for the authenticated tenant
- **Configuration**: Each tenant maintains separate configuration

### Environment-specific Authentication

```typescript
// Production environment setup
await mcp.callTool('setup_project', {
  baseUrl: 'https://api.example.com',
  apiToken: process.env.NODASH_PROD_TOKEN,
  environment: 'production'
});

// Staging environment setup
await mcp.callTool('setup_project', {
  baseUrl: 'https://staging.api.example.com',
  apiToken: process.env.NODASH_STAGING_TOKEN,
  environment: 'staging'
});

// Development environment (no auth required)
await mcp.callTool('setup_project', {
  baseUrl: 'http://localhost:3000',
  environment: 'development'
});
```

### Authentication Error Handling

```typescript
try {
  const result = await mcp.callTool('setup_project', {
    baseUrl: 'https://api.example.com',
    apiToken: 'invalid-token'
  });
} catch (error) {
  if (error.code === 'AUTHENTICATION_FAILED') {
    console.error('Invalid API token provided');
    // Handle token refresh or user re-authentication
  } else if (error.code === 'TENANT_NOT_FOUND') {
    console.error('Tenant could not be derived from token');
    // Handle tenant configuration issue
  }
}
```

### Security Best Practices for AI Agents

1. **Token Management**: Store tokens securely in environment variables
2. **Environment Isolation**: Use different tokens for different environments
3. **Token Validation**: Validate token format before making requests
4. **Error Handling**: Implement proper authentication error handling
5. **Logging**: Log authentication events for security monitoring

## Features

### Dynamic Tool Discovery
The MCP server automatically provides tools based on Nodash capabilities:

- **setup_project**: Configure Nodash for optimal usage with intelligent defaults
- **run_cli_command**: Execute CLI commands programmatically with structured output
- **get_documentation**: Access comprehensive SDK and CLI documentation
- **query_events**: Query analytics events with advanced filtering
- **query_users**: Query user data with comprehensive filtering options
- **analyze_events**: Perform advanced analytics and pattern analysis

### Embedded Documentation System
Documentation is embedded statically for reliable access:

- Complete SDK documentation with type definitions and examples
- Comprehensive CLI documentation with usage patterns
- Automatic example extraction and validation
- Real-time documentation updates through build process

### AI Agent Optimization
Designed specifically for AI agent integration:

- Structured data formats for all responses
- Comprehensive error handling with actionable messages
- Best practices guidance for analytics implementation
- Clear tool descriptions with parameter validation
- Intelligent project setup with environment detection

## Available Tools

### setup_project

Configure a nodash project with optimal settings and authentication.

**Parameters:**
- `baseUrl` (required): Server URL with protocol (http:// or https://)
- `apiToken` (optional): Authentication token (auto-derives tenant for multi-tenant servers)
- `environment` (optional): Environment name for configuration context

**Authentication Examples:**

Single-tenant setup:
```json
{
  "baseUrl": "https://api.example.com",
  "apiToken": "sk-your-secret-token",
  "environment": "production"
}
```

Multi-tenant setup (tenant auto-derived):
```json
{
  "baseUrl": "https://api.example.com",
  "apiToken": "demo-api-key-tenant1",
  "environment": "production"
}
```

Development setup (no authentication):
```json
{
  "baseUrl": "http://localhost:3000",
  "environment": "development"
}
```

### run_cli_command

Execute nodash CLI commands programmatically.

**Parameters:**
- `command` (required): CLI command (without "nodash" prefix)
- `args` (optional): Command arguments array

**Examples:**
```json
{
  "command": "health"
}
```

```json
{
  "command": "track",
  "args": ["user_action", "--properties", "{\"type\": \"click\"}"]
}
```

### get_documentation

Retrieve documentation for SDK or CLI components.

**Parameters:**
- `component` (required): "sdk" or "cli"

**Example:**
```json
{
  "component": "sdk"
}
```

### query_events

Query events with comprehensive filtering and pagination.

**Parameters:**
- `eventTypes` (optional): Array of event types to filter by
- `userId` (optional): Filter by specific user ID
- `startDate` (optional): Start date in ISO 8601 format
- `endDate` (optional): End date in ISO 8601 format
- `properties` (optional): Filter by event properties (key-value pairs)
- `sortBy` (optional): Sort by field (timestamp, eventName, userId)
- `sortOrder` (optional): Sort order (asc, desc)
- `limit` (optional): Maximum number of results (default: 100, max: 1000)
- `offset` (optional): Number of results to skip for pagination

**Example:**
```json
{
  "eventTypes": ["user_signup", "purchase"],
  "startDate": "2024-01-01T00:00:00Z",
  "limit": 50,
  "sortBy": "timestamp",
  "sortOrder": "desc"
}
```

### query_users

Query users with activity filters and comprehensive data.

**Parameters:**
- `userId` (optional): Filter by specific user ID
- `activeSince` (optional): Filter users active since date in ISO 8601 format
- `activeUntil` (optional): Filter users active until date in ISO 8601 format
- `properties` (optional): Filter by user properties (key-value pairs)
- `sortBy` (optional): Sort by field (firstSeen, lastSeen, eventCount, sessionCount)
- `sortOrder` (optional): Sort order (asc, desc)
- `limit` (optional): Maximum number of results (default: 100, max: 1000)
- `offset` (optional): Number of results to skip for pagination

**Example:**
```json
{
  "activeSince": "2024-01-01T00:00:00Z",
  "sortBy": "eventCount",
  "sortOrder": "desc",
  "limit": 25
}
```

### analyze_events

Perform advanced analytics and pattern analysis on events.

**Parameters:**
- `analysisType` (required): Type of analysis (summary, trends, user_behavior, event_patterns)
- `timeRange` (optional): Time range for analysis with start and end dates
- `eventTypes` (optional): Focus analysis on specific event types
- `groupBy` (optional): Group results by time period or dimension
- `limit` (optional): Maximum number of results to analyze

**Example:**
```json
{
  "analysisType": "trends",
  "timeRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "eventTypes": ["user_signup", "purchase"],
  "groupBy": "day"
}
```

## Available Resources

### nodash://docs/sdk
Complete SDK documentation with examples in Markdown format.

### nodash://docs/cli  
Complete CLI documentation with usage patterns in Markdown format.

## Comprehensive Agent Usage Patterns

### Complete Project Setup and Validation Workflow

```typescript
// 1. Set up the project with comprehensive configuration
const setupResult = await mcp.callTool('setup_project', {
  baseUrl: 'https://api.example.com',
  apiToken: 'sk-token-production',
  environment: 'production'
});

if (!setupResult.success) {
  throw new Error(`Setup failed: ${setupResult.message}`);
}

// 2. Verify server connectivity and health
const healthResult = await mcp.callTool('run_cli_command', {
  command: 'health'
});

if (!healthResult.success) {
  throw new Error(`Health check failed: ${healthResult.error}`);
}

// 3. Validate configuration
const configResult = await mcp.callTool('run_cli_command', {
  command: 'config',
  args: ['get']
});

console.log('Current configuration:', configResult.output);

// 4. Start tracking with comprehensive metadata
const trackResult = await mcp.callTool('run_cli_command', {
  command: 'track',
  args: ['project_initialized', '--properties', JSON.stringify({
    agent: 'ai-assistant',
    version: '1.0.0',
    environment: 'production',
    timestamp: new Date().toISOString(),
    setup_duration_ms: Date.now() - setupStart
  })]
});

if (trackResult.success) {
  console.log('Project setup completed and tracked successfully');
}
```

### Documentation Discovery and Learning

```typescript
// Get comprehensive SDK documentation
const sdkDocs = await mcp.callTool('get_documentation', {
  component: 'sdk'
});

// Extract and analyze examples for learning
const examples = sdkDocs.examples;
console.log(`Found ${examples.length} SDK examples`);

// Parse examples for specific patterns
const trackingExamples = examples.filter(ex => 
  ex.includes('track(') || ex.includes('.track')
);

const identifyExamples = examples.filter(ex => 
  ex.includes('identify(') || ex.includes('.identify')
);

console.log(`Tracking examples: ${trackingExamples.length}`);
console.log(`Identify examples: ${identifyExamples.length}`);

// Get CLI documentation for command reference
const cliDocs = await mcp.callTool('get_documentation', {
  component: 'cli'
});

// Extract command patterns for automation
const commandPatterns = cliDocs.content.match(/nodash \w+[^\n]*/g) || [];
console.log(`Available CLI patterns: ${commandPatterns.length}`);
```

### Analytics and Data Querying Workflow

```typescript
// Query recent events for analysis
const recentEvents = await mcp.callTool('query_events', {
  limit: 100,
  sortBy: 'timestamp',
  sortOrder: 'desc',
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24 hours
});

console.log(`Found ${recentEvents.totalCount} recent events`);

// Analyze user behavior patterns
const userAnalysis = await mcp.callTool('analyze_events', {
  analysisType: 'user_behavior',
  timeRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
    end: new Date().toISOString()
  },
  eventTypes: ['user_signup', 'feature_used', 'purchase'],
  groupBy: 'day'
});

// Query active users for segmentation
const activeUsers = await mcp.callTool('query_users', {
  activeSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
  sortBy: 'eventCount',
  sortOrder: 'desc',
  limit: 50
});

// Generate insights report
const insights = {
  totalEvents: recentEvents.totalCount,
  activeUsers: activeUsers.totalCount,
  topUsers: activeUsers.users.slice(0, 10).map(user => ({
    userId: user.userId,
    eventCount: user.eventCount,
    lastSeen: user.lastSeen
  })),
  behaviorTrends: userAnalysis.trends
};

console.log('Analytics insights:', insights);

// Track the analysis completion
await mcp.callTool('run_cli_command', {
  command: 'track',
  args: ['analytics_completed', '--properties', JSON.stringify({
    agent: 'ai-assistant',
    analysis_type: 'user_behavior',
    events_analyzed: recentEvents.totalCount,
    users_analyzed: activeUsers.totalCount,
    timestamp: new Date().toISOString()
  })]
});
```

### Error Handling and Resilience

The MCP server provides comprehensive error handling with structured responses:

```typescript
// Robust error handling pattern
async function executeWithRetry(toolName: string, params: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await mcp.callTool(toolName, params);
      
      if (result.success) {
        return result;
      } else {
        console.warn(`Attempt ${attempt} failed:`, result.message);
        
        if (attempt === maxRetries) {
          throw new Error(`${toolName} failed after ${maxRetries} attempts: ${result.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (error) {
      console.error(`Attempt ${attempt} error:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

// Usage with error handling
try {
  const result = await executeWithRetry('query_events', {
    limit: 100,
    eventTypes: ['user_signup']
  });
  
  console.log('Query successful:', result.totalCount);
} catch (error) {
  console.error('Query failed permanently:', error.message);
  
  // Track the failure for monitoring
  await mcp.callTool('run_cli_command', {
    command: 'track',
    args: ['query_failed', '--properties', JSON.stringify({
      error: error.message,
      tool: 'query_events',
      timestamp: new Date().toISOString()
    })]
  });
}
```

### Common Error Response Format

```json
{
  "success": false,
  "message": "Setup failed: Invalid base URL format",
  "error": "baseUrl must be a valid URL",
  "code": "INVALID_URL",
  "details": {
    "provided": "not-a-url",
    "expected": "Valid URL with protocol (http:// or https://)"
  }
}
```

## Architecture

The MCP server sits at the top of the nodash architecture:

```
┌─────────────────┐
│   @nodash/mcp   │  ← AI Agent Layer (this package)
│  (AI Agents)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/cli   │  ← Developer Layer
│  (Developer)    │
└─────────────────┘
         ↑
┌─────────────────┐
│   @nodash/sdk   │  ← Foundation Layer
│   (Foundation)  │
└─────────────────┘
```

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

The MCP server is tested as part of the overall nodash integration tests.

## Configuration

The MCP server requires no configuration - it automatically discovers and exposes nodash capabilities.

For CLI command execution, it assumes the `nodash` CLI is available globally. Install it with:

```bash
npm install -g @nodash/cli
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| MCP server not starting | Missing dependencies or permissions | Check `npm install` and file permissions |
| CLI commands failing | CLI not installed or configured | Install `@nodash/cli` globally and configure |
| Documentation not loading | Build process issue | Documentation is embedded; check server logs |
| Tools not appearing | MCP client configuration | Verify client config and server status |
| Authentication errors | Invalid or missing tokens | Check API token format and permissions |
| Query timeouts | Large dataset or slow network | Reduce query scope or increase timeout |

### Debug Mode

Enable debug logging for troubleshooting:

```bash
DEBUG=nodash:* nodash-mcp
```

### Health Checks

Verify MCP server functionality:

```typescript
// Test basic connectivity
const healthResult = await mcp.callTool('run_cli_command', {
  command: 'health'
});

// Test documentation access
const docsResult = await mcp.callTool('get_documentation', {
  component: 'sdk'
});

// Test project setup
const setupResult = await mcp.callTool('setup_project', {
  baseUrl: 'http://localhost:3000'
});

console.log('Health checks:', {
  connectivity: healthResult.success,
  documentation: docsResult.success,
  setup: setupResult.success
});
```

### Performance Optimization

For large-scale analytics operations:

```typescript
// Use pagination for large queries
async function queryAllEvents(eventTypes: string[]) {
  const allEvents = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const result = await mcp.callTool('query_events', {
      eventTypes,
      limit,
      offset
    });
    
    allEvents.push(...result.events);
    
    if (!result.hasMore) break;
    offset += limit;
  }
  
  return allEvents;
}

// Batch operations for efficiency
async function batchTrackEvents(events: Array<{event: string, properties: any}>) {
  const batchSize = 10;
  
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    
    await Promise.all(batch.map(({event, properties}) =>
      mcp.callTool('run_cli_command', {
        command: 'track',
        args: [event, '--properties', JSON.stringify(properties)]
      })
    ));
  }
}
```

## Integration Examples

### Kiro IDE Configuration

```json
{
  "mcpServers": {
    "nodash": {
      "command": "nodash-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

### Custom MCP Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: "my-agent",
  version: "1.0.0"
});

// Connect to nodash MCP server
await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools.tools.map(t => t.name));

// Use setup tool
const result = await client.callTool({
  name: 'setup_project',
  arguments: {
    baseUrl: 'https://api.example.com'
  }
});
```

## Key Features

### Self-Contained Architecture
- Documentation is embedded statically for reliable access
- No external dependencies for core functionality
- Works independently of network connectivity for documentation

### Agent-First Design
- Structured data formats for all tool responses
- Comprehensive parameter validation and error messages
- Clear schemas and type definitions for all interfaces
- Optimized for programmatic consumption by AI agents

### Dynamic Capability Discovery
- Automatically reflects CLI and SDK changes through documentation updates
- Real-time tool discovery based on available functionality
- Intelligent parameter suggestions and validation

### Production-Ready Reliability
- Comprehensive error handling with actionable messages
- Built-in retry mechanisms and timeout handling
- Performance optimization for large-scale analytics operations
- Extensive logging and debugging capabilities

## License

MIT License

---

*Built by the Nodash team with a focus on AI agent integration and developer experience*