# Nodash MCP Server

**AI-powered development assistant for analytics integration**

The Nodash MCP (Model Context Protocol) server is a development-time tool that helps AI agents understand and implement Nodash analytics in your projects. It provides code analysis, implementation guidance, and working examples rather than runtime analytics functionality.

## 🎯 Purpose

This MCP server is designed to help developers and AI agents:
- **Analyze projects** for analytics integration opportunities
- **Generate implementation guides** with step-by-step instructions
- **Provide code examples** for different frameworks
- **Validate event schemas** and suggest improvements
- **Access working examples** from the examples directory

## 🚀 Quick Setup

### For Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

### For Other MCP Clients

```bash
# Run directly
npx @nodash/mcp-server@latest

# Or install globally
npm install -g @nodash/mcp-server
nodash-mcp-server
```

## 🔧 Available Tools

### Development Analysis Tools
- **`readme`** - Get comprehensive usage guide for the MCP server
- **`analyze_project`** - Analyze project structure and get implementation recommendations
- **`advanced_analysis`** - Deep code analysis with AI-powered insights and event opportunities
- **`implementation_guide`** - Generate step-by-step implementation instructions for your framework

### Event Design Tools
- **`get_event_templates`** - Get event schema templates for common business types (e-commerce, SaaS, etc.)
- **`validate_event_schema`** - Validate event schema design and get improvement recommendations
- **`generate_tracking_code`** - Generate framework-specific tracking code examples

## 📚 Available Resources

### Documentation Resources
- **`nodash://sdk/readme`** - Complete SDK documentation
- **`nodash://sdk/quick-start`** - 5-minute quick start guide
- **`nodash://sdk/framework-guides`** - Framework-specific integration guides
- **`nodash://sdk/api-reference`** - Complete API reference

### Example Resources
- **`nodash://examples/overview`** - Overview of all available examples
- **`nodash://examples/react`** - Complete React integration example
- **`nodash://examples/react/app`** - React App component with analytics
- **`nodash://examples/react/main`** - React application entry point

## 💡 Available Prompts

- **`implement-analytics`** - Get personalized implementation guidance
- **`debug-analytics`** - Get help debugging analytics issues
- **`design-events`** - Get guidance on designing event schemas
- **`migrate-analytics`** - Get help migrating from other analytics solutions
- **`optimize-performance`** - Get performance optimization recommendations

## 🎯 Usage Examples

### Project Analysis
```
"Analyze my current project and suggest how to integrate analytics"
```

### Implementation Guidance
```
"Generate an implementation guide for React with TypeScript"
```

### Event Design
```
"Get event templates for an e-commerce business"
"Validate my user_signup event schema"
```

### Code Generation
```
"Generate React tracking code for a button_click event"
"Show me Vue.js examples for page tracking"
```

### Example Access
```
"Show me the React example from the examples directory"
"What examples are available for different frameworks?"
```

## 🏗️ Development Workflow

### Recommended AI Agent Workflow

1. **Project Analysis**: Start with `analyze_project` to understand the codebase
2. **Advanced Insights**: Use `advanced_analysis` for comprehensive recommendations
3. **Implementation Plan**: Get `implementation_guide` for step-by-step instructions
4. **Event Design**: Use `get_event_templates` and `validate_event_schema` for event planning
5. **Code Generation**: Use `generate_tracking_code` for framework-specific examples
6. **Example Reference**: Access working examples through resources

### Example AI Conversation Flow

```
Human: Help me add analytics to my React app

AI: I'll help you integrate Nodash analytics into your React application. Let me start by analyzing your project structure.

[Uses analyze_project tool]

Based on the analysis, I can see you have a React application with TypeScript. Let me generate a comprehensive implementation guide for you.

[Uses implementation_guide tool with framework: "react", language: "typescript"]

Now let me show you some event templates that would be relevant for your application type.

[Uses get_event_templates tool]

Here's a complete step-by-step plan with code examples...
```

## 🔍 Key Features

### Smart Project Analysis
- **Framework Detection**: Automatically detects React, Vue, Next.js, Express, Angular, and more
- **Business Type Detection**: Identifies e-commerce, SaaS, content sites for targeted recommendations
- **Dependency Analysis**: Checks for existing analytics tools and suggests migration paths
- **Implementation Roadmap**: Provides phased implementation plan with time estimates

### Code Generation
- **Framework-Specific**: Generates code tailored to your specific framework
- **Best Practices**: Includes error handling, performance optimization, and testing patterns
- **Complete Examples**: Provides working code that can be copied directly into projects

### Event Schema Validation
- **Naming Conventions**: Validates snake_case naming and descriptive event names
- **Property Validation**: Ensures proper property types and required fields
- **Best Practice Suggestions**: Recommends improvements based on analytics best practices

### Working Examples Access
- **Live Examples**: Access to complete, working examples from the examples directory
- **Multiple Frameworks**: Examples for React, Vue, Next.js, Express, and more
- **Real Implementation**: Shows actual SDK integration patterns used in production

## 🛠️ Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/nodash.git
cd nodash/packages/nodash-mcp

# Install dependencies
npm install

# Build the server
npm run build

# Run locally
npm start

# Run tests
npm test

# Type checking
npm run type-check
```

## 📋 Requirements

- **Node.js** ≥ 18.0.0
- **NPM** or compatible package manager
- **MCP-compatible client** (Claude Desktop, etc.)

## 🔧 Configuration

The MCP server works out of the box with no configuration required. It automatically:
- Detects your project structure
- Finds the examples directory
- Caches analysis results for performance
- Provides context-aware recommendations

## 🤝 Integration with Local Agents

This MCP server is designed to work perfectly with local coding agents:

- **MCP Server Role**: Provides analysis, guidance, and recommendations
- **Local Agent Role**: Implements the actual code changes with full project context
- **Perfect Partnership**: MCP analyzes and suggests, agent implements with precision

## 🐛 Troubleshooting

### Common Issues

**MCP server not starting**
- Ensure Node.js ≥ 18.0.0 is installed
- Check that the MCP client configuration is correct
- Try running `npx @nodash/mcp-server@latest` directly

**Project analysis failing**
- Ensure you're running from a directory with a `package.json`
- Check file permissions for the project directory
- Verify the project structure is accessible

**Examples not loading**
- Check that the examples directory exists relative to the MCP server
- Ensure file permissions allow reading example files
- Try accessing examples through the resources

### Getting Help

1. Use the `readme` tool for comprehensive usage instructions
2. Check the troubleshooting prompts for specific issues
3. Review the error messages - they include helpful suggestions and code examples

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🔗 Related Packages

- **[@nodash/sdk](../nodash-sdk)** - Client SDK for analytics tracking
- **[Examples](../../examples)** - Working integration examples for all frameworks

---

**Built for developers, by developers** 🚀

Ready to add analytics to your project? Start with: *"Analyze my project and help me integrate Nodash analytics"* 