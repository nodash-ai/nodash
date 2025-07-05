# Nodash Developer Tools

**Utilities and helper tools for Nodash analytics development**

This directory contains developer utilities, scripts, and tools to help you work with Nodash analytics more effectively. These tools are designed to improve your development workflow and debugging experience.

## 🛠️ Available Tools

### Development Utilities

| Tool | Description | Usage |
|------|-------------|-------|
| **Event Validator** | Validate event schemas and payloads | `node tools/validate-events.js` |
| **Tracking Debugger** | Debug analytics implementation | `node tools/debug-tracking.js` |
| **Schema Generator** | Generate TypeScript types from events | `node tools/generate-types.js` |
| **Migration Helper** | Migrate from other analytics platforms | `node tools/migrate-analytics.js` |

### Testing Tools

| Tool | Description | Usage |
|------|-------------|-------|
| **Event Simulator** | Simulate analytics events for testing | `node tools/simulate-events.js` |
| **Load Tester** | Test analytics performance under load | `node tools/load-test.js` |
| **Mock Server** | Local analytics server for development | `node tools/mock-server.js` |

### Monitoring & Analysis

| Tool | Description | Usage |
|------|-------------|-------|
| **Event Inspector** | Inspect and analyze tracked events | `node tools/inspect-events.js` |
| **Performance Monitor** | Monitor SDK performance impact | `node tools/monitor-performance.js` |
| **Data Quality Checker** | Validate data quality and completeness | `node tools/check-data-quality.js` |

## 🚀 Quick Start

### Event Validator

Validate your event schemas before sending to production:

```bash
# Validate a single event
node tools/validate-events.js --event "User Signup" --data '{"email": "user@example.com"}'

# Validate events from a file
node tools/validate-events.js --file events.json

# Validate against custom schema
node tools/validate-events.js --schema custom-schema.json --file events.json
```

### Tracking Debugger

Debug your analytics implementation in real-time:

```bash
# Start debugging session
node tools/debug-tracking.js --port 3001

# Debug specific events
node tools/debug-tracking.js --filter "Product*"

# Export debug logs
node tools/debug-tracking.js --export debug-log.json
```

### Schema Generator

Generate TypeScript types from your event definitions:

```bash
# Generate types from events
node tools/generate-types.js --input events.json --output types/events.ts

# Generate with custom templates
node tools/generate-types.js --template custom.hbs --output generated/
```

## 🔧 Configuration

Create a `tools.config.js` file to customize tool behavior:

```javascript
module.exports = {
  // Event validation settings
  validation: {
    strict: true,
    allowUnknownProperties: false,
    schemas: './schemas/'
  },
  
  // Debugging configuration
  debug: {
    port: 3001,
    logLevel: 'info',
    filters: ['User*', 'Product*']
  },
  
  // Type generation settings
  typeGeneration: {
    outputDir: './types/',
    template: 'typescript',
    includeComments: true
  },
  
  // Performance monitoring
  performance: {
    sampleRate: 0.1,
    metrics: ['timing', 'memory', 'network']
  }
};
```

## 📊 Event Validator

Ensure your events meet Nodash standards:

```bash
# Example validation
$ node tools/validate-events.js --file my-events.json

✅ Event validation results:
   
📊 Summary:
   Total events: 25
   Valid events: 23
   Invalid events: 2
   
❌ Validation errors:
   - "User Login": Missing required property 'timestamp'
   - "Product View": Invalid property type 'price' (expected number, got string)
   
💡 Suggestions:
   - Add timestamp to all user events
   - Ensure price values are numeric
   - Consider adding user_id for better tracking
```

## 🐛 Tracking Debugger

Real-time debugging of your analytics:

```bash
# Start debug server
$ node tools/debug-tracking.js

🔍 Nodash Debug Server running on http://localhost:3001

📊 Live Events:
   [14:23:15] User Signup { email: "user@example.com", plan: "free" }
   [14:23:18] Page View { path: "/dashboard", referrer: "/signup" }
   [14:23:22] Button Click { component: "cta", text: "Get Started" }
   
⚠️  Warnings:
   - High event frequency detected (50 events/sec)
   - Large payload size on "User Profile Update" (2.3KB)
   
📈 Performance:
   - Average payload size: 156 bytes
   - Network latency: 45ms
   - Success rate: 99.2%
```

## 🧪 Testing Tools

### Event Simulator

Generate realistic test events:

```bash
# Simulate user journey
node tools/simulate-events.js --scenario user-signup --count 100

# Custom event patterns
node tools/simulate-events.js --pattern ecommerce --users 50 --duration 1h
```

### Load Testing

Test your analytics under load:

```bash
# Basic load test
node tools/load-test.js --events 1000 --concurrent 10

# Stress test
node tools/load-test.js --rps 100 --duration 5m --ramp-up 30s
```

## 📈 Monitoring Tools

### Performance Monitor

Track SDK performance impact:

```bash
# Monitor in development
node tools/monitor-performance.js --watch

# Generate performance report
node tools/monitor-performance.js --report --output perf-report.html
```

### Data Quality Checker

Ensure data integrity:

```bash
# Check recent events
node tools/check-data-quality.js --days 7

# Comprehensive audit
node tools/check-data-quality.js --audit --export quality-report.json
```

## 🔌 Integration with IDEs

### VS Code Extension

Install the Nodash VS Code extension for:
- Event schema validation
- Auto-completion for event names
- Inline documentation
- Debugging integration

### Browser DevTools

Use the Nodash browser extension for:
- Real-time event inspection
- Performance monitoring
- Debug mode toggle
- Event export functionality

## 🤖 AI Integration

These tools work with the Nodash MCP server:

```bash
# Ask your AI assistant:
# "Help me debug tracking issues in my app"
# "Generate event schemas for an e-commerce site"
# "What's causing high analytics payload sizes?"
```

## 📚 Tool Documentation

Each tool includes detailed help:

```bash
# Get help for any tool
node tools/validate-events.js --help
node tools/debug-tracking.js --help
node tools/generate-types.js --help
```

## 🤝 Contributing Tools

Want to add a new tool?

1. Create your tool in the `tools/` directory
2. Add documentation to this README
3. Include help text and examples
4. Submit a PR with tests

## 📄 License

All tools are provided under the MIT License - see [LICENSE](../LICENSE) for details.

---

**Pro tip**: Combine multiple tools in your CI/CD pipeline for automated analytics quality assurance! 