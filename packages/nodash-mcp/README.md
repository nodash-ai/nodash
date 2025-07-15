# Nodash MCP Server

**AI-powered development assistant for analytics integration with CLI integration**

The Nodash MCP (Model Context Protocol) server is a development-time tool that helps AI agents understand and implement Nodash analytics in your projects. It provides code analysis, implementation guidance, working examples, and now includes **CLI integration** for enhanced functionality including live configuration, testing, and validation.

## 🎯 Purpose

This MCP server is designed to help developers and AI agents:
- **Analyze projects** for analytics integration opportunities
- **Generate implementation guides** with step-by-step instructions
- **Provide code examples** for different frameworks
- **Validate event schemas** and suggest improvements
- **Access working examples** from the examples directory
- **🆕 Execute CLI commands** with safety checks and validation
- **🆕 Run automated workflows** for setup, validation, and troubleshooting
- **🆕 Live configuration management** through CLI integration
- **🆕 Real-time health monitoring** and diagnostics

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

### 🆕 CLI Integration Tools
- **`setup_nodash_complete`** - Complete Nodash setup with configuration, analysis, and validation using CLI
- **`execute_cli_command`** - Execute any Nodash CLI command with safety checks and confirmation
- **`validate_implementation`** - Comprehensive validation of Nodash implementation using CLI diagnostics
- **`troubleshoot_issues`** - Automated troubleshooting using CLI diagnostics and analysis
- **`execute_workflow`** - Execute predefined workflows for common tasks (setup, validation, health-check)

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

### 🆕 CLI Integration Examples
```
"Set up Nodash completely with my API token"
"Validate my current Nodash implementation"
"Run health checks and diagnostics"
"Execute a complete setup workflow"
"Troubleshoot my analytics issues"
```

## 🏗️ Development Workflow

### Recommended AI Agent Workflow

1. **Project Analysis**: Start with `analyze_project` to understand the codebase
2. **Advanced Insights**: Use `advanced_analysis` for comprehensive recommendations
3. **Implementation Plan**: Get `implementation_guide` for step-by-step instructions
4. **Event Design**: Use `get_event_templates` and `validate_event_schema` for event planning
5. **Code Generation**: Use `generate_tracking_code` for framework-specific examples
6. **Example Reference**: Access working examples through resources

### 🆕 Enhanced CLI-Integrated Workflow

1. **Complete Setup**: Use `setup_nodash_complete` with API token for full configuration
2. **Live Validation**: Use `validate_implementation` to test your setup in real-time
3. **Health Monitoring**: Use `execute_cli_command` with `health` for connectivity checks
4. **Automated Workflows**: Use `execute_workflow` for common tasks like setup and validation
5. **Issue Resolution**: Use `troubleshoot_issues` for automated diagnostics and solutions

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

### 🆕 CLI Integration Features
- **Secure Command Execution**: All CLI commands are validated and sanitized for security
- **Dry-Run Mode**: Commands default to dry-run mode for safety, with explicit confirmation for destructive operations
- **Automated Workflows**: Pre-built workflows for common tasks like setup, validation, and troubleshooting
- **Real-Time Diagnostics**: Live health checks and connectivity testing
- **Configuration Management**: Secure token storage and configuration validation
- **Error Recovery**: Intelligent error handling with fallback to MCP-only functionality
- **Performance Monitoring**: Command caching and execution time tracking

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

### 🆕 CLI Integration Configuration

The MCP server automatically detects and integrates with the Nodash CLI when available:

- **Automatic Detection**: Checks for CLI availability on startup
- **Graceful Fallback**: Falls back to MCP-only mode if CLI is unavailable
- **Version Compatibility**: Validates CLI version compatibility
- **Performance Optimization**: Caches CLI command results for better performance

**CLI Installation** (optional but recommended):
```bash
# Install globally for enhanced functionality
npm install -g @nodash/cli

# Verify installation
nodash --version
```

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

### 🆕 CLI Integration Issues

**CLI not detected**
- Install the CLI: `npm install -g @nodash/cli`
- Verify installation: `nodash --version`
- Check PATH configuration
- Server will fall back to MCP-only mode automatically

**CLI commands failing**
- Check API token configuration: Use `execute_cli_command` with `config list`
- Verify network connectivity: Use `execute_cli_command` with `health`
- Review command syntax and permissions
- Commands default to dry-run mode for safety

**Workflow execution issues**
- Use `troubleshoot_issues` tool for automated diagnostics
- Check individual command execution first
- Verify project structure and permissions
- Review workflow logs for specific failure points

**Security validation errors**
- Commands are automatically sanitized for security
- Destructive operations require explicit confirmation
- Use dry-run mode to test commands safely
- Review security policy for allowed commands and arguments

### Getting Help

1. Use the `readme` tool for comprehensive usage instructions
2. Use the `troubleshoot_issues` tool for automated CLI diagnostics
3. Check the troubleshooting prompts for specific issues
4. Review the error messages - they include helpful suggestions and code examples
5. 🆕 Use `validate_implementation` for comprehensive setup validation

## 📄 License

MIT License - see [LICENSE](../../LICENSE) for details.

## 🔗 Related Packages

- **[@nodash/sdk](../nodash-sdk)** - Client SDK for analytics tracking
- **[Examples](../../examples)** - Working integration examples for all frameworks

---

**Built for developers, by developers** 🚀

Ready to add analytics to your project? Start with: *"Analyze my project and help me integrate Nodash analytics"* 