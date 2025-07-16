# @nodash/mcp 🤖

> AI Agent interface that makes your bots smarter (and occasionally funnier)

The Nodash MCP (Model Context Protocol) server is the AI agent layer of the nodash ecosystem. It automatically consumes CLI and SDK documentation, provides dynamic tool discovery, and helps agents set up projects optimally.

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

## Features

### 🔧 Dynamic Tool Discovery
The MCP server automatically provides tools based on nodash capabilities:

- **setup_project**: Configure nodash for optimal usage
- **run_cli_command**: Execute CLI commands programmatically  
- **get_documentation**: Access latest docs and examples

### 📚 Self-Updating Documentation
Documentation is embedded statically, so it's always available regardless of deployment:

- SDK documentation with examples
- CLI documentation with usage patterns
- Automatic example extraction from code blocks

### 🎯 Agent Optimization
Built specifically to help AI agents:

- Project setup optimization
- Best practices guidance
- Structured error handling
- Clear tool descriptions

## Available Tools

### setup_project

Configure a nodash project with optimal settings.

**Parameters:**
- `baseUrl` (required): Server URL
- `apiToken` (optional): Authentication token
- `environment` (optional): Environment name

**Example:**
```json
{
  "baseUrl": "https://api.example.com",
  "apiToken": "sk-your-token",
  "environment": "production"
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

## Available Resources

### nodash://docs/sdk
Complete SDK documentation with examples in Markdown format.

### nodash://docs/cli  
Complete CLI documentation with usage patterns in Markdown format.

## Agent Usage Patterns

### Project Setup Workflow

```typescript
// 1. Set up the project
const setupResult = await mcp.callTool('setup_project', {
  baseUrl: 'https://api.example.com',
  apiToken: 'sk-token'
});

// 2. Verify health
const healthResult = await mcp.callTool('run_cli_command', {
  command: 'health'
});

// 3. Start tracking events
const trackResult = await mcp.callTool('run_cli_command', {
  command: 'track',
  args: ['project_initialized', '--properties', '{"agent": "ai-assistant"}']
});
```

### Documentation Discovery

```typescript
// Get SDK documentation
const sdkDocs = await mcp.callTool('get_documentation', {
  component: 'sdk'
});

// Extract examples for learning
const examples = sdkDocs.examples;
console.log(`Found ${examples.length} SDK examples`);
```

### Error Handling

The MCP server provides structured error responses:

```json
{
  "success": false,
  "message": "Setup failed: Invalid base URL format",
  "error": "baseUrl must be a valid URL"
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

**Q: MCP server not starting**
A: Check that all dependencies are installed and the server has proper permissions.

**Q: CLI commands failing**
A: Ensure `@nodash/cli` is installed globally and properly configured.

**Q: Documentation not loading**
A: Documentation is embedded statically, so this shouldn't happen. Check the server logs.

**Q: Tools not appearing in MCP client**
A: Verify your MCP client configuration and that the server is running.

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

## What Makes This Special

### Self-Contained
Documentation is embedded, so the package works independently without external file dependencies.

### Agent-First Design
Every tool and response is designed with AI agents in mind - structured data, clear schemas, helpful descriptions.

### Dynamic Capabilities
As the CLI and SDK evolve, the MCP server automatically reflects those changes through its documentation consumption.

### Minimal Complexity
Following the nodash principle of "simple, tight, less code is better."

## License

MIT - Because AI agents deserve freedom too.

---

*Built with ❤️ and a deep understanding of what AI agents actually need by the Nodash team*