# Nodash MCP Server

Model Context Protocol (MCP) server for Nodash Analytics Platform. Provides AI assistants with analytics capabilities including event tracking, schema management, and project analysis.

## Quick Setup

Add to your MCP client configuration (like Claude Desktop):

```json
{
  "mcpServers": {
    "nodash": {
      "command": "npx",
      "args": [
        "@nodash/mcp-server@latest"
      ]
    }
  }
}
```

Alternative shorter command:
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

### 🔧 **Tools Available**
- **`analyze_project`** - Analyze current project structure and provide implementation recommendations
- **`get_events_schema`** - Get current event schema definitions  
- **`set_event_definition`** - Define or update an event schema
- **`query_events`** - Query existing event data for analysis
- **`track_event`** - Track a test event (for testing purposes)

### 📚 **Resources Available**
- **SDK Documentation** - Complete API reference and guides
- **Quick Start Guide** - 5-minute setup instructions
- **Framework Guides** - Integration guides for React, Vue, Next.js, Express, Angular, and Svelte
- **API Reference** - Complete TypeScript definitions

## Installation Options

### Option 1: NPX (Recommended)
```bash
# No installation needed - runs latest version
npx @nodash/mcp-server@latest
```

### Option 2: Global Installation
```bash
npm install -g @nodash/mcp-server
nodash-mcp-server
# or
nodash-mcp
```

### Option 3: Local Installation
```bash
npm install @nodash/mcp-server
npx nodash-mcp-server
```

## Usage Examples

### With Claude Desktop

1. **Add to Claude Desktop settings** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "nodash": {
      "command": "npx",
      "args": ["@nodash/mcp-server@latest"]
    }
  }
}
```

2. **Restart Claude Desktop**

3. **Start using Nodash commands**:
   - "Analyze my current project structure"
   - "Show me the current event schema"
   - "Help me set up analytics for a React app"
   - "Track a test event"

### With Other MCP Clients

The server communicates via stdio and follows the MCP protocol standard. Example:

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npx @nodash/mcp-server@latest
```

## Project Analysis

The MCP server automatically analyzes your project and provides:
- **Framework detection** (React, Vue, Next.js, Express, etc.)
- **Source file counting**
- **Existing analytics detection**
- **Package manager detection**
- **Custom recommendations** based on your setup

Analysis is cached for 5 minutes and persisted to `.nodash/project-analysis.json`.

## Event Management

- **Schema Definition**: Define event structures with validation
- **Event Tracking**: Test event tracking functionality
- **Data Querying**: Query and analyze tracked events
- **Schema Management**: View and update event schemas

## Requirements

- **Node.js** ≥ 18.0.0
- **NPM** or compatible package manager

## Development

```bash
# Clone the repository
git clone https://github.com/nodash/nodash.git
cd nodash/packages/nodash-mcp-server

# Install dependencies
npm install

# Build
npm run build

# Test locally
npm start
```

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Related Packages

- **[@nodash/sdk](../nodash-sdk)** - Client SDK for event tracking
- **[@nodash/analytics-server](../nodash-analytics-server)** - Analytics backend server

---

**Made with ❤️ by the Nodash Team** 